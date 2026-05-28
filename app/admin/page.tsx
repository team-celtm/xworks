"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import "../dashboard/dashboard.css";
import "./admin.css";
import Logo from "../components/Logo";
import RoleTransitionOverlay from "../components/RoleTransitionOverlay";
import { formatDuration } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { fetchApi } from '@/lib/apiClient';

const TransactionTable = dynamic(() => import('../components/admin/payments/TransactionTable'), { ssr: false });
const PaymentFilters = dynamic(() => import('../components/admin/payments/PaymentFilters'), { ssr: false });
const RevenueCards = dynamic(() => import('../components/admin/payments/RevenueCards'), { ssr: false });
const PaymentDetails = dynamic(() => import('../components/admin/payments/PaymentDetails'), { ssr: false });
const AuditLogs = dynamic(() => import('../components/admin/payments/AuditLogs'), { ssr: false });
const FailedPayments = dynamic(() => import('../components/admin/payments/FailedPayments'), { ssr: false });
const RefundsHistory = dynamic(() => import('../components/admin/payments/RefundsHistory'), { ssr: false });

function useUrlSync(key: string, value: any, setValue: any, defaultValue: any, searchParams: any, router: any) {
  useEffect(() => {
    if (!searchParams) return;
    const urlVal = searchParams.get(key);
    if (urlVal !== null && urlVal !== value.toString()) {
      setValue(typeof defaultValue === 'number' ? Number(urlVal) : urlVal);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;
    const urlVal = searchParams.get(key);
    const isDefault = value === defaultValue;
    if (value.toString() !== (urlVal || defaultValue.toString()) || (!isDefault && urlVal === null)) {
      const params = new URLSearchParams(searchParams.toString());
      if (isDefault) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [value]);
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="loader" style={{ margin: '100px auto' }}></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState("admin_overview");
  useUrlSync('view', activeView, setActiveView, 'admin_overview', searchParams, router);
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

  useUrlSync('coursePage', coursePage, setCoursePage, 1, searchParams, router);
  useUrlSync('courseSearch', courseSearch, setCourseSearch, '', searchParams, router);
  useUrlSync('courseStatus', courseStatus, setCourseStatus, '', searchParams, router);
  useUrlSync('courseCategory', courseCategory, setCourseCategory, '', searchParams, router);

  // Category management states
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [colorValue, setColorValue] = useState('#6366f1');

  useEffect(() => {
    if (editingCategory) {
      setColorValue(editingCategory.color || '#6366f1');
    } else {
      setColorValue('#6366f1');
    }
  }, [editingCategory]);

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

  const [createDetails, setCreateDetails] = useState<string[]>(['']);
  const [editDetails, setEditDetails] = useState<string[]>([]);

  useEffect(() => {
    if (editingCourse) {
      setEditLogoUrl(editingCourse.logo || '');
      setEditDetails(editingCourse.details || []);
    }
  }, [editingCourse]);

  const handleCreateLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCreateLogo(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetchApi('/api/admin/upload', {
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
      const res = await fetchApi('/api/admin/upload', {
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
  const [paymentDeepAnalytics, setPaymentDeepAnalytics] = useState<any>(null);
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

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetchApi('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchAllCategoriesForSelect = async () => {
    try {
      const res = await fetchApi('/api/admin/all-categories');
      if (res.ok) {
        const data = await res.json();
        setAllCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const slug = fd.get('slug') as string;
    const parent_id = fd.get('parent_id') as string;
    const icon = fd.get('icon') as string;
    const description = fd.get('description') as string;
    const color = fd.get('color') as string;
    const accent = fd.get('accent') as string;

    setSubmittingCategory(true);
    try {
      const res = await fetchApi('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, parent_id, icon, description, color, accent })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Category created successfully!', 'success');
        (e.target as HTMLFormElement).reset();
        fetchCategories();
        fetchAllCategoriesForSelect();
      } else {
        showToast(data.error || 'Failed to create category', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create category due to network error', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const slug = fd.get('slug') as string;
    const parent_id = fd.get('parent_id') as string;
    const icon = fd.get('icon') as string;
    const description = fd.get('description') as string;
    const color = fd.get('color') as string;
    const accent = fd.get('accent') as string;

    setSubmittingCategory(true);
    try {
      const res = await fetchApi('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCategory.id, name, slug, parent_id, icon, description, color, accent })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Category updated successfully!', 'success');
        setEditingCategory(null);
        setActiveView('admin_categories');
        fetchCategories();
        fetchAllCategoriesForSelect();
      } else {
        showToast(data.error || 'Failed to update category', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update category due to network error', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;
    try {
      const res = await fetchApi(`/api/admin/categories?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Category deleted successfully!', 'success');
        fetchCategories();
        fetchAllCategoriesForSelect();
      } else {
        showToast(data.error || 'Failed to delete category', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete category due to network error', 'error');
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetchApi("/api/auth/me");
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
      fetchApi('/api/admin/stats').then(r => r.json()).then(d => setStats(d)).catch(e => console.error(e));
    }
    if (activeView === 'admin_instructors') {
      fetchApi('/api/admin/instructors').then(r => r.json()).then(d => setApplications(d.applications || [])).catch(e => console.error(e));
    }
    if (activeView === 'admin_courses') {
      fetchApi('/api/admin/courses').then(r => r.json()).then(d => setCourses(d.courses || [])).catch(e => console.error(e));
    }
    if (activeView === 'admin_promos') {
      fetchApi('/api/admin/promo_codes').then(r => r.json()).then(d => setPromos(d.promos || [])).catch(e => console.error(e));
    }
    if (activeView === 'admin_categories' || activeView === 'admin_edit_category') {
      fetchCategories();
    }
    if (activeView === 'admin_create_course' || activeView === 'admin_manage_courses' || activeView === 'admin_cert_repo' || activeView === 'admin_edit_course') {
      if (allCategories.length === 0) fetchAllCategoriesForSelect();
      if (allInstructors.length === 0) fetchApi('/api/admin/all-instructors').then(r => r.json()).then(d => setAllInstructors(d.instructors || [])).catch(e => console.error(e));
    }
    if (activeView === 'admin_manage_courses' || activeView === 'admin_cert_repo') {
      setIsCoursesLoading(true);
      fetchApi(`/api/admin/courses/all?page=${coursePage}&search=${encodeURIComponent(courseSearch)}&categoryId=${courseCategory}&status=${courseStatus}`)
        .then(r => r.json())
        .then(d => {
          setAllCourses(d.courses || []);
          setCoursePagination(d.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        })
        .finally(() => setIsCoursesLoading(false));
    }

    if (['admin_transactions', 'admin_failed_payments', 'admin_refunds_history'].includes(activeView)) {
      setIsPaymentsLoading(true);
      const queryParams = new URLSearchParams(paymentFilters as any);
      if (activeView === 'admin_failed_payments') queryParams.set('status', 'failed');
      if (activeView === 'admin_refunds_history') queryParams.set('status', 'refunded,partially_refunded');

      fetchApi(`/api/admin/transactions?${queryParams.toString()}`)
        .then(r => r.json())
        .then(d => {
          setPayments(d.transactions || []);
          setPaymentPagination(d.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        })
        .finally(() => setIsPaymentsLoading(false));
    }

    if (activeView === 'admin_revenue_analytics') {
      setIsPaymentsLoading(true);
      Promise.all([
        fetchApi('/api/admin/revenue/overview').then(r => r.json()),
        fetchApi('/api/admin/revenue/analytics').then(r => r.json())
      ]).then(([overviewData, analyticsData]) => {
        setPaymentAnalytics(overviewData.overview || null);
        setPaymentChartData(overviewData.chartData || []);
        setPaymentDeepAnalytics(analyticsData || null);
      }).finally(() => setIsPaymentsLoading(false));
    }
  }, [activeView, user, coursePage, courseSearch, courseStatus, courseCategory, paymentFilters]);

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    setDeletingCourseId(id);
    try {
      const res = await fetchApi(`/api/admin/courses/all?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Course deleted successfully', 'success');
        if (allCourses.length === 1 && coursePage > 1) {
          setCoursePage(p => p - 1);
        } else {
          setAllCourses(prev => prev.filter(c => c.id !== id));
        }
        setDeletingCourseId(null);
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
    if (actioningInstructorId) return;
    setActioningInstructorId(id);
    setInstructorAction(action);
    try {
      const res = await fetchApi('/api/admin/instructors', {
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
    if (actioningCourseId) return;
    setActioningCourseId(id);
    setCourseAction(action);
    try {
      const res = await fetchApi('/api/admin/courses', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== id));
      } else {
        alert(`Failed to ${action === 'approve' ? 'publish' : 'reject'} course`);
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
      const discountType = formData.get('discount_type');
      const discountValue = Number(formData.get('discount_value'));
      const maxUses = formData.get('max_uses') ? Number(formData.get('max_uses')) : null;
      const expiryDate = formData.get('expiry_date') ? new Date(formData.get('expiry_date') as string).toISOString() : null;

      const payload = {
        code: formData.get('code'),
        discount_percentage: discountType === 'percentage' ? discountValue : null,
        discount_amount: discountType === 'amount' ? discountValue : null,
        max_uses: maxUses,
        expiry_date: expiryDate
      };

      const res = await fetchApi('/api/admin/promo_codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      const res = await fetchApi('/api/admin/refunds', {
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
      const res = await fetchApi('/api/admin/certificates', {
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
    payload.details = createDetails.map(d => d.trim()).filter(Boolean);
    try {
      const res = await fetchApi('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Course created successfully!', 'success');
        form.reset();
        setCreateLogoUrl('');
        setCreateDetails(['']);
        setActiveView('admin_manage_courses');
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
    payload.details = editDetails.map(d => d.trim()).filter(Boolean);
    try {
      const res = await fetchApi('/api/admin/courses/all', {
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
    await fetchApi("/api/auth/logout", { method: "POST" });
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

          <button className={`sb-item ${activeView === "admin_manage_courses" || activeView === "admin_edit_course" ? "active" : ""}`} onClick={() => { setActiveView("admin_manage_courses"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🛠️</span>
            <span className="sb-item-label">Manage Courses</span>
          </button>

          <button className={`sb-item ${activeView === "admin_categories" || activeView === "admin_edit_category" ? "active" : ""}`} onClick={() => { setActiveView("admin_categories"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🗂️</span>
            <span className="sb-item-label">Manage Categories</span>
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

          {/* ---- CATEGORIES ---- */}
          {activeView === "admin_categories" && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Platform Controls</div>
                  <div className="section-title">Manage Categories</div>
                </div>
              </div>

              <div className="admin-card" style={{ marginBottom: '40px' }}>
                <h3 style={{ color: 'var(--ink)', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>
                  Create New Category
                </h3>
                <form onSubmit={handleCreateCategory} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', padding: '24px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Category Name *</label>
                      <input name="name" type="text" className="prompt-input" required placeholder="e.g. Data Science" disabled={submittingCategory} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Slug (URL) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Auto-generated if empty)</span></label>
                      <input name="slug" type="text" className="prompt-input" placeholder="e.g. data-science" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Parent Category <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <select name="parent_id" className="prompt-input" defaultValue="" disabled={submittingCategory}>
                        <option value="">None (Top-Level Category)</option>
                        {categoriesList
                          .filter(c => c.parent_id === null)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Icon (Emoji) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <input name="icon" type="text" className="prompt-input" placeholder="e.g. 📊" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Description <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <textarea name="description" className="prompt-input" placeholder="Provide category overview..." style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} disabled={submittingCategory}></textarea>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Theme Color (Hex) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input name="color" type="color" className="prompt-input" value={colorValue} onChange={e => setColorValue(e.target.value)} style={{ width: '40px', padding: '2px', height: '40px', cursor: 'pointer' }} disabled={submittingCategory} />
                        <input type="text" className="prompt-input" value={colorValue} onChange={e => setColorValue(e.target.value)} placeholder="#6366f1" disabled={submittingCategory} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Accent Name <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <input name="accent" type="text" className="prompt-input" placeholder="e.g. indigo, emerald" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" className="enrol-cta indigo" style={{ width: 'auto', padding: '14px 40px', marginTop: 0 }} disabled={submittingCategory}>
                      {submittingCategory ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Create Category'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="admin-card">
                <h3 style={{ color: 'var(--ink)', marginBottom: '16px', fontSize: '16px', fontWeight: '800' }}>Existing Categories</h3>
                {isLoadingCategories ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}><div className="btn-loader" style={{ borderTopColor: 'var(--indigo)' }}></div></div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Icon</th>
                          <th>Name</th>
                          <th>Slug (URL)</th>
                          <th>Parent</th>
                          <th style={{ width: '100px' }}>Courses</th>
                          <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoriesList.map(cat => (
                          <tr key={cat.id}>
                            <td data-label="Icon" style={{ fontSize: '20px', textAlign: 'center' }}>{cat.icon || '—'}</td>
                            <td data-label="Name" style={{ fontWeight: '800' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                {cat.color && (
                                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }}></span>
                                )}
                                {cat.name}
                              </span>
                            </td>
                            <td data-label="Slug" style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{cat.slug}</td>
                            <td data-label="Parent">
                              {cat.parent_name ? (
                                <span className="admin-badge" style={{ background: 'var(--border)', color: 'var(--ink)' }}>{cat.parent_name}</span>
                              ) : (
                                <span style={{ color: 'var(--text-3)', fontSize: '12px', fontStyle: 'italic' }}>Top-Level</span>
                              )}
                            </td>
                            <td data-label="Courses" style={{ fontWeight: 'bold', textAlign: 'center' }}>{cat.course_count}</td>
                            <td data-label="Actions">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="qa-btn" onClick={() => { setEditingCategory(cat); setActiveView('admin_edit_category'); }} style={{ background: 'var(--border)', color: 'var(--indigo)', padding: '6px 12px', fontSize: '12px' }}>
                                  Edit
                                </button>
                                <button className="qa-btn" onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#FEE2E2', color: '#EF4444', padding: '6px 12px', fontSize: '12px' }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {categoriesList.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>No categories configured.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- EDIT CATEGORY ---- */}
          {activeView === "admin_edit_category" && editingCategory && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Platform Controls</div>
                  <div className="section-title">Edit Category: {editingCategory.name}</div>
                </div>
                <button type="button" className="admin-btn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }} onClick={() => { setEditingCategory(null); setActiveView('admin_categories'); }}>
                  ← Back to Categories
                </button>
              </div>

              <div className="admin-card">
                <form onSubmit={handleUpdateCategory} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', padding: '24px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Category Name *</label>
                      <input name="name" type="text" className="prompt-input" required defaultValue={editingCategory.name} placeholder="e.g. Data Science" disabled={submittingCategory} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Slug (URL) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Auto-generated if empty)</span></label>
                      <input name="slug" type="text" className="prompt-input" defaultValue={editingCategory.slug} placeholder="e.g. data-science" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Parent Category <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <select name="parent_id" className="prompt-input" defaultValue={editingCategory.parent_id || ''} disabled={submittingCategory}>
                        <option value="">None (Top-Level Category)</option>
                        {categoriesList
                          .filter(c => c.parent_id === null && c.id !== editingCategory.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Icon (Emoji) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <input name="icon" type="text" className="prompt-input" defaultValue={editingCategory.icon || ''} placeholder="e.g. 📊" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Description <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <textarea name="description" className="prompt-input" defaultValue={editingCategory.description || ''} placeholder="Provide category overview..." style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} disabled={submittingCategory}></textarea>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Theme Color (Hex) <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input name="color" type="color" className="prompt-input" value={colorValue} onChange={e => setColorValue(e.target.value)} style={{ width: '40px', padding: '2px', height: '40px', cursor: 'pointer' }} disabled={submittingCategory} />
                        <input type="text" className="prompt-input" value={colorValue} onChange={e => setColorValue(e.target.value)} placeholder="#6366f1" disabled={submittingCategory} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="admin-label">Accent Name <span style={{ textTransform: 'none', color: 'var(--text-3)' }}>(Optional)</span></label>
                      <input name="accent" type="text" className="prompt-input" defaultValue={editingCategory.accent || ''} placeholder="e.g. indigo, emerald" disabled={submittingCategory} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" className="enrol-cta indigo" style={{ width: 'auto', padding: '14px 40px', marginTop: 0 }} disabled={submittingCategory}>
                      {submittingCategory ? <div className="btn-loader" style={{ borderTopColor: '#fff' }}></div> : 'Update Category'}
                    </button>
                    <button type="button" className="enrol-cta" style={{ width: 'auto', padding: '14px 40px', marginTop: 0, background: 'var(--border)', color: 'var(--ink)' }} onClick={() => { setEditingCategory(null); setActiveView('admin_categories'); }} disabled={submittingCategory}>
                      Cancel Edit
                    </button>
                  </div>
                </form>
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
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Discount Type</label>
                      <select name="discount_type" className="prompt-input" style={{ width: '100%' }} disabled={creatingPromo}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Flat Amount (₹)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Value</label>
                      <input name="discount_value" type="number" step="0.01" className="prompt-input" required placeholder="20" style={{ width: '100%' }} disabled={creatingPromo} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Max Uses (Optional)</label>
                      <input name="max_uses" type="number" className="prompt-input" placeholder="e.g. 50" style={{ width: '100%' }} disabled={creatingPromo} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Expiry Date (Optional)</label>
                      <input name="expiry_date" type="date" className="prompt-input" style={{ width: '100%' }} disabled={creatingPromo} />
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
                        <th>Max Uses</th>
                        <th>Expiry</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => (
                        <tr key={p.id}>
                          <td data-label="Code" style={{ fontWeight: '800', letterSpacing: '1px', color: 'var(--indigo)' }}>{p.code}</td>
                          <td data-label="Discount" style={{ fontWeight: '700' }}>
                            <span className="admin-badge success">
                              {p.discount_amount ? `₹${parseFloat(p.discount_amount)} OFF` : `${parseFloat(p.discount_percentage)}% OFF`}
                            </span>
                          </td>
                          <td data-label="Max Uses" style={{ color: 'var(--text-3)' }}>{p.max_uses ? p.max_uses : 'Unlimited'}</td>
                          <td data-label="Expiry" style={{ color: 'var(--text-3)' }}>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'Never'}</td>
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
                          <option key={cat.id} value={cat.id}>
                            {cat.parent_name ? `\u00A0\u00A0\u00A0\u00A0${cat.name}` : cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="admin-label">Format</label>
                      <select name="format" className="prompt-input" required disabled={creatingCourse}>
                        <option value="live">🔴 Live session</option>
                        <option value="recorded" disabled>📹 Recorded (Coming Soon)</option>
                        <option value="inperson" disabled>📍 In-person (Coming Soon)</option>
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
                          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <img src={createLogoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCreateLogoUpload}
                            disabled={creatingCourse || uploadingCreateLogo}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
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

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="admin-label">Course Details / "What's included"</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
                      {createDetails.map((detail, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                          <textarea
                            className="prompt-input"
                            value={detail}
                            onChange={(e) => {
                              const newDetails = [...createDetails];
                              newDetails[idx] = e.target.value;
                              setCreateDetails(newDetails);
                            }}
                            placeholder="e.g. Lifetime access to recordings"
                            disabled={creatingCourse}
                            maxLength={250}
                            style={{ minHeight: '60px', resize: 'vertical' }}
                          />
                          <button
                            type="button"
                            className="admin-btn"
                            style={{ padding: '0 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            onClick={() => {
                              const newDetails = createDetails.filter((_, i) => i !== idx);
                              setCreateDetails(newDetails);
                            }}
                            disabled={creatingCourse}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {createDetails.length < 8 && (
                        <button
                          type="button"
                          className="admin-btn"
                          style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--indigo)', border: '1px dashed var(--indigo)' }}
                          onClick={() => setCreateDetails([...createDetails, ''])}
                          disabled={creatingCourse}
                        >
                          + Add Detail
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="admin-label">What you'll learn (optional)</label>
                    <textarea
                      name="what_you_will_learn"
                      className="prompt-input"
                      placeholder="e.g. Master the intersection of financial markets..."
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      disabled={creatingCourse}
                    ></textarea>
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
                          <option key={cat.id} value={cat.id}>
                            {cat.parent_name ? `\u00A0\u00A0\u00A0\u00A0${cat.name}` : cat.name}
                          </option>
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
                    <div className="form-group">
                      <label className="admin-label">Format</label>
                      <select name="format" className="prompt-input" required defaultValue={editingCourse.format || 'live'} disabled={updatingCourse}>
                        <option value="live">🔴 Live session</option>
                        <option value="recorded" disabled>📹 Recorded (Coming Soon)</option>
                        <option value="inperson" disabled>📍 In-person (Coming Soon)</option>
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
                          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <img src={editLogoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditLogoUpload}
                            disabled={updatingCourse || uploadingEditLogo}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
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

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="admin-label">Course Details / "What's included"</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
                      {editDetails.map((detail, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                          <textarea
                            className="prompt-input"
                            value={detail}
                            onChange={(e) => {
                              const newDetails = [...editDetails];
                              newDetails[idx] = e.target.value;
                              setEditDetails(newDetails);
                            }}
                            placeholder="e.g. Lifetime access to recordings"
                            disabled={updatingCourse}
                            maxLength={250}
                            style={{ minHeight: '60px', resize: 'vertical' }}
                          />
                          <button
                            type="button"
                            className="admin-btn"
                            style={{ padding: '0 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            onClick={() => {
                              const newDetails = editDetails.filter((_, i) => i !== idx);
                              setEditDetails(newDetails);
                            }}
                            disabled={updatingCourse}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {editDetails.length < 8 && (
                        <button
                          type="button"
                          className="admin-btn"
                          style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--indigo)', border: '1px dashed var(--indigo)' }}
                          onClick={() => setEditDetails([...editDetails, ''])}
                          disabled={updatingCourse}
                        >
                          + Add Detail
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="admin-label">What you'll learn (optional)</label>
                    <textarea
                      name="what_you_will_learn"
                      className="prompt-input"
                      placeholder="e.g. Master the intersection of financial markets..."
                      defaultValue={editingCourse.what_you_will_learn || ''}
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      disabled={updatingCourse}
                    ></textarea>
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
          {activeView === 'admin_transactions' && (
            <div className="view active fade-up">
              <div className="section-hd">
                <div>
                  <div className="section-label">Financial Operations</div>
                  <div className="section-title">All Transactions</div>
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

          {activeView === 'admin_failed_payments' && (
            <div className="view active fade-up">
              <FailedPayments />
            </div>
          )}

          {activeView === 'admin_refunds_history' && (
            <div className="view active fade-up">
              <RefundsHistory />
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
                <RevenueCards analytics={paymentAnalytics} chartData={paymentChartData} deepAnalytics={paymentDeepAnalytics} />
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
            onRefund={async (paymentId, amount) => {
              // Trigger refund API
              try {
                const res = await fetchApi('/api/admin/refunds/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ payment_id: paymentId, amount, action: 'process', reason_category: 'Admin UI Refund' })
                });
                const data = await res.json();
                if (res.ok) {
                  showToast('Refund requested successfully', 'success');
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
