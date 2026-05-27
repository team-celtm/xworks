'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import '../../catalogue/catalogue.css';
import Logo from '../../components/Logo';
import AlertModal from '../../components/AlertModal';
import { formatDuration } from '@/lib/utils';

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
  logo?: string;
  g: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  details?: string[];
  what_you_will_learn?: string;
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
  const [userLoading, setUserLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (course) {
      document.title = `XWORKS — ${course.name}`;
    }
  }, [course]);

  useEffect(() => {
    const fetchUser = async () => {
      setUserLoading(true);
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) { }
      finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, []);

  const [userEnrol, setUserEnrol] = useState<any>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/courses/${slug}`);
        if (!res.ok) throw new Error('Course not found');
        const data = await res.json();
        setCourse(data);

        // Fetch user enrolments if logged in
        const eres = await fetch('/api/learner/enrolments');
        if (eres.ok) {
          const edata = await eres.json();
          const match = edata.find((e: any) => e.course_id === data.id && e.enrolment_status === 'active');
          if (match) setUserEnrol(match);
        }

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
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
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
                router.push(`/dashboard?view=upcoming`);
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
          router.push(`/dashboard?view=upcoming`);
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
    <div className="catalogue-wrapper">
      <div className="detail-page">
        <nav className="nav">
          <Logo />
          {/* Mobile Toggle */}
          <button className="mob-menu-toggle" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}>
            {isMobileNavOpen ? '✕' : '☰'}
          </button>

          <div className={`nav-right ${isMobileNavOpen ? 'open' : ''}`}>
            <Link href="/catalogue" className="nav-link-sm" onClick={() => setIsMobileNavOpen(false)}>Explore</Link>
            {userLoading ? (
              <div className="btn-loader small" style={{ marginRight: '16px' }}></div>
            ) : user ? (
              <Link href={user?.role === 'admin' ? '/admin' : (user?.role === 'instructor' ? '/instructor' : '/dashboard')} className="nav-link-sm" onClick={() => setIsMobileNavOpen(false)}>Dashboard</Link>
            ) : (
              <>
                <Link href="/Login" className="nav-link-sm" onClick={() => setIsMobileNavOpen(false)}>Login</Link>
                <Link href="/Registration" className="nav-cta" onClick={() => setIsMobileNavOpen(false)}>Sign up</Link>
              </>
            )}
            <button className="nav-back" onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push('/catalogue');
            }}>← Back</button>
          </div>
        </nav>

        <main className="detail-main">
          <div className="detail-grid">

            <div className="detail-left">
              <div className="crumb">
                <Link href="/catalogue">Workshops</Link>
                <span className="crumb-sep">/</span>
                <Link href={`/catalogue?cat=${course.categorySlug}`}>{course.categoryName}</Link>
                <span className="crumb-sep">/</span>
                <span className="crumb-current">{course.name}</span>
              </div>

              <div className="detail-hero-card">
                <div className="detail-hero-header">
                  <div className={`detail-emoji-box ${course.g}`} style={{ width: '80px', height: '80px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    {course.logo ? (
                      <>
                        <img
                          src={course.logo}
                          alt=""
                          style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        <span style={{ display: 'none' }}>{course.emoji}</span>
                      </>
                    ) : (
                      course.emoji
                    )}
                  </div>
                  <div>
                    <div className="hero-badge-wrap">
                      {course.live && (
                        <span className="live-pulse-badge">
                          <span className="pulse-dot"></span>Live Workshop
                        </span>
                      )}
                      <span className="category-tag">{course.tagLabel || course.categoryName}</span>
                    </div>
                    <h1 className="detail-hero-title">{course.name}</h1>
                  </div>
                </div>

                <div className="detail-stats">
                  <div className="dstat-card">
                    <span className="dstat-icon">★</span>
                    <div className="dstat-content">
                      <span className="dstat-value">{course.rating}</span>
                      <span className="dstat-label">Rating</span>
                    </div>
                  </div>
                  <div className="dstat-card">
                    <span className="dstat-icon">⏱</span>
                    <div className="dstat-content">
                      <span className="dstat-value">{formatDuration(course.dur)}</span>
                      <span className="dstat-label">Duration</span>
                    </div>
                  </div>
                  <div className="dstat-card">
                    <span className="dstat-icon">📊</span>
                    <div className="dstat-content">
                      <span className="dstat-value">{course.level}</span>
                      <span className="dstat-label">Level</span>
                    </div>
                  </div>
                  <div className="dstat-card">
                    <span className="dstat-icon">📺</span>
                    <div className="dstat-content">
                      <span className="dstat-value">Live session</span>
                      <span className="dstat-label">Format</span>
                    </div>
                  </div>
                </div>
              </div>

              {course.what_you_will_learn && (
                <div className="detail-section" style={{ marginBottom: '40px' }}>
                  <h2>What you'll learn</h2>
                  <div className="learn-card" style={{ whiteSpace: 'pre-wrap' }}>
                    {course.what_you_will_learn}
                  </div>
                </div>
              )}

              {sessions.length > 0 && (
                <div className="detail-section" style={{ marginBottom: '40px' }}>
                  <h2>Live Sessions</h2>
                  <div className="sessions-list">
                    {sessions.map(s => {
                      const isSelected = selectedSessionId === s.id;
                      const full = s.maxSeats !== null && s.maxSeats !== undefined && s.maxSeats > 0 && (s.maxSeats - s.registeredCount <= 0);
                      return (
                        <div key={s.id}
                          onClick={() => !full && setSelectedSessionId(s.id)}
                          className={`session-item ${isSelected ? 'selected' : ''} ${full ? 'full' : ''}`}
                        >
                          <div>
                            <div className="session-title">{s.title}</div>
                            <div className="session-time">
                              ⏱ {new Date(s.scheduledStart).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(s.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="session-right">
                            <div className={`session-status ${full ? 'status-soldout' : 'status-available'}`}>
                              {!full && <span className="pulse-dot"></span>}
                              {full ? 'Sold out' : s.maxSeats ? `${s.maxSeats - s.registeredCount} seats left` : 'Seats available'}
                            </div>
                            <div className="session-platform">on {s.platform}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="detail-section" style={{ marginBottom: '40px' }}>
                <h2>About the Instructor</h2>
                <div className="instructor-card">
                  <div className="instructor-avatar-wrap">
                    {course.instructorAvatar && !avatarFailed ? (
                      <img
                        src={course.instructorAvatar}
                        alt={course.instructor}
                        onError={() => setAvatarFailed(true)}
                        className="instructor-avatar-img"
                      />
                    ) : (
                      <div className="instructor-avatar-fallback">
                        {course.instructor ? course.instructor.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'IN'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="instructor-name">{course.instructor}</div>
                    <div className="instructor-subtitle">Platform Educator · 4.9★ Average</div>
                    <div className="instructor-bio">{course.instructorBio || 'An experienced industry professional dedicated to sharing knowledge and helping the next generation of learners succeed in their career journey.'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-right">
              <div className="sticky-container">
                <div className="price-card">
                  <div className="price-val">{priceStr}</div>

                  {course.details && course.details.length > 0 && (
                    <ul className="feature-list">
                      {course.details.map((t: string) => (
                        <li key={t} className="feature-item">
                          <svg className="svg-check" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {userEnrol ? (
                    <button
                      className="enrol-cta-btn continue-state"
                      onClick={() => {
                        router.push('/dashboard?view=upcoming');
                      }}
                    >
                      View Schedule →
                    </button>
                  ) : (
                    <>
                      <button
                        className={`enrol-cta-btn ${success ? 'success-state' : ''}`}
                        onClick={handleEnrol}
                        disabled={enrolling || success}
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
                        <div className="error-msg">
                          {error}
                        </div>
                      )}
                      <div className="guarantee-text">100% money-back guarantee</div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>

        <style jsx>{`
          .detail-page {
            background-color: #fbfcff;
            background-image: 
              radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.04) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, rgba(251, 146, 60, 0.05) 0%, transparent 50%);
            background-attachment: fixed;
            min-height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .detail-main {
            max-width: 1100px;
            margin: 40px auto;
            padding: 0 24px;
          }

          .detail-hero-card {
            background: #fff;
            border-radius: 24px;
            padding: 40px;
            border: 1px solid var(--border-md);
            margin-bottom: 32px;
          }

          .detail-hero-header {
            display: flex;
            gap: 24px;
            align-items: center;
            margin-bottom: 24px;
          }

          .sessions-list {
            display: grid;
            gap: 12px;
          }

          .session-right {
            text-align: right;
          }

          .instructor-name {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .instructor-subtitle {
            font-size: 13px;
            color: var(--indigo);
            font-weight: 600;
            margin-bottom: 12px;
          }

          .instructor-bio {
            font-size: 14px;
            line-height: 1.5;
            color: var(--text-2);
          }

          .sticky-container {
            position: sticky;
            top: 24px;
          }

          .error-msg {
            color: #EF4444;
            font-size: 13px;
            text-align: center;
            margin-bottom: 16px;
            font-weight: 500;
            margin-top: 16px;
          }

          .guarantee-text {
            text-align: center;
            font-size: 12px;
            color: var(--text-3);
            margin-top: 16px;
          }

          .detail-grid { display: grid; grid-template-columns: 1fr 380px; gap: 40px; }
          @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; gap: 32px; } }

          /* Breadcrumbs */
          .crumb {
            font-family: var(--font-body);
            font-size: 13px;
            color: var(--text-3);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }
          .crumb a {
            color: var(--text-2);
            text-decoration: none;
            transition: color 0.15s ease;
          }
          .crumb a:hover {
            color: var(--indigo-mid);
          }
          .crumb-sep {
            color: var(--text-3);
            opacity: 0.6;
          }
          .crumb-current {
            color: var(--indigo);
            font-weight: 600;
          }

          /* Hero Badge pulse */
          .hero-badge-wrap {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }
          .live-pulse-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #DCFCE7;
            color: #15803D;
            padding: 5px 12px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.08);
          }
          .pulse-dot {
            width: 7px;
            height: 7px;
            background-color: #16A34A;
            border-radius: 50%;
            display: inline-block;
            position: relative;
          }
          .pulse-dot::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: inherit;
            animation: pulse 1.6s ease-in-out infinite;
            opacity: 0.8;
            top: 0;
            left: 0;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.8); opacity: 0; }
          }
          .category-tag {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--indigo-mid);
            background: var(--indigo-light);
            padding: 5px 12px;
            border-radius: 100px;
          }

          /* Hero Title */
          .detail-hero-title {
            font-size: clamp(28px, 4.5vw, 38px);
            font-family: var(--font-display);
            font-weight: 800;
            color: var(--ink);
            line-height: 1.2;
            letter-spacing: -0.8px;
            margin: 0;
          }

          /* Stats Section */
          .detail-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 16px;
            border-top: 1px solid rgba(55, 48, 163, 0.08);
            padding-top: 24px;
            margin-top: 8px;
          }
          .dstat-card {
            background: #fff;
            border: 1px solid rgba(55, 48, 163, 0.06);
            border-radius: 16px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
          }
          .dstat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(55, 48, 163, 0.04);
            border-color: rgba(55, 48, 163, 0.12);
          }
          .dstat-icon {
            font-size: 20px;
            width: 36px;
            height: 36px;
            border-radius: 12px;
            background: var(--indigo-light);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--indigo);
            flex-shrink: 0;
          }
          .dstat-content {
            display: flex;
            flex-direction: column;
          }
          .dstat-value {
            font-size: 15px;
            font-weight: 700;
            color: var(--ink);
            line-height: 1.2;
          }
          .dstat-label {
            font-size: 11px;
            color: var(--text-3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }

          /* What You'll Learn Card */
          .learn-card {
            background: #fff;
            border: 1px solid rgba(55, 48, 163, 0.08);
            border-left: 4px solid var(--coral);
            border-radius: 20px;
            padding: 24px 28px;
            line-height: 1.7;
            color: var(--text-2);
            font-size: 15px;
            box-shadow: 0 4px 20px rgba(55, 48, 163, 0.01);
          }
          .detail-section h2 {
            font-family: var(--font-display);
            font-size: 20px;
            font-weight: 700;
            color: var(--ink);
            margin-bottom: 16px;
          }

          /* Session Item styling */
          .session-item {
            background: #fff;
            padding: 18px 24px;
            border-radius: 16px;
            border: 1px solid rgba(55, 48, 163, 0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(55, 48, 163, 0.01);
          }
          .session-item:hover:not(.full) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(55, 48, 163, 0.05);
            border-color: rgba(79, 70, 229, 0.3);
          }
          .session-item.selected {
            background: linear-gradient(135deg, #F5F7FF, #EEF2FF);
            border-color: var(--indigo-mid);
            box-shadow: 0 8px 24px rgba(79, 70, 229, 0.08);
          }
          .session-item.full {
            cursor: not-allowed;
            opacity: 0.65;
            background: #FAFAFB;
          }
          .session-title {
            font-weight: 700;
            color: var(--ink);
            font-size: 15px;
            margin-bottom: 4px;
          }
          .session-time {
            font-size: 13px;
            color: var(--text-3);
          }
          .session-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 100px;
          }
          .status-available {
            background: #DCFCE7;
            color: #16A34A;
          }
          .status-soldout {
            background: #FEE2E2;
            color: #EF4444;
          }
          .session-platform {
            font-size: 11px;
            color: var(--text-3);
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }

          /* Instructor Card */
          .instructor-card {
            background: #fff;
            border: 1px solid rgba(55, 48, 163, 0.08);
            border-radius: 24px;
            padding: 32px;
            display: flex;
            gap: 24px;
            box-shadow: 0 4px 20px rgba(55, 48, 163, 0.01);
          }
          @media (max-width: 600px) {
            .instructor-card {
              flex-direction: column;
              align-items: center;
              text-align: center;
              padding: 24px;
              gap: 16px;
            }
          }
          .instructor-avatar-wrap {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08);
            border: 2px solid #fff;
            background: var(--surface-2);
            flex-shrink: 0;
          }
          .instructor-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .instructor-avatar-fallback {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--indigo), var(--indigo-mid));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 700;
            font-family: var(--font-display);
            letter-spacing: -0.5px;
          }

          /* Price & Sidebar card */
          .price-card {
            background: #fff;
            border: 1px solid rgba(55, 48, 163, 0.08);
            border-radius: 24px;
            padding: 36px 32px;
            box-shadow: 0 20px 40px rgba(79, 70, 229, 0.03);
            transition: all 0.3s ease;
          }
          .price-card:hover {
            box-shadow: 0 24px 48px rgba(79, 70, 229, 0.06);
          }
          .price-val {
            font-size: 34px;
            font-weight: 800;
            font-family: var(--font-display);
            color: var(--ink);
            margin-bottom: 24px;
            letter-spacing: -1px;
            line-height: 1;
          }
          .feature-list {
            padding: 0;
            list-style: none;
            margin: 0 0 32px 0;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: var(--text-2);
            font-weight: 500;
          }
          .svg-check {
            color: #10B981;
            background: #E6FDF4;
            padding: 3px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .enrol-cta-btn {
            width: 100%;
            padding: 18px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--indigo-mid), var(--indigo));
            color: #fff;
            border: none;
            font-size: 16px;
            font-weight: 700;
            font-family: var(--font-display);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.2);
          }
          .enrol-cta-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
            background: linear-gradient(135deg, #5b53e8, #3730A3);
          }
          .enrol-cta-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          .enrol-cta-btn:disabled {
            opacity: 0.8;
            cursor: not-allowed;
            box-shadow: none;
          }
          .enrol-cta-btn.success-state {
            background: #10B981;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
          }
          .enrol-cta-btn.continue-state {
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.2);
          }

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

          .detail-emoji-box.t-amber { background: linear-gradient(135deg, #F0C97A, #E8900A); border: 1px solid #E8900A; color: #fff; }
          .detail-emoji-box.t-blue { background: linear-gradient(135deg, #94B8F0, #1A4DB8); border: 1px solid #1A4DB8; color: #fff; }
          .detail-emoji-box.t-teal { background: linear-gradient(135deg, #7DD4CC, #0E8C85); border: 1px solid #0E8C85; color: #fff; }
          .detail-emoji-box.t-purple { background: linear-gradient(135deg, #C4A8F0, #6B35CC); border: 1px solid #6B35CC; color: #fff; }
          .detail-emoji-box.t-red { background: linear-gradient(135deg, #F0908A, #CC2A22); border: 1px solid #CC2A22; color: #fff; }
          .detail-emoji-box.t-pink { background: linear-gradient(135deg, #F0A0CC, #CC2070); border: 1px solid #CC2070; color: #fff; }
          .detail-emoji-box.t-green { background: linear-gradient(135deg, #90D4A0, #1A8C34); border: 1px solid #1A8C34; color: #fff; }
          .detail-emoji-box.t-slate { background: linear-gradient(135deg, #A8B8CC, #3A5070); border: 1px solid #3A5070; color: #fff; }

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

          @media (max-width: 768px) {
            .detail-main {
              margin: 20px auto;
              padding: 0 16px;
            }
            .detail-hero-card {
              padding: 24px;
              margin-bottom: 24px;
            }
            .detail-hero-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            .price-card {
              padding: 24px 20px;
            }
            .learn-card {
              padding: 20px;
            }
            .instructor-card {
              padding: 24px;
              gap: 16px;
            }
          }

          @media (max-width: 600px) {
            .session-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
            }
            .session-right {
              text-align: left !important;
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
          }

          @media (max-width: 480px) {
            .detail-main {
              padding: 0 12px;
            }
            .detail-hero-card {
              padding: 20px 16px;
              border-radius: 16px;
            }
            .price-card {
              padding: 20px 16px;
              border-radius: 16px;
            }
            .learn-card {
              padding: 16px;
              border-radius: 16px;
            }
            .instructor-card {
              padding: 20px 16px;
              border-radius: 16px;
            }
            .session-item {
              padding: 14px 16px;
              border-radius: 12px;
            }
          }
        `}</style>
      </div>
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Access Restricted"
        message="Administrators and Instructors are not allowed to enrol in or make payments for courses."
      />
    </div>
  );
}
