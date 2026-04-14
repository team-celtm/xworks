"use client";

import { useState, useEffect } from "react";
import "./dashboard.css";
import "./notes.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from '../components/Logo';

/* ══ DATA ══ */
interface Workshop {
  id: string | number;
  slug: string;
  icon: string;
  name: string;
  cat: string;
  catLabel: string;
  g: string;
  rating: string;
  dur: string;
  tags: string[];
  live: boolean;
  isNew: boolean;
  nearby: boolean;
  price: number;
}

interface DashboardEnrolData {
  id?: number;
  courseId?: string;
  sessionId?: string;
  name?: string;
  meta?: string;
  price?: string;
  basePrice?: number;
  finalPrice?: number;
  format?: string;
  formatLabel?: string;
  date?: string;
  time?: string;
  promoApplied?: boolean;
  promoError?: string;
  discountAmt?: number;
  discount?: number;
  payMethod?: string;
  thumbBg?: string;
  thumbEmoji?: string;
}

interface Note {
  id?: string;
  workshop_id?: string;
  workshopName?: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  updated_at?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("home");
  const [promptQuery, setPromptQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ query: string; recorded: Workshop[]; live: Workshop[] } | null>(null);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loadingEnrolments, setLoadingEnrolments] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Enrol modal state
  const [enrolModalOpen, setEnrolModalOpen] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<DashboardEnrolData>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoOk, setPromoOk] = useState({ text: "", color: "", show: false });
  const [playerContent, setPlayerContent] = useState<any>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [certs, setCerts] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [hasMounted, setHasMounted] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteSearch, setNoteSearch] = useState("");

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    preferences: {} as any
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");

  useEffect(() => {
    if (sessions.length > 0 && sessions[0].scheduledStart) {
      const interval = setInterval(() => {
        const diff = new Date(sessions[0].scheduledStart).getTime() - Date.now();
        if (diff <= 0) {
          setTimeLeft("Started");
          return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessions]);

  // Carousel tracking
  const [, setCState] = useState<Record<string, number>>({});


  const [bookingSession, setBookingSession] = useState<{ courseId: string, courseName: string, regId?: string } | null>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [todayDate, setTodayDate] = useState("");

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [trendingWorkshops, setTrendingWorkshops] = useState<Workshop[]>([]);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadWorkshops = async () => {
    try {
      const res = await fetch("/api/courses");
      const results = await res.json();
      if (Array.isArray(results)) {
        const mapped = results.map(r => ({
          id: r.id,
          slug: r.slug,
          icon: r.emoji || "🎓",
          name: r.name,
          cat: r.cat,
          catLabel: r.catLabel,
          g: r.g || "g-ai",
          rating: r.rating?.toString() || "0.0",
          dur: r.dur,
          tags: [r.cat, r.tag].filter(Boolean),
          live: !!r.live,
          isNew: r.tag === 'new',
          nearby: !!r.nearby,
          price: r.price
        }));
        setWorkshops(mapped);

        // Also fetch trending separately for better data coverage
        const trendRes = await fetch("/api/courses?sort=best&limit=8");
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          setTrendingWorkshops(trendData.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            icon: r.emoji || "🎓",
            name: r.name,
            cat: r.cat,
            catLabel: r.catLabel,
            g: r.g || "g-ai",
            rating: r.rating?.toString() || "0.0",
            dur: r.dur,
            tags: [r.cat, r.tag].filter(Boolean),
            price: r.price,
            live: !!r.live,
            isNew: r.tag === 'new',
            nearby: !!r.nearby
          })));
        }
      }
    } catch (err) {
      console.error("Failed to load initial workshops:", err);
    } finally {
      setLoadingWorkshops(false);
    }
  };

  const fetchEnrolments = async () => {
    setLoadingEnrolments(true);
    try {
      const res = await fetch("/api/learner/enrolments");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setEnrolments(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch enrolments:", err);
    } finally {
      setLoadingEnrolments(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/learner/sessions");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch("/api/learner/notes");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setNotes(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const saveNote = async (note: Note) => {
    try {
      const res = await fetch("/api/learner/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note)
      });
      if (res.ok) {
        const saved = await res.json();
        setNotes(prev => {
          const exists = prev.find(n => n.id === saved.id);
          if (exists) return prev.map(n => n.id === saved.id ? saved : n);
          return [saved, ...prev];
        });
        setCurrentNote(saved);
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!currentNote || !isNoteEditorOpen) return;
    
    const handler = setTimeout(() => {
      saveNote(currentNote);
    }, 1500); // Debounce 1.5s

    return () => clearTimeout(handler);
  }, [currentNote?.title, currentNote?.content, currentNote?.tags, currentNote?.is_pinned, currentNote?.workshop_id]);

  const deleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/learner/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        setIsNoteEditorOpen(false);
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const fetchCerts = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch("/api/learner/certificates");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setCerts(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch certs:", err);
    } finally {
      setLoadingCerts(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/learner/profile");
      if (res.ok) {
        const data = await res.json();
        setSettingsForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          city: data.city || "",
          preferences: data.preferences || {}
        });
      }
    } catch (err) {}
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsStatus("Saving...");
    try {
      const res = await fetch("/api/learner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        setSettingsStatus("Saved! ✨");
        fetchUser(); // Refresh user header
        setTimeout(() => setSettingsStatus(""), 3000);
      } else {
        setSettingsStatus("Error saving.");
      }
    } catch (err) {
      setSettingsStatus("Error saving.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const togglePreference = (key: string) => {
    setSettingsForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key]
      }
    }));
  };

  useEffect(() => {
    // Using shared functions defined above to ensure consistency across the component
    const loadData = async () => {
      await Promise.all([
        loadWorkshops(),
        fetchEnrolments(),
        fetchUser(),
        fetchSessions(),
        fetchCerts(),
        fetchNotes(),
        fetchProfile()
      ]);
      setTodayDate(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
      setHasMounted(true);
    };
    loadData();

    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get("view");
    if (view) {
      setActiveView(view);
    }
  }, []);

  const completedCount = enrolments.filter(e => e.enrolment_status === 'completed' || e.progressPct === 100).length;

  const completedDisplayList = enrolments
    .filter(e => e.enrolment_status === 'completed' || e.progressPct === 100)
    .map(e => ({
      id: e.course_id,
      icon: e.emoji || "🎓",
      bg: e.thumbBg || "g-ai",
      name: e.name,
      meta: e.progressPct === 100
        ? `Completed ${new Date(e.completedAt || e.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${e.dur} hrs`
        : `In progress · ${Math.round((e.progressPct / 100) * e.dur)} of ${e.dur} hrs done`,
      pct: Math.round(e.progressPct),
      rating: e.rating,
      dur: e.dur,
      catLabel: e.catLabel,
      price: e.basePrice || 1299, // Fallback price if not present
      slug: e.slug,
      live: e.live
    }));

  const continueLearningList = enrolments.filter(e => e.progressPct > 0 && e.progressPct < 100);

  const handleSearch = async () => {
    const q = promptQuery.trim();
    if (!q) return;

    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}`);
      const results = await res.json();

      if (!Array.isArray(results)) {
        console.error("Invalid search results:", results);
        return;
      }

      // Map API results to dashboard structure
      const mappedResults = results.map(r => ({
        id: r.id,
        slug: r.slug,
        icon: r.emoji || "🎓",
        name: r.name,
        cat: r.cat,
        catLabel: r.catLabel,
        g: r.g || "g-ai",
        rating: r.rating?.toString() || "0.0",
        dur: r.dur,
        tags: [r.cat, r.tag].filter(Boolean),
        price: r.price,
        live: !!r.live,
        isNew: r.tag === 'new',
        nearby: !!r.nearby
      }));

      const recorded = mappedResults.filter((w) => !w.live);
      const live = mappedResults.filter((w) => w.live);

      // We maintain the results even if few for now, or we can still do a fill if needed.
      // But for real search, we should show what we found.
      setSearchResults({ query: q, recorded, live });
      setCState((prev) => ({ ...prev, rec: 0, live: 0 }));

      setTimeout(() => {
        document.getElementById("searchResults")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const handleQuickSearch = (text: string) => {
    setPromptQuery(text);
    // Needed to wait for state update before searching
    setTimeout(() => {
      document.getElementById("promptBtn")?.click();
    }, 0);
  };

  const handleOpenBooking = async (courseId: string, courseName: string, regId?: string) => {
    setBookingSession({ courseId, courseName, regId });
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const handleConfirmBooking = async (sessionId: string) => {
    setIsBooking(true);
    try {
      const isReschedule = !!bookingSession?.regId;
      const url = isReschedule 
        ? `/api/session-registrations/${bookingSession!.regId}` 
        : `/api/sessions/${sessionId}/register`;
      const method = isReschedule ? 'PUT' : 'POST';
      const body = isReschedule ? { newSessionId: sessionId } : {};

      const res = await fetch(url, { 
        method,
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });
      
      if (res.ok) {
        setBookingSession(null);
        fetchEnrolments();
        fetchSessions();
        setActiveView("upcoming"); 
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      alert("Something went wrong");
    } finally {
      setIsBooking(false);
    }
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

  const [modalSessions, setModalSessions] = useState<any[]>([]);

  const openEnrol = async (w: Workshop) => {
    setEnrolData({
      courseId: String(w.id),
      name: w.name,
      meta: `by Ananya Sharma · ★ ${w.rating} · ${w.dur} hrs · ${w.catLabel}`,
      price: `₹${(Number(w.price) || 0).toLocaleString("en-IN")}`,
      basePrice: Number(w.price) || 0,
      finalPrice: Number(w.price) || 0,
      format: "live",
      formatLabel: "live session",
      date: "",
      time: "",
      payMethod: "UPI",
      promoApplied: false,
      thumbBg: w.g,
      thumbEmoji: w.icon
    });
    setEnrolStep(1);
    setPromoCode("");
    setPromoOk({ text: "", color: "", show: false });
    setEnrolModalOpen(true);

    try {
      const res = await fetch(`/api/courses/id/${w.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setModalSessions(data);
        if (data.length > 0) {
          const first = data[0];
          setEnrolData(prev => ({
            ...prev,
            date: new Date(first.scheduledStart).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
            time: new Date(first.scheduledStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load modal sessions:", err);
    }
  };

  const closeEnrol = () => {
    setEnrolModalOpen(false);
  };

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId: enrolData.courseId, format: enrolData.format })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        const baseAdjustedPrice = enrolData.finalPrice || enrolData.basePrice || 0;
        setEnrolData((prev: DashboardEnrolData) => ({
          ...prev,
          promoApplied: true,
          finalPrice: data.discountedPrice,
          discount: Math.abs(baseAdjustedPrice - data.discountedPrice)
        }));
        setPromoOk({ text: `✓ Code applied — ${data.discountPercentage}% off!`, color: "#16A34A", show: true });
      } else {
        setPromoOk({ text: `✗ ${data.error || "Invalid code"}`, color: "#D84040", show: true });
      }
    } catch (err) {
      setPromoOk({ text: "✗ Connection error", color: "#D84040", show: true });
    }
  };

  const fetchPlayerContent = async (id: string) => {
    setActiveView("player");
    setLoadingPlayer(true);
    try {
      const res = await fetch(`/api/learner/enrolments/${id}/access`);
      if (res.ok) {
        const data = await res.json();
        setPlayerContent(data);
      }
    } catch (err) {
      console.error("Player fetch error:", err);
    } finally {
      setLoadingPlayer(false);
    }
  };

  const initiateEnrolPayment = async () => {
    try {
      if (!user) {
        alert("Please login first");
        router.push("/Login");
        return;
      }

      // 0. Handle Free Course / 100% Discount Case
      if (enrolData.finalPrice === 0) {
        const freeRes = await fetch("/api/enrolments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: enrolData.courseId,
            sessionId: enrolData.sessionId
          })
        });
        const freeData = await freeRes.json();
        if (freeRes.ok) {
          setEnrolStep(4);
          fetchEnrolments();
          return;
        } else {
          throw new Error(freeData.error || "Failed to enrol in free course");
        }
      }

      // 1. Create order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: enrolData.courseId,
          promoCode: promoCode || null,
          userId: user.id,
          format: enrolData.format,
          sessionId: enrolData.sessionId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

      const options = {
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: 'INR',
        name: "XWORKS",
        description: `Enrollment for ${enrolData.name}`,
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: enrolData.courseId,
                promoCode: promoCode || null,
                sessionId: enrolData.sessionId
              })
            });
            
            if (verifyRes.ok) {
              setEnrolStep(4);
              fetchEnrolments();
              fetchSessions();
            } else {
              const vData = await verifyRes.json();
              alert(vData.error || "Payment verification failed");
            }
          } catch (vErr) {
            console.error("Verification error:", vErr);
            alert("Connection error during verification");
          }
        },
        prefill: {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
        },
        theme: {
          color: "#3730A3",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      alert(err.message);
    }
  };

  const updatePlayerProgress = async (id: string, newPct: number) => {
    try {
      const res = await fetch(`/api/learner/enrolments/${id}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPct: newPct }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlayerContent((prev: any) => ({ ...prev, currentProgress: updated.progress_pct }));
        // Also update the main enrolments list to keep badges/bars in sync
        setEnrolments(prev => prev.map(e => e.enrolment_id === id ? { ...e, progressPct: updated.progress_pct } : e));
      }
    } catch (err) {
      console.error("Progress update failed:", err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      // Keep overlay visible for a brief moment
      setTimeout(() => {
        router.push('/Login');
      }, 1500);
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/Login');
    }
  };

  const renderWorkshopCard = (w: Workshop) => {
    const tagClass = w.nearby ? "tag-near" : w.live ? "tag-live" : w.isNew ? "tag-new" : "tag-rec";
    const tagLabel = w.nearby ? "📍 Nearby" : w.live ? "🔴 Live" : w.isNew ? "New" : "Recorded";

    const userEnrol = enrolments.find(e => e.course_id === w.id && e.enrolment_status === 'active');
    const userCompleted = enrolments.find(e => e.course_id === w.id && (e.enrolment_status === 'completed' || e.progressPct === 100));

    return (
      <div className="wcard" key={w.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/courses/${w.slug}`)}>
        <div className="wcard-thumb">
          <div className={`wcard-thumb-bg ${w.g}`}></div>
          <div className="wcard-thumb-emoji">{w.icon}</div>
          <div className={`wcard-tag ${tagClass}`}>{tagLabel}</div>
        </div>
        <div className="wcard-body">
          <div className="wcard-cat">{w.catLabel}</div>
          <div className="wcard-name">{w.name}</div>
          <div className="wcard-meta">
            <span className="wcard-rating">★ {w.rating}</span>
            <span>{w.dur} hrs</span>
          </div>
          {userEnrol ? (
            <button className="wcard-enrol-btn" style={{ background: 'var(--blue)' }} onClick={(e) => { 
                e.stopPropagation(); 
                if (w.live) {
                  if (!userEnrol.userSessionRegId) {
                    handleOpenBooking(String(w.id), w.name);
                  } else {
                    setActiveView("upcoming");
                  }
                } else {
                  router.push(`/player/${userEnrol.enrolment_id}`); 
                }
              }}>
              {w.live ? (userEnrol.userSessionRegId ? "View Schedule →" : "Book Seat →") : "Continue →"}
            </button>
          ) : userCompleted ? (
            <button className="wcard-enrol-btn" style={{ background: 'var(--indigo-light)', color: 'var(--indigo)' }} onClick={(e) => { e.stopPropagation(); openEnrol(w); }}>
              Re-enrol →
            </button>
          ) : (
            <button className="wcard-enrol-btn" onClick={(e) => { e.stopPropagation(); openEnrol(w); }}>
              Enrol now →
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEnrolledCard = (e: any) => {
    return (
      <div className="wcard" key={e.enrolment_id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/player/${e.enrolment_id}`)}>
        <div className="wcard-thumb">
          <div className={`wcard-thumb-bg ${e.thumbBg}`}></div>
          <div className="wcard-thumb-emoji">{e.emoji || "🎓"}</div>
          {e.live ? (
             <div className="wcard-tag tag-live">LIVE</div>
          ) : (
             <div className="wcard-tag tag-rec">Recorded</div>
          )}
        </div>
        <div className="wcard-body">
          <div className="wcard-cat">{e.catLabel}</div>
          <div className="wcard-name">{e.name}</div>
          <div className="wcard-meta">
            <span>{Math.round(e.progressPct)}% done</span>
            <span>{e.instructor}</span>
          </div>
          <div className="progress-bar-wrap" style={{ marginTop: '12px', height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div className="progress-bar-fill" style={{ width: `${e.progressPct}%`, height: '100%', background: 'var(--blue)' }}></div>
          </div>
          
          {e.live && !e.userSessionRegId && (
            <button 
              className="wcard-enrol-btn" 
              style={{ marginTop: '16px', background: 'var(--indigo)' }}
              onClick={(ev) => {
                ev.stopPropagation();
                handleOpenBooking(e.course_id, e.name);
              }}
            >
              Secure seat →
            </button>
          )}
          {(!e.live || e.userSessionRegId) && (
            <button className="wcard-enrol-btn" style={{ marginTop: '16px' }} onClick={(ev) => { ev.stopPropagation(); router.push(`/player/${e.enrolment_id}`); }}>
              Continue →
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!hasMounted) return null;

  return (
    <div className="shell">
      {/* ══════════════════════════
           SIDEBAR
      ══════════════════════════ */}
      <aside className="sidebar">
        <div className="sb-logo">
          <Link href="/" className="sb-logo-link">
            <div className="sidebar-logo">
              <Logo fontSize="22px" />
            </div>
          </Link>
        </div>

        <div className="sb-user">
          <div className="sb-avatar">
            {user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() : "..."}
          </div>
          <div>
            <div className="sb-user-name">{user ? `${user.firstName} ${user.lastName}` : "Loading..."}</div>
            <div className="sb-user-tag">{user?.role === 'learner' ? 'Pro Learner' : user?.role || 'Guest'}</div>
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
            <span className="sb-badge">{completedCount}</span>
          </button>

          <button className={`sb-item ${activeView === "certificates" ? "active" : ""}`} onClick={() => setActiveView("certificates")}>
            <span className="sb-item-icon">📜</span>
            <span className="sb-item-label">My Certificates</span>
            <span className="sb-badge">{certs.length}</span>
          </button>

          <button className={`sb-item ${activeView === "upcoming" ? "active" : ""}`} onClick={() => setActiveView("upcoming")}>
            <span className="sb-item-icon">📅</span>
            <span className="sb-item-label">Upcoming Courses</span>
            <span className="sb-badge">{sessions.length}</span>
          </button>

          <button className={`sb-item ${activeView === "notes" ? "active" : ""}`} onClick={() => setActiveView("notes")}>
            <span className="sb-item-icon">📝</span>
            <span className="sb-item-label">My Notes</span>
            <span className="sb-badge">{notes.length}</span>
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

          {user?.role === 'instructor' && (
            <Link href="/instructor" className="sb-item" style={{ textDecoration: 'none', background: 'var(--indigo-dark)', color: 'white' }}>
              <span className="sb-item-icon" style={{filter: 'grayscale(0)'}}>🎬</span>
              <span className="sb-item-label">Instructor Portal</span>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link href="/admin" className="sb-item" style={{ textDecoration: 'none', background: 'var(--indigo-dark)', color: 'white' }}>
              <span className="sb-item-icon" style={{filter: 'grayscale(0)'}}>🛡️</span>
              <span className="sb-item-label">Owner Portal</span>
            </Link>
          )}

        </nav>

        <div className="sb-footer">
          <button className="sb-logout" onClick={handleLogout}>
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
            Good morning, <strong>{user?.firstName || "Learner"}</strong> 👋 Ready to learn something great today?
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
                  <div>
                    <div className="stat-num">{loadingEnrolments ? <div className="skeleton" style={{ width: '30px', height: '28px' }}></div> : completedCount}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--blue-bg)" }}>📅</div>
                  <div>
                    <div className="stat-num">{loadingSessions ? <div className="skeleton" style={{ width: '30px', height: '28px' }}></div> : sessions.length}</div>
                    <div className="stat-label">Upcoming</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--indigo-light)" }}>⏱️</div>
                  <div>
                    <div className="stat-num">{loadingEnrolments ? <div className="skeleton" style={{ width: '60px', height: '28px' }}></div> : `${enrolments.reduce((sum, e) => sum + (e.dur || 0), 0)}h`}</div>
                    <div className="stat-label">Learning time</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: "var(--purple-bg)" }}>🔥</div>
                  <div>
                    <div className="stat-num">{!user ? "..." : (Math.floor((Date.now() - new Date(user?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) || 1)}</div>
                    <div className="stat-label">Day streak</div>
                  </div>
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
                      {chip}
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
                      <Link className="section-pill" href="/catalogue">View all →</Link>
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
                      <Link className="section-pill" href="/catalogue">View all →</Link>
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
                      <Link className="section-pill" href="/catalogue">View all →</Link>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("cont", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="cont-track">
                          {loadingEnrolments ? (
                            [1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 240px', margin: '0 8px' }}></div>)
                          ) : (
                            continueLearningList.length > 0 ? continueLearningList.map(renderEnrolledCard) : workshops.slice(0, 5).map(renderWorkshopCard)
                          )}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("cont", 1)}>›</button>
                    </div>
                  </div>

                  {sessions.length > 0 && (
                    <div className="fade-up" style={{ animationDelay: '0.14s' }}>
                      <div className="section-hd">
                        <div className="section-hd-left">
                          <div className="section-label">Your schedule</div>
                          <div className="section-title">Next live session</div>
                        </div>
                        <button className="section-pill" onClick={() => setActiveView("upcoming")}>View all sessions →</button>
                      </div>
                      {loadingSessions ? (
                        <div className="skeleton" style={{ width: '100%', height: '100px' }}></div>
                      ) : (
                        <div className="summary-card">
                          <div className="summary-card-top">
                            <div className="upcoming-date-block" style={{ margin: 0 }}>
                              <div className="upcoming-day">{new Date(sessions[0].scheduledStart).getDate()}</div>
                              <div className="upcoming-month">{new Date(sessions[0].scheduledStart).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                            </div>
                            <div className="summary-card-info">
                              <div className="summary-card-title">{sessions[0].sessionTitle}</div>
                              <div className="summary-card-meta">
                                {sessions[0].courseName} · {new Date(sessions[0].scheduledStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="summary-card-bottom">
                            <div className="summary-card-time">
                              Starts at {new Date(sessions[0].scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              {timeLeft && timeLeft !== 'Started' && <span className="starting-pill">Starting in {timeLeft}</span>}
                            </div>
                            <button 
                              className="enrol-cta coral summary-card-btn" 
                              onClick={() => {
                                const joinable = new Date(sessions[0].scheduledStart).getTime() <= Date.now() + (15 * 60 * 1000);
                                const isPast = new Date(sessions[0].scheduledStart).getTime() < Date.now();
                                if (sessions[0].recordingAvailable && isPast) window.open(`/api/sessions/${sessions[0].sessionId}/recording`, '_blank');
                                else if (joinable) window.open(`/api/learner/sessions/${sessions[0].sessionId}/join`, '_blank');
                                else setActiveView("upcoming");
                              }}
                            >
                              {sessions[0].recordingAvailable && new Date(sessions[0].scheduledStart).getTime() < Date.now() ? "Watch Recording ↗" : (new Date(sessions[0].scheduledStart).getTime() <= Date.now() + (15 * 60 * 1000) ? "Join Class →" : "View Details →")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="fade-up" style={{ animationDelay: '0.18s' }}>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Trending now</div>
                        <div className="section-title">What everyone&apos;s taking</div>
                      </div>
                      <Link className="section-pill" href="/catalogue">View all →</Link>
                    </div>
                    <div className="carousel-wrap">
                      <button className="cbtn cbtn-l" onClick={() => slide("trend", -1)}>‹</button>
                      <div className="carousel-outer">
                        <div className="carousel-track" id="trend-track">
                          {loadingWorkshops ? (
                            [1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" style={{ flex: '0 0 240px', margin: '0 8px' }}></div>)
                          ) : (
                            (() => {
                              const trending = workshops.filter(w => (w.tags?.includes('pop') || Number(w.rating) >= 4.5)).slice(0, 6);
                              if (trending.length > 0) return trending.map(renderWorkshopCard);
                              // Fallback to any workshops if tag-based trending is empty, ensuring we always show something
                              const fallbackResults = workshops.length > 3 ? workshops.slice(Math.max(0, workshops.length - 6)) : workshops;
                              return fallbackResults.map(renderWorkshopCard);
                            })()
                          )}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("trend", 1)}>›</button>
                    </div>
                  </div>

                  {/* ══ INSTRUCTOR PORTAL INJECTION (Temporarily Disabled) ══ */}
                  {/* 
                  <div className="fade-up" style={{ animationDelay: '0.2s', marginTop: '24px' }}>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Instructor Portal</div>
                        <div className="section-title">Teach on XWORKS</div>
                      </div>
                    </div>
                    {user?.role === 'instructor' ? (
                       <div className="summary-card">
                          <div className="summary-card-info">
                            <div className="summary-card-title">Go to Creator Studio</div>
                            <div className="summary-card-meta">Manage your courses, live sessions, and view earnings.</div>
                          </div>
                          <Link 
                            className="enrol-cta coral summary-card-btn" 
                            style={{ textDecoration: 'none', textAlign: 'center' }}
                            href="/instructor"
                          >
                            Open Instructor Portal 🚀
                          </Link>
                       </div>
                    ) : (
                       <div className="summary-card">
                          <div className="summary-card-info">
                            <div className="summary-card-title">Become an Instructor</div>
                            <div className="summary-card-meta">Share your knowledge and earn revenue by teaching premium cyber-tech workshops.</div>
                          </div>
                          <Link 
                            className="enrol-cta coral summary-card-btn" 
                            style={{ textDecoration: 'none', textAlign: 'center' }}
                            href="/teach"
                          >
                            Apply as Instructor ✨
                          </Link>
                       </div>
                    )}
                  </div>
                  */}
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
                  You&apos;ve completed {completedDisplayList.length} workshops · {completedDisplayList.reduce((s, c) => s + (Number(c.dur) || 0), 0)} hours of learning
                </div>
              </div>
              <div className="completed-grid fade-up" style={{ animationDelay: '0.06s' }}>
                {completedDisplayList.length > 0 ? completedDisplayList.map((c, i) => (
                  <div className="completed-card" key={i}>
                    <div className={`completed-icon ${c.bg}`} style={{ background: "none" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={c.bg}></div>
                      <span style={{ position: "absolute", fontSize: "22px" }}>{c.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                      <div className="completed-name">{c.name}</div>
                      <div className="completed-meta">{c.meta}</div>
                      {c.pct === 100 && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                          <button className="cert-btn">🏆 View certificate</button>
                          <button 
                            className="cert-btn" 
                            style={{ background: "var(--indigo-light)", color: "var(--indigo)" }}
                            onClick={() => openEnrol({
                              id: c.id,
                              name: c.name,
                              rating: String(c.rating),
                              dur: String(c.dur),
                              catLabel: c.catLabel,
                              price: Number(c.price),
                              icon: c.icon,
                              g: c.bg,
                              slug: c.slug,
                              live: !!c.live,
                              tags: [],
                              isNew: false,
                              nearby: false,
                              cat: ""
                            })}
                          >
                            Pay again →
                          </button>
                        </div>
                      )}
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${c.pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                    {loadingEnrolments ? "Loading your learning journey..." : "You haven't enrolled in any courses yet."}
                  </div>
                )}
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
                  {sessions.length} workshops you&apos;ve enrolled in — get ready!
                </div>
              </div>
              <div className="upcoming-list fade-up" style={{ animationDelay: '0.06s' }}>
                {sessions.length > 0 ? sessions.map((s, i) => {
                  const startDate = new Date(s.scheduledStart);
                  const isJoinable = startDate.getTime() <= Date.now() + (15 * 60 * 1000); // 15 mins before
                  return (
                    <div className="upcoming-card" key={i}>
                      <div className="upcoming-date-block">
                        <div className="upcoming-day">{startDate.getDate()}</div>
                        <div className="upcoming-month">{startDate.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="upcoming-name">{s.sessionTitle}</div>
                        <div className="upcoming-meta">
                          {s.courseName} · {s.platform || 'Online'}
                          {s.paymentStatus === 'refunded' && <span style={{ color: 'var(--alert-red)', fontWeight: 600, marginLeft: '8px' }}>· Refunded</span>}
                        </div>
                      </div>
                      <div className="upcoming-right">
                        <span className={`upcoming-mode ${startDate.getTime() > Date.now() ? (s.sessionStatus === 'cancelled' ? '' : 'mode-live') : ''}`}>
                          {s.sessionStatus === 'cancelled' ? '🚫 Cancelled' : (startDate.getTime() > Date.now() ? '🔴 Live' : '⏺ Recorded')}
                        </span>
                        <div className="upcoming-time">⏰ {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        {s.sessionStatus === 'cancelled' ? (
                          <button className="join-btn disabled" disabled>Cancelled</button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className={`join-btn ${isJoinable ? "" : (s.recordingAvailable && startDate.getTime() < Date.now() ? "" : "disabled")}`}
                              onClick={() => {
                                if (s.recordingAvailable && startDate.getTime() < Date.now()) {
                                  window.open(`/api/sessions/${s.sessionId}/recording`, '_blank');
                                } else if (isJoinable) {
                                  window.open(`/api/learner/sessions/${s.sessionId}/join`, '_blank');
                                }
                              }}
                            >
                              {s.recordingAvailable && startDate.getTime() < Date.now() ? "Watch Recording ↗" : (isJoinable ? "Join now →" : "Not yet")}
                            </button>
                            {startDate.getTime() > Date.now() + (2 * 60 * 60 * 1000) && (
                              <button 
                                className="join-btn" 
                                style={{ background: 'var(--surface-2)', color: 'var(--indigo)', border: '0.5px solid var(--border-md)' }}
                                onClick={() => handleOpenBooking(s.courseId, s.courseName, s.registrationId)}
                              >
                                Reschedule
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', width: '100%', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                    {loadingSessions ? "Checking for upcoming sessions..." : "No upcoming live sessions found."}
                  </div>
                )}
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
                      {workshops.slice(0, 6).map(renderWorkshopCard)}
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
                  {workshops.slice(0, 4).map(renderWorkshopCard)}
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
                  {workshops.slice(4, 8).map(renderWorkshopCard)}
                </div>
              </div>
            </div>
          )}

          {/* ══ VIEW: SETTINGS ══ */}
          {activeView === "settings" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="fade-up" style={{ animationDelay: '0s', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                <div>
                  <div className="section-label">Account</div>
                  <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                    Settings
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                    Manage your profile and preferences
                  </div>
                </div>
                {settingsStatus && <div className="fade-up" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--indigo)', background: 'var(--indigo-light)', padding: '6px 14px', borderRadius: '8px' }}>{settingsStatus}</div>}
              </div>
              <div className="settings-grid fade-up" style={{ animationDelay: '0.06s' }}>
                <div className="settings-card">
                  <div className="settings-card-title">👤 Profile</div>
                  <div className="settings-avatar-row">
                    <div className="settings-avatar-big">
                      {settingsForm.firstName?.[0] || user?.firstName?.[0] || "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{settingsForm.firstName} {settingsForm.lastName}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Learner · Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="settings-field">
                      <label>First name</label>
                      <input className="settings-input" value={settingsForm.firstName} onChange={e => setSettingsForm(p => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div className="settings-field">
                      <label>Last name</label>
                      <input className="settings-input" value={settingsForm.lastName} onChange={e => setSettingsForm(p => ({ ...p, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Email address</label>
                    <input className="settings-input" style={{ opacity: 0.6, cursor: 'not-allowed' }} value={user?.email || ""} readOnly />
                  </div>
                  <div className="settings-field">
                    <label>Phone</label>
                    <input className="settings-input" value={settingsForm.phone} onChange={e => setSettingsForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="settings-field">
                    <label>City</label>
                    <input className="settings-input" value={settingsForm.city} onChange={e => setSettingsForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <button className="settings-save" onClick={handleSaveSettings} disabled={isSavingSettings}>
                    {isSavingSettings ? "Saving..." : "Save changes"}
                  </button>
                </div>
                <div>
                  <div className="settings-card" style={{ marginBottom: "16px" }}>
                    <div className="settings-card-title">🔔 Notifications</div>
                    {[
                      { id: 'reminders', lbl: 'Upcoming class reminders', sub: '1 hour before class starts' },
                      { id: 'digest', lbl: 'New workshops in your interests', sub: 'Weekly digest' },
                      { id: 'nearby', lbl: 'Nearby live classes', sub: 'Workshops within 5km' },
                      { id: 'certs', lbl: 'Certificate earned' }
                    ].map(n => (
                      <div className="toggle-row" key={n.id}>
                        <div><div className="toggle-label">{n.lbl}</div>{n.sub && <div className="toggle-sub">{n.sub}</div>}</div>
                        <div className={`toggle ${settingsForm.preferences[n.id] ? 'on' : ''}`} onClick={() => togglePreference(n.id)}></div>
                      </div>
                    ))}
                  </div>
                  <div className="settings-card">
                    <div className="settings-card-title">🎯 Learning Preferences</div>
                    <div className="settings-field">
                      <label>Interests (comma separated)</label>
                      <input className="settings-input" value={settingsForm.preferences.interests || ""} onChange={e => setSettingsForm(p => ({ ...p, preferences: { ...p.preferences, interests: e.target.value } }))} />
                    </div>
                    <div className="settings-field">
                      <label>Preferred language</label>
                      <select className="settings-input" value={settingsForm.preferences.lang || "English"} onChange={e => setSettingsForm(p => ({ ...p, preferences: { ...p.preferences, lang: e.target.value } }))}>
                        <option>English</option><option>Hindi</option><option>Tamil</option>
                      </select>
                    </div>
                    <button className="settings-save" style={{ marginTop: '16px', borderRadius: '10px' }} onClick={handleSaveSettings}>Save Preferences</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ VIEW: PLAYER ══ */}
          {activeView === "player" && (
            <div className="view active fade-up" style={{ display: 'flex', gap: '20px', width: '100%' }}>
              {loadingPlayer || !playerContent ? (
                <div style={{ padding: '80px', textAlign: 'center', width: '100%', color: 'var(--text-3)' }}>
                  Loading your learning experience...
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div className="section-label">Now playing</div>
                    <div className="section-title" style={{ fontSize: '24px', marginBottom: '20px' }}>{playerContent.title}</div>
                    
                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                      <video 
                        src={playerContent.videoUrl} 
                        controls 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
                      />
                    </div>

                    <div className="stat-card" style={{ width: '100%', padding: '20px', display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{Math.round(playerContent.currentProgress)}% Completed</div>
                        <div className="progress-bar-wrap" style={{ height: '8px' }}>
                          <div className="progress-bar-fill" style={{ width: `${playerContent.currentProgress}%` }}></div>
                        </div>
                      </div>
                      <button 
                        className="enrol-cta coral" 
                        style={{ marginLeft: '20px', width: 'auto', padding: '10px 24px', marginTop: 0 }}
                        onClick={() => updatePlayerProgress(playerContent.enrolmentId, Math.min(100, playerContent.currentProgress + 10))}
                        disabled={playerContent.currentProgress >= 100}
                      >
                        Next Lesson →
                      </button>
                    </div>
                  </div>

                  <div style={{ width: '320px', background: 'var(--surface)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Curriculum</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {playerContent.curriculum.map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '12px', opacity: item.completed ? 0.6 : 1 }}>
                          <span style={{ fontSize: '18px' }}>{item.completed ? '✅' : '🔴'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{item.duration}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ VIEW: CERTIFICATES ══ */}
          {activeView === "certificates" && (
            <div className="view active fade-up" style={{ display: 'flex' }}>
              <div className="fade-up" style={{ animationDelay: '0s' }}>
                <div className="section-label">Your credentials</div>
                <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
                  My Certificates
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  Verified proof of your expertise and hard work.
                </div>
              </div>
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }} className="fade-up">
                {certs.length > 0 ? certs.map((c, i) => (
                  <div key={i} className="stat-card" style={{ width: '100%', padding: '24px', flexDirection: 'column', alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: '16px' }}>
                    <div 
                      style={{ display: 'flex', gap: '16px', width: '100%', marginBottom: '20px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onClick={() => window.open(`/verify/${c.credentialId}`, '_blank')}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <div className={`completed-icon ${c.thumbBg}`} style={{ background: "none", margin: 0 }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }} className={c.thumbBg}></div>
                        <span style={{ position: "absolute", fontSize: "20px" }}>{c.emoji || '📜'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {c.courseName} 
                          <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600, padding: '2px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '100px' }}>Verify ↗</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>ID: {c.credentialId}</div>
                      </div>
                    </div>
                    <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
                      <button 
                        className="enrol-cta coral" 
                        style={{ width: 'auto', padding: '10px 20px', marginTop: 0, fontSize: '13px' }}
                        onClick={() => window.open(`/api/learner/certificates/${c.credentialId}/download`, '_blank')}
                      >
                         Download PDF ↓
                      </button>
                      <button 
                        className="section-pill" 
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', cursor: 'pointer' }}
                        onClick={() => {
                          const url = window.location.origin + `/verify/${c.credentialId}`;
                          navigator.clipboard.writeText(url);
                          alert("Verification link copied to clipboard!");
                        }}
                      >
                         Share →
                      </button>
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-4)' }}>
                      Issued on {new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-3)', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                    {loadingCerts ? "Generating your certificate library..." : "No certificates issued yet. Complete a course to earn your first!"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ NOTES VIEW ══ */}
          {activeView === "notes" && (
            <div className="view active fade-up">
              <div className="view-hd">
                <h2 className="view-title">My Study Notes 📝</h2>
                <p className="view-sub">Track your insights and highlights from every session.</p>
              </div>

              <div className="notes-container">
                <div className="notes-header">
                  <div className="notes-search-box">
                    <span className="notes-search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search by title, content or #tags..." 
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                    />
                  </div>
                </div>

                {loadingNotes ? (
                  <div className="notes-grid">
                    {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: '180px', borderRadius: '16px' }}></div>)}
                  </div>
                ) : notes.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-emoji">📓</div>
                    <div className="empty-title">Your notebook is empty</div>
                    <div className="empty-sub">Start by pinning a note for an upcoming session!</div>
                    <button className="enrol-cta coral" style={{ width: 'auto', marginTop: '20px' }} onClick={() => { setCurrentNote({ title: "", content: "", tags: [], is_pinned: false }); setIsNoteEditorOpen(true); }}>Create First Note</button>
                  </div>
                ) : (
                  <div className="notes-grid">
                    {notes
                      .filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.content.toLowerCase().includes(noteSearch.toLowerCase()) || n.tags.some(t => t.toLowerCase().includes(noteSearch.toLowerCase())))
                      .map(note => (
                      <div key={note.id} className={`note-card ${note.id ? '' : 'unsaved'} ${note.is_pinned ? 'pinned' : ''}`} onClick={() => { setCurrentNote(note); setIsNoteEditorOpen(true); }}>
                        {note.is_pinned && <span className="note-card-pin">📌</span>}
                        <div className="note-card-title">{note.title || "Untitled Note"}</div>
                        <div className="note-card-excerpt">{note.content || "No content yet..."}</div>
                        <div className="note-tags">
                          {(note.tags || []).map(t => <span key={t} className="note-tag">{t.startsWith('#') ? t : `#${t}`}</span>)}
                          {note.workshopName && <span className="note-tag" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>{note.workshopName}</span>}
                        </div>
                        <div className="note-card-footer">
                          <span className="note-date">{note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'Just now'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="note-fab" onClick={() => { setCurrentNote({ title: "", content: "", tags: [], is_pinned: false }); setIsNoteEditorOpen(true); }}>+</button>
            </div>
          )}

          {/* ══ NOTE EDITOR OVERLAY ══ */}
          {isNoteEditorOpen && currentNote && (
            <div className="note-editor-overlay" onClick={(e) => { if ((e.target as any).className === 'note-editor-overlay') setIsNoteEditorOpen(false); }}>
              <div className="note-editor">
                <div className="note-editor-hd">
                  <div className="note-editor-actions">
                    <button className="v-btn" style={{ padding: '8px 16px', background: 'var(--surface-2)', fontSize: '12px' }} onClick={() => setIsNoteEditorOpen(false)}>Close</button>
                    <button className={`v-btn ${currentNote.is_pinned ? "v-btn-primary" : ""}`} style={{ padding: '8px 16px', fontSize: '12px', background: currentNote.is_pinned ? 'var(--coral)' : 'var(--surface-2)', color: currentNote.is_pinned ? '#fff' : 'var(--ink)' }} onClick={() => setCurrentNote(prev => prev ? ({ ...prev, is_pinned: !prev.is_pinned }) : null)}>
                      {currentNote.is_pinned ? 'Pinned 📌' : 'Pin Note'}
                    </button>
                  </div>
                  <div className="note-editor-actions">
                    {currentNote.id && <button className="v-btn" style={{ padding: '8px 16px', fontSize: '12px', background: '#FEE2E2', color: '#B91C1C' }} onClick={() => { if (confirm("Delete this note?")) deleteNote(currentNote.id as string); }}>Delete</button>}
                    <button className="v-btn v-btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => saveNote(currentNote)}>Save Note</button>
                  </div>
                </div>
                
                <div className="note-editor-body">
                  <input 
                    className="note-input-title" 
                    placeholder="Note title..." 
                    value={currentNote.title}
                    onChange={(e) => setCurrentNote(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                  />
                  <div className="note-tags">
                     <input 
                       placeholder="Add tags (comma separated)..." 
                       style={{ background: 'transparent', border: 'none', fontSize: '12px', outline: 'none', color: 'var(--text-3)', width: '100%' }}
                       value={currentNote.tags.join(", ")}
                       onChange={(e) => setCurrentNote(prev => prev ? ({ ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }) : null)}
                     />
                  </div>
                  <textarea 
                    className="note-input-content" 
                    placeholder="Start writing..." 
                    value={currentNote.content}
                    onChange={(e) => setCurrentNote(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                  />
                </div>

                <div className="note-editor-footer">
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {currentNote.id ? `Last synced: ${currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleTimeString() : 'Recently'}` : 'New Unsaved Note'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      style={{ background: 'var(--surface-2)', border: 'none', borderRadius: '6px', fontSize: '11px', padding: '4px 8px', outline: 'none', color: 'var(--ink)' }}
                      value={currentNote.workshop_id || ""}
                      onChange={(e) => setCurrentNote(prev => prev ? ({ ...prev, workshop_id: e.target.value || undefined }) : null)}
                    >
                      <option value="">Link to Workshop...</option>
                      {enrolments.map(e => <option key={e.enrolment_id} value={e.courseId}>{e.courseName}</option>)}
                    </select>
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
                      { id: "live", lbl: "Live session", icon: "🔴", sub: "Interactive · Q&A included", priceCalc: (b: number) => b },
                      { id: "recorded", lbl: "Recorded", icon: "📹", sub: "Watch anytime · Self-paced", priceCalc: (b: number) => Math.round(b * 0.8) },
                      { id: "inperson", lbl: "In-person", icon: "📍", sub: "Nearby · Limited seats", priceCalc: (b: number) => b + 500 }
                    ].map((f) => {
                      const calculatedPrice = f.priceCalc(enrolData.basePrice || 0);
                      return (
                        <div
                          key={f.id}
                          className={`enrol-format-btn ${enrolData.format === f.id ? "selected" : ""}`}
                          onClick={() => setEnrolData({
                            ...enrolData,
                            format: f.id,
                            formatLabel: f.lbl.toLowerCase(),
                            price: `₹${calculatedPrice.toLocaleString("en-IN")}`,
                            finalPrice: calculatedPrice,
                            promoApplied: false
                          })}
                        >
                          <div className="enrol-format-icon">{f.icon}</div>
                          <div className="enrol-format-name">{f.lbl}</div>
                          <div className="enrol-format-sub">{f.sub}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: 'var(--indigo)' }}>₹{calculatedPrice.toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
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
                  <div className="enrol-section-label">Available Sessions</div>
                  <div className="enrol-date-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
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
                          onClick={() => setEnrolData(prev => ({ ...prev, date: fullStr, time: timeStr, sessionId: s.id }))}
                          style={{ height: 'auto', padding: '12px 8px', cursor: 'pointer' }}
                        >
                          <div className="enrol-date-day">{day}</div>
                          <div className="enrol-date-num">{num} {month}</div>
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
                    <div className="enrol-session-info" style={{ marginTop: '24px', padding: '12px', background: 'var(--surface-2)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-2)' }}>
                      Selected: <strong>{enrolData.date as string}</strong> at <strong>{enrolData.time as string}</strong>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>Joining details will be sent after payment.</div>
                    </div>
                  )}

                  <button
                    className="enrol-cta"
                    onClick={() => setEnrolStep(3)}
                    disabled={!enrolData.date}
                    style={{ marginTop: '24px', opacity: !enrolData.date ? 0.5 : 1 }}
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
                  <button className="enrol-cta coral" onClick={initiateEnrolPayment}>
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
                    <button className="enrol-success-btn" onClick={() => { closeEnrol(); setActiveView("upcoming"); }}>View in Upcoming →</button>
                    <button className="enrol-success-btn primary" onClick={() => { closeEnrol(); setActiveView("upcoming"); }}>Go to dashboard →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ LOGOUT OVERLAY ══ */}
      {isLoggingOut && (
        <div className="enrol-backdrop open" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-up" style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👋</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Logging you out...</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Successfully logged out of XWORKS. Redirecting to Login...</div>
          </div>
        </div>
      )}
      {/* ══ BOOKING MODAL ══ */}
      {bookingSession && (
        <div className="enrol-backdrop open" style={{ zIndex: 1000 }}>
          <div className="enrol-modal" style={{ maxWidth: '440px' }}>
            <div className="enrol-modal-hd">
              <div className="enrol-modal-title">Secure your seat</div>
              <button className="enrol-modal-close" onClick={() => setBookingSession(null)}>×</button>
            </div>
            <div className="enrol-body">
              <div className="enrol-course-mini">
                <div className="enrol-thumb" style={{ background: 'var(--indigo-light)' }}>🗓️</div>
                <div>
                  <div className="enrol-course-name">{bookingSession.courseName}</div>
                  <div className="enrol-course-meta">Select a live session date</div>
                </div>
              </div>

              <div className="enrol-section-label">Available dates</div>
              <div className="enrol-date-grid" style={{ gridTemplateColumns: '1fr', gap: '10px' }}>
                {availableSessions.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)' }}>No upcoming sessions found for this course.</div>
                ) : (
                  availableSessions.map(s => (
                    <div 
                      key={s.id} 
                      className={`enrol-date-btn ${isBooking ? 'disabled' : ''}`}
                      style={{ textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '15px', border: '1.5px solid var(--border)' }}
                      onClick={() => !isBooking && handleConfirmBooking(s.id)}
                    >
                      <div className="upcoming-date-block" style={{ width: '40px', height: '40px', background: 'var(--indigo-light)', borderRadius: '8px', margin: 0 }}>
                        <div className="upcoming-day" style={{ fontSize: '14px', color: 'var(--indigo)', fontWeight: 800 }}>{new Date(s.scheduled_start).getDate()}</div>
                        <div className="upcoming-month" style={{ fontSize: '8px', color: 'var(--indigo)', fontWeight: 700 }}>{new Date(s.scheduled_start).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{s.title || 'Live Workshop'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          {new Date(s.scheduled_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {s.registered_count}/{s.max_seats} filled
                        </div>
                      </div>
                      <div style={{ color: 'var(--indigo)', fontWeight: 800 }}>→</div>
                    </div>
                  ))
                )}
              </div>
              {isBooking && <div className="btn-loading" style={{ margin: '20px auto' }}></div>}
            </div>
          </div>
        </div>
      )}
      {/* ══ SESSION EXPIRED MODAL ══ */}
      {sessionExpired && (
        <div className="enrol-backdrop open" style={{ zIndex: 9999 }}>
          <div className="enrol-modal" style={{ maxWidth: "400px", textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔒</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "24px", fontWeight: 800, marginBottom: "12px", color: "var(--ink)" }}>
              Session Expired
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: "14px", lineHeight: 1.6, marginBottom: "32px" }}>
              For your security, your session has timed out. Please log in again to continue your journey.
            </p>
            <button 
              className="enrol-cta coral" 
              style={{ width: "100%", margin: 0 }}
              onClick={() => window.location.href = "/Login"}
            >
              Log in to XWORKS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
