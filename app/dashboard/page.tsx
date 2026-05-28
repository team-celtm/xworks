"use client";

import { useState, useEffect, Suspense } from "react";
import "./dashboard.css";
import "./notes.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "../components/Logo";
import RoleTransitionOverlay from "../components/RoleTransitionOverlay";
import AlertModal from "../components/AlertModal";
import { formatDuration } from '@/lib/utils';
import { fetchApi } from '@/lib/apiClient';

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
  dur: number;
  tags: string[];
  live: boolean;
  isNew: boolean;
  nearby: boolean;
  price: number;
  logo?: string;
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
  courseOriginalPrice?: number;
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="loader" style={{ margin: '100px auto' }}></div>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState("home");
  useUrlSync('view', activeView, setActiveView, 'home', searchParams, router);
  const [promptQuery, setPromptQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ query: string; recorded: Workshop[]; live: Workshop[] } | null>(null);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loadingEnrolments, setLoadingEnrolments] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  // Enrol modal state
  const [enrolModalOpen, setEnrolModalOpen] = useState(false);
  const [enrolStep, setEnrolStep] = useState(1);
  const [enrolData, setEnrolData] = useState<DashboardEnrolData>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoOk, setPromoOk] = useState({ text: "", color: "", show: false });
  const [promoLoading, setPromoLoading] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [certs, setCerts] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem('xworks_note_draft');
      if (draft && !currentNote && !isNoteEditorOpen) {
        try {
          const parsed = JSON.parse(draft);
          setCurrentNote(parsed);
          setIsNoteEditorOpen(true);
        } catch(e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isNoteEditorOpen && currentNote && (currentNote.title || currentNote.content)) {
        localStorage.setItem('xworks_note_draft', JSON.stringify(currentNote));
      } else if (!isNoteEditorOpen) {
        localStorage.removeItem('xworks_note_draft');
      }
    }
  }, [currentNote, isNoteEditorOpen]);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    preferences: {} as any
  });

  const updateSettingsForm = (updater: any) => {
    setSettingsForm((prev: any) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') localStorage.setItem('xworks_settings_draft', JSON.stringify(next));
      return next;
    });
  };
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
      const res = await fetchApi("/api/courses");
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
          price: r.price,
          logo: r.logo
        }));
        setWorkshops(mapped);

        // Also fetch trending separately for better data coverage
        const trendRes = await fetchApi("/api/courses?sort=best&limit=8");
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
            nearby: !!r.nearby,
            logo: r.logo
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
      const res = await fetchApi("/api/learner/enrolments");
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
      const res = await fetchApi("/api/auth/me");
      if (res.status === 401) return setSessionExpired(true);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.role === 'admin') {
          router.push('/admin');
          return true; // Indicate redirect is happening
        }
        if (data.role === 'instructor') {
          router.push('/instructor');
          return true; // Indicate redirect is happening
        }
      }
      return false;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      return false;
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchApi("/api/learner/sessions");
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
      const res = await fetchApi("/api/learner/notes");
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
    if (isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetchApi("/api/learner/notes", {
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
    } finally {
      setIsSavingNote(false);
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
      const res = await fetchApi(`/api/learner/notes/${id}`, { method: "DELETE" });
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
      const res = await fetchApi("/api/learner/certificates");
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
      const res = await fetchApi("/api/learner/profile");
      if (res.ok) {
        const data = await res.json();
        const draftStr = typeof window !== 'undefined' ? localStorage.getItem('xworks_settings_draft') : null;
        if (draftStr) {
          try {
            setSettingsForm(JSON.parse(draftStr));
            setSettingsStatus("Showing unsaved draft");
          } catch(e) {}
        } else {
          setSettingsForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            phone: data.phone || "",
            city: data.city || "",
            preferences: data.preferences || {}
          });
        }
      }
    } catch (err) {}
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsStatus("Saving...");
    try {
      const res = await fetchApi("/api/learner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        setSettingsStatus("Saved! ✨");
        if (typeof window !== 'undefined') localStorage.removeItem('xworks_settings_draft');
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
    updateSettingsForm((prev: any) => ({
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
      setIsLoading(true);
      const results = await Promise.all([
        loadWorkshops(),
        fetchEnrolments(),
        fetchUser(),
        fetchSessions(),
        fetchCerts(),
        fetchNotes(),
        fetchProfile()
      ]);
      const isRedirecting = results[2]; // results from fetchUser()
      if (isRedirecting) return; // Keep loading visible during redirect

      setTodayDate(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
      setIsLoading(false);
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
    .map(e => {
      const cert = certs.find(c => c.courseId === e.course_id);
      return {
        id: e.course_id,
        icon: e.logo || e.emoji || "🎓",
        bg: e.thumbBg || "g-ai",
        name: e.name,
        meta: e.progressPct === 100
          ? `Completed ${new Date(e.completedAt || e.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${formatDuration(e.dur)}`
          : `In progress · ${formatDuration(Math.round((e.progressPct / 100) * e.dur))} of ${formatDuration(e.dur)} done`,
        pct: Math.round(e.progressPct),
        rating: e.rating,
        dur: e.dur,
        catLabel: e.catLabel,
        price: e.basePrice || 1299,
        slug: e.slug,
        live: e.live,
        certId: cert?.credentialId,
        certUrl: cert?.verificationUrl
      };
    });

  const continueLearningList = enrolments.filter(e => e.enrolment_status === 'active');

  const handleSearch = async (queryToSearch?: string) => {
    const q = (typeof queryToSearch === 'string' ? queryToSearch : promptQuery).trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetchApi(`/api/courses?q=${encodeURIComponent(q)}`);
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
        nearby: !!r.nearby,
        logo: r.logo
      }));

      const recorded = mappedResults.filter((w) => !w.live);
      const live = mappedResults.filter((w) => w.live);

      setSearchResults({ query: q, recorded, live });
      setCState((prev) => ({ ...prev, rec: 0, live: 0 }));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (promptQuery.trim()) {
        handleSearch(promptQuery);
      } else {
        setSearchResults(null);
      }
    }, 400); // Debounce search
    return () => clearTimeout(handler);
  }, [promptQuery]);

  const handleQuickSearch = (text: string) => {
    setPromptQuery(text);
  };

  const handleOpenBooking = async (courseId: string, courseName: string, regId?: string) => {
    setBookingSession({ courseId, courseName, regId });
    try {
      const res = await fetchApi(`/api/courses/${courseId}/sessions`);
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

      const res = await fetchApi(url, { 
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
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
    const basePrice = Number(w.price) || 0;
    setEnrolData({
      courseId: String(w.id),
      name: w.name,
      meta: `by Ananya Sharma · ★ ${w.rating} · ${formatDuration(w.dur)} · ${w.catLabel}`,
      price: `₹${basePrice.toLocaleString("en-IN")}`,
      basePrice: basePrice,
      finalPrice: basePrice,
      courseOriginalPrice: basePrice,
      format: "live",
      formatLabel: "live session",
      date: "",
      time: "",
      payMethod: "UPI",
      promoApplied: false,
      thumbBg: w.g,
      thumbEmoji: w.logo || w.icon
    });
    setEnrolStep(1);
    setPromoCode("");
    setPromoOk({ text: "", color: "", show: false });
    setEnrolModalOpen(true);

    try {
      const res = await fetchApi(`/api/courses/id/${w.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setModalSessions(data);
        if (data.length > 0) {
          const first = data[0];
          setEnrolData(prev => ({
            ...prev,
            sessionId: first.id,
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
    if (!code) {
      setPromoOk({ text: "✗ Please enter a promo code", color: "#D84040", show: true });
      setEnrolData((prev: DashboardEnrolData) => ({
        ...prev,
        promoApplied: false,
        finalPrice: prev.basePrice || 0,
        discount: 0
      }));
      return;
    }

    setPromoLoading(true);
    try {
      const res = await fetchApi("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, courseId: enrolData.courseId, format: enrolData.format })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setEnrolData((prev: DashboardEnrolData) => ({
          ...prev,
          promoApplied: true,
          finalPrice: data.discountedPrice,
          discount: (prev.basePrice || 0) - data.discountedPrice
        }));
        setPromoOk({ text: `✓ Code applied — ${data.discountPercentage}% off!`, color: "#16A34A", show: true });
        setTimeout(() => triggerPromoConfetti('promo-apply-btn'), 50);
      } else {
        setPromoOk({ text: `✗ ${data.error || "Invalid code"}`, color: "#D84040", show: true });
        setEnrolData((prev: DashboardEnrolData) => ({
          ...prev,
          promoApplied: false,
          finalPrice: prev.basePrice || 0,
          discount: 0
        }));
      }
    } catch (err) {
      setPromoOk({ text: "✗ Connection error", color: "#D84040", show: true });
      setEnrolData((prev: DashboardEnrolData) => ({
        ...prev,
        promoApplied: false,
        finalPrice: prev.basePrice || 0,
        discount: 0
      }));
    } finally {
      setPromoLoading(false);
    }
  };



  const initiateEnrolPayment = async () => {
    try {
      if (!user) {
        alert("Please login first");
        router.push("/Login");
        return;
      }
      if (user.role === 'admin' || user.role === 'instructor') {
        setAlertOpen(true);
        return;
      }

      setEnrolStep(5); // Show processing screen
      setPromoOk({ text: 'Initializing payment gateway...', color: "#1E1B4B", show: true });

      // 0. Handle Free Course / 100% Discount Case
      if (enrolData.finalPrice === 0) {
        setPromoOk({ text: 'Creating free enrolment...', color: "#1E1B4B", show: true });
        const freeRes = await fetchApi("/api/enrolments", {
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
      const res = await fetchApi("/api/payments/create-order", {
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
      if (!res.ok) {
        setPromoOk({ text: data.error || 'Could not create payment order', color: "#D84040", show: true });
        setEnrolStep(6);
        return;
      }

      const options = {
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: 'INR',
        name: "XWORKS",
        description: `Enrollment for ${enrolData.name}`,
        order_id: data.orderId,
        handler: async function (response: any) {
          setEnrolStep(5);
          setPromoOk({ text: 'Verifying your payment securely...', color: "#1E1B4B", show: true });
          try {
            const verifyRes = await fetchApi("/api/payments/verify", {
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
              setPromoOk({ text: vData.error || 'Payment verification failed', color: "#D84040", show: true });
              setEnrolStep(6);
            }
          } catch (vErr: any) {
            console.error("Verification error:", vErr);
            setPromoOk({ text: vErr.message || 'Verification connection failed', color: "#D84040", show: true });
            setEnrolStep(6);
          }
        },
        prefill: {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: () => {
            setPromoOk({ text: 'Payment checkout was closed.', color: "#D84040", show: true });
            setEnrolStep(6); // Cancelled step
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setPromoOk({ text: err.message || 'An error occurred', color: "#D84040", show: true });
      setEnrolStep(6);
    }
  };



  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetchApi('/api/auth/logout', { method: 'POST' });
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
                <span style={{ display: 'none' }}>{w.icon}</span>
              </>
            ) : (
              w.icon
            )}
          </div>
          <div className={`wcard-tag ${tagClass}`}>{tagLabel}</div>
        </div>
        <div className="wcard-body">
          <div className="wcard-cat">{w.catLabel}</div>
          <div className="wcard-name">{w.name}</div>
          <div className="wcard-meta">
            <span className="wcard-rating">★ {w.rating}</span>
            <span>{formatDuration(w.dur)}</span>
          </div>
          {userEnrol ? (
            <button className="wcard-enrol-btn blue" onClick={(e) => { 
                e.stopPropagation(); 
                if (!userEnrol.userSessionRegId) {
                  handleOpenBooking(String(w.id), w.name);
                } else {
                  setActiveView("upcoming");
                }
              }}>
              {userEnrol.userSessionRegId ? "View Schedule →" : "Book Seat →"}
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
      <div className="wcard" key={e.enrolment_id} style={{ cursor: 'pointer' }} onClick={() => setActiveView("upcoming")}>
        <div className="wcard-thumb">
          <div className={`wcard-thumb-bg ${e.thumbBg}`}></div>
          <div className="wcard-thumb-emoji">
            {e.logo ? (
              <>
                <div className="card-logo-badge">
                  <img 
                    src={e.logo} 
                    alt="" 
                    onError={(err) => {
                      err.currentTarget.style.display = 'none';
                      const badge = err.currentTarget.closest('.card-logo-badge') as HTMLElement;
                      if (badge) badge.style.display = 'none';
                      const fallback = badge?.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                </div>
                <span style={{ display: 'none' }}>{e.emoji || "🎓"}</span>
              </>
            ) : (
              e.emoji || "🎓"
            )}
          </div>
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
            <span>{e.instructor}</span>
          </div>
          
          {e.live && !e.userSessionRegId && (
            <button 
              className="wcard-enrol-btn primary" 
              onClick={(ev) => {
                ev.stopPropagation();
                handleOpenBooking(e.course_id, e.name);
              }}
            >
              Secure seat →
            </button>
          )}
          {(!e.live || e.userSessionRegId) && (
            <button className="wcard-enrol-btn blue" onClick={(ev) => { ev.stopPropagation(); setActiveView("upcoming"); }}>
              View Schedule →
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!hasMounted || isLoading) {
    return <RoleTransitionOverlay role="learner" type="login" />;
  }

  if (!hasMounted) return null;

  return (
    <div className={`shell ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {/* ══════════════════════════
           SIDEBAR
      ══════════════════════════ */}
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
          <div className="sb-section-label">Main</div>

          <button className={`sb-item ${activeView === "home" ? "active" : ""}`} onClick={() => { setActiveView("home"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🏠</span>
            <span className="sb-item-label">Home</span>
          </button>

          <button className={`sb-item ${activeView === "completed" ? "active" : ""}`} onClick={() => { setActiveView("completed"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">✅</span>
            <span className="sb-item-label">Courses Completed</span>
            <span className="sb-badge">{completedCount}</span>
          </button>

          <button className={`sb-item ${activeView === "certificates" ? "active" : ""}`} onClick={() => { setActiveView("certificates"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📜</span>
            <span className="sb-item-label">My Certificates</span>
            <span className="sb-badge">{certs.length}</span>
          </button>

          <button className={`sb-item ${activeView === "upcoming" ? "active" : ""}`} onClick={() => { setActiveView("upcoming"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📅</span>
            <span className="sb-item-label">Upcoming Courses</span>
            <span className="sb-badge">{sessions.length}</span>
          </button>

          <button className={`sb-item ${activeView === "notes" ? "active" : ""}`} onClick={() => { setActiveView("notes"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">📝</span>
            <span className="sb-item-label">My Notes</span>
            <span className="sb-badge">{notes.length}</span>
          </button>

          <button className={`sb-item ${activeView === "curious" ? "active" : ""}`} onClick={() => { setActiveView("curious"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">🔮</span>
            <span className="sb-item-label">Sounds Curious</span>
          </button>

          <div className="sb-section-label">Account</div>

          <button className={`sb-item ${activeView === "settings" ? "active" : ""}`} onClick={() => { setActiveView("settings"); setIsMobileMenuOpen(false); }}>
            <span className="sb-item-icon">⚙️</span>
            <span className="sb-item-label">Settings</span>
          </button>

          {user?.role === 'instructor' && (
            <Link href="/instructor" className="sb-item" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', background: 'var(--indigo-dark)', color: 'white' }}>
              <span className="sb-item-icon" style={{filter: 'grayscale(0)'}}>🎬</span>
              <span className="sb-item-label">Instructor Portal</span>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link href="/admin" className="sb-item" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', background: 'var(--indigo-dark)', color: 'white' }}>
              <span className="sb-item-icon" style={{filter: 'grayscale(0)'}}>🛡️</span>
              <span className="sb-item-label">Owner Portal</span>
            </Link>
          )}

        </nav>

        <div className="sb-footer">
          <button className="sb-logout" onClick={handleLogout} disabled={isLoggingOut}>
            <span className="sb-logout-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
            <span className="sb-item-label">{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
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
          <div className="topbar-right" style={{ position: 'relative' }}>
            <div className="topbar-notif" onClick={() => setIsNotifOpen(!isNotifOpen)}>
              🔔<div className="notif-dot"></div>
            </div>
            
            {isNotifOpen && (
              <div className="notif-dropdown" style={{
                position: 'absolute', top: '50px', right: '0', width: '320px', 
                background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                border: '1px solid var(--border-md)', zIndex: 300, overflow: 'hidden'
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                  Notifications
                  <span style={{ fontSize: '12px', color: 'var(--indigo)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setIsNotifOpen(false)}>Close</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ fontSize: '20px' }}>🎉</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Welcome to XWORKS!</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>We're excited to have you on board. Start learning today.</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px' }}>Just now</div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', cursor: 'pointer', background: 'var(--surface-2)' }}>
                    <div style={{ fontSize: '20px' }}>📅</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Upcoming session reminder</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Your next live session starts in 2 hours.</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px' }}>2 hrs ago</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', background: 'var(--surface)' }} onClick={() => setIsNotifOpen(false)}>
                  Mark all as read
                </div>
              </div>
            )}

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
                    <div className="stat-num">{loadingEnrolments ? <div className="skeleton" style={{ width: '60px', height: '28px' }}></div> : `${Math.round(enrolments.reduce((sum, e) => sum + (e.dur || 0), 0) / 3600)}h`}</div>
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
                  <button id="promptBtn" className="prompt-btn" onClick={() => handleSearch()}>
                    {isSearching ? "Searching..." : "Find workshops →"}
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
                <div id="searchResults" style={{ display: "flex", flexDirection: "column", gap: "24px", animationDelay: "0.12s", opacity: isSearching ? 0.6 : 1, transition: 'opacity 0.2s' }} className="fade-up">
                  <div className="results-header">
                    <div>
                      <div className="results-query">Results for <span>{searchResults.query}</span></div>
                      <div className="results-count">
                        {searchResults.recorded.length} recorded · {searchResults.live.length} live workshops found
                      </div>
                    </div>
                  </div>
                  {searchResults.recorded.length === 0 && searchResults.live.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.8 }}>🔍</div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>No workshops found</h3>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>Try adjusting your search terms or try a different topic.</p>
                    </div>
                  ) : (
                    <>
                      {/* Section 1: Recorded */}
                      {searchResults.recorded.length > 0 && (
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
                      )}

                      {/* Section 2: Live */}
                      {searchResults.live.length > 0 && (
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
                      )}
                    </>
                  )}
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
                            continueLearningList.length > 0 
                              ? continueLearningList.map(renderEnrolledCard) 
                              : workshops.length > 0 
                                ? workshops.slice(0, 5).map(renderWorkshopCard) 
                                : <div style={{ padding: '40px', color: 'var(--text-3)', width: '100%', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>No courses available yet.</div>
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
                              if (fallbackResults.length > 0) return fallbackResults.map(renderWorkshopCard);
                              return <div style={{ padding: '40px', color: 'var(--text-3)', width: '100%', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>No trending courses available.</div>;
                            })()
                          )}
                        </div>
                      </div>
                      <button className="cbtn cbtn-r" onClick={() => slide("trend", 1)}>›</button>
                    </div>
                  </div>

                  {/* ══ INSTRUCTOR PORTAL PROMO ══ */}
                  <div className="fade-up" style={{ animationDelay: '0.2s', marginTop: '40px' }}>
                    <div className="section-hd">
                      <div className="section-hd-left">
                        <div className="section-label">Instructor Portal</div>
                        <div className="section-title">Teach on XWORKS</div>
                      </div>
                    </div>
                    {user?.role === 'instructor' ? (
                       <div className="summary-card" style={{ background: 'linear-gradient(135deg, var(--indigo-dark), #1E1B4B)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="summary-card-info">
                            <div className="summary-card-title" style={{ color: '#fff' }}>Go to Creator Studio</div>
                            <div className="summary-card-meta" style={{ color: 'rgba(255,255,255,0.7)' }}>Manage your courses, live sessions, and view earnings.</div>
                          </div>
                          <Link 
                            className="enrol-cta coral summary-card-btn" 
                            style={{ textDecoration: 'none', textAlign: 'center', minWidth: '200px' }}
                            href="/instructor"
                          >
                            Open Instructor Portal 🚀
                          </Link>
                       </div>
                    ) : (
                       <div className="summary-card" style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', boxShadow: '0 10px 30px rgba(55,48,163,0.05)' }}>
                          <div className="summary-card-info">
                            <div className="summary-card-title">Become an Instructor</div>
                            <div className="summary-card-meta">Share your knowledge and earn revenue by teaching premium cyber-tech workshops.</div>
                          </div>
                          <Link 
                            className="enrol-cta coral summary-card-btn" 
                            style={{ textDecoration: 'none', textAlign: 'center', minWidth: '200px' }}
                            href="/teach"
                          >
                            Apply as Instructor ✨
                          </Link>
                       </div>
                    )}
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
                  You&apos;ve completed {completedDisplayList.length} workshops · {Math.round(completedDisplayList.reduce((s, c) => s + (Number(c.dur) || 0), 0) / 3600)} hours of learning
                </div>
              </div>
              <div className="completed-grid fade-up" style={{ animationDelay: '0.06s' }}>
                {completedDisplayList.length > 0 ? completedDisplayList.map((c, i) => (
                  <div className="completed-card" key={i}>
                    <div className={`completed-icon ${c.bg}`} style={{ background: "none" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }} className={c.bg}></div>
                      <span style={{ position: "absolute", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px" }}>
                        {c.icon && (c.icon.startsWith('http') || c.icon.startsWith('/')) ? (
                          <>
                            <img 
                              src={c.icon} 
                              alt="" 
                              style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <span style={{ display: 'none' }}>🎓</span>
                          </>
                        ) : (
                          c.icon
                        )}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                      <div className="completed-name">{c.name}</div>
                      <div className="completed-meta">{c.meta}</div>
                      {c.certId && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                          <button className="cert-btn" onClick={() => window.open(`/verify/${c.certId}`, '_blank')}>🏆 View certificate</button>
                          <button 
                            className="cert-btn" 
                            style={{ background: "var(--indigo-light)", color: "var(--indigo)" }}
                            onClick={() => openEnrol({
                              id: c.id,
                              name: c.name,
                              rating: String(c.rating),
                              dur: Number(c.dur),
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
                      {workshops.length > 0 ? workshops.slice(0, 6).map(renderWorkshopCard) : <div style={{ padding: '40px', color: 'var(--text-3)', width: '100%', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>No courses available right now.</div>}
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
                  {workshops.length > 0 ? workshops.slice(0, 4).map(renderWorkshopCard) : <div style={{ padding: '40px', color: 'var(--text-3)', width: '100%', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>No curated courses yet.</div>}
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
                  {workshops.length > 4 ? workshops.slice(4, 8).map(renderWorkshopCard) : <div style={{ padding: '40px', color: 'var(--text-3)', width: '100%', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>Check back later for more!</div>}
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
                      <label>First Name</label>
                      <div className="settings-input-wrap">
                        <span className="input-icon">👤</span>
                        <input className="settings-input" value={settingsForm.firstName} onChange={e => updateSettingsForm((p: any) => ({ ...p, firstName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="settings-field">
                      <label>Last Name</label>
                      <div className="settings-input-wrap">
                        <input className="settings-input" value={settingsForm.lastName} onChange={e => updateSettingsForm((p: any) => ({ ...p, lastName: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Email address</label>
                    <input className="settings-input" style={{ opacity: 0.6, cursor: 'not-allowed' }} value={user?.email || ""} readOnly />
                  </div>
                  <div className="settings-field">
                    <label>Phone Number</label>
                    <div className="settings-input-wrap">
                      <span className="input-icon">📱</span>
                      <input className="settings-input" value={settingsForm.phone} onChange={e => updateSettingsForm((p: any) => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>City</label>
                    <div className="settings-input-wrap">
                      <span className="input-icon">📍</span>
                      <input className="settings-input" value={settingsForm.city} onChange={e => updateSettingsForm((p: any) => ({ ...p, city: e.target.value }))} />
                    </div>
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
                      <div className="settings-input-wrap">
                        <span className="input-icon">💡</span>
                        <input className="settings-input" value={settingsForm.preferences.interests || ""} onChange={e => updateSettingsForm((p: any) => ({ ...p, preferences: { ...p.preferences, interests: e.target.value } }))} />
                      </div>
                    </div>
                    <div className="settings-field">
                      <label>Preferred language</label>
                      <select className="settings-input" value={settingsForm.preferences.lang || "English"} onChange={e => updateSettingsForm((p: any) => ({ ...p, preferences: { ...p.preferences, lang: e.target.value } }))}>
                        <option>English</option><option>Hindi</option><option>Tamil</option>
                      </select>
                    </div>
                    <button className="settings-save" style={{ marginTop: '16px', borderRadius: '10px' }} onClick={handleSaveSettings} disabled={isSavingSettings}>
                      {isSavingSettings ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              </div>
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
                        <span style={{ position: "absolute", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px" }}>
                          {c.logo ? (
                            <>
                              <img 
                                src={c.logo} 
                                alt="" 
                                style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                              <span style={{ display: 'none' }}>{c.emoji || '📜'}</span>
                            </>
                          ) : (
                            c.emoji || '📜'
                          )}
                        </span>
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
                    <button className="v-btn v-btn-secondary" onClick={() => setIsNoteEditorOpen(false)}>Close</button>
                    <button 
                      className={`v-btn ${currentNote.is_pinned ? "v-btn-coral" : "v-btn-secondary"}`}
                      onClick={() => setCurrentNote(prev => prev ? ({ ...prev, is_pinned: !prev.is_pinned }) : null)}
                    >
                      {currentNote.is_pinned ? 'Pinned 📌' : 'Pin Note'}
                    </button>
                  </div>
                  <div className="note-editor-actions">
                    {currentNote.id && (
                      <button className="v-btn v-btn-danger" onClick={() => { if (confirm("Delete this note?")) deleteNote(currentNote.id as string); }}>Delete</button>
                    )}
                    <button className="v-btn v-btn-primary" onClick={() => saveNote(currentNote)} disabled={isSavingNote}>
                      {isSavingNote ? "Saving..." : "Save Note"}
                    </button>
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
                      <span style={{ position: "absolute", fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center", width: "46px", height: "46px" }}>
                        {enrolData.thumbEmoji && ((enrolData.thumbEmoji as string).startsWith('http') || (enrolData.thumbEmoji as string).startsWith('/')) ? (
                          <>
                            <img 
                              src={enrolData.thumbEmoji as string} 
                              alt="" 
                              style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <span style={{ display: 'none' }}>🎓</span>
                          </>
                        ) : (
                          enrolData.thumbEmoji as string
                        )}
                      </span>
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
                      const calculatedPrice = f.priceCalc(enrolData.courseOriginalPrice || 0);
                      const isComingSoon = f.id === 'recorded' || f.id === 'inperson';
                      return (
                        <div
                          key={f.id}
                          className={`enrol-format-btn ${enrolData.format === f.id && !isComingSoon ? "selected" : ""} ${isComingSoon ? "disabled" : ""}`}
                          style={isComingSoon ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                          onClick={() => {
                            if (isComingSoon) return;
                            const labels: Record<string, string> = { live: 'live session', recorded: 'recorded access', inperson: 'in-person session' };
                            const original = enrolData.courseOriginalPrice || 0;
                            let newBasePrice = original;
                            if (f.id === 'recorded') {
                              newBasePrice = Math.round(original * 0.8);
                            } else if (f.id === 'inperson') {
                              newBasePrice = original + 500;
                            }
                            setEnrolData({
                              ...enrolData,
                              format: f.id,
                              formatLabel: labels[f.id] || f.id,
                              price: `₹${newBasePrice.toLocaleString("en-IN")}`,
                              basePrice: newBasePrice,
                              finalPrice: newBasePrice,
                              promoApplied: false,
                              discount: 0
                            });
                            setPromoCode("");
                            setPromoOk({ text: "", color: "", show: false });
                          }}
                        >
                          <div className="enrol-format-icon" style={isComingSoon ? { opacity: 0.6 } : {}}>{f.icon}</div>
                          <div className="enrol-format-name">{f.lbl} {isComingSoon && <span style={{ fontSize: '9px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Coming soon</span>}</div>
                          <div className="enrol-format-sub">{f.sub}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: isComingSoon ? 'var(--text-3)' : 'var(--indigo)' }}>₹{calculatedPrice.toLocaleString("en-IN")}</div>
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
                      const isFull = s.maxSeats !== null && s.maxSeats !== undefined && s.maxSeats > 0 && (s.maxSeats - s.registeredCount <= 0);

                      return (
                        <div
                          key={s.id}
                          className={`enrol-date-btn ${enrolData.date === fullStr && enrolData.time === timeStr ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                          onClick={() => !isFull && setEnrolData(prev => ({ ...prev, date: fullStr, time: timeStr, sessionId: s.id }))}
                          style={{ height: 'auto', padding: '12px 8px', cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.5 : 1 }}
                        >
                          <div className="enrol-date-day">{day}</div>
                          <div className="enrol-date-num">{num} {month}</div>
                          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>{isFull ? 'Full' : timeStr}</div>
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
                    <span className="enrol-order-label">Workshop</span>
                    <span className="enrol-order-val">{enrolData.name as string}</span>
                  </div>
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Format</span>
                    <span className="enrol-order-val">₹{(enrolData.basePrice || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="enrol-order-row">
                    <span className="enrol-order-label">Platform fee</span>
                    <span className="enrol-order-val">₹0</span>
                  </div>
                  {enrolData.promoApplied && (
                    <div className="enrol-order-row promo-discount-row">
                      <span className="enrol-order-label" style={{ color: "#16A34A" }}>Promo discount</span>
                      <span className="enrol-order-val" style={{ color: "#16A34A" }}>−₹{(enrolData.discount as number)?.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="enrol-divider"></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span className="enrol-total">Total</span>
                    <span key={enrolData.finalPrice} className="enrol-total enrol-total-price-val">₹{(enrolData.finalPrice as number)?.toLocaleString("en-IN")}</span>
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
                          setPromoOk({ text: "", color: "", show: false });
                          setEnrolData((prev: DashboardEnrolData) => ({
                            ...prev,
                            promoApplied: false,
                            finalPrice: prev.basePrice || 0,
                            discount: 0
                          }));
                        }
                      }}
                      onKeyDown={(e) => e.key === "Enter" && !promoLoading && applyPromo()}
                      disabled={promoLoading}
                    />
                    <button id="promo-apply-btn" className={`enrol-promo-apply ${promoLoading ? 'loading' : ''}`} onClick={applyPromo} disabled={promoLoading}>
                      {promoLoading ? <span className="promo-spinner"></span> : 'Apply'}
                    </button>
                  </div>
                  {promoOk.show && (
                    <div className="enrol-promo-ok" style={{ display: "flex", color: promoOk.color }}>
                      {promoOk.text}
                    </div>
                  )}
                  <div className="enrol-section-label">Pay with</div>
                  <div className="enrol-pay-methods">
                    {["UPI", "Card", "Net banking", "EMI"].map((m) => (
                      <button
                        key={m}
                        className={`enrol-pay-btn ${enrolData.payMethod === m ? "selected" : ""}`}
                        onClick={() => setEnrolData({ ...enrolData, payMethod: m })}
                      >
                        {m}
                      </button>
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

            {enrolStep === 5 && (
              <div className="enrol-status-container" style={{ padding: '60px 24px' }}>
                <div className="status-icon-box">
                  <div className="status-spinner"></div>
                </div>
                <div className="status-title">{promoOk.text || 'Processing Payment'}</div>
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
                <div className="status-desc">{promoOk.text || 'The payment transaction could not be completed. Please check your connection and try again.'}</div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="status-btn" onClick={() => { setPromoOk({ text: '', color: '', show: false }); setEnrolStep(3); }}>Try Again</button>
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

      {/* ══ LOGOUT OVERLAY ══ */}
      {isLoggingOut && <RoleTransitionOverlay role="learner" type="logout" />}
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
                          {new Date(s.scheduled_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {s.registered_count}{s.max_seats ? `/${s.max_seats} filled` : ' learners registered'}
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
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Access Restricted"
        message="Administrators and Instructors are not allowed to enrol in or make payments for courses."
      />
    </div>
  );
}
