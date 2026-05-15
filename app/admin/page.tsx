"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import "../dashboard/dashboard.css";
import "./admin.css";
import Logo from "../components/Logo";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("admin_instructors");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [applications, setApplications] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allInstructors, setAllInstructors] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [coursePagination, setCoursePagination] = useState({ total: 0, totalPages: 1 });
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'admin') {
            router.push(data.role === 'instructor' ? '/instructor' : '/dashboard');
            return; // Don't set loading to false, let the redirect happen
          }
          setUser(data);
          setLoading(false);
        } else {
          router.push('/Login');
        }
      } catch (err) {
        router.push('/Login');
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
    if (activeView === 'admin_create_course' || activeView === 'admin_manage_courses') {
      fetch('/api/admin/all-categories').then(r=>r.json()).then(d => setAllCategories(d.categories || []));
      fetch('/api/admin/all-instructors').then(r=>r.json()).then(d => setAllInstructors(d.instructors || []));
    }

    if (activeView === 'admin_manage_courses') {
      setIsFetching(true);
      const query = new URLSearchParams({
        search: courseSearch,
        categoryId: courseCategoryFilter,
        page: coursePage.toString()
      }).toString();
      
      fetch(`/api/admin/courses/all?${query}`)
        .then(r => r.json())
        .then(d => {
          if (d.error) console.error('Manage Courses Error:', d.error, d.details || '');
          setAllCourses(d.courses || []);
          if (d.pagination) setCoursePagination(d.pagination);
          setIsFetching(false);
        })
        .catch(err => {
          console.error('Fetch Error:', err);
          setIsFetching(false);
        });
    }
  }, [activeView, user, courseSearch, courseCategoryFilter, coursePage]);

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    const res = await fetch(`/api/admin/courses/all?id=${id}`, { method: 'DELETE' });
    if (res.ok) setAllCourses(prev => prev.filter(c => c.id !== id));
  };

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

  if (loading) return (
    <div className="shell" style={{ alignItems: 'center', justifyContent: 'center', background: 'var(--indigo-dark)' }}>
      <div className="dashboard-loader" style={{ borderTopColor: 'var(--coral)' }}></div>
      <style jsx>{`
        .dashboard-loader {
          width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--indigo); border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={`shell ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sb-mobile-hd">
          <button className="sb-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className="sb-logo">
            <Logo />
          </div>
          <div className="sb-user">
            <div className="sb-avatar">
              {user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() : "..."}
            </div>
            <div className="sb-user-info-mob">
              <div className="sb-user-name">{user ? `${user.firstName} ${user.lastName}` : "Loading..."}</div>
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Platform Controls</div>
          <button className={`sb-item ${activeView === "admin_instructors" ? "active" : ""}`} onClick={() => { setActiveView("admin_instructors"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">👨‍⚖️</span>
            <span className="sb-item-label">Approve Instructors</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_courses" ? "active" : ""}`} onClick={() => { setActiveView("admin_courses"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📢</span>
            <span className="sb-item-label">Publish Courses</span>
          </button>

          <button className={`sb-item ${activeView === "admin_create_course" ? "active" : ""}`} onClick={() => { setEditingCourse(null); setActiveView("admin_create_course"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">➕</span>
            <span className="sb-item-label">Create Course</span>
          </button>

          <button className={`sb-item ${activeView === "admin_manage_courses" ? "active" : ""}`} onClick={() => { setActiveView("admin_manage_courses"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🛠️</span>
            <span className="sb-item-label">Manage Courses</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_promos" ? "active" : ""}`} onClick={() => { setActiveView("admin_promos"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🏷️</span>
            <span className="sb-item-label">Promo Codes</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_refunds" ? "active" : ""}`} onClick={() => { setActiveView("admin_refunds"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">💸</span>
            <span className="sb-item-label">Process Refunds</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_certificates" ? "active" : ""}`} onClick={() => { setActiveView("admin_certificates"); setIsMobileMenuOpen(false); }}>
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
      <div className="main">
        <div className="topbar">
          <div className="topbar-greeting">
            Welcome back, <strong>Admin</strong>. 🛡️ System is running smoothly.
          </div>
          <div className="topbar-right">
            <div className="topbar-notif">🔔<div className="notif-dot"></div></div>
          </div>
        </div>

        <div className="content">
          {/* ---- INSTRUCTORS ---- */}
          {activeView === "admin_instructors" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Approve Instructors</div>
                </div>
              </div>
              
              <div className="admin-card">
                <p style={{ color: 'var(--text-3)', marginBottom: '24px', fontSize: '14px' }}>Pending applications waiting for platform access.</p>
                {applications.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">✅</div>
                    <p className="admin-empty-text">All caught up! No pending applications.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>LinkedIn</th>
                          <th>Bio</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(app => (
                          <tr key={app.id}>
                            <td>
                              <div style={{fontWeight: '700'}}>{app.first_name} {app.last_name}</div>
                              <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{app.email}</div>
                            </td>
                            <td><a href={app.linkedin_url} target="_blank" style={{color:'var(--indigo-mid)', fontWeight: '600'}}>Link ↗</a></td>
                            <td style={{ maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app.bio}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="admin-btn admin-btn-success" onClick={() => handleApproveInstructor(app.id, 'approve')}>Approve</button>
                                <button className="admin-btn admin-btn-danger" onClick={() => handleApproveInstructor(app.id, 'reject')}>Reject</button>
                              </div>
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

          {/* ---- COURSES ---- */}
          {activeView === "admin_courses" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Publish Courses</div>
                </div>
              </div>
              
              <div className="admin-card">
                <p style={{ color: 'var(--text-3)', marginBottom: '24px', fontSize: '14px' }}>Courses submitted by instructors awaiting platform publication.</p>
                {courses.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">✨</div>
                    <p className="admin-empty-text">The queue is empty. Refresh to check for new courses.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Course Name</th>
                          <th>Price</th>
                          <th>Instructor</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{fontWeight: '700'}}>{c.name}</div>
                              <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.cat} • {c.dur} hrs</div>
                            </td>
                            <td style={{ fontWeight: '700', color: 'var(--indigo)' }}>₹{c.price}</td>
                            <td>
                              <div>{c.first_name} {c.last_name}</div>
                              <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.email}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="admin-btn admin-btn-primary" onClick={() => handlePublishCourse(c.id, 'approve')}>Publish</button>
                                <button className="admin-btn" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => handlePublishCourse(c.id, 'reject')}>Keep Draft</button>
                              </div>
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

          {/* ---- PROMOS ---- */}
          {activeView === "admin_promos" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Promo Codes</div>
                </div>
              </div>
              
              <div className="admin-card">
                <form onSubmit={handleCreatePromo} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '40px', padding: '24px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Code String</label>
                       <input name="code" type="text" className="prompt-input" required placeholder="e.g. DIWALI50" style={{ textTransform: 'uppercase', width: '100%' }} />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Discount %</label>
                       <input name="perc" type="number" className="prompt-input" required placeholder="20" style={{ width: '100%' }} />
                     </div>
                  </div>
                  <button type="submit" className="enrol-cta coral" style={{ width: 'auto', justifySelf: 'start', padding: '14px 40px', marginTop: 0 }}>Create Promo Code →</button>
                </form>

                <h3 style={{ color: 'var(--ink)', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>Active Promo Codes</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: '800', letterSpacing: '1px', color: 'var(--indigo)' }}>{p.code}</td>
                          <td style={{ fontWeight: '700' }}><span className="admin-badge success">{parseFloat(p.discount_percentage)}% OFF</span></td>
                          <td style={{ color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {promos.length === 0 && <tr><td colSpan={3} style={{padding:'24px', textAlign:'center', color:'var(--text-3)'}}>No active codes.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---- REFUNDS ---- */}
          {activeView === "admin_refunds" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Process Refund</div>
                </div>
              </div>
              
              <div className="admin-card">
                <p style={{ color: 'var(--text-3)', marginBottom: '24px' }}>Process a refund and immediately revoke course access via Razorpay ID.</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="text" className="prompt-input" placeholder="Razorpay Order ID (order_...)" id="adminRefundId" style={{ flex: 1 }} />
                  <button className="enrol-cta coral" style={{ width: 'auto', padding: '12px 32px', cursor: 'pointer', marginTop: 0 }} onClick={async () => {
                    const orderId = (document.getElementById('adminRefundId') as HTMLInputElement).value;
                    const res = await fetch('/api/admin/refunds', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId }) });
                    const data = await res.json();
                    alert(data.message || data.error || 'Done!');
                  }}>Issue Refund →</button>
                </div>
              </div>
            </div>
          )}

          {/* ---- CERTIFICATES ---- */}
          {activeView === "admin_certificates" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Revoke Certificate</div>
                </div>
              </div>
              
              <div className="admin-card">
                <p style={{ color: 'var(--text-3)', marginBottom: '24px' }}>Invalidate a certificate and update its public verification page.</p>
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    const formData = new FormData(e.currentTarget);
                    const res = await fetch('/api/admin/certificates', { 
                      method: 'PUT', 
                      headers: {'Content-Type':'application/json'}, 
                      body: JSON.stringify({ credential_id: formData.get('credential_id'), reason: formData.get('reason') }) 
                    }); 
                    const data = await res.json();
                    alert(data.message || data.error || 'Done!');
                    e.currentTarget.reset();
                  }} 
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Credential ID</label>
                      <input name="credential_id" type="text" className="prompt-input" required placeholder="XW-..." style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Revocation Reason</label>
                      <input name="reason" type="text" className="prompt-input" required placeholder="e.g. Academic misconduct" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <button type="submit" className="enrol-cta" style={{ width: 'auto', justifySelf: 'start', padding: '14px 40px', background: 'var(--red)', marginTop: '8px' }}>Revoke Certificate Access</button>
                </form>
              </div>
            </div>
          )}

          {/* ---- CREATE COURSE ---- */}
          {activeView === "admin_create_course" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">{editingCourse ? 'Edit Course' : 'Create New Course'}</div>
                </div>
              </div>
              
              <div className="admin-card">
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    const formData = new FormData(e.currentTarget);
                    const payload = Object.fromEntries(formData.entries());
                    const url = editingCourse ? `/api/admin/courses?id=${editingCourse.id}` : '/api/admin/courses';
                    const method = editingCourse ? 'PUT' : 'POST';
                    
                    const res = await fetch(url, { 
                      method, 
                      headers: {'Content-Type':'application/json'}, 
                      body: JSON.stringify(payload) 
                    }); 
                    const data = await res.json();
                    if (res.ok) {
                      alert(editingCourse ? 'Course updated successfully!' : 'Course created successfully!');
                      setEditingCourse(null);
                      setActiveView('admin_manage_courses');
                    } else {
                      alert(data.error || 'Operation failed');
                    }
                  }} 
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Course Name</label>
                      <input name="name" type="text" className="prompt-input" required placeholder="e.g. Master React in 30 Days" defaultValue={editingCourse?.name} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Slug (URL)</label>
                      <input name="slug" type="text" className="prompt-input" required placeholder="e.g. react-mastery" defaultValue={editingCourse?.slug} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Category</label>
                      <select name="category_id" className="prompt-input" required defaultValue={editingCourse?.category_id}>
                        <option value="">Select Category</option>
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Instructor</label>
                      <select name="instructor_id" className="prompt-input" required defaultValue={editingCourse?.instructor_id}>
                        <option value="">Select Instructor</option>
                        {allInstructors.map(inst => (
                          <option key={inst.id} value={inst.id}>{inst.first_name} {inst.last_name} ({inst.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Price (₹)</label>
                      <input name="price" type="number" className="prompt-input" required placeholder="1299" defaultValue={editingCourse?.price} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Level</label>
                      <select name="level" className="prompt-input" required defaultValue={editingCourse?.level}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Duration (hrs)</label>
                      <input name="dur" type="number" className="prompt-input" required placeholder="10" defaultValue={editingCourse?.dur} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Emoji</label>
                      <input name="emoji" type="text" className="prompt-input" placeholder="🎓" defaultValue={editingCourse?.emoji} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Gradient Class</label>
                      <select name="g" className="prompt-input" defaultValue={editingCourse?.g}>
                        <option value="t-indigo">Indigo</option>
                        <option value="t-coral">Coral</option>
                        <option value="t-amber">Amber</option>
                        <option value="t-cyan">Cyan</option>
                        <option value="t-emerald">Emerald</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Badge (optional)</label>
                      <input name="tag" type="text" className="prompt-input" placeholder="e.g. hot" defaultValue={editingCourse?.tag} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="admin-label">Badge Label (optional)</label>
                    <input name="tag_label" type="text" className="prompt-input" placeholder="e.g. Best Seller" defaultValue={editingCourse?.tag_label} />
                  </div>

                  <button type="submit" className="enrol-cta coral" style={{ width: 'auto', justifySelf: 'start', padding: '14px 60px', marginTop: '12px' }}>
                    {editingCourse ? 'Save Changes' : 'Create Course Now →'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ---- MANAGE COURSES ---- */}
          {activeView === "admin_manage_courses" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Manage All Courses</div>
                </div>
              </div>
              
              <div className="admin-card">
                <p style={{ color: 'var(--text-3)', marginBottom: '24px', fontSize: '14px' }}>Overview of all courses currently on the platform.</p>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <input 
                      type="text" 
                      className="prompt-input" 
                      placeholder="Search courses or instructors..." 
                      value={courseSearch}
                      onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                    />
                  </div>
                  <div style={{ width: '200px' }}>
                    <select 
                      className="prompt-input"
                      value={courseCategoryFilter}
                      onChange={(e) => { setCourseCategoryFilter(e.target.value); setCoursePage(1); }}
                    >
                      <option value="">All Categories</option>
                      {allCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {(courseSearch || courseCategoryFilter) && (
                    <button 
                      className="admin-btn" 
                      onClick={() => { setCourseSearch(""); setCourseCategoryFilter(""); setCoursePage(1); }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                {isFetching ? (
                  <div className="admin-empty-state">
                    <div className="spinner" style={{ marginBottom: '16px' }}></div>
                    <p className="admin-empty-text">Fetching latest data...</p>
                  </div>
                ) : allCourses.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">{courseSearch || courseCategoryFilter ? '🔍' : '📚'}</div>
                    <p className="admin-empty-text">
                      {courseSearch || courseCategoryFilter 
                        ? 'No courses matching your filters. Try a different search!' 
                        : 'No courses found. Create one to get started!'}
                    </p>
                    {(courseSearch || courseCategoryFilter) && (
                      <button 
                        className="admin-btn admin-btn-primary" 
                        style={{ marginTop: '16px' }}
                        onClick={() => { setCourseSearch(""); setCourseCategoryFilter(""); }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Instructor</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCourses.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{fontWeight: '700', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={c.name}>
                                {c.name}
                              </div>
                              <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.category_name} • ₹{c.price}</div>
                            </td>
                            <td>
                              <div>{c.first_name} {c.last_name}</div>
                              <div style={{fontSize: '12px', color: 'var(--text-3)'}}>{c.email}</div>
                            </td>
                            <td>
                              <span className={`admin-badge ${c.status === 'published' ? 'success' : 'pending'}`}>
                                {c.status === 'published' ? 'Live' : (c.status || 'Draft').replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="admin-btn admin-btn-primary" onClick={() => { setEditingCourse(c); setActiveView('admin_create_course'); }}>Edit</button>
                                <button className="admin-btn admin-btn-danger" onClick={() => handleDeleteCourse(c.id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {coursePagination.totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '32px', padding: '16px', borderTop: '1px solid var(--border)' }}>
                        <button 
                          className="admin-btn" 
                          disabled={coursePage === 1}
                          style={{ opacity: coursePage === 1 ? 0.5 : 1, cursor: coursePage === 1 ? 'not-allowed' : 'pointer' }}
                          onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>
                          Page <strong>{coursePage}</strong> of {coursePagination.totalPages}
                        </span>
                        <button 
                          className="admin-btn" 
                          disabled={coursePage === coursePagination.totalPages}
                          style={{ opacity: coursePage === coursePagination.totalPages ? 0.5 : 1, cursor: coursePage === coursePagination.totalPages ? 'not-allowed' : 'pointer' }}
                          onClick={() => setCoursePage(p => Math.min(coursePagination.totalPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
