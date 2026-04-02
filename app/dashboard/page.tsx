"use client";

import React, { useState, useEffect } from "react";
import "./dashboard.css";

/* ══ DATA ══ */
const ALL_WORKSHOPS = [
  { id: 1, icon: "🤖", name: "ChatGPT & Prompt Engineering", cat: "Artificial Intelligence", g: "g-ai", rating: "4.9", dur: "6 hrs", tags: ["ai", "python", "tech"], live: false, isNew: false, nearby: false },
  { id: 2, icon: "🧠", name: "Machine Learning with Python", cat: "AI & Data", g: "g-py", rating: "4.8", dur: "12 hrs", tags: ["ai", "python", "tech", "data"], live: false, isNew: false, nearby: false },
  { id: 3, icon: "🐍", name: "Python Zero to Hero", cat: "Programming", g: "g-py", rating: "4.9", dur: "10 hrs", tags: ["python", "tech", "programming"], live: false, isNew: false, nearby: false },
  { id: 4, icon: "📊", name: "Excel & Power BI", cat: "Data & Analytics", g: "g-da", rating: "4.7", dur: "8 hrs", tags: ["data", "finance", "tech"], live: false, isNew: false, nearby: false },
  { id: 5, icon: "🔐", name: "Ethical Hacking Masterclass", cat: "Cybersecurity", g: "g-cy", rating: "4.9", dur: "12 hrs", tags: ["security", "tech", "hacking"], live: false, isNew: false, nearby: false },
  { id: 6, icon: "🎨", name: "UI/UX with Figma", cat: "Design", g: "g-de", rating: "4.8", dur: "9 hrs", tags: ["design", "tech", "ux"], live: false, isNew: true, nearby: false },
  { id: 7, icon: "📸", name: "DSLR Photography", cat: "Photography", g: "g-ph", rating: "4.7", dur: "5 hrs", tags: ["photo", "creative"], live: false, isNew: false, nearby: false },
  { id: 8, icon: "💰", name: "Investing for Indians", cat: "Personal Finance", g: "g-fi", rating: "4.8", dur: "6 hrs", tags: ["finance", "money", "investing"], live: false, isNew: false, nearby: false },
  { id: 9, icon: "🧘", name: "Mindfulness & Meditation", cat: "Wellness", g: "g-we", rating: "4.9", dur: "4 hrs", tags: ["wellness", "mindfulness"], live: false, isNew: false, nearby: false },
  { id: 10, icon: "👨‍🍳", name: "Indian Home Cooking", cat: "Cooking", g: "g-co", rating: "4.9", dur: "8 hrs", tags: ["cooking", "lifestyle"], live: false, isNew: false, nearby: false },
  { id: 11, icon: "🔗", name: "Build AI Agents — LangChain", cat: "Artificial Intelligence", g: "g-ai", rating: "4.8", dur: "8 hrs", tags: ["ai", "python", "tech"], live: true, isNew: true, nearby: false },
  { id: 12, icon: "🎸", name: "Guitar for Beginners", cat: "Music", g: "g-mu", rating: "4.6", dur: "5 hrs", tags: ["music", "creative"], live: true, isNew: false, nearby: true },
  { id: 13, icon: "📱", name: "Flutter App Development", cat: "Programming", g: "g-py", rating: "4.8", dur: "14 hrs", tags: ["programming", "tech", "mobile"], live: true, isNew: true, nearby: false },
  { id: 14, icon: "🌿", name: "Home Gardening Workshop", cat: "Environment", g: "g-en", rating: "4.9", dur: "3 hrs", tags: ["environment", "lifestyle"], live: true, isNew: false, nearby: true },
  { id: 15, icon: "💡", name: "Startup MVP in 30 Days", cat: "Entrepreneurship", g: "g-bu", rating: "4.7", dur: "8 hrs", tags: ["business", "finance", "startup"], live: true, isNew: false, nearby: false },
  { id: 16, icon: "🗣️", name: "Public Speaking Confidence", cat: "Life Skills", g: "g-we", rating: "4.8", dur: "4 hrs", tags: ["communication", "lifeskills"], live: true, isNew: false, nearby: true },
  { id: 17, icon: "☁️", name: "AWS Cloud Fundamentals", cat: "Cloud & DevOps", g: "g-da", rating: "4.7", dur: "11 hrs", tags: ["tech", "cloud", "aws"], live: false, isNew: true, nearby: false },
  { id: 18, icon: "🏠", name: "Real Estate Investment", cat: "Finance", g: "g-fi", rating: "4.6", dur: "5 hrs", tags: ["finance", "money", "investing"], live: false, isNew: false, nearby: false },
  { id: 19, icon: "🎬", name: "Reels & Short Video", cat: "Photography & Film", g: "g-ph", rating: "4.7", dur: "4 hrs", tags: ["photo", "creative", "video"], live: true, isNew: true, nearby: false },
  { id: 20, icon: "♻️", name: "Zero Waste Living", cat: "Environment", g: "g-en", rating: "4.8", dur: "3 hrs", tags: ["environment", "lifestyle", "sustainability"], live: false, isNew: true, nearby: false },
];

