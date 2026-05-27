"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import "../dashboard/dashboard.css";
import "./admin.css";
import Logo from "../components/Logo";
import RoleTransitionOverlay from "../components/RoleTransitionOverlay";
import { formatDuration } from '@/lib/utils';
import dynamic from 'next/dynamic';

const TransactionTable = dynamic(() => import('../components/admin/payments/TransactionTable'), { ssr: false });
const PaymentFilters = dynamic(() => import('../components/admin/payments/PaymentFilters'), { ssr: false });
const RevenueCards = dynamic(() => import('../components/admin/payments/RevenueCards'), { ssr: false });
const PaymentDetails = dynamic(() => import('../components/admin/payments/PaymentDetails'), { ssr: false });
const AuditLogs = dynamic(() => import('../components/admin/payments/AuditLogs'), { ssr: false });

export default function AdminDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("admin_overview");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLearners: 0, totalInstructors: 0, activeCourses: 0, totalEnrolments: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Data states
  const [applications, setApplications] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allInstructors, setAllInstructors] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePagination, setCoursePagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatus, setCourseStatus] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);

  // Loading states for admin actions
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [revokingCert, setRevokingCert] = useState(false);
  const [actioningInstructorId, setActioningInstructorId] = useState<string | null>(null);
  const [instructorAction, setInstructorAction] = useState<'approve' | 'reject' | null>(null);
  const [actioningCourseId, setActioningCourseId] = useState<string | null>(null);
  const [courseAction, setCourseAction] = useState<'approve' | 'reject' | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [updatingCourse, setUpdatingCourse] = useState(false);

  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [uploadingCreateLogo, setUploadingCreateLogo] = useState(false);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      setEditLogoUrl(editingCourse.logo || '');
    }
  }, [editingCourse]);

  const handleCreateLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCreateLogo(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setCreateLogoUrl(data.url);
        showToast('Logo uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Logo upload failed', 'error');
    } finally {
      setUploadingCreateLogo(false);
    }
  };

  const handleEditLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEditLogo(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setEditLogoUrl(data.url);
        showToast('Logo uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Logo upload failed', 'error');
    } finally {
      setUploadingEditLogo(false);
    }
  };

  // Financial states
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState<any>(null);
  const [paymentChartData, setPaymentChartData] = useState<any[]>([]);
  const [paymentFilters, setPaymentFilters] = useState({ search: '', status: '', method: '', from: '', to: '', page: 1, limit: 10 });
  const [paymentPagination, setPaymentPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null; hiding: boolean }>({ message: '', type: null, hiding: false });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, hiding: false });
    setTimeout(() => {
      setToast(prev => ({ ...prev, hiding: true }));
      setTimeout(() => setToast({ message: '', type: null, hiding: false }), 300);
    }, 3000);
  };

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
    if (activeView === 'admin_overview') {
      fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d));
    }
    if (activeView === 'admin_instructors') {
      fetch('/api/admin/instructors').then(r => r.json()).then(d => setApplications(d.applications || []));
    }
    if (activeView === 'admin_courses') {
      fetch('/api/admin/courses').then(r => r.json()).then(d => setCourses(d.courses || []));
    }
    if (activeView === 'admin_promos') {
      fetch('/api/admin/promo_codes').then(r => r.json()).then(d => setPromos(d.promos || []));
    }
    if (activeView === 'admin_create_course' || activeView === 'admin_manage_courses' || activeView === 'admin_cert_repo' || activeView === 'admin_edit_course') {
      if (allCategories.length === 0) fetch('/api/categories').then(r => r.json()).then(d => setAllCategories(d || []));
      if (allInstructors.length === 0) fetch('/api/admin/all-instructors').then(r => r.json()).then(d => setAllInstructors(d.instructors || []));
    }
    if (activeView === 'admin_manage_courses' || activeView === 'admin_cert_repo') {
      setIsCoursesLoading(true);
      fetch(`/api/admin/courses/all?page=${coursePage}&search=${encodeURIComponent(courseSearch)}&categoryId=${courseCategory}&status=${courseStatus}`)
        .then(r => r.json())
        .then(d => {
          setAllCourses(d.courses || []);
          setCoursePagination(d.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        })
        .finally(() => setIsCoursesLoading(false));
    }

    if (['admin_transactions', 'admin_failed_payments', 'admin_refunds_history', 'admin_revenue_analytics'].includes(activeView)) {
      setIsPaymentsLoading(true);
      const queryParams = new URLSearchParams(paymentFilters as any);
      if (activeView === 'admin_failed_payments') queryParams.set('status', 'failed');
      if (activeView === 'admin_refunds_history') queryParams.set('status', 'refunded');
      
      fetch(`/api/admin/payments?${queryParams.toString()}`)
        .then(r => r.json())
        .then(d => {
          setPayments(d.payments || []);
          setPaymentAnalytics(d.analytics || null);
          setPaymentChartData(d.chartData || []);
          setPaymentPagination(d.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        })
        .finally(() => setIsPaymentsLoading(false));
    }
  }, [activeView, user, coursePage, courseSearch, courseStatus, courseCategory, paymentFilters]);

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    setDeletingCourseId(id);
    try {
      const res = await fetch(`/api/admin/courses/all?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Course deleted successfully', 'success');
        setTimeout(() => {
          setAllCourses(prev => prev.filter(c => c.id !== id));
          setDeletingCourseId(null);
        }, 300);
      } else {
        showToast('Failed to delete course', 'error');
        setDeletingCourseId(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete course due to network/server error', 'error');
      setDeletingCourseId(null);
    }
  };

  const handleApproveInstructor = async (id: string, action: 'approve' | 'reject') => {
    setActioningInstructorId(id);
    setInstructorAction(action);
    try {
      const res = await fetch('/api/admin/instructors', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        setApplications(prev => prev.filter(a => a.id !== id));
      } else {
        alert(`Failed to ${action} instructor`);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} instructor due to network/server error`);
    } finally {
      setActioningInstructorId(null);
      setInstructorAction(null);
    }
  };

  const handlePublishCourse = async (id: string, action: 'approve' | 'reject') => {
    setActioningCourseId(id);
    setCourseAction(action);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== id));
      } else {
        alert(`Failed to ${action === 'approve' ? 'publish' : 'keep draft'} course`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update course publishing status due to network/server error');
    } finally {
      setActioningCourseId(null);
      setCourseAction(null);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingPromo(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/admin/promo_codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.get('code'), discount_percentage: Number(formData.get('perc')) })
      });
      const data = await res.json();
      if (data.success) {
        setPromos([data.promo, ...promos]);
        form.reset();
      } else {
        alert(data.error || "Failed to create promo");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create promo due to network/server error");
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleProcessRefund = async () => {
    const inputEl = document.getElementById('adminRefundId') as HTMLInputElement;
    if (!inputEl) return;
    const orderId = inputEl.value.trim();
    if (!orderId) {
      alert('Please enter a Razorpay Order ID');
      return;
    }
    setProcessingRefund(true);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      alert(data.message || data.error || 'Done!');
      if (res.ok) {
        inputEl.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process refund due to network/server error');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleRevokeCert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRevokingCert(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/admin/certificates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential_id: formData.get('credential_id'), reason: formData.get('reason') })
      });
      const data = await res.json();
      alert(data.message || data.error || 'Done!');
      if (res.ok) {
        form.reset();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to revoke certificate due to network/server error');
    } finally {
      setRevokingCert(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingCourse(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload: any = Object.fromEntries(formData.entries());
    const dur_h = Number(payload.dur_h) || 0;
    const dur_m = Number(payload.dur_m) || 0;
    const dur_s = Number(payload.dur_s) || 0;
    payload.dur = dur_h * 3600 + dur_m * 60 + dur_s;
    delete payload.dur_h;
    delete payload.dur_m;
    delete payload.dur_s;
    const format = payload.format;
    payload.live = format === 'live';
    payload.nearby = format === 'inperson';
    delete payload.format;
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Course created successfully!', 'success');
        form.reset();
        setCreateLogoUrl('');
        setActiveView('admin_courses');
      } else {
        showToast(data.error || 'Failed to create course', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create course due to network/server error', 'error');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleEditCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdatingCourse(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload: any = Object.fromEntries(formData.entries());
    const dur_h = Number(payload.dur_h) || 0;
    const dur_m = Number(payload.dur_m) || 0;
    const dur_s = Number(payload.dur_s) || 0;
    payload.dur = dur_h * 3600 + dur_m * 60 + dur_s;
    delete payload.dur_h;
    delete payload.dur_m;
    delete payload.dur_s;
    payload.id = editingCourse?.id;
    try {
      const res = await fetch('/api/admin/courses/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Course updated successfully!', 'success');
        setEditingCourse(null);
        setEditLogoUrl('');
        setActiveView('admin_manage_courses');
        setCoursePage(1); // Refresh the list
      } else {
        showToast(data.error || 'Failed to update course', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update course due to network/server error', 'error');
    } finally {
      setUpdatingCourse(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <RoleTransitionOverlay role="admin" type="login" />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={`shell ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {toast.type && (
        <div className={`admin-toast ${toast.type} ${toast.hiding ? 'hiding' : ''}`}>
          <span style={{ fontSize: '18px' }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}
      {isLoggingOut && <RoleTransitionOverlay role="admin" type="logout" />}
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
          <button className={`sb-item ${activeView === "admin_overview" ? "active" : ""}`} onClick={() => { setActiveView("admin_overview"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📊</span>
            <span className="sb-item-label">Dashboard Overview</span>
          </button>

          <button className={`sb-item ${activeView === "admin_instructors" ? "active" : ""}`} onClick={() => { setActiveView("admin_instructors"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">👨‍⚖️</span>
            <span className="sb-item-label">Approve Instructors</span>
          </button>

          <button className={`sb-item ${activeView === "admin_courses" ? "active" : ""}`} onClick={() => { setActiveView("admin_courses"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📢</span>
            <span className="sb-item-label">Publish Courses</span>
          </button>

          <button className={`sb-item ${activeView === "admin_create_course" ? "active" : ""}`} onClick={() => { setActiveView("admin_create_course"); setIsMobileMenuOpen(false); }}>
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

          <button className={`sb-item ${activeView === "admin_cert_repo" ? "active" : ""}`} onClick={() => { setActiveView("admin_cert_repo"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📜</span>
            <span className="sb-item-label">Certificates Repo</span>
          </button>
          
          <button className={`sb-item ${activeView === "admin_certificates" ? "active" : ""}`} onClick={() => { setActiveView("admin_certificates"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">❌</span>
            <span className="sb-item-label">Revoke Certs</span>
          </button>

          <div className="sb-section-label" style={{ marginTop: '24px' }}>Financial Operations</div>
          <button className={`sb-item ${activeView === "admin_transactions" ? "active" : ""}`} onClick={() => { setActiveView("admin_transactions"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">💳</span>
            <span className="sb-item-label">Transactions</span>
          </button>
          <button className={`sb-item ${activeView === "admin_revenue_analytics" ? "active" : ""}`} onClick={() => { setActiveView("admin_revenue_analytics"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📈</span>
            <span className="sb-item-label">Revenue Analytics</span>
          </button>
          <button className={`sb-item ${activeView === "admin_refunds_history" ? "active" : ""}`} onClick={() => { setActiveView("admin_refunds_history"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">💸</span>
            <span className="sb-item-label">Refunds History</span>
          </button>
          <button className={`sb-item ${activeView === "admin_failed_payments" ? "active" : ""}`} onClick={() => { setActiveView("admin_failed_payments"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">❌</span>
            <span className="sb-item-label">Failed Payments</span>
          </button>
          <button className={`sb-item ${activeView === "admin_payment_audit" ? "active" : ""}`} onClick={() => { setActiveView("admin_payment_audit"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🛡️</span>
            <span className="sb-item-label">Audit Logs</span>
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
          {/* ---- OVERVIEW ---- */}
          {activeView === "admin_overview" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Platform Summary</div>
                  <div className="section-title">Dashboard Overview</div>
                </div>
              </div>

              <div className="overview-grid">
                <div className="overview-card">
                  <div className="overview-icon">🎓</div>
                  <div className="overview-label">Total Learners</div>
                  <div className="overview-value">{stats.totalLearners}</div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">👨‍🏫</div>
                  <div className="overview-label">Total Instructors</div>
                  <div className="overview-value">{stats.totalInstructors}</div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">📚</div>
                  <div className="overview-label">Active Courses</div>
                  <div className="overview-value">{stats.activeCourses}</div>
                </div>
                <div className="overview-card">
                  <div className="overview-icon">💳</div>
                  <div className="overview-label">Total Enrolments</div>
                  <div className="overview-value">{stats.totalEnrolments}</div>
                </div>
              </div>

              <div className="quick-actions-wrap">
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--indigo-dark)' }}>Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button className="qa-btn primary" onClick={() => setActiveView('admin_create_course')}>Create New Course</button>
                  <button className="qa-btn" onClick={() => setActiveView('admin_instructors')}>Review Applications</button>
                  <button className="qa-btn" onClick={() => setActiveView('admin_manage_courses')}>Inventory Check</button>
                </div>
              </div>
            </div>
          )}

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
                            <td data-label="User">
                              <div style={{ fontWeight: '700' }}>{app.first_name} {app.last_name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{app.email}</div>
                            </td>
                            <td data-label="LinkedIn"><a href={app.linkedin_url} target="_blank" style={{ color: 'var(--indigo-mid)', fontWeight: '600' }}>Link ↗</a></td>
                            <td data-label="Bio" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.bio}</td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="admin-btn admin-btn-success" 
                                  disabled={actioningInstructorId === app.id} 
                                  onClick={() => handleApproveInstructor(app.id, 'approve')}
                                >
                                  {actioningInstructorId === app.id && instructorAction === 'approve' ? (
                                    <div className="btn-loader"></div>
                                  ) : 'Approve'}
                                </button>
                                <button 
                                  className="admin-btn admin-btn-danger" 
                                  disabled={actioningInstructorId === app.id} 
                                  onClick={() => handleApproveInstructor(app.id, 'reject')}
                                >
                                  {actioningInstructorId === app.id && instructorAction === 'reject' ? (
                                    <div className="btn-loader"></div>
                                  ) : 'Reject'}
                                </button>
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
                            <td data-label="Course Name">
                              <div style={{ fontWeight: '700' }}>{c.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.cat} • {formatDuration(c.dur)}</div>
                            </td>
                            <td data-label="Price" style={{ fontWeight: '700', color: 'var(--indigo)' }}>₹{c.price}</td>
                            <td data-label="Instructor">
                              <div>{c.first_name} {c.last_name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.email}</div>
                            </td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="admin-btn admin-btn-primary" 
                                  disabled={actioningCourseId === c.id} 
                                  onClick={() => handlePublishCourse(c.id, 'approve')}
                                >
                                  {actioningCourseId === c.id && courseAction === 'approve' ? (
                                    <div className="btn-loader"></div>
                                  ) : 'Publish'}
                                </button>
                                <button 
                                  className="admin-btn" 
                                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} 
                                  disabled={actioningCourseId === c.id} 
                                  onClick={() => handlePublishCourse(c.id, 'reject')}
                                >
                                  {actioningCourseId === c.id && courseAction === 'reject' ? (
                                    <div className="btn-loader" style={{ borderTopColor: 'var(--text-2)' }}></div>
                                  ) : 'Keep Draft'}
                                </button>
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
                      <input name="code" type="text" className="prompt-input" required placeholder="e.g. DIWALI50" style={{ textTransform: 'uppercase', width: '100%' }} disabled={creatingPromo} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Discount %</label>
                      <input name="perc" type="number" className="prompt-input" required placeholder="20" style={{ width: '100%' }} disabled={creatingPromo} />
                    </div>
                  </div>
                  <button type="submit" className="enrol-cta coral" style={{ width: 'auto', justifySelf: 'start', padding: '14px 40px', marginTop: 0 }} disabled={creatingPromo}>
                    {creatingPromo ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Create Promo Code →'}
                  </button>
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
                          <td data-label="Code" style={{ fontWeight: '800', letterSpacing: '1px', color: 'var(--indigo)' }}>{p.code}</td>
                          <td data-label="Discount" style={{ fontWeight: '700' }}><span className="admin-badge success">{parseFloat(p.discount_percentage)}% OFF</span></td>
                          <td data-label="Created At" style={{ color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {promos.length === 0 && <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>No active codes.</td></tr>}
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
                  <input type="text" className="prompt-input" placeholder="Razorpay Order ID (order_...)" id="adminRefundId" style={{ flex: 1 }} disabled={processingRefund} />
                  <button 
                    className="enrol-cta coral" 
                    style={{ width: 'auto', padding: '12px 32px', cursor: 'pointer', marginTop: 0 }} 
                    disabled={processingRefund}
                    onClick={handleProcessRefund}
                  >
                    {processingRefund ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Issue Refund →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- CERTIFICATE REPO ---- */}
          {activeView === "admin_cert_repo" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Credential Assets</div>
                  <div className="section-title">Certificates Repo</div>
                </div>
              </div>

              <div className="admin-card">
                <div className="section-subhd">
                  <div className="section-sub-title">Course Certificate Assignments</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Manage which templates are assigned to which courses and view issuance stats.</p>
                </div>

                <div className="admin-table-wrap" style={{ marginTop: '20px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Course Name</th>
                        <th>Assigned Template</th>
                        <th>Total Issued</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCourses.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No courses available in repo.</td>
                        </tr>
                      ) : (
                        allCourses.map(c => (
                          <tr key={c.id}>
                            <td data-label="Course Name">
                              <div style={{ fontWeight: '700' }}>{c.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>ID: {c.id.slice(0, 8)}...</div>
                            </td>
                            <td data-label="Assigned Template">
                              <div className="admin-badge" style={{ background: 'var(--surface-2)', color: 'var(--text-1)', textTransform: 'capitalize' }}>
                                {(c.certificate_type || 'default').replace('_', ' ')}
                              </div>
                            </td>
                            <td data-label="Total Issued">
                              <div style={{ fontWeight: '600', color: 'var(--indigo)' }}>{c.issued_count || 0} certs</div>
                            </td>
                            <td data-label="Status">
                              <span className={`admin-badge ${c.status === 'published' ? 'success' : 'pending'}`}>
                                {c.status === 'published' ? 'Live' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
                  onSubmit={handleRevokeCert}
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Credential ID</label>
                      <input name="credential_id" type="text" className="prompt-input" required placeholder="XW-..." style={{ width: '100%' }} disabled={revokingCert} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Revocation Reason</label>
                      <input name="reason" type="text" className="prompt-input" required placeholder="e.g. Academic misconduct" style={{ width: '100%' }} disabled={revokingCert} />
                    </div>
                  </div>
                  <button type="submit" className="enrol-cta" style={{ width: 'auto', justifySelf: 'start', padding: '14px 40px', background: 'var(--red)', marginTop: '8px' }} disabled={revokingCert}>
                    {revokingCert ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Revoke Certificate Access'}
                  </button>
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
                  <div className="section-title">Create New Course</div>
                </div>
              </div>

              <div className="admin-card">
                <form
                  onSubmit={handleCreateCourse}
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Course Name</label>
                      <input name="name" type="text" className="prompt-input" required placeholder="e.g. Master React in 30 Days" disabled={creatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Slug (URL)</label>
                      <input name="slug" type="text" className="prompt-input" required placeholder="e.g. react-mastery" disabled={creatingCourse} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Category</label>
                      <select name="category_id" className="prompt-input" required disabled={creatingCourse}>
                        <option value="">Select Category</option>
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Format</label>
                      <select name="format" className="prompt-input" required disabled={creatingCourse}>
                        <option value="live">🔴 Live session</option>
                        <option value="recorded" disabled>📹 Recorded (Coming soon)</option>
                        <option value="inperson" disabled>📍 In-person (Coming soon)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Instructor</label>
                      <select name="instructor_id" className="prompt-input" required disabled={creatingCourse}>
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
                      <input name="price" type="number" className="prompt-input" required placeholder="1299" disabled={creatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Level</label>
                      <select name="level" className="prompt-input" required disabled={creatingCourse}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Duration</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input name="dur_h" type="number" min="0" className="prompt-input" placeholder="Hrs" disabled={creatingCourse} />
                        <input name="dur_m" type="number" min="0" max="59" className="prompt-input" placeholder="Mins" disabled={creatingCourse} />
                        <input name="dur_s" type="number" min="0" max="59" className="prompt-input" placeholder="Secs" disabled={creatingCourse} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Course Logo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {createLogoUrl && (
                          <img src={createLogoUrl} alt="Logo Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                        )}
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCreateLogoUpload} 
                            disabled={creatingCourse || uploadingCreateLogo}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          />
                          <button 
                            type="button" 
                            className="prompt-input" 
                            style={{ width: '100%', textAlign: 'left', background: 'var(--surface-2)', color: 'var(--text-2)', pointerEvents: 'none' }}
                          >
                            {uploadingCreateLogo ? 'Uploading...' : createLogoUrl ? 'Change Image' : 'Choose Image'}
                          </button>
                        </div>
                      </div>
                      <input type="hidden" name="logo" value={createLogoUrl} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Emoji</label>
                      <input name="emoji" type="text" className="prompt-input" placeholder="🎓" disabled={creatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Gradient Class</label>
                      <select name="g" className="prompt-input" disabled={creatingCourse}>
                        <option value="t-blue">Blue</option>
                        <option value="t-red">Red</option>
                        <option value="t-amber">Amber</option>
                        <option value="t-teal">Teal</option>
                        <option value="t-green">Green</option>
                        <option value="t-purple">Purple</option>
                        <option value="t-pink">Pink</option>
                        <option value="t-slate">Slate</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Badge (optional)</label>
                      <input name="tag" type="text" className="prompt-input" placeholder="e.g. hot" disabled={creatingCourse} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Badge Label (optional)</label>
                      <input name="tag_label" type="text" className="prompt-input" placeholder="e.g. Best Seller" disabled={creatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Certificate Template</label>
                      <select name="certificate_type" className="prompt-input" required defaultValue="default" disabled={creatingCourse}>
                        <option value="default">Default Template</option>
                        <option value="tech_mastery">Tech Mastery (Premium)</option>
                        <option value="creative_expert">Creative Expert</option>
                        <option value="business_pro">Business Pro</option>
                        <option value="completion_standard">Standard Completion</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="enrol-cta coral" style={{ width: 'auto', justifySelf: 'start', padding: '14px 60px', marginTop: '12px' }} disabled={creatingCourse}>
                    {creatingCourse ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Create Course Now →'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ---- EDIT COURSE ---- */}
          {activeView === "admin_edit_course" && editingCourse && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Owner Operations</div>
                  <div className="section-title">Edit Course: {editingCourse.name}</div>
                </div>
                <button type="button" className="admin-btn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }} onClick={() => { setEditingCourse(null); setActiveView('admin_manage_courses'); }}>← Back to Courses</button>
              </div>

              <div className="admin-card">
                <form
                  key={editingCourse?.id}
                  onSubmit={handleEditCourse}
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Course Name</label>
                      <input name="name" type="text" className="prompt-input" required defaultValue={editingCourse.name} disabled={updatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Slug (URL)</label>
                      <input name="slug" type="text" className="prompt-input" required defaultValue={editingCourse.slug} disabled={updatingCourse} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Category</label>
                      <select name="category_id" className="prompt-input" required defaultValue={editingCourse.category_id} disabled={updatingCourse}>
                        <option value="">Select Category</option>
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Instructor</label>
                      <select name="instructor_id" className="prompt-input" required defaultValue={editingCourse.instructor_id} disabled={updatingCourse}>
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
                      <input name="price" type="number" className="prompt-input" required defaultValue={editingCourse.price} disabled={updatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Level</label>
                      <select name="level" className="prompt-input" required defaultValue={editingCourse.level} disabled={updatingCourse}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Duration</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input name="dur_h" type="number" min="0" className="prompt-input" placeholder="Hrs" defaultValue={Math.floor(editingCourse.dur / 3600)} disabled={updatingCourse} />
                        <input name="dur_m" type="number" min="0" max="59" className="prompt-input" placeholder="Mins" defaultValue={Math.floor((editingCourse.dur % 3600) / 60)} disabled={updatingCourse} />
                        <input name="dur_s" type="number" min="0" max="59" className="prompt-input" placeholder="Secs" defaultValue={editingCourse.dur % 60} disabled={updatingCourse} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Course Logo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {editLogoUrl && (
                          <img src={editLogoUrl} alt="Logo Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                        )}
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleEditLogoUpload} 
                            disabled={updatingCourse || uploadingEditLogo}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          />
                          <button 
                            type="button" 
                            className="prompt-input" 
                            style={{ width: '100%', textAlign: 'left', background: 'var(--surface-2)', color: 'var(--text-2)', pointerEvents: 'none' }}
                          >
                            {uploadingEditLogo ? 'Uploading...' : editLogoUrl ? 'Change Image' : 'Choose Image'}
                          </button>
                        </div>
                      </div>
                      <input type="hidden" name="logo" value={editLogoUrl} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Emoji</label>
                      <input name="emoji" type="text" className="prompt-input" defaultValue={editingCourse.emoji} disabled={updatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Gradient Class</label>
                      <select name="g" className="prompt-input" defaultValue={editingCourse.g} disabled={updatingCourse}>
                        <option value="t-blue">Blue</option>
                        <option value="t-red">Red</option>
                        <option value="t-amber">Amber</option>
                        <option value="t-teal">Teal</option>
                        <option value="t-green">Green</option>
                        <option value="t-purple">Purple</option>
                        <option value="t-pink">Pink</option>
                        <option value="t-slate">Slate</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Badge (optional)</label>
                      <input name="tag" type="text" className="prompt-input" defaultValue={editingCourse.tag} disabled={updatingCourse} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                    <div className="form-group">
                      <label className="admin-label">Badge Label (optional)</label>
                      <input name="tag_label" type="text" className="prompt-input" defaultValue={editingCourse.tag_label} disabled={updatingCourse} />
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Certificate Template</label>
                      <select name="certificate_type" className="prompt-input" required defaultValue={editingCourse.certificate_type || 'default'} disabled={updatingCourse}>
                        <option value="default">Default Template</option>
                        <option value="tech_mastery">Tech Mastery (Premium)</option>
                        <option value="creative_expert">Creative Expert</option>
                        <option value="business_pro">Business Pro</option>
                        <option value="completion_standard">Standard Completion</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="enrol-cta coral" style={{ width: 'auto', justifySelf: 'start', padding: '14px 60px', marginTop: '12px' }} disabled={updatingCourse}>
                    {updatingCourse ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Save Changes'}
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
                {/* --- FILTERS --- */}
                <div className="admin-filters-grid" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Search courses or instructors..." 
                      className="prompt-input" 
                      value={courseSearch}
                      onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                    />
                  </div>
                  <div className="form-group">
                    <select className="prompt-input" value={courseCategory} onChange={(e) => { setCourseCategory(e.target.value); setCoursePage(1); }}>
                      <option value="">All Categories</option>
                      {allCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <select className="prompt-input" value={courseStatus} onChange={(e) => { setCourseStatus(e.target.value); setCoursePage(1); }}>
                      <option value="">All Status</option>
                      <option value="published">Published</option>
                      <option value="under_review">Under Review</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                 {isCoursesLoading ? (
                    <div style={{ padding: '100px 0', textAlign: 'center' }}>
                       <div className="dashboard-loader" style={{ margin: '0 auto', borderTopColor: 'var(--coral)' }}></div>
                       <p style={{ marginTop: '16px', color: 'var(--text-3)', fontSize: '14px' }}>Updating records...</p>
                    </div>
                ) : allCourses.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">📚</div>
                    <p className="admin-empty-text">No courses found matching your criteria.</p>
                    {(courseSearch || courseCategory || courseStatus) && (
                      <button onClick={() => { setCourseSearch(''); setCourseCategory(''); setCourseStatus(''); }} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--indigo)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Clear all filters</button>
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
                        {allCourses.map((c, idx) => (
                          <tr key={c.id} className={`${deletingCourseId === c.id ? 'row-deleting' : ''} ${idx === 0 && coursePage === 1 ? 'row-adding' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                            <td data-label="Course">
                              <div style={{ fontWeight: '700' }}>{c.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.category_name} • ₹{c.price}</div>
                            </td>
                            <td data-label="Instructor">
                              <div>{c.first_name} {c.last_name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.email}</div>
                            </td>
                            <td data-label="Status">
                              <span className={`admin-badge ${c.status === 'published' ? 'success' : 'pending'}`}>
                                {c.status === 'published' ? 'Live' : (c.status || 'Draft').replace('_', ' ')}
                              </span>
                            </td>
                            <td data-label="Action">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="admin-btn admin-btn-primary" 
                                  onClick={() => { setEditingCourse(c); setActiveView('admin_edit_course'); }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="admin-btn admin-btn-danger" 
                                  disabled={deletingCourseId === c.id} 
                                  onClick={() => handleDeleteCourse(c.id)}
                                >
                                  {deletingCourseId === c.id ? (
                                    <div className="btn-loader" style={{ borderTopColor: 'var(--red)' }}></div>
                                  ) : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {coursePagination.totalPages > 1 && (
                      <div className="admin-pagination" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', borderTop: '1px solid var(--border)', marginTop: '20px', justifyContent: 'center' }}>
                        <button 
                          disabled={coursePage === 1} 
                          onClick={() => setCoursePage(p => p - 1)}
                          className="admin-btn"
                          style={{ opacity: coursePage === 1 ? 0.5 : 1, cursor: coursePage === 1 ? 'not-allowed' : 'pointer' }}
                        >← Prev</button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)' }}>Page {coursePage} of {coursePagination.totalPages}</span>
                        <button 
                          disabled={coursePage === coursePagination.totalPages} 
                          onClick={() => setCoursePage(p => p + 1)}
                          className="admin-btn"
                          style={{ opacity: coursePage === coursePagination.totalPages ? 0.5 : 1, cursor: coursePage === coursePagination.totalPages ? 'not-allowed' : 'pointer' }}
                        >Next →</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- TRANSACTIONS & FINANCIALS ---- */}
          {['admin_transactions', 'admin_failed_payments', 'admin_refunds_history'].includes(activeView) && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Financial Operations</div>
                  <div className="section-title">
                    {activeView === 'admin_transactions' && 'All Transactions'}
                    {activeView === 'admin_failed_payments' && 'Failed Payments'}
                    {activeView === 'admin_refunds_history' && 'Refunds History'}
                  </div>
                </div>
              </div>
              <div className="admin-card">
                <PaymentFilters filters={paymentFilters} setFilters={setPaymentFilters} />
                {isPaymentsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}><div className="dashboard-loader"></div></div>
                ) : (
                  <>
                    <TransactionTable 
                      payments={payments} 
                      onViewDetails={p => setSelectedPayment(p)} 
                    />
                    {paymentPagination.totalPages > 1 && (
                      <div className="admin-pagination" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', borderTop: '1px solid var(--border)', marginTop: '20px', justifyContent: 'center' }}>
                        <button 
                          disabled={paymentPagination.page === 1} 
                          onClick={() => setPaymentFilters({ ...paymentFilters, page: paymentPagination.page - 1 })}
                          className="admin-btn"
                          style={{ opacity: paymentPagination.page === 1 ? 0.5 : 1, cursor: paymentPagination.page === 1 ? 'not-allowed' : 'pointer' }}
                        >← Prev</button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)' }}>Page {paymentPagination.page} of {paymentPagination.totalPages}</span>
                        <button 
                          disabled={paymentPagination.page === paymentPagination.totalPages} 
                          onClick={() => setPaymentFilters({ ...paymentFilters, page: paymentPagination.page + 1 })}
                          className="admin-btn"
                          style={{ opacity: paymentPagination.page === paymentPagination.totalPages ? 0.5 : 1, cursor: paymentPagination.page === paymentPagination.totalPages ? 'not-allowed' : 'pointer' }}
                        >Next →</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeView === 'admin_revenue_analytics' && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Financial Operations</div>
                  <div className="section-title">Revenue Analytics</div>
                </div>
              </div>
              {isPaymentsLoading ? (
                 <div style={{ padding: '40px', textAlign: 'center' }}><div className="dashboard-loader"></div></div>
              ) : (
                 <RevenueCards analytics={paymentAnalytics} chartData={paymentChartData} />
              )}
            </div>
          )}

          {activeView === 'admin_payment_audit' && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Financial Operations</div>
                  <div className="section-title">Payment Audit Logs</div>
                </div>
              </div>
              <div className="admin-card">
                <AuditLogs />
              </div>
            </div>
          )}

        </div>

        {selectedPayment && (
          <PaymentDetails 
            payment={selectedPayment} 
            onClose={() => setSelectedPayment(null)} 
            onRefund={async (orderId, amount) => {
              // Trigger refund API
              try {
                const res = await fetch('/api/admin/refunds', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId, refundAmount: amount, reason: 'Admin UI Refund' })
                });
                const data = await res.json();
                if (res.ok) {
                  showToast('Refund processed successfully', 'success');
                  setSelectedPayment(null);
                  // Trigger reload by updating filter state reference
                  setPaymentFilters({ ...paymentFilters }); 
                } else {
                  showToast(data.error || 'Failed to process refund', 'error');
                }
              } catch (e) {
                showToast('Network error processing refund', 'error');
              }
            }} 
          />
        )}

      </div>
    </div>
  );
}
