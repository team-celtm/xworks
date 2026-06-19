"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './home.css';
import { SUBJECTS, CAT_DATA } from './data';
import Footer from './components/Footer';
import Logo from './components/Logo';
import AlertModal from './components/AlertModal';
import { formatDuration } from '@/lib/utils';
import { fetchApi } from '@/lib/apiClient';

import EnrolModal from './components/EnrolModal';

export default function Home() {
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [activeSubjectSlug, setActiveSubjectSlug] = useState('tech');

  const [catOverlay, setCatOverlay] = useState({ isOpen: false, key: null as string | null, isClosing: false });

  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [enrolModalData, setEnrolModalData] = useState<any>(null);

  const [bsSlide, setBsSlide] = useState(0);
  const [naSlide, setNaSlide] = useState(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [catCourses, setCatCourses] = useState<any[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [browserCourses, setBrowserCourses] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [newlyAdded, setNewlyAdded] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetchApi("/api/auth/me", { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (err) {
        // Silent error for session check
      }
    };
    fetchUser().finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const shouldLock = isMobileNavOpen || isWorkshopModalOpen || catOverlay.isOpen || isEnrolModalOpen;
    document.body.style.overflow = shouldLock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen, isWorkshopModalOpen, catOverlay.isOpen, isEnrolModalOpen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bsRes, naRes, catRes] = await Promise.all([
          fetchApi('/api/courses?sort=best&limit=10'),
          fetchApi('/api/courses?sort=new&limit=10'),
          fetchApi('/api/categories')
        ]);
        const [bs, na, cats] = await Promise.all([bsRes.json(), naRes.json(), catRes.json()]);
        if (Array.isArray(bs)) setBestSellers(bs);
        if (Array.isArray(na)) setNewlyAdded(na);
        if (Array.isArray(cats)) {
          setCategories(cats);
          if (cats.length > 0 && !activeSubjectSlug) {
            setActiveSubjectSlug(cats[0].slug);
          }
        }
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isWorkshopModalOpen) {
      const fetchBrowserData = async () => {
        setIsBrowserLoading(true);
        try {
          const res = await fetchApi(`/api/courses?category=${activeSubjectSlug}`);
          const data = await res.json();
          if (Array.isArray(data)) setBrowserCourses(data);
        } catch (err) {
          console.error('Failed to fetch browser data:', err);
        } finally {
          setIsBrowserLoading(false);
        }
      };
      fetchBrowserData();
    }
  }, [isWorkshopModalOpen, activeSubjectSlug]);

  // Scroll effect on nav
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.style.height = window.scrollY > 60 ? '56px' : '68px';
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.course-card, .audience-card, .step-card, .testimonial-card, .cat-chip').forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [catOverlay.isOpen]); // re-run if we open a cat page maybe

  // Mobile nav toggle
  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const handleMobileNavScroll = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    setIsMobileNavOpen(false);
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };


  // Workshop Browser
  const openWorkshopBrowser = () => {
    setIsWorkshopModalOpen(true);
  };
  const closeWorkshopBrowser = () => {
    setIsWorkshopModalOpen(false);
  };

  // Category Overlay
  const openCatPage = async (key: string) => {
    setCatOverlay({ isOpen: true, key, isClosing: false });
    setIsCatLoading(true);

    try {
      const res = await fetchApi(`/api/courses?category=${key}`);
      const data = await res.json();
      if (Array.isArray(data)) setCatCourses(data);
    } catch (err) {
      console.error('Failed to load category courses:', err);
    } finally {
      setIsCatLoading(false);
    }
  };
  const closeCatPage = () => {
    setCatOverlay(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => {
      setCatOverlay({ isOpen: false, key: null, isClosing: false });
    }, 300);
  };

  // Enrol Modal
  const openEnrol = (id: string | number, name: string, meta: string, price: string, thumbBg: string, thumbEmoji: string) => {
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
    const basePrice = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    setEnrolModalData({
      id,
      name,
      meta,
      basePrice,
      thumbBg,
      thumbEmoji,
      isLive: true,
      isNearby: false,
    });
    setIsEnrolModalOpen(true);
  };

  const doSlide = (id: 'bs' | 'na', dir: number) => {
    if (id === 'bs') {
      const maxVal = Math.max(0, bestSellers.length - 1);
      const val = Math.max(0, Math.min(bsSlide + dir, maxVal));
      setBsSlide(val);
    } else {
      const maxVal = Math.max(0, newlyAdded.length - 1);
      const val = Math.max(0, Math.min(naSlide + dir, maxVal));
      setNaSlide(val);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEnrolModalOpen) setIsEnrolModalOpen(false);
        else if (isWorkshopModalOpen) closeWorkshopBrowser();
        else if (catOverlay.isOpen) closeCatPage();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isEnrolModalOpen, isWorkshopModalOpen, catOverlay.isOpen]);

  // Derived state for category
  const activeCat = catOverlay.key ? (categories.find(c => c.slug === catOverlay.key) || CAT_DATA[catOverlay.key]) : null;

  const activeSubjectObj = categories.find(c => c.slug === activeSubjectSlug) || categories[0];

  const browserSections = browserCourses.reduce((acc: any[], course: any) => {
    const sectionName = course.catLabel || 'General';
    let section = acc.find(s => s.title === sectionName);
    if (!section) {
      section = { title: sectionName, items: [] };
      acc.push(section);
    }
    section.items.push({
      id: course.id,
      icon: course.emoji,
      name: course.name,
      meta: `${formatDuration(course.dur)} · ${course.level}`,
      tag: course.tag,
      tagLabel: course.tagLabel,
      price: course.price,
      instructor: course.instructor,
      rating: course.rating,
      g: course.g,
      logo: course.logo
    });
    return acc;
  }, []);

  return (
    <div className="home-container">

      {/* ════ NAV ════ */}
      <nav ref={navRef} className="home-nav">
        <Logo />
        <div className="nav-links">
          <div className="nav-dropdown">
            <button className="nav-link" onClick={openWorkshopBrowser}>Workshops ▾</button>
          </div>
          <a href="#footer" className="nav-link">About us</a>
          <a href="#footer" className="nav-link">Contact us</a>
          {userLoading ? (
            <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: '100px', opacity: 0.2 }}></div>
          ) : user ? (
            <Link href={user.role === 'admin' ? "/admin" : "/dashboard"} className="nav-btn">
              {user.role === 'admin' ? "Admin Portal →" : "Go to Dashboard →"}
            </Link>
          ) : (
            <>
              <Link href="/Login" className="nav-link">Login</Link>
              <Link href="/Registration" className="nav-btn">Sign up free →</Link>
            </>
          )}
        </div>
        <div className="hamburger" onClick={toggleMobileNav}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      <div className={`mobile-nav ${isMobileNavOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
            X<span style={{ color: 'var(--coral)' }}>WORKS</span>
          </span>
          <button className="mobile-nav-close" onClick={toggleMobileNav}>✕</button>
        </div>
        <a href="#" className="mobile-nav-link" onClick={(e) => { e.preventDefault(); toggleMobileNav(); openWorkshopBrowser(); }}>Workshops</a>
        <a href="#footer" className="mobile-nav-link" onClick={(e) => handleMobileNavScroll(e, 'footer')}>About us</a>
        <a href="#footer" className="mobile-nav-link" onClick={(e) => handleMobileNavScroll(e, 'footer')}>Contact us</a>
        {userLoading ? (
          <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '12px' }}></div>
        ) : user ? (
          <div className="mobile-nav-cta"><Link href={user.role === 'admin' ? "/admin" : "/dashboard"} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMobileNavOpen(false)}>{user.role === 'admin' ? "Admin Portal →" : "Go to Dashboard →"}</Link></div>
        ) : (
          <>
            <Link href="/Login" className="mobile-nav-link" onClick={() => setIsMobileNavOpen(false)}>Login</Link>
            <div className="mobile-nav-cta"><Link href="/Registration" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsMobileNavOpen(false)}>Sign up free →</Link></div>
          </>
        )}
      </div>

      {/* ════ HERO ════ */}
      <section className="hero" id="home">
        <div className="hero-glow"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-wordmark">X<span>WORKS</span></div>
            <div className="hero-bars">
              <div className="hero-bar-row"><div className="hero-bar-line bar-1"></div></div>
              <div style={{ height: '10px' }}></div>
              <div className="hero-bar-row"><div className="hero-bar-line bar-2"></div></div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-eyebrow">Where skills come alive</div>
            <h1 className="hero-headline">Curated workshops for<br /><em>every curious mind.</em></h1>
            <p className="hero-body">
              From school students to senior citizens — XWORKS brings you live, hands-on workshops across technology, creativity, wellness and more. Learn from experts. Build real skills.
            </p>
            <div className="hero-cta-row">
              {userLoading ? (
                <div className="skeleton" style={{ width: '200px', height: '56px', borderRadius: '16px' }}></div>
              ) : user ? (
                <Link href={user.role === 'admin' ? "/admin" : "/dashboard"} className="btn-primary">{user.role === 'admin' ? "Back to Admin Portal →" : "Back to Dashboard →"}</Link>
              ) : (
                <Link href="/Registration" className="btn-primary">Sign up for free →</Link>
              )}
              <button className="btn-ghost" onClick={openWorkshopBrowser}>Browse workshops</button>
            </div>
          </div>
        </div>
      </section>

      {/* ════ CATEGORIES STRIP ════ */}
      <div className="stats-strip">
        <div className="stats-strip-inner">
          <div className="stats-strip-item"><div className="hero-stat-num">100<span>+</span></div><div className="hero-stat-label">Live workshops</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">5<span>k+</span></div><div className="hero-stat-label">Learners</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">9<span>+</span></div><div className="hero-stat-label">Categories</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">4.8<span>★</span></div><div className="hero-stat-label">Avg. rating</div></div>
        </div>
      </div>
      <div className="categories-section">
        <div className="cat-grid">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '100px' }}></div>)
          ) : (
            categories.map((c: any) => {
              const icons: Record<string, string> = { ai: '🤖', programming: '💻', cybersecurity: '🔐', data: '📊', design: '🎨', photography: '📸', wellness: '🪴', music: '🎵', business: '💼', mindfulness: '🧘' };
              return (
                <button
                  key={c.id}
                  className="cat-chip"
                  onClick={() => openCatPage(c.slug)}
                >
                  <span className="cat-chip-icon">{c.icon || '🎓'}</span>
                  <span className="cat-chip-label">{c.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ════ BEST SELLERS ════ */}
      <section className="home-section" id="best-sellers">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Community favourites</div>
              <div className="section-title">Best Sellers</div>
            </div>
            <a href="/catalogue" className="section-link">View all →</a>
          </div>
          <div className="carousel-wrap">
            <button className="carousel-btn carousel-btn-prev" onClick={() => doSlide('bs', -1)}>‹</button>
            <div className="carousel-track-outer">
              <div className="carousel-track" style={{ transform: `translateX(-${bsSlide * 280}px)` }}>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 260px' }}></div>)
                ) : (
                  hasMounted && (bestSellers.length > 0 ? bestSellers.map((c: any) => {
                    const priceStr = '₹' + c.price.toLocaleString('en-IN');
                    return (
                      <div key={c.id} className="course-card" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${formatDuration(c.dur)} · ${c.level}`, priceStr, c.g || 't-amber', c.logo || c.emoji)}>
                        <div className="course-thumb">
                          <div className={`course-thumb-bg ${c.g || 't-amber'}`}></div>
                          <div className="course-thumb-label">
                            {c.logo ? (
                              <>
                                <div className="card-logo-badge">
                                  <img 
                                    src={c.logo} 
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
                                <span style={{ display: 'none' }}>{c.emoji}</span>
                              </>
                            ) : (
                              c.emoji
                            )}
                          </div>
                          {c.tagLabel && <div className={`course-badge badge-${c.tag}`}>{c.tagLabel}</div>}
                        </div>
                        <div className="course-body">
                          <div className="course-category">{c.catLabel}</div>
                          <div className="course-name">{c.name}</div>
                          <div className="course-meta"><span className="course-rating">★ {c.rating}</span><span className="course-duration">⏱ {formatDuration(c.dur)}</span></div>
                        </div>
                      </div>
                    );
                  }) : <div style={{ padding: '60px 20px', color: 'var(--text-3)', width: '100%', textAlign: 'center' }}>More courses coming soon!</div>)
                )}
              </div>
            </div>
            <button className="carousel-btn carousel-btn-next" onClick={() => doSlide('bs', 1)}>›</button>
          </div>
        </div>
      </section>

      {/* ════ NEWLY ADDED ════ */}
      <section className="home-section" style={{ background: '#F8F9FF' }} id="newly-added">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Fresh drops</div>
              <div className="section-title">Newly Added</div>
            </div>
            <a href="catalogue" className="section-link">View all →</a>
          </div>
          <div className="carousel-wrap">
            <button className="carousel-btn carousel-btn-prev" onClick={() => doSlide('na', -1)}>‹</button>
            <div className="carousel-track-outer">
              <div className="carousel-track" style={{ transform: `translateX(-${naSlide * 280}px)` }}>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 260px' }}></div>)
                ) : (
                  hasMounted && (newlyAdded.length > 0 ? newlyAdded.map((c: any) => {
                    const priceStr = '₹' + c.price.toLocaleString('en-IN');
                    return (
                      <div key={c.id} className="course-card" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${formatDuration(c.dur)} · ${c.level}`, priceStr, c.g || 't-amber', c.logo || c.emoji)}>
                        <div className="course-thumb">
                          <div className={`course-thumb-bg ${c.g || 't-amber'}`}></div>
                          <div className="course-thumb-label">
                            {c.logo ? (
                              <>
                                <div className="card-logo-badge">
                                  <img 
                                    src={c.logo} 
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
                                <span style={{ display: 'none' }}>{c.emoji}</span>
                              </>
                            ) : (
                              c.emoji
                            )}
                          </div>
                          {c.tagLabel && <div className={`course-badge badge-${c.tag}`}>{c.tagLabel}</div>}
                        </div>
                        <div className="course-body">
                          <div className="course-category">{c.catLabel}</div>
                          <div className="course-name">{c.name}</div>
                          <div className="course-meta"><span className="course-rating">★ {c.rating}</span><span className="course-duration">⏱ {formatDuration(c.dur)}</span></div>
                        </div>
                      </div>
                    );
                  }) : <div style={{ padding: '60px 20px', color: 'var(--text-3)', width: '100%', textAlign: 'center' }}>Check back later for fresh drops!</div>)
                )}
              </div>
            </div>
            <button className="carousel-btn carousel-btn-next" onClick={() => doSlide('na', 1)}>›</button>
          </div>
        </div>
      </section>

      {/* ════ WHO IS XWORKS FOR ════ */}
      <div className="audience-section">
        <div className="section-inner">
          <div className="section-eyebrow">Open to everyone</div>
          <div className="section-title" style={{ color: '#FFFFFF' }}>XWORKS is for <em style={{ color: 'var(--coral)', fontStyle: 'normal' }}>every stage of life</em></div>
        </div>
        <div className="audience-grid">
          <div className="audience-card"><div className="audience-icon">🧒</div><div className="audience-title">School Students</div><div className="audience-desc">Build foundations in coding, AI, and creativity before anyone else. Get ahead early.</div><div className="step-accent"></div></div>
          <div className="audience-card"><div className="audience-icon">🎓</div><div className="audience-title">College Learners</div><div className="audience-desc">Go beyond the syllabus. Master skills that actually get you hired.</div><div className="step-accent"></div></div>
          <div className="audience-card"><div className="audience-icon">💼</div><div className="audience-title">Working Professionals</div><div className="audience-desc">Upskill on weekends. Stay relevant. Get promoted or pivot entirely.</div><div className="step-accent"></div></div>
          <div className="audience-card"><div className="audience-icon">🏠</div><div className="audience-title">Homemakers</div><div className="audience-desc">Discover hobbies, learn new crafts, or start a side income from home.</div><div className="step-accent"></div></div>
          <div className="audience-card"><div className="audience-icon">🧓</div><div className="audience-title">Senior Citizens</div><div className="audience-desc">Keep your mind active. Learn photography, cooking, wellness, or tech at your pace.</div><div className="step-accent"></div></div>
        </div>
      </div>

      {/* ════ HOW IT WORKS ════ */}
      <section className="steps-section">
        <div className="section-inner">
          <div className="section-eyebrow">Simple as 1–2–3</div>
          <div className="section-title">How XWORKS works</div>
          <div className="steps-grid">
            <div className="step-card"><div className="step-accent"></div><div className="step-num">01</div><div className="step-title">Discover your workshop</div><div className="step-desc">Browse 100+ curated workshops across 10 categories. Filter by interest, duration, or level.</div></div>
            <div className="step-card"><div className="step-accent"></div><div className="step-num">02</div><div className="step-title">Sign up & reserve your seat</div><div className="step-desc">One-click enrolment. Get instant confirmation with your calendar invite and prep materials.</div></div>
            <div className="step-card"><div className="step-accent"></div><div className="step-num">03</div><div className="step-title">Learn live from experts</div><div className="step-desc">Attend live sessions, ask questions in real-time, and walk away with a certificate.</div></div>
            <div className="step-card"><div className="step-accent"></div><div className="step-num">04</div><div className="step-title">Keep evolving</div><div className="step-desc">New workshops added every week. Build your learning streak and track your growth.</div></div>
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section className="cta-section" style={{ background: 'var(--indigo)' }}>
        <div className="cta-inner">
          <div>
            <div className="cta-eyebrow">Ready to begin?</div>
            <div className="cta-title">Join the <em>revolution</em><br />in learning.</div>
            <div className="cta-sub">Thousands of curious minds are already learning something new today. Your first workshop is waiting.</div>
          </div>
          <div className="cta-right">
            {userLoading ? (
              <div className="skeleton" style={{ width: '200px', height: '56px', borderRadius: '16px', opacity: 0.2 }}></div>
            ) : user ? (
              <Link href={user.role === 'admin' ? "/admin" : "/dashboard"} className="btn-primary" style={{ fontSize: '16px', padding: '16px 40px' }}>
                {user.role === 'admin' ? "Back to Admin Portal →" : "Back to Dashboard →"}
              </Link>
            ) : (
              <Link href="/Registration" className="btn-primary" style={{ fontSize: '16px', padding: '16px 40px' }}>Sign up today — it's free →</Link>
            )}
            <div className="cta-fine">No credit card required · Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* ════ TESTIMONIALS ════ */}
      <section className="testimonials-section">
        <div className="section-inner">
          <div className="section-eyebrow">Real learners, real results</div>
          <div className="section-title">What our community says</div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-quote">"</div>
              <div className="testimonial-text">I'm 58 and I just completed my first AI workshop. I honestly didn't think I could, but the instructor made it so simple. XWORKS is different — it respects every learner.</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'rgba(79,70,229,0.12)', color: 'var(--indigo)' }}>RK</div>
                <div><div className="testimonial-name">Rajesh Kumar</div><div className="testimonial-role">Retired Teacher · Mumbai</div></div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-quote">"</div>
              <div className="testimonial-text">The Python workshop helped me crack my first internship. The instructor was brilliant, and the live format meant I could ask questions immediately. Worth every rupee.</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'rgba(60,190,140,0.15)', color: '#3CBE8C' }}>AP</div>
                <div><div className="testimonial-name">Anjali Patel</div><div className="testimonial-role">Engineering Student · Pune</div></div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-quote">"</div>
              <div className="testimonial-text">I took the Photography workshop on a whim. Six months later I'm shooting weddings on weekends and making more than my day job. XWORKS changed my life trajectory.</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'rgba(170,100,220,0.15)', color: '#AA64DC' }}>SM</div>
                <div><div className="testimonial-name">Suhani Mehta</div><div className="testimonial-role">Homemaker & Photographer · Delhi</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ════ WORKSHOP BROWSER MODAL ════ */}
      {hasMounted && (
        <div id="workshopModal" className={`workshop-modal ${isWorkshopModalOpen ? 'visible' : ''}`} onClick={(e) => { if ((e.target as any).id === 'workshopModal') closeWorkshopBrowser(); }}>
          <div id="workshopPanel" className="workshop-panel">
            <div className="workshop-hd">
              <div>
                <div className="workshop-hd-label">Explore</div>
                <div className="workshop-hd-title">Browse Workshops</div>
              </div>
              <button onClick={closeWorkshopBrowser} className="workshop-close">✕</button>
            </div>
            <div className="workshop-body">
              <div className="workshop-sidebar">
                <div className="workshop-sidebar-label">{categories.length} subjects</div>
                <div id="subjectList">
                  {categories.map((s: any) => (
                    <button key={s.id} className={`subject-btn ${s.slug === activeSubjectSlug ? 'active' : ''}`} onClick={() => setActiveSubjectSlug(s.slug)}>
                      <span className="subject-icon">{s.icon}</span>
                      <span className="sbtn-label">{s.name}</span>
                      <span className="sbtn-count">{s.course_count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="workshop-content" id="subjectContent">
                {activeSubjectObj && (
                  <div className="subject-hero" style={{ background: activeSubjectObj.color || 'var(--surface-2)' }}>
                    <div className="subject-hero-icon">{activeSubjectObj.icon}</div>
                    <div>
                      <div className="subject-hero-title">{activeSubjectObj.name}</div>
                      <div className="subject-hero-desc">{activeSubjectObj.description}</div>
                    </div>
                  </div>
                )}
                
                {isBrowserLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="loader" style={{ margin: '0 auto 12px' }}></div>
                    <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading workshops...</div>
                  </div>
                ) : browserSections.length > 0 ? (
                  browserSections.map((sec: any, j: number) => (
                    <div className="sub-section" key={j}>
                      <div className="sub-section-title">{sec.title}</div>
                      <div className="sub-grid">
                        {sec.items.map((item: any, k: number) => (
                          <button 
                            className="sub-card" 
                            key={item.id || k} 
                            onClick={() => openEnrol(item.id, item.name, `by ${item.instructor} · ★ ${item.rating} · ${item.meta}`, `₹${item.price.toLocaleString('en-IN')}`, '', item.logo || item.icon)}
                          >
                            <div className="sub-card-icon">
                              {item.logo ? (
                                <>
                                  <div className="sub-logo-badge">
                                    <img 
                                      src={item.logo} 
                                      alt="" 
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const badge = e.currentTarget.closest('.sub-logo-badge') as HTMLElement;
                                        if (badge) badge.style.display = 'none';
                                        const fallback = badge?.nextSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'block';
                                      }}
                                    />
                                  </div>
                                  <span style={{ display: 'none' }}>{item.icon}</span>
                                </>
                              ) : (
                                item.icon
                              )}
                            </div>
                            <div className="sub-card-name">{item.name}</div>
                            <div className="sub-card-meta">{item.meta}</div>
                            <span className={`sub-card-tag tag-${item.tag}`}>{item.tagLabel}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                    No workshops found in this subject yet.
                  </div>
                )}
                {!isBrowserLoading && activeSubjectObj && (
                  <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                    <button onClick={() => openCatPage(activeSubjectObj.slug)} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--indigo)', cursor: 'pointer', fontWeight: 600 }}>
                      View all {activeSubjectObj.course_count} {activeSubjectObj.name} workshops →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ CATEGORY PAGE OVERLAY ════ */}
      {hasMounted && (
        <div className={`cat-overlay ${catOverlay.isClosing ? 'closing' : ''}`} style={{ display: catOverlay.isOpen ? 'block' : 'none' }}>
          {activeCat && (
            <>
              <div className="cat-page-nav">
                <button className="cat-back-btn" onClick={closeCatPage}>← Back <span className="cat-back-extra">to XWORKS</span></button>
                <div className="cat-page-crumb"><span className="crumb-prefix">Workshops / </span><span>{activeCat.label || activeCat.name}</span></div>
              </div>
              <div className="cat-hero">
                <div className="cat-hero-left">
                  <span className="cat-hero-icon-big">{activeCat.icon}</span>
                  <div className="cat-hero-title">
                    <mark>{activeCat.name}</mark> Workshops
                  </div>
                  <div className="cat-hero-desc">{activeCat.description}</div>
                </div>
                <div className="cat-hero-stats">
                  <div>
                    <div className="cat-hero-stat-num">{catCourses.length}<span>+</span></div>
                    <div className="cat-hero-stat-label">Workshops</div>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'var(--border-md)' }}></div>
                  <div>
                    <div className="cat-hero-stat-num">4.9<span>★</span></div>
                    <div className="cat-hero-stat-label">Avg rating</div>
                  </div>
                </div>
              </div>
              <div className="cat-body">
                <div className="cat-sub-section">
                  <div className="cat-sub-title">All {activeCat.name} Workshops</div>
                  <div className="cat-sub-desc">Browse through our curated collection of {activeCat.name} workshops and register for upcoming live sessions.</div>
                  {isCatLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <div className="loader" style={{ margin: '0 auto 16px' }}></div>
                      <div style={{ color: 'var(--text-3)' }}>Loading workshops...</div>
                    </div>
                  ) : catCourses.length > 0 ? (
                    <div className="cat-courses-grid">
                      {catCourses.map((c: any) => {
                        const priceStr = '₹' + c.price.toLocaleString('en-IN');
                        return (
                          <div key={c.id} className="cat-course-card" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${formatDuration(c.dur)} · ${c.level}`, priceStr, c.g || 't-amber', c.logo || c.emoji)}>
                            <div className="cat-card-thumb">
                              <div className={`cat-card-thumb-bg ${c.g || 't-amber'}`}></div>
                              <div className="cat-card-emoji">
                                {c.logo ? (
                                  <>
                                    <div className="card-logo-badge">
                                      <img 
                                        src={c.logo} 
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
                                    <span style={{ display: 'none' }}>{c.emoji}</span>
                                  </>
                                ) : (
                                  c.emoji
                                )}
                              </div>
                              {c.tagLabel && <div className="cat-card-badge badge-live">{c.tagLabel}</div>}
                            </div>
                            <div className="cat-card-body">
                              <div className="cat-card-level">{c.level}</div>
                              <div className="cat-card-name">{c.name}</div>
                              <div className="cat-card-instructor">with {c.instructor}</div>
                              <div className="cat-card-footer">
                                <div className="cat-card-rating">★ {c.rating}</div>
                                <div className="cat-card-price">{priceStr}</div>
                              </div>
                              <button className="cat-enroll-btn">Explore →</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface-2)', borderRadius: '16px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                      <div style={{ color: 'var(--text-2)', fontWeight: 600 }}>No workshops found</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>Check back later for new {activeCat.name} sessions.</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}


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
