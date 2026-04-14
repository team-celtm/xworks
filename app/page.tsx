"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './home.css';
import { SUBJECTS, CAT_DATA } from './data';
import Footer from './components/Footer';

export default function Home() {
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [activeSubjectSlug, setActiveSubjectSlug] = useState('tech');

  const [catOverlay, setCatOverlay] = useState({ isOpen: false, key: null as string | null, isClosing: false });

  const [enrolData, setEnrolData] = useState({
    isOpen: false,
    id: null as string | number | null,
    step: 1,
    name: '',
    meta: '',
    price: '₹1,299',
    basePrice: 1299,
    finalPrice: 1299,
    format: 'live',
    formatLabel: 'Live session',
    date: '', 
    time: '',
    promoApplied: false,
    payMethod: 'UPI',
    thumbBg: 'linear-gradient(135deg,#1A2E5A,#3A7ACC)',
    thumbEmoji: '💬',
    enrolmentId: null as string | null,
    sessions: [] as any[],
    selectedSessionId: null as string | null
  });
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState({ text: '', type: '' });

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        // Silent error for session check
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bsRes, naRes, catRes] = await Promise.all([
          fetch('/api/courses?sort=best&limit=10'),
          fetch('/api/courses?sort=new&limit=10'),
          fetch('/api/categories')
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
          const res = await fetch(`/api/courses?category=${activeSubjectSlug}`);
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

  useEffect(() => {
    if (enrolData.isOpen && enrolData.step === 2 && enrolData.id) {
      const fetchSessions = async () => {
        try {
          const res = await fetch(`/api/courses/${enrolData.id}/sessions`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setEnrolData(prev => ({ 
              ...prev, 
              sessions: data,
              selectedSessionId: data.length > 0 ? data[0].id : null,
              date: data.length > 0 ? new Date(data[0].scheduled_start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '',
              time: data.length > 0 ? new Date(data[0].scheduled_start).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''
            }));
          }
        } catch (err) {
          console.error('Failed to fetch sessions:', err);
        }
      };
      fetchSessions();
    }
  }, [enrolData.isOpen, enrolData.step, enrolData.id]);

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
    document.body.style.overflow = !isMobileNavOpen ? 'hidden' : '';
  };

  // Workshop Browser
  const openWorkshopBrowser = () => {
    setIsWorkshopModalOpen(true);
    document.body.style.overflow = 'hidden';
  };
  const closeWorkshopBrowser = () => {
    setIsWorkshopModalOpen(false);
    document.body.style.overflow = '';
  };

  // Category Overlay
  const openCatPage = async (key: string) => {
    setCatOverlay({ isOpen: true, key, isClosing: false });
    setIsCatLoading(true);
    document.body.style.overflow = 'hidden';

    try {
      const res = await fetch(`/api/courses?category=${key}`);
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
      document.body.style.overflow = '';
    }, 300);
  };

  // Enrol Modal
  const openEnrol = (id: string | number, name: string, meta: string, price: string, thumbBg: string, thumbEmoji: string) => {
    const basePrice = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    setEnrolData({
      isOpen: true,
      id,
      step: 1,
      name, meta, price, basePrice, finalPrice: basePrice,
      format: 'live', formatLabel: 'Live session',
      date: '', time: '',
      promoApplied: false, payMethod: 'UPI',
      thumbBg, thumbEmoji,
      enrolmentId: null,
      sessions: [],
      selectedSessionId: null
    });
    setPromoCode('');
    setPromoMsg({ text: '', type: '' });
    document.body.style.overflow = 'hidden';
  };
  const closeEnrol = () => {
    setEnrolData(prev => ({ ...prev, isOpen: false }));
    document.body.style.overflow = '';
  };

  const enrolGoStep = (step: number) => {
    setEnrolData(prev => ({ ...prev, step }));
  };

  const enrolSelectFormat = (format: string, price: string) => {
    const basePrice = parseInt(price.replace(/[^0-9]/g, '')) || 1299;
    const labels: Record<string, string> = { live: 'live session', recorded: 'recorded access', inperson: 'in-person session' };
    setEnrolData(prev => ({
      ...prev, format, price, basePrice, finalPrice: basePrice, promoApplied: false, formatLabel: labels[format] || format
    }));
    setPromoMsg({ text: '', type: '' });
  };

  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleModalEnrol = async () => {
    if (!enrolData.id) return;
    
    setIsEnrolling(true);
    try {
      // If it's a paid course, start Razorpay flow
      if (enrolData.finalPrice && enrolData.finalPrice > 0) {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            courseId: enrolData.id,
            promoCode: enrolData.promoApplied ? promoCode : null
           })
        });
        
        const orderData = await orderRes.json();
        
        if (!orderRes.ok) {
           if (orderRes.status === 401) {
             router.push(`/Login?returnUrl=/`);
             return;
           }
           setPromoMsg({ text: orderData.error || 'Could not create payment order', type: 'error' });
           setIsEnrolling(false);
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
            setIsEnrolling(true);
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: enrolData.id,
                promoCode: enrolData.promoApplied ? promoCode : null,
                sessionId: enrolData.selectedSessionId
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setEnrolData(prev => ({ ...prev, enrolmentId: verifyData.enrolmentId }));
              enrolGoStep(4);
            } else {
              setPromoMsg({ text: verifyData.error || 'Payment verification failed', type: 'error' });
            }
            setIsEnrolling(false);
          },
          prefill: {
            name: '',
            email: '',
          },
          theme: { color: '#4F46E5' },
          modal: {
            ondismiss: () => setIsEnrolling(false)
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      const res = await fetch('/api/learner/enrolments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          courseId: enrolData.id, 
          sessionId: enrolData.selectedSessionId 
        })
      });

      if (res.status === 401) {
        router.push(`/Login?returnUrl=/`);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setEnrolData(prev => ({ ...prev, enrolmentId: data.enrolmentId }));
        
        // AUTO REGISTER FOR SESSION IF SELECTED
        if (enrolData.format === 'live' && enrolData.selectedSessionId) {
          await fetch(`/api/sessions/${enrolData.selectedSessionId}/register`, { method: 'POST' });
        }
        
        enrolGoStep(4);
      } else {
        setPromoMsg({ text: data.error || 'Failed to enrol', type: 'error' });
      }
    } catch (err: any) {
      console.error('Enrol failed:', err);
      setPromoMsg({ text: err.message || 'An error occurred', type: 'error' });
    } finally {
      setIsEnrolling(false);
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsCatLoading(true); // temporary loader
    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, courseId: enrolData.id })
      });
      const data = await res.json();
      if (res.ok) {
        const discountPercentage = parseFloat(data.discountPercentage);
        const discount = Math.round(enrolData.basePrice * (discountPercentage / 100));
        setEnrolData(prev => ({ ...prev, promoApplied: true, finalPrice: prev.basePrice - discount }));
        setPromoMsg({ text: `✓ Code applied — ${discountPercentage}% off!`, type: 'success' });
      } else {
        setPromoMsg({ text: data.error || 'Invalid code', type: 'error' });
        setEnrolData(prev => ({ ...prev, promoApplied: false, finalPrice: prev.basePrice }));
      }
    } catch (err) {
      setPromoMsg({ text: 'Validation failed', type: 'error' });
    } finally {
      setIsCatLoading(false);
    }
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
        if (enrolData.isOpen) closeEnrol();
        else if (isWorkshopModalOpen) closeWorkshopBrowser();
        else if (catOverlay.isOpen) closeCatPage();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [enrolData.isOpen, isWorkshopModalOpen, catOverlay.isOpen]);

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
      meta: `${course.dur} hrs · ${course.level}`,
      tag: course.tag,
      tagLabel: course.tagLabel,
      price: course.price,
      instructor: course.instructor,
      rating: course.rating,
      g: course.g
    });
    return acc;
  }, []);

  return (
    <div className="home-container">
      
      {/* ════ NAV ════ */}
      <nav ref={navRef} className="home-nav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-bars">
            <div className="nav-logo-bar"></div>
            <div className="nav-logo-bar"></div>
          </div>
          X<span>WORKS</span>
        </Link>
        <div className="nav-links">
          <div className="nav-dropdown">
            <button className="nav-link" onClick={openWorkshopBrowser}>Workshops ▾</button>
          </div>
          <a href="#footer" className="nav-link">About us</a>
          <a href="#footer" className="nav-link">Contact us</a>
          {user ? (
            <Link href="/dashboard" className="nav-btn">Go to Dashboard →</Link>
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
        <a href="#footer" className="mobile-nav-link" onClick={() => setIsMobileNavOpen(false)}>About us</a>
        <a href="#footer" className="mobile-nav-link" onClick={() => setIsMobileNavOpen(false)}>Contact us</a>
        {user ? (
          <div className="mobile-nav-cta"><Link href="/dashboard" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Go to Dashboard →</Link></div>
        ) : (
          <>
            <Link href="/Login" className="mobile-nav-link">Login</Link>
            <div className="mobile-nav-cta"><Link href="/Registration" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Sign up free →</Link></div>
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
            <h1 className="hero-headline">Curated workshops for<br/><em>every curious mind.</em></h1>
            <p className="hero-body">
              From school students to senior citizens — XWORKS brings you live, hands-on workshops across technology, creativity, wellness and more. Learn from experts. Build real skills.
            </p>
            <div className="hero-cta-row">
              {user ? (
                <Link href="/dashboard" className="btn-primary">Back to Dashboard →</Link>
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
          <div className="stats-strip-item"><div className="hero-stat-num">200<span>+</span></div><div className="hero-stat-label">Live workshops</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">40<span>k+</span></div><div className="hero-stat-label">Learners</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">9<span>+</span></div><div className="hero-stat-label">Categories</div></div>
          <div className="stats-strip-divider"></div>
          <div className="stats-strip-item"><div className="hero-stat-num">4.8<span>★</span></div><div className="hero-stat-label">Avg. rating</div></div>
        </div>
      </div>
      <div className="categories-section">
        <div className="cat-grid">
          {isLoading ? (
            [1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '100px' }}></div>)
          ) : (
            categories.map((c: any) => {
            const icons: Record<string, string> = {ai:'🤖',programming:'💻',cybersecurity:'🔐',data:'📊',design:'🎨',photography:'📸',wellness:'🪴',music:'🎵',business:'💼',mindfulness:'🧘'};
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
                  [1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 260px' }}></div>)
                ) : (
                  hasMounted && bestSellers.map((c: any) => {
                  const priceStr = '₹' + c.price.toLocaleString('en-IN');
                  return (
                    <div key={c.id} className="course-card" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${c.dur} hrs · ${c.level}`, priceStr, c.g || 't-amber', c.emoji)}>
                      <div className="course-thumb">
                        <div className={`course-thumb-bg ${c.g || 't-amber'}`}></div>
                        <div className="course-thumb-label">{c.emoji}</div>
                        {c.tagLabel && <div className={`course-badge badge-${c.tag}`}>{c.tagLabel}</div>}
                      </div>
                      <div className="course-body">
                        <div className="course-category">{c.catLabel}</div>
                        <div className="course-name">{c.name}</div>
                        <div className="course-meta"><span className="course-rating">★ {c.rating}</span><span className="course-duration">⏱ {c.dur} hrs</span></div>
                      </div>
                    </div>
                  );
                })
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
                  [1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 260px' }}></div>)
                ) : (
                  hasMounted && newlyAdded.map((c: any) => {
                  const priceStr = '₹' + c.price.toLocaleString('en-IN');
                  return (
                    <div key={c.id} className="course-card" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${c.dur} hrs · ${c.level}`, priceStr, c.g || 't-amber', c.emoji)}>
                      <div className="course-thumb">
                        <div className={`course-thumb-bg ${c.g || 't-amber'}`}></div>
                        <div className="course-thumb-label">{c.emoji}</div>
                        {c.tagLabel && <div className={`course-badge badge-${c.tag}`}>{c.tagLabel}</div>}
                      </div>
                      <div className="course-body">
                        <div className="course-category">{c.catLabel}</div>
                        <div className="course-name">{c.name}</div>
                        <div className="course-meta"><span className="course-rating">★ {c.rating}</span><span className="course-duration">⏱ {c.dur} hrs</span></div>
                      </div>
                    </div>
                  );
                })
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
            <div className="step-card"><div className="step-accent"></div><div className="step-num">01</div><div className="step-title">Discover your workshop</div><div className="step-desc">Browse 200+ curated workshops across 10 categories. Filter by interest, duration, or level.</div></div>
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
            <div className="cta-title">Join the <em>revolution</em><br/>in learning.</div>
            <div className="cta-sub">Thousands of curious minds are already learning something new today. Your first workshop is waiting.</div>
          </div>
          <div className="cta-right">
            <Link href="/Registration" className="btn-primary" style={{ fontSize: '16px', padding: '16px 40px' }}>Sign up today — it's free →</Link>
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
      <div id="workshopModal" style={{ display: isWorkshopModalOpen ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(20,20,8,0.55)', backdropFilter: 'blur(6px)' }} onClick={(e) => { if ((e.target as any).id === 'workshopModal') closeWorkshopBrowser(); }}>
        <div id="workshopPanel" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(780px,100%)', background: 'var(--surface)', overflowY: 'auto', transform: isWorkshopModalOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '28px 36px 20px', borderBottom: '0.5px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Explore</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.5px' }}>Browse Workshops</div>
            </div>
            <button onClick={closeWorkshopBrowser} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '0.5px solid var(--border-md)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div style={{ width: '220px', flexShrink: 0, borderRight: '0.5px solid var(--border-md)', padding: '20px 0', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 20px 12px' }}>{categories.length} subjects</div>
              <div id="subjectList">
                {categories.map((s) => (
                  <button key={s.id} className={`subject-btn ${s.slug === activeSubjectSlug ? 'active' : ''}`} onClick={() => setActiveSubjectSlug(s.slug)}>
                    <span className="subject-icon">{s.icon}</span>
                    <span className="sbtn-label">{s.name}</span>
                    <span className="sbtn-count">{s.course_count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }} id="subjectContent">
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
                          style={{ textAlign: 'left', width: '100%', border: '1px solid var(--border-md)' }}
                          onClick={() => openEnrol(item.id, item.name, `by ${item.instructor} · ★ ${item.rating} · ${item.meta}`, `₹${item.price.toLocaleString('en-IN')}`, '', item.icon)}
                        >
                          <div className="sub-card-icon">{item.icon}</div>
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
              
              {activeSubjectObj && (
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

      {/* ════ CATEGORY PAGE OVERLAY ════ */}
      <div className={`cat-overlay ${catOverlay.isClosing ? 'closing' : ''}`} style={{ display: catOverlay.isOpen ? 'block' : 'none' }}>
        {activeCat && (
          <>
            <div className="cat-page-nav">
              <button className="cat-back-btn" onClick={closeCatPage}>← Back to XWORKS</button>
              <div className="cat-page-crumb">Workshops / <span>{activeCat.label}</span></div>
            </div>
            <div className="cat-hero">
              <div className="cat-hero-left">
                <span className="cat-hero-icon-big">{activeCat.icon}</span>
                <div className="cat-hero-title">
                  {activeCat.name || activeCat.label}
                </div>
                <div className="cat-hero-desc">{activeCat.description || activeCat.desc}</div>
              </div>
              <div className="cat-hero-stats">
                <div style={{ textAlign: 'center' }}>
                  <div className="cat-hero-stat-num">{activeCat.course_count || activeCat.workshops}<span>+</span></div>
                  <div className="cat-hero-stat-label">Workshops</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-md)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div className="cat-hero-stat-num">{activeCat.learners || '4,000+'}</div>
                  <div className="cat-hero-stat-label">Learners</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-md)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div className="cat-hero-stat-num">{activeCat.rating || '4.8'}<span>★</span></div>
                  <div className="cat-hero-stat-label">Avg. rating</div>
                </div>
              </div>
            </div>
            <div className="cat-body">
              {isCatLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div className="loader" style={{ margin: '0 auto 16px' }}></div>
                  <div style={{ color: 'var(--text-3)' }}>Finding the best workshops for you...</div>
                </div>
              ) : catCourses.length > 0 ? (
                <div className="cat-sub-section">
                  <div className="cat-sub-title">Live Workshops</div>
                  <div className="cat-sub-desc">Upcoming sessions led by industry experts.</div>
                  <div className="cat-courses-grid">
                    {catCourses.map((c: any, cidx: number) => {
                      const priceStr = '₹' + c.price.toLocaleString('en-IN');
                      return (
                        <div className="cat-course-card" key={c.id || cidx}>
                          <div className="cat-card-thumb">
                            <div className={`cat-card-thumb-bg ${c.g || 'ct-ai'}`}></div>
                            <div className="cat-card-emoji">{c.emoji}</div>
                            <div className={`cat-card-badge badge-${c.tag}`}>{c.tagLabel}</div>
                          </div>
                          <div className="cat-card-body">
                            <div className="cat-card-level">{c.level}</div>
                            <div className="cat-card-name">{c.name}</div>
                            <div className="cat-card-instructor">by {c.instructor}</div>
                            <div className="cat-card-footer">
                              <span className="cat-card-rating">★ {c.rating}</span>
                              <span className="cat-card-dur">⏱ {c.dur} hrs</span>
                              <span className="cat-card-price">{priceStr}</span>
                            </div>
                            <button className="cat-enroll-btn" onClick={() => openEnrol(c.id, c.name, `by ${c.instructor} · ★ ${c.rating} · ${c.dur} hrs · ${c.level}`, priceStr, '', c.emoji)}>Enrol now →</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Fallback to curated data if DB is empty or still loading? 
                   Actually catCourses should have data if the DB is seeded. */
                <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed var(--border-md)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>No live workshops found in this category</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-3)', marginTop: '4px' }}>Check back later or explore another category.</div>
                </div>
              )}

              {/* Keep curated sections as "Recommended Paths" if they don't overlap much? 
                 Decided to keep it dynamic-first for this task. */}
            </div>
          </>
        )}
      </div>

      {/* ════ ENROL MODAL ════ */}
      <div className={`enrol-backdrop ${enrolData.isOpen ? 'open' : ''}`} onClick={(e) => { if ((e.target as any).className.includes('enrol-backdrop')) closeEnrol(); }}>
        <div className="enrol-modal" style={{ display: enrolData.isOpen ? 'block' : 'none' }}>
          
          {enrolData.step === 1 && (
            <div>
              <div className="enrol-modal-hd">
                <div className="enrol-modal-title">Enrol in workshop</div>
                <button className="enrol-modal-close" onClick={closeEnrol}>✕</button>
              </div>
              <div className="enrol-stepper">
                <div className="enrol-step-item"><div className="enrol-step-dot active">1</div><div className="enrol-step-label active">Format</div></div><div className="enrol-step-line pending"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot pending">2</div><div className="enrol-step-label">Schedule</div></div><div className="enrol-step-line pending"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot pending">3</div><div className="enrol-step-label">Payment</div></div>
              </div>
              <div className="enrol-body">
                <div className="enrol-course-mini">
                  <div className="enrol-thumb" style={enrolData.thumbBg ? { background: enrolData.thumbBg } : {}}>{enrolData.thumbEmoji}</div>
                  <div><div className="enrol-course-name">{enrolData.name}</div><div className="enrol-course-meta">{enrolData.meta}</div></div>
                </div>
                <div className="enrol-section-label">Choose your format</div>
                <div className="enrol-format-grid">
                  <div className={`enrol-format-btn ${enrolData.format === 'live' ? 'selected' : ''}`} onClick={() => enrolSelectFormat('live', enrolData.price)}>
                    <div className="enrol-format-icon">🔴</div><div className="enrol-format-name">Live session</div><div className="enrol-format-sub">Interactive · Q&A included</div>
                  </div>
                  <div className={`enrol-format-btn ${enrolData.format === 'recorded' ? 'selected' : ''}`} onClick={() => enrolSelectFormat('recorded', enrolData.price)}>
                    <div className="enrol-format-icon">📹</div><div className="enrol-format-name">Recorded</div><div className="enrol-format-sub">Watch anytime · Self-paced</div>
                  </div>
                  <div className={`enrol-format-btn ${enrolData.format === 'inperson' ? 'selected' : ''}`} onClick={() => enrolSelectFormat('inperson', enrolData.price)}>
                    <div className="enrol-format-icon">📍</div><div className="enrol-format-name">In-person</div><div className="enrol-format-sub">Nearby · Limited seats</div>
                  </div>
                </div>
                <div className="enrol-divider"></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', color: '#4B5080' }}>Price for <span>{enrolData.formatLabel}</span></div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '20px', fontWeight: 800, color: '#3730A3' }}>{enrolData.price}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#9294B8', marginBottom: '18px' }}>Includes certificate · Lifetime recording access · Class notes PDF</div>
                <button className="enrol-cta" onClick={() => enrolGoStep(2)}>Continue to schedule →</button>
              </div>
            </div>
          )}

          {enrolData.step === 2 && (
            <div>
              <div className="enrol-modal-hd"><button className="enrol-back" onClick={() => enrolGoStep(1)}>← Back</button><div className="enrol-modal-title">Pick a date & time</div><button className="enrol-modal-close" onClick={closeEnrol}>✕</button></div>
              <div className="enrol-stepper">
                <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Format</div></div><div className="enrol-step-line done"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot active">2</div><div className="enrol-step-label active">Schedule</div></div><div className="enrol-step-line pending"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot pending">3</div><div className="enrol-step-label">Payment</div></div>
              </div>
              <div className="enrol-body">
                <div className="enrol-section-label">Available sessions</div>
                <div className="enrol-date-grid">
                  {enrolData.sessions.length > 0 ? (
                    enrolData.sessions.map((s) => {
                      const d = new Date(s.scheduled_start);
                      const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
                      const num = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
                      const isFull = s.max_seats && s.registered_count >= s.max_seats;
                      
                      return (
                        <button 
                          key={s.id} 
                          className={`enrol-date-btn ${enrolData.selectedSessionId === s.id ? 'sel' : ''} ${isFull ? 'disabled' : ''}`}
                          disabled={isFull}
                          onClick={() => setEnrolData(prev => ({ 
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
                      No upcoming live sessions found. You can still enrol to access recordings or pick a date later.
                    </div>
                  )}
                </div>
                
                {enrolData.selectedSessionId && (
                  <>
                    <div className="enrol-section-label">Selected slot</div>
                    <div className="enrol-session-info">
                      {enrolData.date} · {enrolData.time} &nbsp;·&nbsp; {enrolData.format === 'live' ? 'Online via Zoom' : 'Location TBD'}
                    </div>
                  </>
                )}
                
                <button className="enrol-cta" onClick={() => enrolGoStep(3)}>Continue to payment →</button>
              </div>
            </div>
          )}

          {enrolData.step === 3 && (
            <div>
              <div className="enrol-modal-hd"><button className="enrol-back" onClick={() => enrolGoStep(2)}>← Back</button><div className="enrol-modal-title">Payment</div><button className="enrol-modal-close" onClick={closeEnrol}>✕</button></div>
              <div className="enrol-stepper">
                <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Format</div></div><div className="enrol-step-line done"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot done">✓</div><div className="enrol-step-label">Schedule</div></div><div className="enrol-step-line done"></div>
                <div className="enrol-step-item"><div className="enrol-step-dot active">3</div><div className="enrol-step-label active">Payment</div></div>
              </div>
              <div className="enrol-body">
                <div className="enrol-order-row"><span className="enrol-order-label">Workshop</span><span className="enrol-order-val">{enrolData.name}</span></div>
                <div className="enrol-order-row"><span className="enrol-order-label">Format</span><span className="enrol-order-val">{enrolData.price}</span></div>
                {enrolData.promoApplied && (
                  <div className="enrol-order-row"><span className="enrol-order-label" style={{ color: '#16A34A' }}>Promo discount</span><span className="enrol-order-val" style={{ color: '#16A34A' }}>−₹{Math.round(enrolData.basePrice * 0.20)}</span></div>
                )}
                <div className="enrol-divider"></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span className="enrol-total">Total</span><span className="enrol-total">₹{enrolData.finalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="enrol-promo-row">
                  <input className="enrol-promo-input" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} type="text" placeholder="Promo code (try XWORKS20)" />
                  <button className="enrol-promo-apply" onClick={applyPromo}>Apply</button>
                </div>
                {promoMsg.text && (
                  <div className="enrol-promo-ok" style={{ color: promoMsg.type === 'error' ? '#D84040' : '#16A34A' }}>{promoMsg.text}</div>
                )}
                <div className="enrol-section-label">Pay with</div>
                <div className="enrol-pay-methods">
                  {['UPI', 'Card', 'Net banking', 'EMI'].map(method => (
                    <button key={method} className={`enrol-pay-btn ${enrolData.payMethod === method ? 'sel' : ''}`} onClick={() => setEnrolData(prev => ({ ...prev, payMethod: method }))}>{method}</button>
                  ))}
                </div>
                <div className="enrol-upi-field">
                  {enrolData.payMethod === 'UPI' && <span>UPI ID: &nbsp;<strong>priya@okaxis</strong></span>}
                  {enrolData.payMethod === 'Card' && <span style={{ color: '#4B5080' }}>Card ending in &nbsp;<strong>•••• 4242</strong> &nbsp;(Visa)</span>}
                  {enrolData.payMethod === 'Net banking' && <span style={{ color: '#4B5080' }}>Bank: &nbsp;<strong>HDFC Bank</strong></span>}
                </div>
                <button className={`enrol-cta coral ${isEnrolling ? 'loading' : ''}`} onClick={handleModalEnrol} disabled={isEnrolling}>
                   {isEnrolling ? 'Processing...' : enrolData.finalPrice === 0 ? 'Enrol for Free →' : `Pay ₹${enrolData.finalPrice.toLocaleString('en-IN')} securely →`}
                </button>
                <div className="enrol-fine">🔒 Secured by Razorpay &nbsp;·&nbsp; 100% refund if class is cancelled</div>
              </div>
            </div>
          )}

          {enrolData.step === 4 && (
            <div>
              <div className="enrol-success">
                <div className="enrol-success-icon">✅</div>
                <div className="enrol-success-badge">Booking confirmed</div>
                <div className="enrol-success-title">You're enrolled!</div>
                <div className="enrol-success-sub">Your seat is reserved. A calendar invite and Zoom link have been sent to your email.</div>
                <div className="enrol-confirm-card">
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Workshop</span><span className="enrol-confirm-val">{enrolData.name}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Date & time</span><span className="enrol-confirm-val">{enrolData.date} · {enrolData.time}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Format</span><span className="enrol-confirm-val">{enrolData.format === 'live' ? 'Live · Zoom' : enrolData.format === 'recorded' ? 'Recorded · Watch anytime' : 'In-person · Venue'}</span></div>
                  <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: '#3730A3' }}>₹{enrolData.finalPrice.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="enrol-success-btns">
                  <button className="enrol-success-btn" onClick={closeEnrol}>Close</button>
                  <button 
                    className="enrol-success-btn primary" 
                    onClick={() => {
                      closeEnrol();
                      if (enrolData.enrolmentId) router.push(`/player/${enrolData.enrolmentId}`);
                      else router.push('/dashboard/enrolments');
                    }}
                  >
                    Start Learning →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
