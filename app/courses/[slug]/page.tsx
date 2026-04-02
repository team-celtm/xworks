'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (error || !course) return (
    <div className="error-screen" style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1>{error || 'Course not found'}</h1>
      <button onClick={() => router.back()}>Go back</button>
    </div>
  );

  const priceStr = '₹' + course.price.toLocaleString('en-IN');

  return (
    <div className="detail-page" style={{ background: 'var(--surface-2)', minHeight: '100vh' }}>
      <nav className="nav" style={{ background: '#fff', borderBottom: '1px solid var(--border-md)' }}>
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
           <div className="nav-bars"><div className="nav-bar"></div><div className="nav-bar"></div></div>
           X<span>WORKS</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="nav-back" onClick={() => router.back()}>← Back</button>
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

              <div className="detail-stats" style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--border-md)', paddingTop: '24px' }}>
                <div className="dstat"><span>★ {course.rating}</span><label>Rating</label></div>
                <div className="dstat"><span>⏱ {course.dur} hrs</span><label>Duration</label></div>
                <div className="dstat"><span>{course.level}</span><label>Level</label></div>
                <div className="dstat"><span>{course.live ? '🔴 Live' : '📹 Recorded'}</span><label>Format</label></div>
              </div>
            </div>

            <div className="detail-section" style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>What you'll learn</h2>
              <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-md)', lineHeight: '1.6', color: 'var(--text-2)' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </div>
            </div>

            {sessions.length > 0 && (
              <div className="detail-section" style={{ marginBottom: '40px' }}>
                 <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Live Sessions</h2>
                 <div className="sessions-list" style={{ display: 'grid', gap: '12px' }}>
                    {sessions.map(s => (
                       <div key={s.id} style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.title}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{new Date(s.scheduledStart).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(s.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>{s.maxSeats - s.registeredCount} seats left</div>
                             <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>on {s.platform}</div>
                          </div>
                       </div>
                    ))}
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

                   <button style={{ width: '100%', padding: '18px', borderRadius: '16px', background: 'var(--indigo)', color: '#fff', border: 'none', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '16px' }}>Enrol now →</button>
                   <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>100% money-back guarantee</div>
                </div>
             </div>
          </div>
          
        </div>
      </main>

      <style jsx>{`
        .dstat { display: flex; flexDirection: column; }
        .dstat span { font-weight: 800; color: var(--ink); font-size: 16px; }
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
      `}</style>
    </div>
  );
}
