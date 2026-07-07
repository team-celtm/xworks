"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { formatDuration } from '@/lib/utils';
import './catalogue.css';
import Logo from '../components/Logo';
import AlertModal from '../components/AlertModal';
import { fetchApi } from '@/lib/apiClient';

declare global {
  interface Window {
    Razorpay: any;
  }
}

import EnrolModal from '../components/EnrolModal';



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
  scheduledStart?: string;
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
    level: searchParams?.get('level') || 'all',
    format: searchParams?.get('format') || 'all',
    price: searchParams?.get('price') || 'all',
    search: searchParams?.get('search') || '',
    sort: searchParams?.get('sort') || 'popular',
    page: parseInt(searchParams?.get('page') || '1', 10),
    perPage: 12,
  });

  useEffect(() => {
    setState({
      cat: searchParams?.get('cat') || 'all',
      level: searchParams?.get('level') || 'all',
      format: searchParams?.get('format') || 'all',
      price: searchParams?.get('price') || 'all',
      search: searchParams?.get('search') || '',
      sort: searchParams?.get('sort') || 'popular',
      page: parseInt(searchParams?.get('page') || '1', 10),
      perPage: 12,
    });
  }, [searchParams]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setUserLoading(true);
      try {
        const res = await fetchApi("/api/auth/me");
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
        const res = await fetchApi('/api/categories');
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
        const res = await fetchApi(`/api/categories?parent=${state.cat}`);
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

        const res = await fetchApi(`/api/courses?${params.toString()}`);
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
    const newState = { ...state, ...updates, page: updates.page ?? 1 };
    setState(newState);
    
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (k: string, v: string, def: string) => v !== def ? params.set(k, v) : params.delete(k);
    
    setOrDel('cat', newState.cat, 'all');
    setOrDel('level', newState.level, 'all');
    setOrDel('format', newState.format, 'all');
    setOrDel('price', newState.price, 'all');
    setOrDel('search', newState.search, '');
    setOrDel('sort', newState.sort, 'popular');
    setOrDel('page', String(newState.page), '1');
    
    router.replace(`?${params.toString()}`, { scroll: false });
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
  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [enrolModalData, setEnrolModalData] = useState<any>(null);

  const openEnrol = async (w: Workshop) => {
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
    const basePrice = Number(w.price) || 0;
    setEnrolModalData({
      id: w.id,
      name: w.name,
      meta: `by ${w.instructor} · ★ ${w.rating} · ${formatDuration(w.dur)} · ${w.level}`,
      basePrice,
      thumbBg: w.g,
      thumbEmoji: w.logo || w.emoji,
      isLive: w.live,
      isNearby: w.nearby,
    });
    setIsEnrolModalOpen(true);
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
                                alt={w.name || "Workshop Logo"} 
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
      <EnrolModal 
        isOpen={isEnrolModalOpen} 
        onClose={() => setIsEnrolModalOpen(false)} 
        initialData={enrolModalData} 
        user={user} 
        onSuccess={() => {
          router.push('/dashboard?view=upcoming');
        }} 
      />
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
