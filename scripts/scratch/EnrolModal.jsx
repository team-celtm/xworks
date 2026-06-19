      {enrolModalOpen && (
        <div className="enrol-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) closeEnrol(); }}>
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
                    <div className={`enrol-thumb ${enrolData.thumbBg as string}`}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={enrolData.thumbBg as string}></div>
                      <span style={{ position: "absolute", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px" }}>
                        {enrolData.thumbEmoji && ((enrolData.thumbEmoji as string).startsWith('http') || (enrolData.thumbEmoji as string).startsWith('/')) ? (
                          <>
                            <img 
                              src={enrolData.thumbEmoji as string} 
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
                          enrolData.thumbEmoji as string
                        )}
                      </span>
                    </div>
                    <div>
                      <div className="enrol-course-name">{enrolData.name as string}</div>
                      <div className="enrol-course-meta">{enrolData.meta as string}</div>
                    </div>
                  </div>
                  <div className="enrol-section-label">Choose your format</div>
                  <div className="enrol-format-grid">
                    {[
                      { id: "live", lbl: "Live session", icon: "🔴", sub: "Interactive · Q&A included", priceCalc: (b: number) => b },
                      { id: "recorded", lbl: "Recorded", icon: "📹", sub: "Watch anytime · Self-paced", priceCalc: (b: number) => Math.round(b * 0.8) },
                      { id: "inperson", lbl: "In-person", icon: "📍", sub: "Nearby · Limited seats", priceCalc: (b: number) => b + 500 }
                    ].map((f) => {
                      const calculatedPrice = f.priceCalc(enrolData.courseOriginalPrice || 0);
                      const isComingSoon = f.id === 'recorded' || f.id === 'inperson';
                      return (
                        <div
                          key={f.id}
                          className={`enrol-format-btn ${enrolData.format === f.id && !isComingSoon ? "selected" : ""} ${isComingSoon ? "disabled" : ""}`}
                          style={isComingSoon ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                          onClick={() => {
                            if (isComingSoon) return;
                            const labels: Record<string, string> = { live: 'live session', recorded: 'recorded access', inperson: 'in-person session' };
                            const original = enrolData.courseOriginalPrice || 0;
                            let newBasePrice = original;
                            if (f.id === 'recorded') {
                              newBasePrice = Math.round(original * 0.8);
                            } else if (f.id === 'inperson') {
                              newBasePrice = original + 500;
                            }
                            setEnrolData({
                              ...enrolData,
                              format: f.id,
                              formatLabel: labels[f.id] || f.id,
                              price: `₹${newBasePrice.toLocaleString("en-IN")}`,
                              basePrice: newBasePrice,
                              finalPrice: newBasePrice,
                              promoApplied: false,
                              discount: 0
                            });
                            setPromoCode("");
                            setPromoOk({ text: "", color: "", show: false });
                          }}
                        >
                          <div className="enrol-format-icon" style={isComingSoon ? { opacity: 0.6 } : {}}>{f.icon}</div>
                          <div className="enrol-format-name">{f.lbl} {isComingSoon && <span style={{ fontSize: '9px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Coming soon</span>}</div>
                          <div className="enrol-format-sub">{f.sub}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: isComingSoon ? 'var(--text-3)' : 'var(--indigo)' }}>₹{calculatedPrice.toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="enrol-divider"></div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", color: "#4B5080" }}>Price for <span>{enrolData.formatLabel as string}</span></div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, color: "#3730A3" }}>
                      {enrolData.price as string}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9294B8", marginBottom: "18px" }}>
                    Includes certificate · Lifetime recording access · Class notes PDF
                  </div>
                  <button className="enrol-cta" onClick={() => setEnrolStep(2)}>Continue to schedule →</button>
                </div>
              </div>
            )}

            {/* STEP 2: SCHEDULE */}
            {enrolStep === 2 && (
              <div>
                <div className="enrol-modal-hd">
                  <button className="enrol-back" onClick={() => setEnrolStep(1)}>← Back</button>
                  <div className="enrol-modal-title">Pick a date & time</div>
                  <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
                </div>
                <div className="enrol-stepper">
                  <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Format</div></div>
                  <div className="enrol-step-line done"></div>
                  <div className="enrol-step-item"><div className="enrol-step-dot active">2</div><div className="enrol-step-label active">Schedule</div></div>
                  <div className="enrol-step-line pending"></div>
                  <div className="enrol-step-item"><div className="enrol-step-dot pending">3</div><div className="enrol-step-label">Payment</div></div>
                </div>
                <div className="enrol-body">
                  <div className="enrol-section-label">Available Sessions</div>
                  <div className="enrol-date-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                    {modalSessions.length > 0 ? modalSessions.map((s) => {
                      const sDate = new Date(s.scheduledStart);
                      const day = sDate.toLocaleDateString('en-IN', { weekday: 'short' });
                      const num = sDate.getDate();
                      const month = sDate.toLocaleDateString('en-IN', { month: 'short' });
                      const fullStr = sDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                      const timeStr = sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      const isPast = sDate.getTime() < currentTime;
                      const isFull = s.maxSeats !== null && s.maxSeats !== undefined && s.maxSeats > 0 && (s.maxSeats - s.registeredCount <= 0);
                      const isDisabled = isFull || isPast;

                      return (
                        <div
                          key={s.id}
                          className={`enrol-date-btn ${enrolData.date === fullStr && enrolData.time === timeStr ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          onClick={() => !isDisabled && setEnrolData(prev => ({ ...prev, date: fullStr, time: timeStr, sessionId: s.id, scheduledStart: s.scheduledStart }))}
                          style={{ height: 'auto', padding: '12px 8px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
                        >
                          <div className="enrol-date-day">{day}</div>
                          <div className="enrol-date-num">{num} {month}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>{isPast ? 'Passed' : isFull ? 'Full' : timeStr}</div>
                        </div>
                      );
                    }) : (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-3)' }}>
                        No sessions scheduled yet. Check back soon!
                      </div>
                    )}
                  </div>

                  {enrolData.date && (
                    <div className="enrol-session-info" style={{ marginTop: '24px', padding: '12px', background: 'var(--surface-2)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-2)' }}>
                      Selected: <strong>{enrolData.date as string}</strong> at <strong>{enrolData.time as string}</strong>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>Joining details will be sent after payment.</div>
                    </div>
                  )}

                  {(() => {
                    const isSelectedExpired = !!(enrolData.scheduledStart && new Date(enrolData.scheduledStart as string).getTime() < currentTime);
                    return (
                      <button
                        className="enrol-cta"
                        onClick={() => setEnrolStep(3)}
                        disabled={!enrolData.date || isSelectedExpired}
                        style={{ marginTop: '24px', opacity: (!enrolData.date || isSelectedExpired) ? 0.5 : 1 }}
                      >
                        {isSelectedExpired ? 'Slot Expired' : 'Continue to payment →'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {enrolStep === 3 && (
              <div>
                <div className="enrol-modal-hd">
                  <button className="enrol-back" onClick={() => setEnrolStep(2)}>← Back</button>
                  <div className="enrol-modal-title">Payment</div>
                  <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
                </div>
                <div className="enrol-stepper">
                  <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Format</div></div>
                  <div className="enrol-step-line done"></div>
                  <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Schedule</div></div>
                  <div className="enrol-step-line done"></div>
                  <div className="enrol-step-item"><div className="enrol-step-dot active">3</div><div className="enrol-step-label active">Payment</div></div>
                </div>
                <div className="enrol-body">
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Workshop</span>
                    <span className="enrol-order-val">{enrolData.name as string}</span>
                  </div>
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Format</span>
                    <span className="enrol-order-val">₹{(enrolData.basePrice || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Platform fee</span>
                    <span className="enrol-order-val">₹0</span>
                  </div>
                  {enrolData.promoApplied && (
                    <div className="enrol-order-row promo-discount-row">
                      <span className="enrol-order-label" style={{ color: "#16A34A" }}>Promo discount</span>
                      <span className="enrol-order-val" style={{ color: "#16A34A" }}>−₹{(enrolData.discount as number)?.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="enrol-divider"></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span className="enrol-total">Total</span>
                    <span key={enrolData.finalPrice} className="enrol-total enrol-total-price-val">₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="enrol-promo-row">
                    <input
                      className="enrol-promo-input"
                      type="text"
                      placeholder="Promo code (try XWORKS20)"
                      value={promoCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPromoCode(val);
                        if (!val.trim()) {
                          setPromoOk({ text: "", color: "", show: false });
                          setEnrolData((prev: DashboardEnrolData) => ({
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
                    {enrolData.payMethod === "EMI" && <span style={{ color: "#4B5080" }}>EMI: &nbsp;<strong>3 × ₹{Math.round((enrolData.finalPrice as number) / 3).toLocaleString("en-IN")}/month</strong> &nbsp;at 0% interest</span>}
                  </div>
                  <button className="enrol-cta coral" onClick={initiateEnrolPayment}>
                    Pay ₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")} securely →
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
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Workshop</span><span className="enrol-confirm-val">{enrolData.name as string}</span></div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Date & time</span><span className="enrol-confirm-val">{enrolData.date as string} · {enrolData.time as string}</span></div>
                    <div className="enrol-confirm-row">
                      <span className="enrol-confirm-label">Format</span>
                      <span className="enrol-confirm-val">{enrolData.format === "live" ? "Live · Zoom" : enrolData.format === "recorded" ? "Recorded · Watch anytime" : "In-person · Venue confirmed"}</span>
                    </div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: "#3730A3" }}>₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")}</span></div>
                  </div>
                  <div className="enrol-success-btns">
                    <button className="enrol-success-btn" onClick={() => { closeEnrol(); setActiveView("upcoming"); }}>View in Upcoming →</button>
                    <button className="enrol-success-btn primary" onClick={() => { closeEnrol(); setActiveView("upcoming"); }}>Go to dashboard →</button>
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
                    <path className="cross-line1" fill="none" d="M16 16l20 20" />
                    <path className="cross-line2" fill="none" d="M36 16L16 36" />
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

            {enrolStep === 7 && (
              <div className="enrol-status-container" style={{ padding: '50px 24px' }}>
                <div className="status-icon-box">
                  <svg className="pending-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle className="pending-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="pending-dash" fill="none" strokeLinecap="round" strokeWidth="4" d="M26 14v20" />
                    <circle className="pending-dot" cx="26" cy="40" r="2" fill="#F59E0B" />
                  </svg>
                </div>
                <div className="status-title">Verification Pending</div>
                <div className="status-desc">We are verifying your transaction with the payment gateway. You can check your status in your dashboard shortly.</div>
                <button className="status-btn" onClick={closeEnrol}>Close & Check Dashboard</button>
              </div>
            )}
          </div>
        </div>
