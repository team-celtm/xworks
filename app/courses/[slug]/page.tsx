'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import '../../catalogue/catalogue.css';
import Logo from '../../components/Logo';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CourseDetail {
  id: string;
  name: string;
  level: string;
  dur: number;
  price: number;
  rating: number;
  tag: string;
  tagLabel: string;
  live: boolean;
  nearby: boolean;
  distance: string;
  emoji: string;
  g: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  instructor: string;
  instructorAvatar: string;
  instructorBio: string;
}

interface LiveSession {
  id: string;
  title: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  platform: string;
  maxSeats: number;
  registeredCount: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {}
    };
    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/courses/${slug}`);
        if (!res.ok) throw new Error('Course not found');
        const data = await res.json();
        setCourse(data);

        // Fetch sessions if it's a live course
        const sres = await fetch(`/api/courses/id/${data.id}/sessions`);
        if (sres.ok) {
           const sdata = await sres.json();
           setSessions(sdata);
           if (sdata.length > 0) {
              setSelectedSessionId(sdata[0].id);
           }
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchDetail();
  }, [slug]);

  if (loading) return (
    <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  const handleEnrol = async () => {
    if (!course) return;
    if (course.live && !selectedSessionId && sessions.length > 0) {
       setError('Please select a live session first.');
       return;
    }
    setEnrolling(true);
    setError(null);

    try {
      const res = await fetch('/api/learner/enrolments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, sessionId: selectedSessionId })
      });

      if (res.status === 401) {
        router.push(`/Login?returnUrl=/courses/${slug}`);
        return;
      }

      const data = await res.json();

      if (res.status === 402) {
        // Paid course - Intiate Razorpay
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: course.id, sessionId: selectedSessionId })
        });
        
        if (!orderRes.ok) throw new Error('Could not create payment order');
        const orderData = await orderRes.json();

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'XWORKS',
          description: `Enrolment for ${orderData.courseName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            setEnrolling(true);
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: course.id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccess(true);
              setTimeout(() => {
                if (course.live) {
                  router.push(`/dashboard?view=upcoming`);
                } else {
                  router.push(`/player/${verifyData.enrolmentId}`);
                }
              }, 1000);
            } else {
              setError(verifyData.error || 'Payment verification failed');
              setEnrolling(false);
            }
          },
          prefill: {
            name: '', // Optional: populate if you have user info
            email: '',
          },
          theme: { color: '#4F46E5' }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setEnrolling(false);
        return;
      }

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          if (course.live) {
            router.push(`/dashboard?view=upcoming`);
          } else {
            router.push(`/player/${data.enrolmentId}`);
          }
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to enrol');
      }
    } catch (err: any) {
      setError(err.message);
      setEnrolling(false);
    }
  };

  if (loading) return (
    <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  if (!course) return (
    <div className="error-screen" style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1>{error || 'Course not found'}</h1>
      <button onClick={() => router.back()}>Go back</button>
    </div>
  );

  const priceStr = course.price === 0 ? 'FREE' : '₹' + course.price.toLocaleString('en-IN');

  return (
    <div className="detail-page" style={{ background: 'var(--surface-2)', minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
           <Logo fontSize="22px" />
        </Link>
        <div className="nav-right">
          <Link href="/catalogue" className="nav-link-sm">Explore</Link>
          {user ? (
            <Link href="/dashboard" className="nav-link-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/Login" className="nav-link-sm">Login</Link>
              <Link href="/Registration" className="nav-cta">Sign up</Link>
            </>
          )}
          <button className="nav-back" onClick={() => router.back()}>← Back</button>
        </div>
      </nav>

      <main className="detail-main" style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px' }}>
          
          <div className="detail-left">
            <div className="crumb" style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
              Workshops / <Link href={`/catalogue?cat=${course.categorySlug}`} style={{ color: 'var(--indigo)', textDecoration: 'none' }}>{course.categoryName}</Link> / {course.name}
            </div>

            <div className="detail-hero-card" style={{ background: '#fff', borderRadius: '24px', padding: '40px', border: '1px solid var(--border-md)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>
                <div className={`detail-emoji-box ${course.g}`} style={{ width: '80px', height: '80px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                   {course.emoji}
                </div>
                <div>
                   <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '4px' }}>{course.tagLabel}</div>
                   <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--ink)' }}>{course.name}</h1>
                </div>
              </div>

              <div className="detail-stats" style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--border-md)', paddingTop: '24px', flexWrap: 'wrap' }}>
                <div className="dstat"><span>★ {course.rating}</span><label>Rating</label></div>
                <div className="dstat"><span>⏱ {course.dur} hrs</span><label>Duration</label></div>
                <div className="dstat"><span>📊 {course.level}</span><label>Level</label></div>
                <div className="dstat"><span>📺 {course.live ? 'Live' : 'Recorded'}</span><label>Format</label></div>
              </div>
            </div>

            <div className="detail-section" style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>What you'll learn</h2>
              <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-md)', lineHeight: '1.6', color: 'var(--text-2)' }}>
                Master the intersection of financial markets and artificial intelligence. In this comprehensive session, we cover quantitative trading strategies using Python, risk management with neural networks, and the implementation of automated trading bots using real-time market APIs.
              </div>
            </div>

            {sessions.length > 0 && (
              <div className="detail-section" style={{ marginBottom: '40px' }}>
                 <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Live Sessions</h2>
                 <div className="sessions-list" style={{ display: 'grid', gap: '12px' }}>
                    {sessions.map(s => {
                       const isSelected = selectedSessionId === s.id;
                       const full = s.maxSeats - s.registeredCount <= 0;
                       return (
                       <div key={s.id} 
                            onClick={() => !full && setSelectedSessionId(s.id)}
                            style={{ 
                              background: isSelected ? 'var(--indigo-light)' : '#fff', 
                              padding: '16px 20px', borderRadius: '16px', 
                              border: `1px solid ${isSelected ? 'var(--indigo-mid)' : 'var(--border-md)'}`, 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              cursor: full ? 'not-allowed' : 'pointer',
                              opacity: full ? 0.6 : 1
                            }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.title}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{new Date(s.scheduledStart).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(s.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '12px', fontWeight: 600, color: full ? '#EF4444' : '#16A34A' }}>{full ? 'Sold out' : `${s.maxSeats - s.registeredCount} seats left`}</div>
                             <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>on {s.platform}</div>
                          </div>
                       </div>
                       );
                    })}
                 </div>
              </div>
            )}

            <div className="detail-section">
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>About the Instructor</h2>
              <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-md)', display: 'flex', gap: '24px' }}>
                 <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)' }}>
                    {course.instructorAvatar ? <img src={course.instructorAvatar} alt={course.instructor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--indigo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{course.instructor[0]}</div>}
                 </div>
                 <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{course.instructor}</div>
                    <div style={{ fontSize: '13px', color: 'var(--indigo)', fontWeight: 600, marginBottom: '12px' }}>Platform Educator · 4.9★ Average</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-2)' }}>{course.instructorBio || 'An experienced industry professional dedicated to sharing knowledge and helping the next generation of learners succeed in their career journey.'}</div>
                 </div>
              </div>
            </div>
          </div>

          <div className="detail-right">
             <div style={{ position: 'sticky', top: '24px' }}>
                <div className="price-card" style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-md)', boxShadow: '0 20px 40px rgba(79,70,229,0.06)' }}>
                   <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: '24px' }}>{priceStr}</div>
                   
                   <ul style={{ padding: 0, listStyle: 'none', marginBottom: '32px' }}>
                      {['Lifetime access to recordings', 'Certificate of completion', 'Q&A session with instructor', 'Class notes & resources PDF'].map(t => (
                        <li key={t} style={{ display: 'flex', gap: '10px', fontSize: '14px', marginBottom: '12px', color: 'var(--text-2)' }}>
                           <span style={{ color: '#16A34A' }}>✓</span> {t}
                        </li>
                      ))}
                   </ul>

                   <button 
                     onClick={handleEnrol}
                     disabled={enrolling || success}
                     style={{ 
                       width: '100%', 
                       padding: '18px', 
                       borderRadius: '16px', 
                       background: success ? '#16A34A' : 'var(--indigo)', 
                       color: '#fff', 
                       border: 'none', 
                       fontSize: '16px', 
                       fontWeight: 700, 
                       cursor: (enrolling || success) ? 'default' : 'pointer', 
                       marginBottom: '16px',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '10px',
                       opacity: enrolling ? 0.8 : 1
                     }}
                   >
                     {enrolling ? (
                       <div className="btn-loader"></div>
                     ) : success ? (
                       '✓ Enrolled Successfully'
                     ) : (
                       'Enrol now →'
                     )}
                   </button>
                   {error && !loading && (
                     <div style={{ color: '#EF4444', fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: 500 }}>
                       {error}
                     </div>
                   )}
                   <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>100% money-back guarantee</div>
                </div>
             </div>
          </div>
          
        </div>
      </main>

      <style jsx>{`
        .dstat { display: flex; flex-direction: column; min-width: 100px; }
        .dstat span { font-weight: 800; color: var(--ink); font-size: 16px; white-space: nowrap; }
        .dstat label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .detail-emoji-box.ct-ai { background: linear-gradient(135deg,#fff,#E8F4FF); border: 1px solid #D0E8FF; }
        .detail-emoji-box.ct-py { background: linear-gradient(135deg,#fff,#F0F9FF); border: 1px solid #E0F2FE; }
        .detail-emoji-box.ct-da { background: linear-gradient(135deg,#fff,#FDF2F8); border: 1px solid #FBCFE8; }
        .detail-emoji-box.ct-de { background: linear-gradient(135deg,#fff,#FFF7ED); border: 1px solid #FFEDD5; }
        .detail-emoji-box.ct-ph { background: linear-gradient(135deg,#fff,#F5F3FF); border: 1px solid #DDD6FE; }
        .detail-emoji-box.ct-we { background: linear-gradient(135deg,#fff,#ECFDF5); border: 1px solid #D1FAE5; }
        .detail-emoji-box.ct-mu { background: linear-gradient(135deg,#fff,#FFFBEB); border: 1px solid #FEF3C7; }
        .detail-emoji-box.ct-bu { background: linear-gradient(135deg,#fff,#F0FDFA); border: 1px solid #CCFBF1; }
        .detail-emoji-box.ct-mi { background: linear-gradient(135deg,#fff,#FAF5FF); border: 1px solid #F3E8FF; }
        .detail-emoji-box.ct-cy { background: linear-gradient(135deg,#fff,#F8FAFC); border: 1px solid #E2E8F0; }

        .btn-loader {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
