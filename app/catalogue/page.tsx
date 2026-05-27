"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { formatDuration } from '@/lib/utils';
import './catalogue.css';
import Logo from '../components/Logo';
import AlertModal from '../components/AlertModal';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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


interface Workshop {
  id: number | string;
  slug: string;
  cat: string;
  catLabel: string;
  emoji: string;
  logo?: string;
  g: string;
  name: string;
  instructor: string;
  level: string;
  dur: number;
  price: number;
  rating: number;
  tag: string;
  tagLabel: string;
  live: boolean;
  nearby: boolean;
  distance?: string;
  createdAt?: string;
}

interface EnrolData {
  id?: string | number;
  name?: string;
  meta?: string;
  price?: string;
  basePrice?: number;
  finalPrice?: number;
  format?: string;
  formatLabel?: string;
  date?: string;
  time?: string;
  payMethod?: string;
  thumbBg?: string;
  thumbEmoji?: string;
  discountAmt?: number;
  selectedSessionId?: string | null;
  courseOriginalPrice?: number;
}

function CatalogueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);

  const [state, setState] = useState({
    cat: searchParams?.get('cat') || 'all',
    level: 'all',
    format: 'all',
    price: 'all',
    search: '',
    sort: 'popular',
    page: 1,
    perPage: 12,
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);

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

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (Array.isArray(data)) setDbCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchSubs() {
      if (state.cat === 'all') {
        setSubCategories([]);
        return;
      }
      try {
        const res = await fetch(`/api/categories?parent=${state.cat}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubCategories(data);
      } catch (err) {
        console.error('Failed to load sub-categories:', err);
      }
    }
    fetchSubs();
  }, [state.cat]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (state.search.trim()) params.set('q', state.search.trim());
        if (state.cat !== 'all') params.set('category', state.cat);

        const res = await fetch(`/api/courses?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch workshops');
        const data = await res.json();
        setWorkshops(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search to avoid too many requests, but fetch immediately on cat change
    const timer = setTimeout(() => {
      fetchData();
    }, state.search.trim() ? 400 : 0);

    return () => clearTimeout(timer);
  }, [state.search, state.cat]);

  const updateState = (updates: Partial<typeof state>) => {
    setState((prev: any) => ({ ...prev, ...updates, page: updates.page ?? 1 }));
  };

  const filtered = useMemo(() => {
    let list = [...workshops];
    if (state.level !== 'all') list = list.filter(w => w.level === state.level || w.level === 'All levels');
    if (state.format === 'live') list = list.filter(w => w.live);
    if (state.format === 'recorded') list = list.filter(w => !w.live);
    if (state.format === 'nearby') list = list.filter(w => w.nearby);

    if (state.price === 'low') list = list.filter(w => w.price < 999);
    if (state.price === 'mid') list = list.filter(w => w.price >= 999 && w.price <= 2000);
    if (state.price === 'high') list = list.filter(w => w.price > 2000);

    /* search is now handled server-side */

    if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'duration') list.sort((a, b) => a.dur - b.dur);
    else if (state.sort === 'newest') list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else list.sort((a, b) => (b.tag === 'pop' ? 1 : 0) - (a.tag === 'pop' ? 1 : 0));

    // Nearby always floated to top
    list.sort((a, b) => (b.nearby ? 1 : 0) - (a.nearby ? 1 : 0));

    return list;
  }, [state, workshops]);

  const totalPages = Math.ceil(filtered.length / state.perPage);
  const paginated = filtered.slice((state.page - 1) * state.perPage, state.page * state.perPage);

  // Active filters
  const chips: Array<{ label: string, clear: () => void }> = [];
  const catNames: Record<string, string> = { ai: 'AI', programming: 'Programming', cybersecurity: 'Cybersecurity', data: 'Data & Analytics', design: 'Design', photography: 'Photography', wellness: 'Wellness', music: 'Music & Arts', business: 'Business', mindfulness: 'Mindfulness' };

  if (state.cat !== 'all') chips.push({ label: catNames[state.cat] || state.cat, clear: () => updateState({ cat: 'all' }) });
  if (state.level !== 'all') chips.push({ label: state.level, clear: () => updateState({ level: 'all' }) });
  if (state.format !== 'all') chips.push({ label: state.format === 'live' ? 'Live only' : state.format === 'recorded' ? 'Recorded' : state.format === 'nearby' ? '📍 Nearby' : state.format, clear: () => updateState({ format: 'all' }) });
  if (state.price !== 'all') chips.push({ label: state.price === 'low' ? 'Under ₹999' : state.price === 'mid' ? '₹999–₹2000' : '₹2000+', clear: () => updateState({ price: 'all' }) });
  if (state.search) chips.push({ label: `"${state.search}"`, clear: () => updateState({ search: '' }) });

  const resetAll = () => updateState({ cat: 'all', level: 'all', format: 'all', price: 'all', search: '', page: 1 });

  // Page texts
  const catNamesFull: Record<string, string> = { all: 'All Workshops', ai: 'Artificial Intelligence', programming: 'Programming', cybersecurity: 'Cybersecurity', data: 'Data & Analytics', design: 'Design & Creativity', photography: 'Photography', wellness: 'Lifestyle & Wellness', music: 'Music & Arts', business: 'Business & Finance', mindfulness: 'Mindfulness' };
  const pageTitleText = catNamesFull[state.cat] || 'All Workshops';
  const startIdx = (state.page - 1) * state.perPage + 1;
  const endIdx = Math.min(state.page * state.perPage, filtered.length);
  const subtitleText = filtered.length > 0 ? `Showing ${startIdx}–${endIdx} of ${filtered.length} workshops` : 'No workshops match your filters';

  // --- Modal Logic ---
  const [showEnrol, setShowEnrol] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<EnrolData>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [modalSessions, setModalSessions] = useState<any[]>([]);

  const openEnrol = async (w: Workshop) => {
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
    const basePrice = Number(w.price) || 0;
    const format = w.nearby ? 'inperson' : (w.live ? 'live' : 'recorded');
    const formatLabel = w.nearby ? 'in-person session' : (w.live ? 'live session' : 'recorded session');
    let initPrice = basePrice;
    if (format === 'inperson') {
      initPrice = basePrice + 500;
    } else if (format === 'recorded') {
      initPrice = Math.round(basePrice * 0.8);
    }
    setEnrolData({
      id: w.id,
      name: w.name,
      meta: `by ${w.instructor} · ★ ${w.rating} · ${formatDuration(w.dur)} · ${w.level}`,
      price: `₹${initPrice.toLocaleString('en-IN')}`,
      basePrice: initPrice,
      finalPrice: initPrice,
      courseOriginalPrice: basePrice,
      format,
      formatLabel,
      date: '', // filled from sessions
      time: '',
      payMethod: 'UPI',
      thumbBg: w.g,
      thumbEmoji: w.logo || w.emoji
    });
    setEnrolStep(1);
    setShowEnrol(true);
    setPromoCode('');
    setPromoApplied(false);
    setPromoError('');

    try {
      const res = await fetch(`/api/courses/${w.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setModalSessions(data);
        if (data.length > 0) {
          const first = data[0];
          setEnrolData(prev => ({
            ...prev,
            selectedSessionId: first.id,
            date: new Date(first.scheduled_start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
            time: new Date(first.scheduled_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch modal sessions:', err);
    }
  };

  const closeEnrol = () => {
    setShowEnrol(false);
  };

  const enrolSelectFormat = (format: string) => {
    const labels: Record<string, string> = { live: 'live session', recorded: 'recorded access', inperson: 'in-person session' };
    const original = enrolData.courseOriginalPrice || enrolData.basePrice || 0;
    let newBasePrice = original;
    if (format === 'recorded') {
      newBasePrice = Math.round(original * 0.8);
    } else if (format === 'inperson') {
      newBasePrice = original + 500;
    }
    setEnrolData((prev: EnrolData) => ({
      ...prev,
      format,
      formatLabel: labels[format] || format,
      price: `₹${newBasePrice.toLocaleString('en-IN')}`,
      basePrice: newBasePrice,
      finalPrice: newBasePrice,
      discountAmt: 0
    }));
    setPromoCode('');
    setPromoApplied(false);
    setPromoError('');
  };

  const [modalEnrolmentId, setModalEnrolmentId] = useState<string | null>(null);

  const handleModalEnrol = async () => {
    if (!enrolData.id) return;

    setLoading(true);
    setEnrolStep(5); // Show processing screen
    setPromoError('Initializing payment gateway...');

    try {
      // If it's a paid course, start Razorpay flow
      if (enrolData.finalPrice && enrolData.finalPrice > 0) {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: enrolData.id,
            promoCode: promoApplied ? promoCode : null,
            format: enrolData.format,
            sessionId: enrolData.selectedSessionId
          })
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok) {
          if (orderRes.status === 401) {
            router.push(`/Login?returnUrl=/catalogue`);
            return;
          }
          setPromoError(orderData.error || 'Could not create payment order');
          setEnrolStep(6);
          setLoading(false);
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'XWORKS',
          description: `Enrolment for ${orderData.courseName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            setLoading(true);
            setEnrolStep(5);
            setPromoError('Verifying your payment securely...');

            try {
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  courseId: enrolData.id,
                  promoCode: promoApplied ? promoCode : null,
                  format: enrolData.format,
                  sessionId: enrolData.selectedSessionId
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                setModalEnrolmentId(verifyData.enrolmentId);

                // NEW: Session Registration
                if (enrolData.format === 'live' && enrolData.selectedSessionId) {
                  await fetch(`/api/sessions/${enrolData.selectedSessionId}/register`, { method: 'POST' });
                }

                setEnrolStep(4); // Success step
              } else {
                setPromoError(verifyData.error || 'Payment verification failed');
                setEnrolStep(6); // Failed step
              }
            } catch (vErr: any) {
              setPromoError(vErr.message || 'Verification connection failed');
              setEnrolStep(6);
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: '',
            email: '',
          },
          theme: { color: '#4F46E5' },
          modal: {
            ondismiss: () => {
              setLoading(false);
              setPromoError('Payment checkout was closed.');
              setEnrolStep(6); // Cancelled step
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Free Course Enrolment Flow
      setPromoError('Creating free enrolment...');
      const res = await fetch('/api/learner/enrolments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: enrolData.id,
          sessionId: enrolData.selectedSessionId
        })
      });

      if (res.status === 401) {
        router.push(`/Login?returnUrl=/catalogue`);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setModalEnrolmentId(data.enrolmentId);

        // NEW: Session Registration
        if (enrolData.format === 'live' && enrolData.selectedSessionId) {
          await fetch(`/api/sessions/${enrolData.selectedSessionId}/register`, { method: 'POST' });
        }

        setEnrolStep(4); // Success step
      } else {
        setPromoError(data.error || 'Failed to enrol');
        setEnrolStep(6);
      }
    } catch (err: any) {
      console.error('Enrol failed:', err);
      setPromoError(err.message || 'An error occurred during enrolment');
      setEnrolStep(6);
    } finally {
      setLoading(false);
    }
  };

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code');
      setPromoApplied(false);
      setEnrolData((prev: EnrolData) => ({ ...prev, finalPrice: prev.basePrice, discountAmt: 0 }));
      return;
    }
    setPromoLoading(true);
    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, courseId: enrolData.id, format: enrolData.format })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoApplied(true);
        const discount = Math.round((enrolData.basePrice || 0) * (data.discountPercentage / 100));
        setEnrolData((prev: EnrolData) => ({
          ...prev,
          finalPrice: (prev.basePrice || 0) - discount,
          discountAmt: discount
        }));
        setPromoError('');
        setTimeout(() => triggerPromoConfetti('promo-apply-btn'), 50);
      } else {
        setPromoError(data.error || 'Invalid code');
        setPromoApplied(false);
        setEnrolData((prev: EnrolData) => ({ ...prev, finalPrice: prev.basePrice, discountAmt: 0 }));
      }
    } catch (err) {
      setPromoError('Validation failed');
      setPromoApplied(false);
      setEnrolData((prev: EnrolData) => ({ ...prev, finalPrice: prev.basePrice, discountAmt: 0 }));
    } finally {
      setPromoLoading(false);
    }
  };

  // --- Handlers ---
  const handleCatChange = (cat: string) => updateState({ cat });
  const handleLevelChange = (level: string) => updateState({ level });
  const handleFormatChange = (format: string) => updateState({ format: state.format === format ? 'all' : format });

  return (
    <div className="catalogue-wrapper">
      {/* ══ NAV ══ */}
      <nav className="nav">
        <Logo />
        <div className="nav-right">
          {(() => {
            const dashboardPath = user?.role === 'admin' ? '/admin' : (user?.role === 'instructor' ? '/instructor' : '/dashboard');
            return (
              <>
                {userLoading ? (
                  <div className="btn-loader small" style={{ marginRight: '16px' }}></div>
                ) : user && (
                  <Link href={dashboardPath} className="nav-link-sm" onClick={() => setIsNavigating(true)}>
                    {isNavigating ? 'Loading...' : 'Dashboard'}
                  </Link>
                )}
              </>
            );
          })()}
          <button className="nav-back" onClick={() => router.back()}>← Back</button>
        </div>
      </nav>

      {/* ══ PAGE HEADER ══ */}
      <div className="page-header">
        <div className="page-eyebrow">Browse catalogue</div>
        <div className="page-title">{pageTitleText}</div>
        <div className="page-subtitle">100+ workshops across 10 categories</div>

        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search workshops, topics, instructors…"
              value={state.search}
              onChange={(e) => updateState({ search: e.target.value })}
            />
          </div>
          <div className="level-btns">
            {['All levels', 'Beginner', 'Intermediate', 'Advanced'].map(lbl => {
              const val = lbl === 'All levels' ? 'all' : lbl;
              return (
                <button
                  key={lbl}
                  className={`level-btn ${state.level === val ? 'active' : ''}`}
                  onClick={() => handleLevelChange(val)}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
          <select
            className="filter-select"
            value={state.format}
            onChange={(e) => updateState({ format: e.target.value })}
          >
            <option value="all">Any format</option>
            <option value="live">Live only</option>
            <option value="recorded" disabled>Recorded only (Coming soon)</option>
            <option value="nearby" disabled>📍 Nearby (Coming soon)</option>
          </select>
          <select
            className="filter-select"
            value={state.price}
            onChange={(e) => updateState({ price: e.target.value })}
          >
            <option value="all">Any price</option>
            <option value="low">Under ₹999</option>
            <option value="mid">₹999 – ₹2,000</option>
            <option value="high">₹2,000+</option>
          </select>
        </div>

        {subCategories.length > 0 && (
          <div className="subcat-row" style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {[{ slug: state.cat, name: 'All ' + pageTitleText }, ...subCategories].map(sc => (
              <button
                key={sc.slug}
                className={`subcat-chip ${state.cat === sc.slug ? 'active' : ''}`}
                onClick={() => handleCatChange(sc.slug)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  border: '1px solid var(--border-md)',
                  background: state.cat === sc.slug ? 'var(--indigo)' : 'var(--surface)',
                  color: state.cat === sc.slug ? '#fff' : 'var(--text-1)',
                  cursor: 'pointer'
                }}
              >
                {sc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ BODY ══ */}
      <div className="body-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Category</div>
            {[
              { id: 'all', icon: '🗂️', name: 'All categories', count: '100+' },
              ...dbCategories.map((c: any) => ({
                id: c.slug,
                icon: c.icon || '🎓',
                name: c.name,
                count: c.course_count
              }))
            ].map((c: any) => (
              <div
                key={c.id}
                className={`cat-item ${state.cat === c.id ? 'active' : ''}`}
                onClick={() => handleCatChange(c.id)}
              >
                <span className="cat-item-icon">{c.icon}</span>
                <span className="cat-item-name">{c.name}</span>
                {c.count !== undefined && <span className="cat-item-count" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>{c.count}</span>}
              </div>
            ))}
          </div>

          <div className="sidebar-divider"></div>

          <div className="sidebar-section">
            <div className="sidebar-label">Format</div>
            <div className="format-item" onClick={() => handleFormatChange('live')}>
              <input type="checkbox" checked={state.format === 'live'} readOnly />
              <label className="format-item-label">🔴 Live sessions</label>
            </div>
            <div className="format-item disabled" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
              <input type="checkbox" checked={false} disabled readOnly />
              <label className="format-item-label" style={{ cursor: 'not-allowed' }}>📹 Recorded (Coming soon)</label>
            </div>
          </div>

          <div className="sidebar-divider"></div>

          <div className="sidebar-section">
            <div className="sidebar-label">Location</div>
            <div className="format-item disabled" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
              <input type="checkbox" checked={false} disabled readOnly />
              <label className="format-item-label" style={{ cursor: 'not-allowed' }}>📍 Near me (Coming soon)</label>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="results-row">
            <div>
              <div className="results-info-title">{pageTitleText}</div>
              <div className="results-info-sub">{subtitleText}</div>
            </div>
            <div className="sort-row">
              Sort by
              <select
                className="sort-select-main"
                value={state.sort}
                onChange={(e) => updateState({ sort: e.target.value })}
              >
                <option value="popular">Most popular</option>
                <option value="newest">Newest first</option>
                <option value="rating">Rating: high to low</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="duration">Shortest first</option>
              </select>
            </div>
          </div>

          <div className="active-filters">
            {chips.map((c: any, i: number) => (
              <div key={i} className="active-chip" onClick={c.clear}>
                <span>{c.label}</span><span className="active-chip-x">×</span>
              </div>
            ))}
            {chips.length > 0 && (
              <span className="clear-all" onClick={resetAll}>Clear all</span>
            )}
          </div>

          <div className="wgrid">
            {loading ? (
              <div className="loading-state">
                <div className="loader"></div>
                <p>Curating best workshops for you...</p>
              </div>
            ) : error ? (
              <div className="empty-state">
                <div className="empty-emoji">⚠️</div>
                <div className="empty-title">Connection failed</div>
                <div className="empty-sub">{error}</div>
                <button className="reset-btn" onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : paginated.length === 0 ? (
              <div className="empty-state">
                <div className="empty-emoji">🔍</div>
                <div className="empty-title">No workshops found</div>
                <div className="empty-sub">Try different filters or search terms</div>
                <button className="reset-btn" onClick={resetAll}>Clear all filters</button>
              </div>
            ) : (
              paginated.map((w: any, i: number) => {
                const isNearby = w.nearby;
                const tagClass = isNearby ? 'tag-near' : w.tag === 'live' ? 'tag-live' : w.tag === 'new' ? 'tag-new' : w.tag === 'pop' ? 'tag-pop' : 'tag-rec';
                const tagLabel = isNearby ? '📍 Nearby' : w.tagLabel;
                const priceStr = '₹' + (Number(w.price) || 0).toLocaleString('en-IN');

                return (
                  <div
                    key={w.id}
                    className={`wcard ${isNearby ? 'nearby' : ''}`}
                    style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
                    onClick={() => router.push(`/courses/${w.slug}`)}
                  >
                    <div className="wcard-thumb">
                      <div className={`wcard-thumb-bg ${w.g}`}></div>
                      <div className="wcard-thumb-emoji">
                        {w.logo ? (
                          <>
                            <div className="card-logo-badge">
                              <img 
                                src={w.logo} 
                                alt="" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const badge = e.currentTarget.closest('.card-logo-badge') as HTMLElement;
                                  if (badge) badge.style.display = 'none';
                                  const fallback = badge?.nextSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                            </div>
                            <span style={{ display: 'none' }}>{w.emoji}</span>
                          </>
                        ) : (
                          w.emoji
                        )}
                      </div>
                      <div className={`wcard-tag ${tagClass}`}>{tagLabel}</div>
                    </div>
                    <div className="wcard-body">
                      <div className="wcard-cat">{w.catLabel}</div>
                      <div className="wcard-name">{w.name}</div>
                      <div className="wcard-instructor">{w.instructor}</div>
                      {isNearby && <div className="wcard-distance">📍 {w.distance} away</div>}
                      <div className="wcard-meta-row">
                        <span>⏱ {formatDuration(w.dur)} · {w.level}</span>
                        <span className="wcard-rating">★ {w.rating}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="wcard-price">{priceStr}</span>
                      </div>
                      <button
                        className={`wcard-enrol ${isNearby ? 'nearby-btn' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEnrol(w);
                        }}
                      >
                        {isNearby ? 'Join in-person →' : 'Enrol now →'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pag-btn arrow"
                onClick={() => updateState({ page: state.page - 1 })}
                disabled={state.page === 1}
                style={{ opacity: state.page === 1 ? 0.3 : 1 }}
              >‹</button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                if (totalPages > 7 && p > 3 && p < totalPages - 1 && Math.abs(p - state.page) > 1) {
                  if (p === 4 || p === totalPages - 2) return <span key={p} className="pag-dots">…</span>;
                  return null;
                }
                return (
                  <button
                    key={p}
                    className={`pag-btn ${p === state.page ? 'active' : ''}`}
                    onClick={() => updateState({ page: p })}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                className="pag-btn arrow"
                onClick={() => updateState({ page: state.page + 1 })}
                disabled={state.page === totalPages}
                style={{ opacity: state.page === totalPages ? 0.3 : 1 }}
              >›</button>
            </div>
          )}
        </main>
      </div>

      {/* ══ ENROL MODAL ══ */}
      {showEnrol && (
        <div className="enrol-backdrop open" onClick={(e) => { if ((e.target as HTMLElement).classList.contains('enrol-backdrop')) closeEnrol(); }}>
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
                    <div className={`enrol-thumb ${enrolData.thumbBg}`} style={{ background: 'linear-gradient(135deg,#1A2E5A,#3A7ACC)' }}>
                      {enrolData.thumbEmoji && (enrolData.thumbEmoji.startsWith('http') || enrolData.thumbEmoji.startsWith('/')) ? (
                        <img src={enrolData.thumbEmoji} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                      ) : (
                        enrolData.thumbEmoji
                      )}
                    </div>
                    <div>
                      <div className="enrol-course-name">{enrolData.name}</div>
                      <div className="enrol-course-meta">{enrolData.meta}</div>
                    </div>
                  </div>
                  <div className="enrol-section-label">Choose your format</div>
                  <div className="enrol-format-grid">
                    {[
                      { id: 'live', icon: '🔴', name: 'Live session', sub: 'Interactive · Q&A included' },
                      { id: 'recorded', icon: '📹', name: 'Recorded', sub: 'Watch anytime · Self-paced' },
                      { id: 'inperson', icon: '📍', name: 'In-person', sub: 'Nearby · Limited seats' }
                    ].map(f => {
                      const original = enrolData.courseOriginalPrice || 0;
                      let priceVal = original;
                      if (f.id === 'recorded') {
                        priceVal = Math.round(original * 0.8);
                      } else if (f.id === 'inperson') {
                        priceVal = original + 500;
                      }
                      const isComingSoon = f.id === 'recorded' || f.id === 'inperson';
                      return (
                        <div
                          key={f.id}
                          className={`enrol-format-btn ${enrolData.format === f.id && !isComingSoon ? 'selected' : ''} ${isComingSoon ? 'disabled' : ''}`}
                          style={isComingSoon ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                          onClick={() => { if (!isComingSoon) enrolSelectFormat(f.id); }}
                        >
                          <div className="enrol-format-icon" style={isComingSoon ? { opacity: 0.6 } : {}}>{f.icon}</div>
                          <div className="enrol-format-name">{f.name} {isComingSoon && <span style={{ fontSize: '9px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Coming soon</span>}</div>
                          <div className="enrol-format-sub">{f.sub}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '5px', color: isComingSoon ? '#94A3B8' : '#3730A3' }}>
                            ₹{priceVal.toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="enrol-divider"></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#4B5080' }}>Price for <span>{enrolData.formatLabel}</span></div>
                    <div style={{ fontFamily: '"Syne", sans-serif', fontSize: '20px', fontWeight: 800, color: '#3730A3' }}>
                      ₹{(enrolData.basePrice || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9294B8', marginBottom: '18px' }}>Includes certificate · Lifetime recording access · Class notes PDF</div>
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
                  <div className="enrol-date-grid">
                    {modalSessions.length > 0 ? (
                      modalSessions.map((s: any) => {
                        const d = new Date(s.scheduled_start);
                        const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
                        const num = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
                        const isFull = s.max_seats && s.registered_count >= s.max_seats;

                        return (
                          <button
                            key={s.id}
                            className={`enrol-date-btn ${enrolData.selectedSessionId === s.id ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                            disabled={isFull}
                            style={{ height: 'auto', padding: '12px 8px' }}
                            onClick={() => setEnrolData((prev: EnrolData) => ({
                              ...prev,
                              selectedSessionId: s.id,
                              date: `${day} ${num}`,
                              time
                            }))}
                          >
                            <div className="enrol-date-day">{day}</div>
                            <div className="enrol-date-num">{num}</div>
                            <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>{time}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ gridColumn: '1/-1', padding: '16px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
                        No upcoming live sessions found.
                      </div>
                    )}
                  </div>

                  {enrolData.selectedSessionId && (
                    <>
                      <div className="enrol-section-label">Selected slot</div>
                      <div className="enrol-session-info">
                        {enrolData.date as string} · {enrolData.time as string} &nbsp;·&nbsp; {enrolData.format === 'live' ? 'Online via Zoom' : 'Location TBD'}
                      </div>
                    </>
                  )}

                  <button className="enrol-cta" onClick={() => setEnrolStep(3)}>Continue to payment →</button>
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
                  <div className="enrol-order-row"><span className="enrol-order-label">Workshop</span><span className="enrol-order-val">{enrolData.name}</span></div>
                  <div className="enrol-order-row"><span className="enrol-order-label">Format</span><span className="enrol-order-val">₹{(enrolData.basePrice || 0).toLocaleString('en-IN')}</span></div>
                  <div className="enrol-order-row"><span className="enrol-order-label">Platform fee</span><span className="enrol-order-val">₹0</span></div>

                  {promoApplied && (
                    <div className="enrol-order-row promo-discount-row">
                      <span className="enrol-order-label" style={{ color: '#16A34A' }}>Promo discount</span>
                      <span className="enrol-order-val" style={{ color: '#16A34A' }}>−₹{(enrolData.discountAmt || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="enrol-divider"></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="enrol-total">Total</span>
                    <span key={enrolData.finalPrice} className="enrol-total enrol-total-price-val">₹{(enrolData.finalPrice || 0).toLocaleString('en-IN')}</span>
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
                          setPromoError('');
                          setPromoApplied(false);
                          setEnrolData((prev: EnrolData) => ({ ...prev, finalPrice: prev.basePrice, discountAmt: 0 }));
                        }
                      }}
                      disabled={promoLoading}
                    />
                    <button id="promo-apply-btn" className={`enrol-promo-apply ${promoLoading ? 'loading' : ''}`} onClick={applyPromo} disabled={promoLoading}>
                      {promoLoading ? <span className="promo-spinner"></span> : 'Apply'}
                    </button>
                  </div>

                  {promoApplied && <div className="enrol-promo-ok" style={{ display: 'flex' }}>✓ Code applied — 20% off!</div>}
                  {promoError && <div className="enrol-promo-ok" style={{ display: 'flex', color: '#D84040' }}>{promoError}</div>}

                  <div className="enrol-section-label">Pay with</div>
                  <div className="enrol-pay-methods">
                    {['UPI', 'Card', 'Net banking', 'EMI'].map(m => (
                      <button
                        key={m}
                        className={`enrol-pay-btn ${enrolData.payMethod === m ? 'selected' : ''}`}
                        onClick={() => setEnrolData((prev: EnrolData) => ({ ...prev, payMethod: m }))}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="enrol-upi-field">
                    {enrolData.payMethod === 'UPI' && <span>UPI ID: &nbsp;<strong>priya@okaxis</strong></span>}
                    {enrolData.payMethod === 'Card' && <span style={{ color: '#4B5080' }}>Card ending in &nbsp;<strong>•••• 4242</strong> &nbsp;(Visa)</span>}
                    {enrolData.payMethod === 'Net banking' && <span style={{ color: '#4B5080' }}>Bank: &nbsp;<strong>HDFC Bank</strong></span>}
                    {enrolData.payMethod === 'EMI' && <span style={{ color: '#4B5080' }}>EMI: &nbsp;<strong>3 × ₹{(Math.round((enrolData.finalPrice || 0) / 3)).toLocaleString('en-IN')}/month</strong> &nbsp;at 0% interest</span>}
                  </div>
                  <button
                    className={`enrol-cta coral ${loading ? 'btn-loading' : ''}`}
                    onClick={handleModalEnrol}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="btn-loader"></div>
                    ) : (enrolData.finalPrice || 0) === 0 ? (
                      'Enrol for Free →'
                    ) : (
                      `Pay ₹${(enrolData.finalPrice || 0).toLocaleString('en-IN')} securely →`
                    )}
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
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Date & time</span><span className="enrol-confirm-val">{enrolData.date} · {enrolData.time}</span></div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Format</span><span className="enrol-confirm-val">{enrolData.format === 'live' ? 'Live · Zoom' : enrolData.format === 'recorded' ? 'Recorded · Watch anytime' : 'In-person · Venue confirmed'}</span></div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: '#3730A3' }}>₹{(enrolData.finalPrice || 0).toLocaleString('en-IN')}</span></div>
                  </div>
                  <div className="enrol-success-btns">
                    <button className="enrol-success-btn" onClick={closeEnrol}>Close</button>
                    <button
                      className="enrol-success-btn primary"
                      onClick={() => {
                        closeEnrol();
                        if (modalEnrolmentId) router.push(`/player/${modalEnrolmentId}`);
                        else router.push(user?.role === 'admin' ? '/admin' : '/dashboard/enrolments');
                      }}
                    >
                      Start Learning →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {enrolStep === 5 && (
              <div className="enrol-status-container" style={{ padding: '60px 24px' }}>
                <div className="status-icon-box">
                  <div className="status-spinner"></div>
                </div>
                <div className="status-title">{promoError || 'Processing Payment'}</div>
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
                <div className="status-desc">{promoError || 'The payment transaction could not be completed. Please check your connection and try again.'}</div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="status-btn" onClick={() => { setPromoError(''); setEnrolStep(3); }}>Try Again</button>
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
      )}
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Access Restricted"
        message="Administrators and Instructors are not allowed to enrol in or make payments for courses."
      />
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading catalogue...</div>}>
      <CatalogueContent />
    </Suspense>
  );
}