const COMPLETED = [
  { icon: "🐍", bg: "g-py", name: "Python Zero to Hero", meta: "Completed 12 Jan 2026 · 10 hrs", pct: 100 },
  { icon: "📊", bg: "g-da", name: "Excel & Power BI for Business", meta: "Completed 28 Feb 2026 · 8 hrs", pct: 100 },
  { icon: "🤖", bg: "g-ai", name: "ChatGPT & Prompt Engineering", meta: "Completed 5 Mar 2026 · 6 hrs", pct: 100 },
  { icon: "📸", bg: "g-ph", name: "DSLR Photography Foundations", meta: "Completed 10 Mar 2026 · 5 hrs", pct: 100 },
  { icon: "🧘", bg: "g-we", name: "Mindfulness & Meditation", meta: "Completed 14 Mar 2026 · 4 hrs", pct: 100 },
  { icon: "💰", bg: "g-fi", name: "Investing for Indians", meta: "In progress · 4 of 6 hrs done", pct: 67 },
];

const UPCOMING = [
  { day: "22", month: "Mar", name: "Ethical Hacking Masterclass", meta: "Instructor: Arjun Mehta · 12 hrs total · Session 1 of 6", mode: "live", modeLabel: "Live", time: "10:00 AM – 12:00 PM", joinable: true },
  { day: "25", month: "Mar", name: "Build AI Agents with LangChain", meta: "Instructor: Dr. Priya Nair · 8 hrs total · Session 1 of 4", mode: "live", modeLabel: "Live", time: "3:00 PM – 5:00 PM", joinable: false },
  { day: "2", month: "Apr", name: "Startup MVP in 30 Days", meta: "Instructor: Ravi Shankar · 8 hrs total · Full day workshop", mode: "rec", modeLabel: "Recorded", time: "Available from Apr 2", joinable: false },
];

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("home");
  const [todayDate, setTodayDate] = useState("");
  const [promptQuery, setPromptQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ query: string; recorded: typeof ALL_WORKSHOPS; live: typeof ALL_WORKSHOPS } | null>(null);

  // Enrol modal state
  const [enrolModalOpen, setEnrolModalOpen] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<Record<string, unknown>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoOk, setPromoOk] = useState({ text: "", color: "", show: false });

  // Carousel tracking
  const [, setCState] = useState<Record<string, number>>({});

  const [todayDate, setTodayDate] = useState("");
  
  useEffect(() => {
    // Only access Date/Intl on client side to avoid hydration mismatch
    setTodayDate(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
  }, [setTodayDate]);

  const handleSearch = () => {
    const q = promptQuery.trim().toLowerCase();
    if (!q) return;

    const keywords = q.split(/\s+/);
    const results = ALL_WORKSHOPS.filter((w) => {
      const searchable = (w.name + " " + w.cat + " " + w.tags.join(" ")).toLowerCase();
      return keywords.some((k) => searchable.includes(k));
    });

    const recorded = results.filter((w) => !w.live);
    const live = results.filter((w) => w.live);

    const recFill = recorded.length < 3 ? ALL_WORKSHOPS.filter((w) => !w.live).slice(0, 6) : recorded;
    const liveFill = live.length < 2 ? ALL_WORKSHOPS.filter((w) => w.live).slice(0, 5) : live;

    setSearchResults({ query: q, recorded: recFill, live: liveFill });
    setCState((prev) => ({ ...prev, rec: 0, live: 0 }));
    
    setTimeout(() => {
       document.getElementById("searchResults")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleQuickSearch = (text: string) => {
    setPromptQuery(text);
    // Needed to wait for state update before searching
    setTimeout(() => {
        document.getElementById("promptBtn")?.click();
    }, 0);
  };

  const slide = (id: string, dir: number) => {
    const track = document.getElementById(id + "-track");
    if (!track) return;
    const cards = track.querySelectorAll(".wcard");
    if (!cards.length) return;
    
    // In React we can't easily rely on offsetWidth before render, but for a simple slider this works usually if items exist
    const cardEl = cards[0] as HTMLElement;
    const cardW = cardEl.offsetWidth + 16;
    const visible = Math.max(1, Math.floor((track.parentElement?.offsetWidth || 800) / cardW));
    const max = Math.max(0, cards.length - visible);
    
    setCState((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(current + dir, max));
      track.style.transform = `translateX(-${next * cardW}px)`;
      return { ...prev, [id]: next };
    });
  };

  const openEnrol = (w: typeof ALL_WORKSHOPS[0]) => {
    setEnrolData({
      name: w.name,
      meta: `by Ananya Sharma · ★ ${w.rating} · ${w.dur} · Beginner`,
      price: "₹1,299",
      basePrice: 1299,
      finalPrice: 1299,
      format: "live",
      formatLabel: "live session",
      date: "Sat 29 Mar",
      time: "11:00 AM",
      payMethod: "UPI",
      promoApplied: false,
      thumbBg: w.g,
      thumbEmoji: w.icon
    });
    setEnrolStep(1);
    setPromoCode("");
    setPromoOk({ text: "", color: "", show: false });
    setEnrolModalOpen(true);
  };

  const closeEnrol = () => {
    setEnrolModalOpen(false);
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const valid = ["XWORKS20", "FIRST20", "WELCOME", "LEARN20"];
    
    if (valid.includes(code) && !enrolData.promoApplied) {
      const discount = Math.round(enrolData.basePrice * 0.20);
      setEnrolData((prev: Record<string, unknown>) => ({
        ...prev,
        promoApplied: true,
        finalPrice: prev.basePrice - discount,
        discount
      }));
      setPromoOk({ text: "✓ Code applied — 20% off!", color: "#16A34A", show: true });
    } else if (enrolData.promoApplied) {
      setPromoOk({ text: "✓ Promo already applied!", color: "#16A34A", show: true });
    } else {
      setPromoOk({ text: "✗ Invalid code. Try XWORKS20", color: "#D84040", show: true });
    }
  };

  const renderWorkshopCard = (w: typeof ALL_WORKSHOPS[0]) => {
    const tagClass = w.nearby ? "tag-near" : w.live ? "tag-live" : w.isNew ? "tag-new" : "tag-rec";
    const tagLabel = w.nearby ? "📍 Nearby" : w.live ? "🔴 Live" : w.isNew ? "New" : "Recorded";

    return (
      <div className="wcard" key={w.id}>
        <div className="wcard-thumb">
          <div className={`wcard-thumb-bg ${w.g}`}></div>
          <div className="wcard-thumb-emoji">{w.icon}</div>
          <div className={`wcard-tag ${tagClass}`}>{tagLabel}</div>
        </div>
        <div className="wcard-body">
          <div className="wcard-cat">{w.cat}</div>
          <div className="wcard-name">{w.name}</div>
          <div className="wcard-meta">
            <span className="wcard-rating">★ {w.rating}</span>
            <span>{w.dur}</span>
          </div>
          <button className="wcard-enrol-btn" onClick={() => openEnrol(w)}>
            Enrol now →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="shell">
      {/* ══════════════════════════
           SIDEBAR
      ══════════════════════════ */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-bars">
            <div className="sb-logo-bar"></div>
            <div className="sb-logo-bar"></div>
          </div>
          <span className="sb-logo-name">X<span>WORKS</span></span>
        </div>

        <div className="sb-user">
          <div className="sb-avatar">PR</div>
          <div>
            <div className="sb-user-name">Priya Rajan</div>
            <div className="sb-user-tag">Pro Learner</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Main</div>

          <button className={`sb-item ${activeView === "home" ? "active" : ""}`} onClick={() => setActiveView("home")}>
            <span className="sb-item-icon">🏠</span>
            <span className="sb-item-label">Home</span>
          </button>

          <button className={`sb-item ${activeView === "completed" ? "active" : ""}`} onClick={() => setActiveView("completed")}>
            <span className="sb-item-icon">✅</span>
            <span className="sb-item-label">Courses Completed</span>
            <span className="sb-badge">6</span>
          </button>

          <button className={`sb-item ${activeView === "upcoming" ? "active" : ""}`} onClick={() => setActiveView("upcoming")}>
            <span className="sb-item-icon">📅</span>
            <span className="sb-item-label">Upcoming Courses</span>
            <span className="sb-badge">3</span>
          </button>

          <button className={`sb-item ${activeView === "curious" ? "active" : ""}`} onClick={() => setActiveView("curious")}>
            <span className="sb-item-icon">🔮</span>
            <span className="sb-item-label">Sounds Curious</span>
          </button>

          <div className="sb-section-label">Account</div>

          <button className={`sb-item ${activeView === "settings" ? "active" : ""}`} onClick={() => setActiveView("settings")}>
            <span className="sb-item-icon">⚙️</span>
            <span className="sb-item-label">Settings</span>
          </button>
        </nav>

        <div className="sb-footer">
          <button className="sb-logout">
            <span className="sb-logout-icon">🚪</span>
            <span className="sb-logout-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════
           MAIN
      ══════════════════════════ */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-greeting">
            Good morning, <strong>Priya</strong> 👋 Ready to learn something great today?
          </div>
          <div className="topbar-right">
            <div className="topbar-notif">🔔<div className="notif-dot"></div></div>
            <div className="topbar-date">{todayDate}</div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* ══ VIEW: HOME ══ */}
          {activeView === "home" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              {/* Stats row */}
              <div className="stats-row fade-up" style={{ animationDelay: '0s' }}>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--green-bg)" }}>✅</div>
                  <div><div className="stat-num">6</div><div className="stat-label">Completed</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--blue-bg)" }}>📅</div>
                  <div><div className="stat-num">3</div><div className="stat-label">Upcoming</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--indigo-light)" }}>⏱️</div>
                  <div><div className="stat-num">42h</div><div className="stat-label">Learning time</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--purple-bg)" }}>🔥</div>
                  <div><div className="stat-num">14</div><div className="stat-label">Day streak</div></div>
                </div>
              </div>

              {/* Prompt card */}
              <div className="prompt-card fade-up" style={{ animationDelay: '0.06s' }}>
                <div className="prompt-eyebrow">AI-powered discovery</div>
                <div className="prompt-title">What do you want to <em>learn today?</em></div>
                <div className="prompt-input-row">
                  <input
                    className="prompt-input"
                    type="text"
                    placeholder="e.g. I want to learn Python for data analysis…"
                    value={promptQuery}
                    onChange={(e) => setPromptQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button id="promptBtn" className="prompt-btn" onClick={handleSearch}>
                    Find workshops →
                  </button>
                </div>
                <div className="prompt-chips">
                  {["AI & Machine Learning", "Photography basics", "Personal finance", "Yoga & mindfulness", "Ethical hacking", "Cooking"].map((chip) => (
                    <span key={chip} className="prompt-chip" onClick={() => handleQuickSearch(chip)}>
                      {chip.split(" ")[0]} {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Search results or Default home */}
              {searchResults ? (
                <div id="searchResults" style={{ display: "flex", flexDirection: "column", gap: "24px", animationDelay: "0.12s" }} className="fade-up">
                  <div className="results-header">
                    <div>
                      <div className="results-query">Results for <span>{searchResults.query}</span></div>
                      <div className="results-count">
                        {searchResults.recorded.length} recorded · {searchResults.live.length} live workshops found
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Recorded */}
                  <div>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Section 1</div>
                        <div className="section-title">🎬 Recorded Workshops</div>
                      </div>
                      <a className="section-pill" href="#">View all</a>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("rec", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="rec-track">
                          {searchResults.recorded.map(renderWorkshopCard)}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("rec", 1)}>›</button>
                    </div>
                  </div>

                  {/* Section 2: Live */}
                  <div>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Section 2</div>
                        <div className="section-title">🔴 Live Workshops</div>
                      </div>
                      <a className="section-pill" href="#">View all</a>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("live", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="live-track">
                          {searchResults.live.map(renderWorkshopCard)}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("live", 1)}>›</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div id="homeCarousels" style={{ display: "flex", flexDirection: "column", gap: "24px", animationDelay: "0.12s" }} className="fade-up">
                  <div>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Continue learning</div>
                        <div className="section-title">Pick up where you left off</div>
                      </div>
                      <a className="section-pill" href="#">See all</a>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("cont", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="cont-track">
                          {ALL_WORKSHOPS.slice(0, 5).map(renderWorkshopCard)}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("cont", 1)}>›</button>
                    </div>
                  </div>
                  <div className="fade-up" style={{ animationDelay: '0.18s' }}>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Trending now</div>
                        <div className="section-title">What everyone&apos;s taking</div>
                      </div>
                      <a className="section-pill" href="#">See all</a>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("trend", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="trend-track">
                          {ALL_WORKSHOPS.slice(5, 11).map(renderWorkshopCard)}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("trend", 1)}>›</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ VIEW: COMPLETED ══ */}
          {activeView === "completed" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="fade-up" style={{ animationDelay: '0s' }}>
                <div className="section-label">Your achievements</div>
                <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                  Courses Completed
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  You&apos;ve completed 6 workshops · 42 hours of learning
                </div>
              </div>
              <div className="completed-grid fade-up" style={{ animationDelay: '0.06s' }}>
                {COMPLETED.map((c, i) => (
                  <div className="completed-card" key={i}>
                    <div className={`completed-icon ${c.bg}`} style={{ background: "none" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={c.bg}></div>
                      <span style={{ position: "absolute", fontSize: "22px" }}>{c.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                      <div className="completed-name">{c.name}</div>
                      <div className="completed-meta">{c.meta}</div>
                      {c.pct === 100 && <button className="cert-btn">🏆 View certificate</button>}
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${c.pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ VIEW: UPCOMING ══ */}
          {activeView === "upcoming" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="fade-up" style={{ animationDelay: '0s' }}>
                <div className="section-label">What&apos;s coming up</div>
                <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                  Upcoming Courses
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  3 workshops you&apos;ve enrolled in — get ready!
                </div>
              </div>
              <div className="upcoming-list fade-up" style={{ animationDelay: '0.06s' }}>
                {UPCOMING.map((u, i) => (
                  <div className="upcoming-card" key={i}>
                    <div className="upcoming-date-block">
                      <div className="upcoming-day">{u.day}</div>
                      <div className="upcoming-month">{u.month}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="upcoming-name">{u.name}</div>
                      <div className="upcoming-meta">{u.meta}</div>
                    </div>
                    <div className="upcoming-right">
                      <span className={`upcoming-mode mode-${u.mode}`}>{u.modeLabel}</span>
                      <div className="upcoming-time">⏰ {u.time}</div>
                      <button className={`join-btn ${u.joinable ? "" : "disabled"}`}>
                        {u.joinable ? "Join now →" : "Not yet"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fade-up" style={{ marginTop: "8px", animationDelay: '0.12s' }}>
                <div className="section-hd" style={{ marginBottom: "16px" }}>
                  <div className="section-hd-left">
                    <div className="section-label">Discover more</div>
                    <div className="section-title">Workshops you might book next</div>
                  </div>
                </div>
                <div className="carousel-wrap">
                  <button className="cbtn cbtn-l" onClick={() => slide("upsell", -1)}>‹</button>
                  <div className="carousel-outer">
                    <div className="carousel-track" id="upsell-track">
                      {ALL_WORKSHOPS.filter((w) => ![11, 13, 15].includes(w.id)).slice(0, 6).map(renderWorkshopCard)}
                    </div>
                  </div>
                  <button className="cbtn cbtn-r" onClick={() => slide("upsell", 1)}>›</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ VIEW: SOUNDS CURIOUS ══ */}
          {activeView === "curious" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="curious-intro fade-up" style={{ animationDelay: '0s' }}>
                <div className="curious-emoji">🔮</div>
                <div>
                  <div className="curious-title">We think you&apos;ll love these</div>
                  <div className="curious-desc">
                    Based on your learning history, interests, and what curious minds like yours are exploring — here&apos;s what we think will spark something new.
                  </div>
                </div>
              </div>
              <div className="fade-up" style={{ animationDelay: '0.06s' }}>
                <div className="section-hd">
                  <div className="section-hd-left">
                    <div className="section-label">Handpicked for you</div>
                    <div className="section-title">Because you learned Python…</div>
                  </div>
                </div>
                <div className="curious-grid">
                  {ALL_WORKSHOPS.filter((w) => [11, 13, 17, 6].includes(w.id)).map(renderWorkshopCard)}
                </div>
              </div>
              <div className="fade-up" style={{ animationDelay: '0.12s' }}>
                <div className="section-hd">
                  <div className="section-hd-left">
                    <div className="section-label">Step outside your comfort zone</div>
                    <div className="section-title">Something completely different</div>
                  </div>
                </div>
                <div className="curious-grid">
                  {ALL_WORKSHOPS.filter((w) => [12, 14, 19, 20].includes(w.id)).map(renderWorkshopCard)}
                </div>
              </div>
            </div>
          )}

          {/* ══ VIEW: SETTINGS ══ */}
          {activeView === "settings" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="fade-up" style={{ animationDelay: '0s' }}>
                <div className="section-label">Account</div>
                <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                  Settings
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  Manage your profile and preferences
                </div>
              </div>
              <div className="settings-grid fade-up" style={{ animationDelay: '0.06s' }}>
                <div className="settings-card">
                  <div className="settings-card-title">👤 Profile</div>
                  <div className="settings-avatar-row">
                    <div className="settings-avatar-big">PR</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Priya Rajan</div>
                      <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>Pro Learner · Member since Jan 2025</div>
                      <button style={{ marginTop: "8px", fontSize: "11px", color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Change photo →
                      </button>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Full name</label>
                    <input className="settings-input" defaultValue="Priya Rajan" />
                  </div>
                  <div className="settings-field">
                    <label>Email</label>
                    <input className="settings-input" defaultValue="priya.rajan@email.com" />
                  </div>
                  <div className="settings-field">
                    <label>Phone</label>
                    <input className="settings-input" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="settings-field">
                    <label>City</label>
                    <input className="settings-input" defaultValue="Bengaluru, Karnataka" />
                  </div>
                  <button className="settings-save">Save changes</button>
                </div>
                <div>
                  <div className="settings-card" style={{ marginBottom: "16px" }}>
                    <div className="settings-card-title">🔔 Notifications</div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">Upcoming class reminders</div><div className="toggle-sub">1 hour before class starts</div></div>
                      <div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">New workshops in your interests</div><div className="toggle-sub">Weekly digest</div></div>
                      <div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">Nearby live classes</div><div className="toggle-sub">Workshops within 5km</div></div>
                      <div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">Certificate earned</div></div>
                      <div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">Promotional offers</div></div>
                      <div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                  </div>
                  <div className="settings-card">
                    <div className="settings-card-title">🎯 Learning Preferences</div>
                    <div className="settings-field">
                      <label>Interests</label>
                      <input className="settings-input" defaultValue="AI, Python, Photography, Finance" />
                    </div>
                    <div className="settings-field">
                      <label>Preferred language</label>
                      <select className="settings-input" style={{ cursor: "pointer" }}>
                        <option>English</option>
                        <option>Hindi</option>
                        <option>Tamil</option>
                        <option>Telugu</option>
                      </select>
                    </div>
                    <div className="settings-field">
                      <label>Learning pace</label>
                      <select className="settings-input" style={{ cursor: "pointer" }} defaultValue="Regular (3–5 hrs/week)">
                        <option>Casual (1–2 hrs/week)</option>
                        <option value="Regular (3–5 hrs/week)">Regular (3–5 hrs/week)</option>
                        <option>Intensive (5+ hrs/week)</option>
                      </select>
                    </div>
                    <div className="toggle-row">
                      <div><div className="toggle-label">Show nearby classes first</div></div>
                      <div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ ENROL MODAL ══ */}
      {enrolModalOpen && (
        <div className="enrol-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) closeEnrol(); }}>
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
                    <div className={`enrol-thumb ${enrolData.thumbBg as string}`}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={enrolData.thumbBg as string}></div>
                      <span style={{ position: "absolute", fontSize: "22px" }}>{enrolData.thumbEmoji as string}</span>
                    </div>
                    <div>
                      <div className="enrol-course-name">{enrolData.name as string}</div>
                      <div className="enrol-course-meta">{enrolData.meta as string}</div>
                    </div>
                  </div>
                  <div className="enrol-section-label">Choose your format</div>
                  <div className="enrol-format-grid">
                    {[
                      { id: "live", lbl: "Live session", icon: "🔴", sub: "Interactive · Q&A included", price: "₹1,299" },
                      { id: "recorded", lbl: "Recorded", icon: "📹", sub: "Watch anytime · Self-paced", price: "₹999" },
                      { id: "inperson", lbl: "In-person", icon: "📍", sub: "Nearby · Limited seats", price: "₹849" }
                    ].map((f) => (
                      <div
                        key={f.id}
                        className={`enrol-format-btn ${enrolData.format === f.id ? "selected" : ""}`}
                        onClick={() => setEnrolData({
                          ...enrolData,
                          format: f.id,
                          formatLabel: f.lbl.toLowerCase(),
                          price: f.price,
                          basePrice: parseInt(f.price.replace(/[^0-9]/g, "")),
                          finalPrice: parseInt(f.price.replace(/[^0-9]/g, "")),
                          promoApplied: false
                        })}
                      >
                        <div className="enrol-format-icon">{f.icon}</div>
                        <div className="enrol-format-name">{f.lbl}</div>
                        <div className="enrol-format-sub">{f.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="enrol-divider"></div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", color: "#4B5080" }}>Price for <span>{enrolData.formatLabel as string}</span></div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, color: "#3730A3" }}>
                      {enrolData.price as string}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9294B8", marginBottom: "18px" }}>
                    Includes certificate · Lifetime recording access · Class notes PDF
                  </div>
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
                  <div className="enrol-section-label">Upcoming dates — March / April 2026</div>
                  <div className="enrol-date-grid">
                    {[
                      { d: "disabled", day: "Sat", num: "21", full: "" },
                      { d: "Sun 22 Mar", day: "Sun", num: "22", full: "" },
                      { d: "Tue 24 Mar", day: "Tue", num: "24", full: "" },
                      { d: "Sat 29 Mar", day: "Sat", num: "29", full: "" },
                      { d: "Sun 30 Mar", day: "Sun", num: "30", full: "" },
                      { d: "Tue 1 Apr", day: "Tue", num: "1 Apr", full: "13px" },
                      { d: "Sat 5 Apr", day: "Sat", num: "5", full: "" },
                      { d: "Sun 6 Apr", day: "Sun", num: "6", full: "" }
                    ].map((d, i) => (
                      <div
                        key={i}
                        className={`enrol-date-btn ${d.d === "disabled" ? "disabled" : ""} ${enrolData.date === d.d ? "sel" : ""}`}
                        onClick={() => d.d !== "disabled" && setEnrolData({ ...enrolData, date: d.d })}
                      >
                        <div className="enrol-date-day">{d.day}</div>
                        <div className="enrol-date-num" style={d.full ? { fontSize: d.full } : {}}>{d.num}</div>
                      </div>
                    ))}
                  </div>
                  <div className="enrol-section-label">Available time slots — <span>{(enrolData.date as string)?.split("").slice(4).join("") || "29 Mar"}</span></div>
                  <div className="enrol-time-row">
                    <div className="enrol-time-btn full">9:00 AM &nbsp;<span style={{ fontSize: "10px" }}>Full</span></div>
                    {["11:00 AM", "2:00 PM", "5:00 PM", "7:00 PM"].map((t) => (
                      <div
                        key={t}
                        className={`enrol-time-btn ${enrolData.time === t ? "sel" : ""}`}
                        onClick={() => setEnrolData({ ...enrolData, time: t })}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                  <div className="enrol-session-info">
                    {(() => {
                      const timeStr = enrolData.time as string;
                      if (!timeStr) return null;
                      const endTimeMatch = timeStr.match(/(\d+):00 (AM|PM)/);
                      let endString = "1:00 PM";
                      if (endTimeMatch) {
                          let num = parseInt(endTimeMatch[1]);
                          let suffix = endTimeMatch[2];
                          num += 2;
                          if (num >= 12) {
                              if (num > 12) num -= 12;
                              suffix = "PM";
                          }
                          endString = `${num}:00 ${suffix}`;
                      }
                      return `${enrolData.date as string} · ${enrolData.time as string} – ${endString} · Online via Zoom · 14 seats left`
                    })()}
                  </div>
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
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">{enrolData.name as string}</span>
                    <span className="enrol-order-val">{enrolData.price as string}</span>
                  </div>
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Platform fee</span>
                    <span className="enrol-order-val">₹0</span>
                  </div>
                  {enrolData.promoApplied && (
                    <div className="enrol-order-row">
                      <span className="enrol-order-label" style={{ color: "#16A34A" }}>Promo discount</span>
                      <span className="enrol-order-val" style={{ color: "#16A34A" }}>−₹{(enrolData.discount as number)?.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="enrol-divider"></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span className="enrol-total">Total</span>
                    <span className="enrol-total">₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="enrol-promo-row">
                    <input
                      className="enrol-promo-input"
                      type="text"
                      placeholder="Promo code (try XWORKS20)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    />
                    <button className="enrol-promo-apply" onClick={applyPromo}>Apply</button>
                  </div>
                  {promoOk.show && (
                    <div className="enrol-promo-ok" style={{ display: "flex", color: promoOk.color }}>
                      {promoOk.text}
                    </div>
                  )}
                  <div className="enrol-section-label">Pay with</div>
                  <div className="enrol-pay-methods">
                    {["UPI", "Card", "Net banking", "EMI"].map((m) => (
                      <div
                        key={m}
                        className={`enrol-pay-btn ${enrolData.payMethod === m ? "sel" : ""}`}
                        onClick={() => setEnrolData({ ...enrolData, payMethod: m })}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="enrol-upi-field">
                    {enrolData.payMethod === "UPI" && <>UPI ID: &nbsp;<strong>priya@okaxis</strong></>}
                    {enrolData.payMethod === "Card" && <span style={{ color: "#4B5080" }}>Card ending in &nbsp;<strong>•••• 4242</strong> &nbsp;(Visa)</span>}
                    {enrolData.payMethod === "Net banking" && <span style={{ color: "#4B5080" }}>Bank: &nbsp;<strong>HDFC Bank</strong></span>}
                    {enrolData.payMethod === "EMI" && <span style={{ color: "#4B5080" }}>EMI: &nbsp;<strong>3 × ₹{Math.round((enrolData.finalPrice as number) / 3).toLocaleString("en-IN")}/month</strong> &nbsp;at 0% interest</span>}
                  </div>
                  <button className="enrol-cta coral" onClick={() => setEnrolStep(4)}>
                    Pay ₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")} securely →
                  </button>
                  <div className="enrol-fine">🔒 Secured by Razorpay &nbsp;·&nbsp; 100% refund if class is cancelled</div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMATION */}
            {enrolStep === 4 && (
              <div>
                <div className="enrol-success">
                  <div className="enrol-success-icon">✅</div>
                  <div className="enrol-success-badge">Booking confirmed</div>
                  <div className="enrol-success-title">You&apos;re enrolled!</div>
                  <div className="enrol-success-sub">Your seat is reserved. A calendar invite and Zoom link have been sent to your email.</div>
                  <div className="enrol-confirm-card">
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Workshop</span><span className="enrol-confirm-val">{enrolData.name as string}</span></div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Date & time</span><span className="enrol-confirm-val">{enrolData.date as string} · {enrolData.time as string}</span></div>
                    <div className="enrol-confirm-row">
                      <span className="enrol-confirm-label">Format</span>
                      <span className="enrol-confirm-val">{enrolData.format === "live" ? "Live · Zoom" : enrolData.format === "recorded" ? "Recorded · Watch anytime" : "In-person · Venue confirmed"}</span>
                    </div>
                    <div className="enrol-confirm-row"><span className="enrol-confirm-label">Amount paid</span><span className="enrol-confirm-val" style={{ color: "#3730A3" }}>₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")}</span></div>
                  </div>
                  <div className="enrol-success-btns">
                    <button className="enrol-success-btn" onClick={closeEnrol}>Close</button>
                    <button className="enrol-success-btn primary" onClick={() => { closeEnrol(); setActiveView("upcoming"); }}>Go to dashboard →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
