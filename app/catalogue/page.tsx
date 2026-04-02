'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './catalogue.css';

interface Workshop {
  id: number | string;
  slug: string;
  cat: string;
  catLabel: string;
  emoji: string;
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
}

interface EnrolData {
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
}

export default function CataloguePage() {
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
    setState(prev => ({ ...prev, ...updates, page: updates.page ?? 1 }));
  };

  const filtered = useMemo(() => {
    let list = [...workshops];
    if (state.cat !== 'all') list = list.filter(w => w.cat === state.cat);
    if (state.level !== 'all') list = list.filter(w => w.level === state.level || w.level === 'All levels');
    if (state.format === 'live') list = list.filter(w => w.live);
    if (state.format === 'recorded') list = list.filter(w => !w.live);
    if (state.format === 'nearby') list = list.filter(w => w.nearby);
    
    if (state.price === 'low') list = list.filter(w => w.price < 999);
    if (state.price === 'mid') list = list.filter(w => w.price >= 999 && w.price <= 2000);
    if (state.price === 'high') list = list.filter(w => w.price > 2000);

/* search is now handled server-side */

    if (state.sort === 'rating') list.sort((a,b) => b.rating - a.rating);
    else if (state.sort === 'price-asc') list.sort((a,b) => a.price - b.price);
    else if (state.sort === 'price-desc') list.sort((a,b) => b.price - a.price);
    else if (state.sort === 'duration') list.sort((a,b) => a.dur - b.dur);
    else if (state.sort === 'newest') list.sort((a,b) => (b.tag==='new'?1:0)-(a.tag==='new'?1:0));
    else list.sort((a,b) => (b.tag==='pop'?1:0)-(a.tag==='pop'?1:0));

    // Nearby always floated to top
    list.sort((a,b) => (b.nearby?1:0)-(a.nearby?1:0));

    return list;
  }, [state, workshops]);

  const totalPages = Math.ceil(filtered.length / state.perPage);
  const paginated = filtered.slice((state.page - 1) * state.perPage, state.page * state.perPage);

  // Active filters
  const chips: Array<{label: string, clear: () => void}> = [];
  const catNames: Record<string, string> = {ai:'AI',programming:'Programming',cybersecurity:'Cybersecurity',data:'Data & Analytics',design:'Design',photography:'Photography',wellness:'Wellness',music:'Music & Arts',business:'Business',mindfulness:'Mindfulness'};
  
  if (state.cat !== 'all') chips.push({label: catNames[state.cat] || state.cat, clear: () => updateState({cat: 'all'})});
  if (state.level !== 'all') chips.push({label: state.level, clear: () => updateState({level: 'all'})});
  if (state.format !== 'all') chips.push({label: state.format==='live'?'Live only':state.format==='recorded'?'Recorded':state.format==='nearby'?'📍 Nearby':state.format, clear: () => updateState({format: 'all'})});
  if (state.price !== 'all') chips.push({label: state.price==='low'?'Under ₹999':state.price==='mid'?'₹999–₹2000':'₹2000+', clear: () => updateState({price: 'all'})});
  if (state.search) chips.push({label: `"${state.search}"`, clear: () => updateState({search: ''})});

  const resetAll = () => updateState({ cat:'all', level:'all', format:'all', price:'all', search:'', page:1 });

  // Page texts
  const catNamesFull: Record<string, string> = {all:'All Workshops',ai:'Artificial Intelligence',programming:'Programming',cybersecurity:'Cybersecurity',data:'Data & Analytics',design:'Design & Creativity',photography:'Photography',wellness:'Lifestyle & Wellness',music:'Music & Arts',business:'Business & Finance',mindfulness:'Mindfulness'};
  const pageTitleText = catNamesFull[state.cat] || 'All Workshops';
  const startIdx = (state.page-1)*state.perPage + 1;
  const endIdx = Math.min(state.page*state.perPage, filtered.length);
  const subtitleText = filtered.length > 0 ? `Showing ${startIdx}–${endIdx} of ${filtered.length} workshops` : 'No workshops match your filters';

  // --- Modal Logic ---
  const [showEnrol, setShowEnrol] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<EnrolData>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [modalSessions, setModalSessions] = useState<any[]>([]);

  const openEnrol = async (w: Workshop) => {
    setEnrolData({
      name: w.name,
      meta: `by ${w.instructor} · ★ ${w.rating} · ${w.dur} hrs · ${w.level}`,
      price: `₹${w.price.toLocaleString('en-IN')}`,
      basePrice: w.price,
      finalPrice: w.price,
      format: w.nearby ? 'inperson' : 'live', // fallback init
      formatLabel: w.nearby ? 'in-person session' : 'live session',
      date: '', // filled from sessions
      time: '',
      payMethod: 'UPI',
      thumbBg: w.g,
      thumbEmoji: w.emoji
    });
    setEnrolStep(1);
    setShowEnrol(true);
    setPromoCode('');
    setPromoApplied(false);
    setPromoError('');

    try {
      const res = await fetch(`/api/courses/id/${w.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setModalSessions(data);
        if (data.length > 0) {
           const first = data[0];
           setEnrolData(prev => ({
             ...prev, 
             date: new Date(first.scheduledStart).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
             time: new Date(first.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
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

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const valid = ['XWORKS20','FIRST20','WELCOME','LEARN20'];
    if (valid.includes(code) && !promoApplied) {
      setPromoApplied(true);
      const discount = Math.round((enrolData.basePrice || 0) * 0.20);
      setEnrolData((prev: EnrolData) => ({ ...prev, finalPrice: (prev.basePrice || 0) - discount, discountAmt: discount }));
      setPromoError('');
    } else if (promoApplied) {
      setPromoError('Promo already applied!');
    } else {
      setPromoError('Invalid code. Try XWORKS20');
    }
  };

  // --- Handlers ---
  const handleCatChange = (cat: string) => updateState({ cat });
  const handleLevelChange = (level: string) => updateState({ level });
  const handleFormatChange = (format: string) => updateState({ format: state.format === format ? 'all' : format });

  return (
    <div className="catalogue-wrapper">
      {/* ══ NAV ══ */}
      <nav className="nav" style={{ paddingInline: '20px' }}>
        <Link href="/" className="nav-logo">
          <div className="nav-bars"><div className="nav-bar"></div><div className="nav-bar"></div></div>
          X<span>WORKS</span>
        </Link>
        <button className="nav-back" onClick={() => router.back()}>← Back to XWORKS</button>
        <div className="nav-right" style={{ display: 'none' }}> {/* Hidden for logged in flow */}
          <a href="#" className="nav-link-sm">About us</a>
          <a href="#" className="nav-link-sm">Login</a>
          <a href="#" className="nav-cta">Sign up free →</a>
        </div>
      </nav>

      {/* ══ PAGE HEADER ══ */}
      <div className="page-header">
        <div className="page-eyebrow">Browse catalogue</div>
        <div className="page-title">{pageTitleText}</div>
        <div className="page-subtitle">176 workshops across 10 categories</div>

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
            <option value="recorded">Recorded only</option>
            <option value="nearby">📍 Nearby</option>
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
              { id:'all', icon:'🗂️', name:'All categories', count:176 },
              ...dbCategories.map(c => ({
                id: c.slug,
                icon: (record: any) => {
                  const icons: Record<string, string> = {ai:'🤖',programming:'💻',cybersecurity:'🔐',data:'📊',design:'🎨',photography:'📸',wellness:'🪴',music:'🎵',business:'💼',mindfulness:'🧘'};
                  return icons[c.slug] || '🎓';
                },
                name: c.name,
                count: 'many' // we don't have counts in the DB yet, but we'll use a placeholder
              }))
            ].map((c: any) => (
              <div 
                key={c.id} 
                className={`cat-item ${state.cat === c.id ? 'active' : ''}`}
                onClick={() => handleCatChange(c.id)}
              >
                <span className="cat-item-icon">{typeof c.icon === 'function' ? c.icon() : c.icon}</span>
                <span className="cat-item-name">{c.name}</span>
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
            <div className="format-item" onClick={() => handleFormatChange('recorded')}>
              <input type="checkbox" checked={state.format === 'recorded'} readOnly />
              <label className="format-item-label">📹 Recorded</label>
            </div>
          </div>

          <div className="sidebar-divider"></div>

          <div className="sidebar-section">
            <div className="sidebar-label">Location</div>
            <div className="format-item" onClick={() => handleFormatChange('nearby')}>
              <input type="checkbox" checked={state.format === 'nearby'} readOnly />
              <label className="format-item-label">📍 Near me &nbsp;<span className="nearby-badge">6</span></label>
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
            {chips.map((c, i) => (
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
              paginated.map((w, i) => {
                const isNearby = w.nearby;
                const tagClass = isNearby ? 'tag-near' : w.tag === 'live' ? 'tag-live' : w.tag === 'new' ? 'tag-new' : w.tag === 'pop' ? 'tag-pop' : 'tag-rec';
                const tagLabel = isNearby ? '📍 Nearby' : w.tagLabel;
                const priceStr = '₹' + w.price.toLocaleString('en-IN');
                
                return (
                  <div 
                    key={w.id} 
                    className={`wcard ${isNearby ? 'nearby' : ''}`} 
                    style={{ animationDelay: `${i*0.04}s`, cursor: 'pointer' }}
                    onClick={() => router.push(`/courses/${w.slug}`)}
                  >
                    <div className="wcard-thumb">
                      <div className={`wcard-thumb-bg ${w.g}`}></div>
                      <div className="wcard-thumb-emoji">{w.emoji}</div>
                      <div className={`wcard-tag ${tagClass}`}>{tagLabel}</div>
                    </div>
                    <div className="wcard-body">
                      <div className="wcard-cat">{w.catLabel}</div>
                      <div className="wcard-name">{w.name}</div>
                      <div className="wcard-instructor">{w.instructor}</div>
                      {isNearby && <div className="wcard-distance">📍 {w.distance} away</div>}
                      <div className="wcard-meta-row">
                        <span>⏱ {w.dur} hrs · {w.level}</span>
                        <span className="wcard-rating">★ {w.rating}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="wcard-price">{priceStr}</span>
                      </div>
                      <button 
                        className={`wcard-enrol ${isNearby ? 'nearby-btn' : ''}`} 
                        onClick={() => openEnrol(w)}
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
                if (totalPages > 7 && p > 3 && p < totalPages-1 && Math.abs(p-state.page) > 1) {
                  if (p === 4 || p === totalPages-2) return <span key={p} className="pag-dots">…</span>;
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
                      {enrolData.thumbEmoji}
                    </div>
                    <div>
                      <div className="enrol-course-name">{enrolData.name}</div>
                      <div className="enrol-course-meta">{enrolData.meta}</div>
                    </div>
                  </div>
                  <div className="enrol-section-label">Choose your format</div>
                  <div className="enrol-format-grid">
                    {[
                      { id: 'live', icon: '🔴', name: 'Live session', sub: 'Interactive · Q&A included', p: '₹1,299' },
                      { id: 'recorded', icon: '📹', name: 'Recorded', sub: 'Watch anytime · Self-paced', p: '₹999' },
                      { id: 'inperson', icon: '📍', name: 'In-person', sub: 'Nearby · Limited seats', p: '₹849' }
                    ].map(f => (
                      <div 
                        key={f.id} 
                        className={`enrol-format-btn ${enrolData.format === f.id ? 'selected' : ''}`}
                        onClick={() => {
                          setEnrolData((prev: EnrolData) => ({
                            ...prev, 
                            format: f.id, 
                            formatLabel: f.name.toLowerCase(),
                            price: f.p,
                            basePrice: parseInt(f.p.replace(/[^0-9]/g, '')),
                            finalPrice: parseInt(f.p.replace(/[^0-9]/g, ''))
                          }));
                          setPromoApplied(false);
                        }}
                      >
                        <div className="enrol-format-icon">{f.icon}</div>
                        <div className="enrol-format-name">{f.name}</div>
                        <div className="enrol-format-sub">{f.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="enrol-divider"></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#4B5080' }}>Price for <span>{enrolData.formatLabel}</span></div>
                    <div style={{ fontFamily: '"Syne", sans-serif', fontSize: '20px', fontWeight: 800, color: '#3730A3' }}>
                      {enrolData.price}
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
                  <div className="enrol-section-label">Available Sessions</div>
                  <div className="enrol-date-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                    {modalSessions.length > 0 ? modalSessions.map((s) => {
                      const sDate = new Date(s.scheduledStart);
                      const day = sDate.toLocaleDateString('en-IN', { weekday: 'short' });
                      const num = sDate.getDate();
                      const month = sDate.toLocaleDateString('en-IN', { month: 'short' });
                      const fullStr = sDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                      const timeStr = sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div 
                          key={s.id} 
                          className={`enrol-date-btn ${enrolData.date === fullStr && enrolData.time === timeStr ? 'sel' : ''}`}
                          onClick={() => setEnrolData((prev: EnrolData) => ({ ...prev, date: fullStr, time: timeStr }))}
                          style={{ height: 'auto', padding: '12px 8px', cursor: 'pointer' }}
                        >
                          <div className="enrol-date-day">{day}</div>
                          <div className="enrol-date-num" style={{ fontSize: '15px' }}>{num} {month}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>{timeStr}</div>
                        </div>
                      );
                    }) : (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-3)' }}>
                        No sessions scheduled yet. Check back soon!
                      </div>
                    )}
                  </div>
                  
                  {enrolData.date && (
                    <div className="enrol-session-info" style={{ marginTop: '24px', padding: '14px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-1)', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                      Selected: <strong>{enrolData.date as string}</strong> at <strong>{enrolData.time as string}</strong>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-3)' }}>Course link and materials will be sent to your email after enrolment.</div>
                    </div>
                  )}

                  <button 
                    className="enrol-cta" 
                    onClick={() => setEnrolStep(3)}
                    disabled={!enrolData.date}
                    style={{ marginTop: '24px', opacity: !enrolData.date ? 0.5 : 1, transition: 'all 0.3s ease' }}
                  >
                    Continue to payment →
                  </button>
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
                  <div className="enrol-order-row"><span className="enrol-order-label">Platform fee</span><span className="enrol-order-val">₹0</span></div>
                  
                  {promoApplied && (
                    <div className="enrol-order-row">
                      <span className="enrol-order-label" style={{ color: '#16A34A' }}>Promo discount</span>
                      <span className="enrol-order-val" style={{ color: '#16A34A' }}>−₹{(enrolData.discountAmt || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  <div className="enrol-divider"></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="enrol-total">Total</span>
                    <span className="enrol-total">₹{(enrolData.finalPrice || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="enrol-promo-row">
                    <input 
                      className="enrol-promo-input" 
                      type="text" 
                      placeholder="Promo code (try XWORKS20)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                    <button className="enrol-promo-apply" onClick={applyPromo}>Apply</button>
                  </div>
                  
                  {promoApplied && <div className="enrol-promo-ok" style={{ display: 'flex' }}>✓ Code applied — 20% off!</div>}
                  {promoError && <div className="enrol-promo-ok" style={{ display: 'flex', color: promoError.includes('!') ? '#1E1B4B' : '#D84040' }}>{promoError}</div>}
                  
                  <div className="enrol-section-label">Pay with</div>
                  <div className="enrol-pay-methods">
                    {['UPI', 'Card', 'Net banking', 'EMI'].map(m => (
                      <div 
                        key={m} 
                        className={`enrol-pay-btn ${enrolData.payMethod === m ? 'sel' : ''}`}
                        onClick={() => setEnrolData((prev: EnrolData) => ({ ...prev, payMethod: m }))}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="enrol-upi-field">
                    {enrolData.payMethod === 'UPI' && <span>UPI ID: &nbsp;<strong>priya@okaxis</strong></span>}
                    {enrolData.payMethod === 'Card' && <span style={{ color: '#4B5080' }}>Card ending in &nbsp;<strong>•••• 4242</strong> &nbsp;(Visa)</span>}
                    {enrolData.payMethod === 'Net banking' && <span style={{ color: '#4B5080' }}>Bank: &nbsp;<strong>HDFC Bank</strong></span>}
                    {enrolData.payMethod === 'EMI' && <span style={{ color: '#4B5080' }}>EMI: &nbsp;<strong>3 × ₹{(Math.round((enrolData.finalPrice || 0)/3)).toLocaleString('en-IN')}/month</strong> &nbsp;at 0% interest</span>}
                  </div>
                  <button className="enrol-cta coral" onClick={() => setEnrolStep(4)}>
                    Pay ₹{(enrolData.finalPrice || 0).toLocaleString('en-IN')} securely →
                  </button>
                  <div className="enrol-fine">🔒 Secured by Razorpay &nbsp;·&nbsp; 100% refund if class is cancelled</div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMATION */}
            {enrolStep === 4 && (
              <div className="enrol-success">
                <div className="enrol-success-icon">✅</div>
                <div className="enrol-success-badge">Booking confirmed</div>
                <div className="enrol-success-title">You&apos;re enrolled!</div>
                <div className="enrol-success-sub">Your seat is reserved. A calendar invite and Zoom link have been sent to your email.</div>
                <div className="enrol-confirm-card">
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Workshop</span><span className="enrol-confirm-val">{enrolData.name}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Date & time</span><span className="enrol-confirm-val">{enrolData.date} · {enrolData.time}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Format</span><span className="enrol-confirm-val">{enrolData.format === 'live' ? 'Live · Zoom' : enrolData.format === 'recorded' ? 'Recorded · Watch anytime' : 'In-person · Venue confirmed'}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: '#3730A3' }}>₹{(enrolData.finalPrice || 0).toLocaleString('en-IN')}</span></div>
                </div>
                <div className="enrol-success-btns">
                  <button className="enrol-success-btn" onClick={closeEnrol}>Close</button>
                  <button className="enrol-success-btn primary" onClick={() => { closeEnrol(); router.push('/dashboard'); }}>Go to dashboard →</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
