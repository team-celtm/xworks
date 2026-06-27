import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/apiClient';

const triggerPromoConfetti = (elementId: string) => {
  const anchor = document.getElementById(elementId);
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = `${rect.top}px`;
  container.style.left = `${rect.left + rect.width / 2}px`;
  container.style.width = '0';
  container.style.height = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '99999';
  document.body.appendChild(container);

  const colors = ['#4F46E5', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#8B5CF6'];
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 6 + 5;
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 80 + 40;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 30;
    
    particle.style.position = 'absolute';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    
    particle.style.transform = 'translate(-50%, -50%)';
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.setProperty('--rot', `${Math.random() * 360}deg`);
    
    container.appendChild(particle);
  }
  
  setTimeout(() => {
    container.remove();
  }, 1800);
};

export default function EnrolModal({
  isOpen,
  onClose,
  initialData,
  user,
  onSuccess
}: any) {
  const router = useRouter();
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<any>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoOk, setPromoOk] = useState({ text: "", color: "", show: false });
  const [promoLoading, setPromoLoading] = useState(false);
  const [modalSessions, setModalSessions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && initialData) {
      setEnrolData({
        courseId: String(initialData.id),
        name: initialData.name,
        meta: initialData.meta,
        price: `₹${initialData.basePrice.toLocaleString("en-IN")}`,
        basePrice: initialData.basePrice,
        finalPrice: initialData.basePrice,
        courseOriginalPrice: initialData.basePrice,
        format: initialData.isLive ? "live" : "recorded",
        formatLabel: initialData.isLive ? "live session" : "recorded",
        date: "",
        time: "",
        payMethod: "UPI",
        promoApplied: false,
        thumbBg: initialData.thumbBg || 't-amber',
        thumbEmoji: initialData.thumbEmoji || '🎓',
        sessionId: initialData.preselectedSessionId || null,
        isLive: initialData.isLive,
        isNearby: initialData.isNearby
      });
      setEnrolStep(1);
      setPromoCode("");
      setPromoOk({ text: "", color: "", show: false });

      const fetchSessions = async () => {
        try {
          const res = await fetchApi(`/api/courses/id/${initialData.id}/sessions`);
          if (res.ok) {
            const data = await res.json();
            setModalSessions(data);
            if (data.length > 0) {
              const available = data.find((s: any) => s.status !== 'cancelled' && new Date(s.scheduledStart).getTime() >= Date.now() && (!s.maxSeats || (s.maxSeats - s.registeredCount > 0)));
              const targetSession = initialData.preselectedSessionId ? data.find((s:any) => String(s.id) === String(initialData.preselectedSessionId)) : available;
              if (targetSession) {
                setEnrolData((prev: any) => ({
                  ...prev,
                  sessionId: targetSession.id,
                  date: new Date(targetSession.scheduledStart).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
                  time: new Date(targetSession.scheduledStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                  scheduledStart: targetSession.scheduledStart
                }));
              }
            }
          }
        } catch (err) {
          console.error("Failed to load modal sessions:", err);
        }
      };
      fetchSessions();
    }
  }, [isOpen, initialData]);

  if (!isOpen || !enrolData) return null;

  const closeEnrol = () => {
    onClose();
  };

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoOk({ text: "✗ Please enter a promo code", color: "#D84040", show: true });
      setEnrolData((prev: any) => ({
        ...prev,
        promoApplied: false,
        finalPrice: prev.basePrice || 0,
        discount: 0
      }));
      return;
    }

    setPromoLoading(true);
    try {
      const res = await fetchApi("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId: enrolData.courseId, format: enrolData.format })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setEnrolData((prev: any) => ({
          ...prev,
          promoApplied: true,
          finalPrice: data.discountedPrice,
          discount: (prev.basePrice || 0) - data.discountedPrice
        }));
        setPromoOk({ text: `✓ Code applied — ${data.discountPercentage}% off!`, color: "#16A34A", show: true });
        setTimeout(() => triggerPromoConfetti('promo-apply-btn'), 50);
      } else {
        setPromoOk({ text: `✗ ${data.error || "Invalid code"}`, color: "#D84040", show: true });
        setEnrolData((prev: any) => ({
          ...prev,
          promoApplied: false,
          finalPrice: prev.basePrice || 0,
          discount: 0
        }));
      }
    } catch (err) {
      setPromoOk({ text: "✗ Connection error", color: "#D84040", show: true });
      setEnrolData((prev: any) => ({
        ...prev,
        promoApplied: false,
        finalPrice: prev.basePrice || 0,
        discount: 0
      }));
    } finally {
      setPromoLoading(false);
    }
  };

  const initiateEnrolPayment = async () => {
    try {
      if (!user) {
        alert("Please login first");
        router.push(`/Login?returnUrl=${window.location.pathname}`);
        return;
      }
      if (user.role === 'admin' || user.role === 'instructor') {
        alert("Instructors and Admins cannot enrol in courses.");
        return;
      }

      setEnrolStep(5); // Show processing screen
      setPromoOk({ text: 'Initializing payment gateway...', color: "#1E1B4B", show: true });

      // Handle Free Course / 100% Discount Case
      if (enrolData.finalPrice === 0) {
        setPromoOk({ text: 'Creating free enrolment...', color: "#1E1B4B", show: true });
        const freeRes = await fetchApi("/api/learner/enrolments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: enrolData.courseId,
            sessionId: enrolData.sessionId
          })
        });
        if (freeRes.status === 401) {
            router.push(`/Login?returnUrl=${window.location.pathname}`);
            return;
        }
        const freeData = await freeRes.json();
        if (freeRes.ok) {
          setEnrolStep(4);
          if (onSuccess) onSuccess();
          return;
        } else {
          throw new Error(freeData.error || "Failed to enrol in free course");
        }
      }

      // Create order
      const res = await fetchApi("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: enrolData.courseId,
          promoCode: promoCode || null,
          userId: user.id,
          format: enrolData.format,
          sessionId: enrolData.sessionId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPromoOk({ text: data.error || 'Could not create payment order', color: "#D84040", show: true });
        setEnrolStep(6);
        return;
      }

      const options = {
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: 'INR',
        name: "XWORKS",
        description: `Enrollment for ${enrolData.name}`,
        order_id: data.orderId,
        handler: async function (response: any) {
          setEnrolStep(5);
          setPromoOk({ text: 'Verifying your payment securely...', color: "#1E1B4B", show: true });
          try {
            const verifyRes = await fetchApi("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: enrolData.courseId,
                promoCode: promoCode || null,
                sessionId: enrolData.sessionId
              })
            });
            
            if (verifyRes.ok) {
              setEnrolStep(4);
              if (onSuccess) onSuccess();
            } else {
              const vData = await verifyRes.json();
              setPromoOk({ text: vData.error || 'Payment verification failed', color: "#D84040", show: true });
              setEnrolStep(6);
            }
          } catch (vErr: any) {
            console.error("Verification error:", vErr);
            setPromoOk({ text: vErr.message || 'Verification connection failed', color: "#D84040", show: true });
            setEnrolStep(6);
          }
        },
        prefill: {
          name: `${user.firstName || ''} ${user.lastName || ''}`,
          email: user.email,
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: () => {
            setPromoOk({ text: 'Payment checkout was closed.', color: "#D84040", show: true });
            setEnrolStep(6); 
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setPromoOk({ text: err.message || 'An error occurred', color: "#D84040", show: true });
      setEnrolStep(6);
    }
  };

  return (
    <div className="enrol-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) closeEnrol(); }} style={{zIndex: 1000}}>
      <div className="enrol-modal">
        {/* STEP 1: FORMAT */}
        {enrolStep === 1 && (
          <div>
            <div className="enrol-modal-hd">
              <div className="enrol-modal-title">Enrol in workshop</div>
              <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
            </div>
            <div className="enrol-stepper">
              <div className="enrol-step-item">
                <div className="enrol-step-dot active">1</div>
                <div className="enrol-step-label active">Format</div>
              </div>
              <div className="enrol-step-line pending"></div>
              <div className="enrol-step-item">
                <div className="enrol-step-dot pending">2</div>
                <div className="enrol-step-label">Schedule</div>
              </div>
              <div className="enrol-step-line pending"></div>
              <div className="enrol-step-item">
                <div className="enrol-step-dot pending">3</div>
                <div className="enrol-step-label">Payment</div>
              </div>
            </div>
            <div className="enrol-body">
              <div className="enrol-course-mini">
                <div className={`enrol-thumb ${enrolData.thumbBg}`}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={enrolData.thumbBg}></div>
                  <span style={{ position: "absolute", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px" }}>
                    {enrolData.thumbEmoji && (enrolData.thumbEmoji.startsWith('http') || enrolData.thumbEmoji.startsWith('/')) ? (
                      <>
                        <img 
                          src={enrolData.thumbEmoji} 
                          alt="" 
                          style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        <span style={{ display: 'none' }}>🎓</span>
                      </>
                    ) : (
                      enrolData.thumbEmoji
                    )}
                  </span>
                </div>
                <div>
                  <div className="enrol-course-name">{enrolData.name}</div>
                  <div className="enrol-course-meta">{enrolData.meta}</div>
                </div>
              </div>
              <div className="enrol-section-label">Choose your format</div>
              <div className="enrol-format-grid">
                {[
                  { id: "live", lbl: "Live session", icon: "🔴", sub: "Interactive · Q&A included", priceCalc: (b: number) => b },
                  { id: "recorded", lbl: "Recorded", icon: "📹", sub: "Watch anytime · Self-paced", priceCalc: (b: number) => Math.round(b * 0.8) },
                  { id: "inperson", lbl: "In-person", icon: "📍", sub: "Nearby · Limited seats", priceCalc: (b: number) => b + 500 }
                ].map((f) => {
                  if (!enrolData.isLive && f.id === 'live') return null;
                  if (!enrolData.isNearby && f.id === 'inperson') return null;
                  return (
                    <div
                      key={f.id}
                      className={`enrol-format-btn ${enrolData.format === f.id ? "selected" : ""}`}
                      onClick={() => setEnrolData({ ...enrolData, format: f.id, formatLabel: f.lbl, finalPrice: f.priceCalc(enrolData.courseOriginalPrice), basePrice: f.priceCalc(enrolData.courseOriginalPrice), promoApplied: false, discount: 0 })}
                      style={{ position: 'relative' }}
                    >
                      {enrolData.format === f.id && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '14px', color: '#3730A3', fontWeight: 'bold' }}>✓</div>}
                      <div className="enrol-format-icon">{f.icon}</div>
                      <div className="enrol-format-name">{f.lbl}</div>
                      <div className="enrol-format-sub">{f.sub}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '8px', color: '#1E1B4B' }}>₹{f.priceCalc(enrolData.courseOriginalPrice).toLocaleString("en-IN")}</div>
                    </div>
                  );
                })}
              </div>
              <div className="enrol-price-summary">
                <div style={{ fontSize: "12px", color: "var(--text-3)" }}>Price for {enrolData.formatLabel}</div>
                <div className="enrol-price-val">₹{enrolData.finalPrice.toLocaleString("en-IN")}</div>
              </div>
              <div className="enrol-fine">Includes certificate · Lifetime recording access · Class notes PDF</div>
              <button className="enrol-cta" onClick={() => { setEnrolStep(enrolData.format === "live" || enrolData.format === "inperson" ? 2 : 3); setPromoCode(""); setPromoOk({ text: "", color: "", show: false }); }}>
                {enrolData.format === "live" || enrolData.format === "inperson" ? "Continue to schedule →" : "Continue to payment →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCHEDULE */}
        {enrolStep === 2 && (
          <div>
            <div className="enrol-modal-hd">
              <div className="enrol-modal-title">Enrol in workshop</div>
              <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
            </div>
            <div className="enrol-stepper">
              <div className="enrol-step-item">
                <div className="enrol-step-dot done" onClick={() => setEnrolStep(1)}>✓</div>
                <div className="enrol-step-label">Format</div>
              </div>
              <div className="enrol-step-line done"></div>
              <div className="enrol-step-item">
                <div className="enrol-step-dot active">2</div>
                <div className="enrol-step-label active">Schedule</div>
              </div>
              <div className="enrol-step-line pending"></div>
              <div className="enrol-step-item">
                <div className="enrol-step-dot pending">3</div>
                <div className="enrol-step-label">Payment</div>
              </div>
            </div>
            <div className="enrol-body">
              <div className="enrol-course-mini">
                <div className="enrol-thumb" style={{ background: 'var(--indigo-light)' }}>🗓️</div>
                <div>
                  <div className="enrol-course-name">{enrolData.name}</div>
                  <div className="enrol-course-meta">Select a live session date</div>
                </div>
              </div>
              <div className="enrol-section-label">Available dates</div>
              <div className="enrol-date-grid">
                {modalSessions.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', gridColumn: '1 / -1' }}>No upcoming live sessions found. You can still enrol to access recordings or pick a date later.</div>
                ) : (
                  modalSessions.map(s => {
                    const isPast = new Date(s.scheduledStart).getTime() < Date.now();
                    const isCancelled = s.status === 'cancelled';
                    const full = !isCancelled && !isPast && s.maxSeats !== null && s.maxSeats !== undefined && s.maxSeats > 0 && (s.maxSeats - s.registeredCount <= 0);
                    const disabled = isPast || isCancelled || full;
                    return (
                      <div
                        key={s.id}
                        className={`enrol-date-btn ${enrolData.sessionId === s.id ? "selected" : ""} ${disabled ? "disabled" : ""}`}
                        style={{ opacity: disabled ? 0.6 : 1, position: 'relative' }}
                        onClick={() => {
                          if (!disabled) {
                            setEnrolData({
                              ...enrolData,
                              sessionId: s.id,
                              date: new Date(s.scheduledStart).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
                              time: new Date(s.scheduledStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                              scheduledStart: s.scheduledStart
                            });
                          }
                        }}
                      >
                        <div className="enrol-date-md">{new Date(s.scheduledStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</div>
                        <div className="enrol-date-tm">{new Date(s.scheduledStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="enrol-date-sub">{isCancelled ? 'Cancelled' : isPast ? 'Ended' : full ? 'Sold out' : s.title || 'Live Workshop'}</div>
                        {enrolData.sessionId === s.id && !disabled && <div style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>✓</div>}
                      </div>
                    );
                  })
                )}
              </div>
              {enrolData.sessionId ? (
                <div className="enrol-price-summary" style={{ marginTop: "16px", padding: "12px 16px", background: "var(--indigo-light)", borderRadius: "12px", border: "1px solid var(--indigo-mid)" }}>
                  <div style={{ fontSize: "12px", color: "var(--indigo)" }}>Selected Schedule</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)" }}>{enrolData.date} · {enrolData.time}</div>
                </div>
              ) : (
                <div className="enrol-price-summary" style={{ marginTop: "16px", padding: "12px 16px", background: "#F3F4F6", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                  <div style={{ fontSize: "13px", color: "#4B5563" }}>No session selected. You can enrol without a date and pick one later.</div>
                </div>
              )}
              <button className="enrol-cta" onClick={() => setEnrolStep(3)} style={{ marginTop: "24px" }}>
                Continue to payment →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {enrolStep === 3 && (
          <div>
            <div className="enrol-modal-hd">
              <div className="enrol-modal-title">Payment</div>
              <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
            </div>
            <div className="enrol-stepper">
              <div className="enrol-step-item">
                <div className="enrol-step-dot done" onClick={() => setEnrolStep(1)}>✓</div>
                <div className="enrol-step-label">Format</div>
              </div>
              <div className="enrol-step-line done"></div>
              <div className="enrol-step-item" style={{ display: enrolData.format === "live" || enrolData.format === "inperson" ? "flex" : "none" }}>
                <div className="enrol-step-dot done" onClick={() => setEnrolStep(2)}>✓</div>
                <div className="enrol-step-label">Schedule</div>
              </div>
              <div className="enrol-step-line done" style={{ display: enrolData.format === "live" || enrolData.format === "inperson" ? "block" : "none" }}></div>
              <div className="enrol-step-item">
                <div className="enrol-step-dot active">3</div>
                <div className="enrol-step-label active">Payment</div>
              </div>
            </div>
            <div className="enrol-body">
              <div className="enrol-summary-box">
                <div className="enrol-summary-row">
                  <span>{enrolData.name} ({enrolData.formatLabel})</span>
                  <span>₹{enrolData.basePrice.toLocaleString("en-IN")}</span>
                </div>
                {enrolData.promoApplied && (
                  <div className="enrol-summary-row discount">
                    <span>Discount applied</span>
                    <span>- ₹{enrolData.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="enrol-summary-row total">
                  <span>Total Payable</span>
                  <span>₹{enrolData.finalPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="enrol-promo-box">
                <input
                  type="text"
                  placeholder="Have a promo code?"
                  className="enrol-promo-input"
                  value={promoCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setPromoCode(val);
                    if (!val.trim()) {
                      setPromoOk({ text: "", color: "", show: false });
                      setEnrolData((prev: any) => ({
                        ...prev,
                        promoApplied: false,
                        finalPrice: prev.basePrice || 0,
                        discount: 0
                      }));
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !promoLoading && applyPromo()}
                  disabled={promoLoading}
                />
                <button id="promo-apply-btn" className={`enrol-promo-apply ${promoLoading ? 'loading' : ''}`} onClick={applyPromo} disabled={promoLoading}>
                  {promoLoading ? <span className="promo-spinner"></span> : 'Apply'}
                </button>
              </div>
              {promoOk.show && (
                <div className="enrol-promo-ok" style={{ display: "flex", color: promoOk.color }}>
                  {promoOk.text}
                </div>
              )}
              <div className="enrol-section-label">Pay with</div>
              <div className="enrol-pay-methods">
                {["UPI", "Card", "Net banking", "EMI"].map((m) => (
                  <button
                    key={m}
                    className={`enrol-pay-btn ${enrolData.payMethod === m ? "selected" : ""}`}
                    onClick={() => setEnrolData({ ...enrolData, payMethod: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="enrol-upi-field">
                {enrolData.payMethod === "UPI" && <>UPI ID: &nbsp;<strong>priya@okaxis</strong></>}
                {enrolData.payMethod === "Card" && <span style={{ color: "#4B5080" }}>Card ending in &nbsp;<strong>•••• 4242</strong> &nbsp;(Visa)</span>}
                {enrolData.payMethod === "Net banking" && <span style={{ color: "#4B5080" }}>Bank: &nbsp;<strong>HDFC Bank</strong></span>}
                {enrolData.payMethod === "EMI" && <span style={{ color: "#4B5080" }}>EMI: &nbsp;<strong>3 × ₹{Math.round((enrolData.finalPrice) / 3).toLocaleString("en-IN")}/month</strong> &nbsp;at 0% interest</span>}
              </div>
              <button className="enrol-cta coral" onClick={initiateEnrolPayment}>
                Pay ₹{(enrolData.finalPrice)?.toLocaleString("en-IN")} securely →
              </button>
              <div className="enrol-fine">🔒 Secured by Razorpay &nbsp;·&nbsp; 100% refund if class is cancelled</div>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {enrolStep === 4 && (
          <div>
            <div className="enrol-success">
              <div className="enrol-status-container">
                <div className="status-icon-box">
                  <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                </div>
                <div className="enrol-success-badge">Booking confirmed</div>
                <div className="enrol-success-title">You're enrolled!</div>
                <div className="enrol-success-sub">Your seat is reserved. A calendar invite and Zoom link have been sent to your email.</div>
              </div>
              <div className="enrol-confirm-card">
                <div className="enrol-confirm-row"><span className="enrol-confirm-label">Workshop</span><span className="enrol-confirm-val">{enrolData.name}</span></div>
                <div className="enrol-confirm-row">
                  <span className="enrol-confirm-label">Date & time</span>
                  <span className="enrol-confirm-val">{enrolData.date ? `${enrolData.date} · ${enrolData.time}` : 'To be scheduled'}</span>
                </div>
                <div className="enrol-confirm-row">
                  <span className="enrol-confirm-label">Format</span>
                  <span className="enrol-confirm-val">{enrolData.format === "live" ? "Live · Zoom" : enrolData.format === "recorded" ? "Recorded · Watch anytime" : "In-person · Venue confirmed"}</span>
                </div>
                <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: "#3730A3" }}>₹{(enrolData.finalPrice)?.toLocaleString("en-IN")}</span></div>
              </div>
              <div className="enrol-success-btns">
                <button className="enrol-success-btn primary" onClick={() => { closeEnrol(); router.push('/dashboard?view=upcoming'); }}>Go to dashboard →</button>
              </div>
            </div>
          </div>
        )}

        {enrolStep === 5 && (
          <div className="enrol-status-container" style={{ padding: '60px 24px' }}>
            <div className="status-icon-box">
              <div className="status-spinner"></div>
            </div>
            <div className="status-title">{promoOk.text || 'Processing Payment'}</div>
            <div className="status-desc">Please do not close this window or refresh the page while we secure your enrolment.</div>
          </div>
        )}

        {enrolStep === 6 && (
          <div className="enrol-status-container" style={{ padding: '50px 24px' }}>
            <div className="status-icon-box">
              <svg className="cross-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="cross-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="cross-line1" fill="none" strokeLinecap="round" strokeWidth="3" stroke="#EF4444" d="M16 16l20 20" />
                <path className="cross-line2" fill="none" strokeLinecap="round" strokeWidth="3" stroke="#EF4444" d="M36 16L16 36" />
              </svg>
            </div>
            <div className="status-title">Payment Cancelled or Failed</div>
            <div className="status-desc">{promoOk.text || 'The payment transaction could not be completed. Please check your connection and try again.'}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="status-btn" onClick={() => { setPromoOk({ text: '', color: '', show: false }); setEnrolStep(3); }}>Try Again</button>
              <button className="status-btn secondary" onClick={closeEnrol}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
