"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import "../dashboard/dashboard.css";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("admin_instructors");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [applications, setApplications] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'admin') {
            router.push('/dashboard');
            return;
          }
          setUser(data);
        } else {
          router.push('/Login');
        }
      } catch (err) {
        router.push('/Login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (activeView === 'admin_instructors') {
      fetch('/api/admin/instructors').then(r=>r.json()).then(d => setApplications(d.applications || []));
    }
    if (activeView === 'admin_courses') {
      fetch('/api/admin/courses').then(r=>r.json()).then(d => setCourses(d.courses || []));
    }
    if (activeView === 'admin_promos') {
      fetch('/api/admin/promo_codes').then(r=>r.json()).then(d => setPromos(d.promos || []));
    }
  }, [activeView, user]);

  const handleApproveInstructor = async (id: string, action: 'approve' | 'reject') => {
    const res = await fetch('/api/admin/instructors', { 
      method: 'PUT', headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ id, action }) 
    });
    if (res.ok) setApplications(prev => prev.filter(a => a.id !== id));
  };

  const handlePublishCourse = async (id: string, action: 'approve' | 'reject') => {
    const res = await fetch('/api/admin/courses', { 
      method: 'PUT', headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ id, action }) 
    });
    if (res.ok) setCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/admin/promo_codes', { 
      method: 'POST', headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({ code: formData.get('code'), discount_percentage: Number(formData.get('perc')) }) 
    });
    const data = await res.json();
    if (data.success) {
      setPromos([data.promo, ...promos]);
      e.currentTarget.reset();
    } else {
      alert("Failed to create promo");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <div className="shell flex items-center justify-center text-white" style={{ background: "var(--page-bg)" }}>Loading secure portal...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="shell">
      {/* SIDEBAR */}
      <aside className="sidebar sb-dark" style={{ background: "var(--indigo-dark)" }}>
        <div className="sb-header">
          <Link href="/" className="logo">
            <div className="logo-icon"><div className="lb"></div><div className="lb"></div></div>
            <span className="logo-text">X<span>WORKS</span></span>
          </Link>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--coral)", marginTop: "4px", letterSpacing: "1px", textTransform: "uppercase" }}>
            Owner Portal
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Platform Controls</div>
          <button className={`sb-item ${activeView === "admin_instructors" ? "active" : ""}`} onClick={() => setActiveView("admin_instructors")}>
            <span className="sb-item-icon">👨‍⚖️</span>
            <span className="sb-item-label">Approve Instructors</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_courses" ? "active" : ""}`} onClick={() => setActiveView("admin_courses")}>
            <span className="sb-item-icon">📢</span>
            <span className="sb-item-label">Publish Courses</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_promos" ? "active" : ""}`} onClick={() => setActiveView("admin_promos")}>
            <span className="sb-item-icon">🏷️</span>
            <span className="sb-item-label">Promo Codes</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_refunds" ? "active" : ""}`} onClick={() => setActiveView("admin_refunds")}>
            <span className="sb-item-icon">💸</span>
            <span className="sb-item-label">Process Refunds</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_certificates" ? "active" : ""}`} onClick={() => setActiveView("admin_certificates")}>
            <span className="sb-item-icon">❌</span>
            <span className="sb-item-label">Revoke Certs</span>
          </button>
        </nav>

        <div className="sb-footer">
          <button className="sb-logout" onClick={handleLogout}>
            <span className="sb-logout-icon">🚪</span>
            <span className="sb-logout-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main" style={{ background: "var(--page-bg)" }}>
        <div className="topbar">
          <div className="topbar-greeting">
            Welcome back, Owner. 🛡️ System is running smoothly.
          </div>
          <div className="topbar-right">
            <div className="topbar-notif">🔔<div className="notif-dot"></div></div>
          </div>
        </div>

        <div className="content">
          {/* ---- INSTRUCTORS ---- */}
          {activeView === "admin_instructors" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Owner Operations</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Approve Instructors
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', flex: 1 }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '20px' }}>Pending applications waiting for platform access.</p>
                {applications.length === 0 ? <p style={{color:'var(--text-4)'}}>No pending applications.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-md)', color: 'var(--text-3)', fontSize: '14px' }}>
                        <th style={{ padding: '12px 8px' }}>User</th>
                        <th style={{ padding: '12px 8px' }}>LinkedIn</th>
                        <th style={{ padding: '12px 8px' }}>Bio</th>
                        <th style={{ padding: '12px 8px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map(app => (
                        <tr key={app.id} style={{ borderBottom: '1px solid var(--border-sm)' }}>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{fontWeight: 'bold'}}>{app.first_name} {app.last_name}</div>
                            <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{app.email}</div>
                          </td>
                          <td style={{ padding: '16px 8px' }}><a href={app.linkedin_url} target="_blank" style={{color:'var(--blue)'}}>Link</a></td>
                          <td style={{ padding: '16px 8px', maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app.bio}</td>
                          <td style={{ padding: '16px 8px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleApproveInstructor(app.id, 'approve')} style={{ padding:'8px 16px', background:'var(--green-bg)', color:'var(--green)', fontWeight: '600', border:'none', borderRadius:'8px', cursor:'pointer' }}>Approve</button>
                            <button onClick={() => handleApproveInstructor(app.id, 'reject')} style={{ padding:'8px 16px', background:'var(--red-bg)', color:'var(--red)', fontWeight: '600', border:'none', borderRadius:'8px', cursor:'pointer' }}>Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ---- COURSES ---- */}
          {activeView === "admin_courses" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Owner Operations</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Publish Courses
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', flex: 1 }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '20px' }}>Courses submitted by instructors awaiting platform publication.</p>
                {courses.length === 0 ? <p style={{color:'var(--text-4)'}}>No courses pending review.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-md)', color: 'var(--text-3)', fontSize: '14px' }}>
                        <th style={{ padding: '12px 8px' }}>Course Name</th>
                        <th style={{ padding: '12px 8px' }}>Price</th>
                        <th style={{ padding: '12px 8px' }}>Instructor</th>
                        <th style={{ padding: '12px 8px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-sm)' }}>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{fontWeight: 'bold'}}>{c.name}</div>
                            <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.cat} • {c.dur} hrs</div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>₹{c.price}</td>
                          <td style={{ padding: '16px 8px' }}>
                            <div>{c.first_name} {c.last_name}</div>
                            <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.email}</div>
                          </td>
                          <td style={{ padding: '16px 8px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => handlePublishCourse(c.id, 'approve')} style={{ padding:'8px 16px', background:'var(--blue-bg)', color:'var(--blue)', fontWeight: '600', border:'none', borderRadius:'8px', cursor:'pointer' }}>Publish</button>
                            <button onClick={() => handlePublishCourse(c.id, 'reject')} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border-md)', color:'var(--text-2)', fontWeight: '600', borderRadius:'8px', cursor:'pointer' }}>Draft</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ---- PROMOS ---- */}
          {activeView === "admin_promos" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Owner Operations</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Promo Codes
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                     <div style={{flex: 2}}>
                       <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>Code String</label>
                       <input name="code" type="text" className="prompt-input" required placeholder="e.g. DIWALI50" style={{ textTransform: 'uppercase', width: '100%' }} />
                     </div>
                     <div style={{flex: 1}}>
                       <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>Discount %</label>
                       <input name="perc" type="number" className="prompt-input" required placeholder="20" style={{ width: '100%' }} />
                     </div>
                     <button type="submit" className="enrol-cta coral" style={{ cursor: 'pointer', padding: '14px 24px', marginBottom: '2px' }}>Create Promo</button>
                  </div>
                </form>

                <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '16px' }}>Active Promo Codes</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-md)', color: 'var(--text-3)', fontSize: '14px' }}>
                      <th style={{ padding: '12px 8px' }}>Code</th>
                      <th style={{ padding: '12px 8px' }}>Discount</th>
                      <th style={{ padding: '12px 8px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-sm)' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 'bold', letterSpacing: '1px' }}>{p.code}</td>
                        <td style={{ padding: '16px 8px', color: 'var(--green)' }}>{parseFloat(p.discount_percentage)}% OFF</td>
                        <td style={{ padding: '16px 8px', color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {promos.length === 0 && <tr><td colSpan={3} style={{padding:'16px'}}>No codes exist.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---- REFUNDS ---- */}
          {activeView === "admin_refunds" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Owner Operations</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Process Refund
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '20px' }}>Process a refund and immediately revoke course access via Razorpay ID.</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                  <input type="text" className="prompt-input" placeholder="Razorpay Order ID (order_...)" id="adminRefundId" style={{ flex: 1 }} />
                  <button className="enrol-cta coral" style={{ width: 'auto', padding: '12px 24px', cursor: 'pointer', marginTop: 0 }} onClick={async () => {
                    const orderId = (document.getElementById('adminRefundId') as HTMLInputElement).value;
                    const res = await fetch('/api/admin/refunds', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId }) });
                    alert((await res.json()).message || 'Done!');
                  }}>Issue Refund</button>
                </div>
              </div>
            </div>
          )}

          {/* ---- CERTIFICATES ---- */}
          {activeView === "admin_certificates" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="section-label">Owner Operations</div>
              <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "24px" }}>
                Revoke Certificate
              </div>
              <div className="stat-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                <p style={{ color: 'var(--text-3)', marginBottom: '20px' }}>Invalidate a certificate and update its public verification page.</p>
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    const formData = new FormData(e.currentTarget);
                    const res = await fetch('/api/admin/certificates', { 
                      method: 'PUT', 
                      headers: {'Content-Type':'application/json'}, 
                      body: JSON.stringify({ credential_id: formData.get('credential_id'), reason: formData.get('reason') }) 
                    }); 
                    alert((await res.json()).message || 'Done!');
                    e.currentTarget.reset();
                  }} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
                >
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-3)' }}>Credential ID</label>
                  <input name="credential_id" type="text" className="prompt-input" required placeholder="XW-..." />
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-3)' }}>Revocation Reason</label>
                  <input name="reason" type="text" className="prompt-input" required placeholder="e.g. Academic misconduct" />
                  <button type="submit" className="enrol-cta coral" style={{ width: '100%', marginTop: '8px', cursor: 'pointer', background: 'var(--indigo-dark)' }}>Revoke Access</button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
