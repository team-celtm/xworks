"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import "../dashboard/dashboard.css";
import RoleTransitionOverlay from "../components/RoleTransitionOverlay";

export default function InstructorDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("inst_courses");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Application Form States
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [earnings, setEarnings] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_courses: 0, pending_payout: 0 });
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  useEffect(() => {
    fetch('/api/instructor/sessions')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSessions(data);
      })
      .catch(console.error);
  }, []);

  const handleToggleRecording = async (sessionId: string, currentAvailable: boolean) => {
    let recordingUrl = null;
    if (!currentAvailable) {
      recordingUrl = prompt("Enter the recording URL for learners:");
      if (!recordingUrl) return;
    }

    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/recording`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingUrl, available: !currentAvailable })
      });
      if (res.ok) {
        alert("Recording status updated!");
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, recordingAvailable: !currentAvailable } : s));
      }
    } catch (e) {
      alert("Error updating recording status");
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this live session? All registrants will be notified immediately and refunded if eligible.")) return;

    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/cancel`, {
        method: 'PUT'
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Session cancelled! Notified ${result.registrantsNotified} registrants.`);
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, sessionStatus: 'cancelled' } : s));
      } else {
        alert("Failed to cancel: " + result.error);
      }
    } catch (e) {
      alert("Error cancelling session");
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'instructor') return;
    if (activeView === 'inst_courses') {
      fetch('/api/teach/courses').then(r=>r.json()).then(d => {
        if (Array.isArray(d)) setCourses(d);
      });
      fetch('/api/categories').then(r => r.json()).then(d => setAllCategories(d || []));
    }
  }, [activeView, user]);

  useEffect(() => {
    const fetchUserAndStatus = async () => {
      try {
        const [res, statRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/instructor/status")
        ]);

        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'instructor') {
            router.push(data.role === 'admin' ? '/admin' : '/dashboard'); 
            return; // Don't set loading to false, let the redirect happen
          }
          setUser(data);

          if (statRes.ok) {
            const statData = await statRes.json();
            setAppStatus(statData.application_status);
          }
          setLoading(false); // Only set loading to false if user is an instructor
        } else {
          router.push('/Login');
        }
      } catch (err) {
        router.push('/Login');
      }
    };
    fetchUserAndStatus();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const submitApplication = async () => {
    if (!bio || !linkedin) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/instructor/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, linkedin_url: linkedin })
      });
      if (res.ok) {
        setAppStatus('pending');
      }
    } catch(err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <RoleTransitionOverlay role="instructor" type="login" />;
  if (!user || user.role !== 'instructor') return null;

  if (appStatus === 'none') {
    return (
      <div className="shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'var(--surface)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-md)' }}>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '16px', letterSpacing: '-1px' }}>Apply to Teach</h1>
          <p style={{ color: 'var(--text-3)', marginBottom: '32px' }}>Complete your profile to unlock the Creator Studio and start publishing courses to 5,000+ learners.</p>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Bio / Experience</label>
            <textarea className="inp" style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} placeholder="What makes you an expert?..." value={bio} onChange={e=>setBio(e.target.value)}></textarea>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>LinkedIn URL</label>
            <input type="url" className="inp" style={{ width: '100%' }} placeholder="https://linkedin.com/in/..." value={linkedin} onChange={e=>setLinkedin(e.target.value)} />
          </div>

          <button className="enrol-cta coral" style={{ width: '100%' }} onClick={submitApplication} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application →'}
          </button>
        </div>
      </div>
    );
  }

  if (appStatus === 'pending') {
    return (
      <div className="shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'var(--surface)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏳</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '16px', letterSpacing: '-1px' }}>Application Pending Review</h1>
          <p style={{ color: 'var(--text-3)' }}>The platform administrators are currently reviewing your application. You will gain full access to the Creator Studio once approved.</p>
          <button className="prompt-input" style={{ marginTop: '32px', border: '1px solid var(--border-md)', background: 'transparent' }} onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    );
  }

  if (appStatus === 'rejected') {
    return (
      <div className="shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'var(--surface)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>❌</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '16px', letterSpacing: '-1px' }}>Application Rejected</h1>
          <p style={{ color: 'var(--text-3)' }}>Unfortunately, your application to teach has been rejected by the platform administrators. If you believe this is an error, please contact support.</p>
          <button className="prompt-input" style={{ marginTop: '32px', border: '1px solid var(--border-md)', background: 'transparent' }} onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`shell ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {isLoggingOut && <RoleTransitionOverlay role="instructor" type="logout" />}
      {/* ══════════════════════════
           INSTRUCTOR SIDEBAR (Left)
       ══════════════════════════ */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sb-mobile-hd">
          <button className="sb-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <Link href="/" className="sb-logo" style={{ textDecoration: 'none' }}>
            <div className="sb-logo-bars">
              <div className="sb-logo-bar"></div>
              <div className="sb-logo-bar"></div>
            </div>
            <span className="sb-logo-name">X<span className="works-text">WORKS</span></span>
          </Link>
          <div className="sb-user">
            <div className="sb-avatar">
              {user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() : "..."}
            </div>
            <div className="sb-user-info-mob">
              <div className="sb-user-name">{user ? `${user.firstName} ${user.lastName}` : "Loading..."}</div>
              <div className="sb-user-tag">Instructor Portal</div>
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Creator Studio</div>
          <button className={`sb-item ${activeView === "inst_courses" ? "active" : ""}`} onClick={() => { setActiveView("inst_courses"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🎬</span>
            <span className="sb-item-label">My Courses</span>
          </button>
          
          <button className={`sb-item ${activeView === "inst_sessions" ? "active" : ""}`} onClick={() => { setActiveView("inst_sessions"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📅</span>
            <span className="sb-item-label">Live Sessions</span>
          </button>
          
          <button className={`sb-item ${activeView === "inst_earnings" ? "active" : ""}`} onClick={() => { setActiveView("inst_earnings"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">💰</span>
            <span className="sb-item-label">Earnings & Payouts</span>
          </button>

        </nav>

        <div className="sb-footer">
          <button className="sb-logout" onClick={handleLogout}>
            <span className="sb-logout-icon">🚪</span>
            <span className="sb-logout-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════
           INSTRUCTOR MAIN AREA
      ══════════════════════════ */}
      <div className="main" style={{ background: "var(--bg)" }}>
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-greeting">
            Welcome back to the Studio, {user.firstName || 'Instructor'}! 🚀 Let&apos;s inspire learners today.
          </div>
          <div className="topbar-right">
            <div className="topbar-notif">🔔<div className="notif-dot"></div></div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {activeView === "inst_courses" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Creator Studio</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Course Management
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Upload a new course as a draft.</p>
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    setIsCreatingCourse(true);
                    const formData = new FormData(e.currentTarget);
                    const dur_h = Number(formData.get('dur_h')) || 0;
                    const dur_m = Number(formData.get('dur_m')) || 0;
                    const dur_s = Number(formData.get('dur_s')) || 0;
                    const totalSecs = dur_h * 3600 + dur_m * 60 + dur_s;
                    const format = formData.get('format');
                    const live = format === 'live';
                    const nearby = format === 'inperson';
                    try {
                      const res = await fetch('/api/teach/courses', { 
                        method: 'POST', 
                        headers: {'Content-Type':'application/json'}, 
                        body: JSON.stringify({ 
                          name: formData.get('name'), category_id: formData.get('category_id'), 
                          dur: totalSecs, price: formData.get('price'),
                          live, nearby,
                          slug: formData.get('name')?.toString().toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7)
                        }) 
                      }); 
                      if (res.ok) {
                        const newCourse = await res.json();
                        setCourses(prev => [...prev, newCourse]);
                        alert('Course Draft Saved!');
                        e.currentTarget.reset();
                      }
                    } finally {
                      setIsCreatingCourse(false);
                    }
                  }} 
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Course Name</label>
                    <input name="name" type="text" className="prompt-input" required placeholder="e.g. Advanced Ethical Hacking" disabled={isCreatingCourse} style={{ width: '100%' }} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Course Category</label>
                       <select name="category_id" className="prompt-input" required disabled={isCreatingCourse} style={{ width: '100%', height: '46px' }}>
                         <option value="">Select Category</option>
                         {allCategories.map(cat => (
                           <option key={cat.id} value={cat.id}>{cat.name}</option>
                         ))}
                       </select>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Format</label>
                       <select name="format" className="prompt-input" required disabled={isCreatingCourse} style={{ width: '100%', height: '46px' }}>
                         <option value="live">🔴 Live session</option>
                         <option value="recorded">📹 Recorded</option>
                         <option value="inperson">📍 In-person</option>
                       </select>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Duration</label>
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <input name="dur_h" type="number" min="0" className="prompt-input" placeholder="Hrs" disabled={isCreatingCourse} style={{ width: '100%' }} />
                         <input name="dur_m" type="number" min="0" max="59" className="prompt-input" placeholder="Min" disabled={isCreatingCourse} style={{ width: '100%' }} />
                         <input name="dur_s" type="number" min="0" max="59" className="prompt-input" placeholder="Sec" disabled={isCreatingCourse} style={{ width: '100%' }} />
                       </div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Price (₹)</label>
                       <input name="price" type="number" className="prompt-input" required placeholder="e.g. 1999" disabled={isCreatingCourse} style={{ width: '100%' }} />
                     </div>
                  </div>
                  <button type="submit" className="enrol-cta coral" disabled={isCreatingCourse} style={{ marginTop: '12px' }}>
                    {isCreatingCourse ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Create Draft Course'}
                  </button>
                </form>
              </div>

              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <h3 style={{ color: 'var(--ink)', marginBottom: '16px', fontSize: '16px' }}>Your Courses</h3>
                {courses.length === 0 ? <p style={{color:'var(--text-3)'}}>You have not created any courses yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ink)', textAlign: 'left', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-md)', color: 'var(--text-3)', fontSize: '14px' }}>
                        <th style={{ padding: '12px 8px' }}>Course Name</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-sm)' }}>
                          <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{c.name}</td>
                          <td style={{ padding: '16px 8px', color: c.status === 'draft' ? 'var(--text-3)' : c.status === 'published' ? 'var(--green)' : 'var(--blue)' }}>{c.status.toUpperCase()}</td>
                          <td style={{ padding: '16px 8px' }}>
                            {c.status === 'draft' && (
                              <button onClick={async () => {
                                const res = await fetch('/api/teach/courses', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: c.id, action: 'submit_review' }) });
                                if (res.ok) setCourses(courses.map(course => course.id === c.id ? {...course, status: 'under_review'} : course));
                              }} style={{ padding:'8px 16px', background:'var(--blue-bg)', color:'var(--blue)', fontWeight: '600', border:'none', borderRadius:'8px', cursor:'pointer' }}>Submit</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          )}

          {activeView === "inst_sessions" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Creator Studio</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Live Sessions
              </div>

              {sessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sessions.map(s => (
                    <div key={s.sessionId} className="session-row">
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>{s.sessionTitle}</h3>
                        <div style={{ color: 'var(--text-3)', fontSize: '14px' }}>
                          {s.courseName} • {new Date(s.scheduledStart).toLocaleString()} • {s.registrantCount} learners registered
                        </div>
                      </div>
                      <div className="session-actions">
                        {s.sessionStatus === 'cancelled' ? (
                          <span style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '100px', fontWeight: 600, fontSize: '13px' }}>
                            Cancelled
                          </span>
                        ) : (
                          <>
                            <button 
                              className="join-btn enrol-cta coral"
                              style={{ padding: '10px 24px', margin: 0 }}
                              onClick={() => s.hostUrl ? window.open(s.hostUrl, '_blank') : alert('Host URL not configured')}
                            >
                              Start Session →
                            </button>
                            <button 
                              onClick={() => handleToggleRecording(s.sessionId, s.recordingAvailable)}
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--indigo)', padding: '10px 18px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >
                              {s.recordingAvailable ? "Recording Live ✅" : "Share Recording 📽️"}
                            </button>
                            <button 
                              onClick={() => handleCancel(s.sessionId)}
                              style={{ background: 'transparent', border: '1px solid var(--alert-red)', color: 'var(--alert-red)', padding: '10px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', color: 'var(--text-3)' }}>
                  You have no live sessions scheduled right now.
                </div>
              )}
            </div>
          )}

          {activeView === "inst_earnings" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Creator Studio</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Earnings Dashboard
              </div>
              
              <div className="stats-row" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                    <div>
                      <div style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Courses</div>
                      <div style={{ color: 'var(--ink)', fontSize: '32px', fontWeight: '900' }}>0</div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                    <div>
                      <div style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pending Payout</div>
                      <div style={{ color: 'var(--green)', fontSize: '32px', fontWeight: '900' }}>₹ 0</div>
                    </div>
                </div>
              </div>
              
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '20px' }}>Earnings are calculated using the 80/20 XWORKS Revenue Split algorithm.</p>
                <div style={{ padding: '16px', border: '1px dashed var(--border-md)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-3)' }}>No transactions yet. Publish a course to start earning!</div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
