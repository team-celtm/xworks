"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import "./dashboard.css";
import "./notes.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "../components/Logo";
import RoleTransitionOverlay from "../components/RoleTransitionOverlay";
import AlertModal from "../components/AlertModal";
import { formatDuration } from '@/lib/utils';
import { fetchApi } from '@/lib/apiClient';
import { useRealtimeSessions } from '@/app/hooks/useRealtimeSessions';

import EnrolModal from '../components/EnrolModal';


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
  scheduledStart?: string;
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

  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetchApi("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetchApi("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetchApi("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Enrol modal state
  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [enrolModalData, setEnrolModalData] = useState<any>(null);

  const [initialSessions, setInitialSessions] = useState<any[]>([]);
  const [sessions, setSessions] = useRealtimeSessions(initialSessions);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const prevSessionsRef = useRef<any[]>([]);
  useEffect(() => {
    if (prevSessionsRef.current.length > 0 && sessions.length > 0) {
      const hasCompletedTransition = sessions.some(s => {
        const prev = prevSessionsRef.current.find(ps => (ps.sessionId || ps.id) === (s.sessionId || s.id));
        return prev && (prev.sessionStatus || prev.status) !== 'completed' && (s.sessionStatus || s.status) === 'completed';
      });
      if (hasCompletedTransition) {
        // Refetch enrolments and certificates since progress might have reached 100%
        fetchEnrolments();
        fetchCerts();
      }
    }
    prevSessionsRef.current = sessions;
  }, [sessions]);
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
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000); // 5 sec sync
    return () => clearInterval(timer);
  }, []);

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
        setInitialSessions(data || []);
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
        fetchProfile(),
        fetchNotifications()
      ]);
      const isRedirecting = results[2]; // results from fetchUser()
      if (isRedirecting) return; // Keep loading visible during redirect

      setTodayDate(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
      setIsLoading(false);
      setHasMounted(true);
    };
    loadData();

    const notifInterval = setInterval(fetchNotifications, 10000);

    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get("view");
    if (view) {
      setActiveView(view);
    }

    return () => clearInterval(notifInterval);
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

  const continueLearningList = (() => {
    const list = enrolments.filter(e => {
      let p = Number(e.progressPct);
      if (isNaN(p) || p < 0) p = 0;
      if (p > 100) p = 100;
      
      if (e.enrolment_status !== 'active') return false;
      if (e.course_status !== 'published') return false;
      if (p <= 0 || p >= 100) return false;
      
      if (e.live && e.scheduledStart && new Date(e.scheduledStart).getTime() <= Date.now()) {
        return false;
      }
      return true;
    });

    const seen = new Set();
    const deduped = list.filter(e => {
      if (seen.has(e.course_id)) return false;
      seen.add(e.course_id);
      return true;
    });

    deduped.sort((a, b) => {
      const aTime = new Date(a.lastAccessedAt || a.enrolledAt).getTime();
      const bTime = new Date(b.lastAccessedAt || b.enrolledAt).getTime();
      return bTime - aTime;
    });

    return deduped;
  })();

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
    setBookingError(null);
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
        setBookingError(data.message || data.error || "Action failed. Please try again.");
      }
    } catch (err) {
      setBookingError("Something went wrong. Please check your connection and try again.");
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

  const openEnrol = async (w: Workshop) => {
    if (user && (user.role === 'admin' || user.role === 'instructor')) {
      setAlertOpen(true);
      return;
    }
    const basePrice = Number(w.price) || 0;
    setEnrolModalData({
      id: w.id,
      name: w.name,
      meta: `by Ananya Sharma · ★ ${w.rating} · ${formatDuration(w.dur)} · ${w.catLabel}`,
      basePrice,
      thumbBg: w.g,
      thumbEmoji: w.logo || w.icon,
      isLive: w.live !== undefined ? w.live : true,
      isNearby: w.nearby !== undefined ? w.nearby : false,
    });
    setIsEnrolModalOpen(true);
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
                    alt={e.name || "Workshop Logo"} 
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

          {completedCount > 0 && (
            <button className={`sb-item ${activeView === "completed" ? "active" : ""}`} onClick={() => { setActiveView("completed"); setIsMobileMenuOpen(false); }}>
              <span className="sb-item-icon">✅</span>
              <span className="sb-item-label">Courses Completed</span>
              <span className="sb-badge">{completedCount}</span>
            </button>
          )}

          {certs.length > 0 && (
            <button className={`sb-item ${activeView === "certificates" ? "active" : ""}`} onClick={() => { setActiveView("certificates"); setIsMobileMenuOpen(false); }}>
              <span className="sb-item-icon">📜</span>
              <span className="sb-item-label">My Certificates</span>
              <span className="sb-badge">{certs.length}</span>
            </button>
          )}

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
              🔔{notifications.some(n => !n.isRead) && <div className="notif-dot"></div>}
            </div>
            
            {isNotifOpen && (
              <div className="notif-dropdown" style={{
                position: 'absolute', top: '50px', right: '0', width: '320px', 
                background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                border: '1px solid var(--border-md)', zIndex: 300, overflow: 'hidden'
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                  Notifications
                  <span style={{ fontSize: '12px', color: 'var(--indigo)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setIsNotifOpen(false)}>Close</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let emoji = '🔔';
                      if (n.type === 'success' || n.title.toLowerCase().includes('success') || n.title.toLowerCase().includes('complete') || n.title.toLowerCase().includes('cert')) {
                        emoji = '🎉';
                      } else if (n.type === 'warning' || n.title.toLowerCase().includes('cancel') || n.title.toLowerCase().includes('failed') || n.title.toLowerCase().includes('refund')) {
                        emoji = '⚠️';
                      } else if (n.title.toLowerCase().includes('session') || n.title.toLowerCase().includes('schedule') || n.title.toLowerCase().includes('live')) {
                        emoji = '📅';
                      }
                      
                      return (
                        <div 
                          key={n.id} 
                          onClick={() => !n.isRead && markNotificationRead(n.id)}
                          style={{ 
                            padding: '16px 20px', 
                            borderBottom: '1px solid var(--border)', 
                            display: 'flex', 
                            gap: '12px', 
                            cursor: 'pointer', 
                            background: n.isRead ? 'transparent' : 'var(--surface-2)',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontSize: '20px' }}>{emoji}</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{n.message}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {notifications.some(n => !n.isRead) && (
                  <div 
                    style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--indigo)', cursor: 'pointer', background: 'var(--surface)', fontWeight: 600 }} 
                    onClick={markAllNotificationsRead}
                  >
                    Mark all as read
                  </div>
                )}
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
                  {continueLearningList.length > 0 && (
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
                              continueLearningList.map(renderEnrolledCard)
                            )}
                          </div>
                        </div>
                        <button className="cbtn cbtn-r" onClick={() => slide("cont", 1)}>›</button>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const upcomingSessions = sessions.filter(s => ['scheduled', 'live'].includes(s.sessionStatus || s.status));
                    // Since it's sorted DESC, the closest one is the last one in the array
                    const nextSession = upcomingSessions.length > 0 ? upcomingSessions[upcomingSessions.length - 1] : null;
                    return nextSession && (
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
                                <div className="upcoming-day">{new Date(nextSession.scheduledStart).getDate()}</div>
                                <div className="upcoming-month">{new Date(nextSession.scheduledStart).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                              </div>

                              <div className="summary-card-info">
                                <div className="summary-card-title">{nextSession.sessionTitle}</div>
                                <div className="summary-card-meta">
                                  {nextSession.courseName} · {new Date(nextSession.scheduledStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="summary-card-bottom">
                            <div className="summary-card-time">
                              Starts at {new Date(nextSession.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              {timeLeft && timeLeft !== 'Started' && <span className="starting-pill">Starting in {timeLeft}</span>}
                            </div>
                            <button 
                              className="enrol-cta coral summary-card-btn" 
                              onClick={() => {
                                const joinable = new Date(nextSession.scheduledStart).getTime() <= Date.now() + (15 * 60 * 1000);
                                const hasRecording = nextSession.recordingAvailable && (nextSession.sessionStatus || nextSession.status) === 'completed';
                                if (hasRecording) window.open(`/api/sessions/${nextSession.sessionId}/recording`, '_blank');
                                else if (joinable) window.open(`/api/learner/sessions/${nextSession.sessionId}/join`, '_blank');
                                else setActiveView("upcoming");
                              }}
                            >
                              {nextSession.recordingAvailable && (nextSession.sessionStatus || nextSession.status) === 'completed' ? "Watch Recording ↗" : (new Date(nextSession.scheduledStart).getTime() <= Date.now() + (15 * 60 * 1000) ? "Join Class →" : "View Details →")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         <div className="summary-card" style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', boxShadow: '0 10px 30px rgba(55,48,163,0.05)' }}>
                            <div className="summary-card-info">
                              <div className="summary-card-title">Become an Instructor</div>
                              <div className="summary-card-meta">Share your knowledge and earn revenue by teaching premium cyber-tech workshops.</div>
                            </div>
                            <a 
                              className="enrol-cta coral summary-card-btn" 
                              style={{ 
                                textDecoration: 'none', 
                                textAlign: 'center', 
                                minWidth: '200px',
                                opacity: 0.6,
                                cursor: 'not-allowed'
                              }}
                              href="#"
                              onClick={(e) => { e.preventDefault(); }}
                              title="Instructor onboarding is temporarily unavailable."
                              aria-disabled="true"
                            >
                              🔒 Coming Soon
                            </a>
                         </div>
                         <div className="alert alert-info" style={{ margin: 0, padding: '12px 16px' }}>
                           <span className="alert-icon">💡</span>
                           <div className="alert-content">We're improving the instructor onboarding experience. Applications will reopen soon.</div>
                         </div>
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
                              alt={c.name || "Workshop Logo"} 
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
                  {sessions.filter(s => ['scheduled', 'live'].includes(s.sessionStatus || s.status)).length} upcoming workshops you&apos;ve enrolled in — get ready!
                </div>
              </div>
              <div className="upcoming-list fade-up" style={{ animationDelay: '0.06s' }}>
                {sessions.filter(s => ['scheduled', 'live'].includes(s.sessionStatus || s.status)).length > 0 ? sessions.filter(s => ['scheduled', 'live'].includes(s.sessionStatus || s.status)).map((s, i) => {
                  const startDate = new Date(s.scheduledStart);
                  const isJoinable = startDate.getTime() <= currentTime + (15 * 60 * 1000) || (s.sessionStatus || s.status) === 'live';
                  return (
                    <div className="upcoming-card" key={`upcoming-${i}`}>
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
                        <span className={`upcoming-mode ${(s.sessionStatus || s.status) === 'live' ? 'mode-live' : ''}`} style={(s.sessionStatus || s.status) === 'live' ? { background: '#22c55e20', color: '#16a34a', border: '1px solid #22c55e50' } : {}}>
                          {(s.sessionStatus || s.status) === 'live' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                              LIVE NOW
                            </span>
                          ) : (
                            'Upcoming'
                          )}
                        </span>
                        <div className="upcoming-time">⏰ {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        {s.sessionStatus === 'cancelled' ? (
                          <button className="join-btn disabled" disabled>Cancelled</button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className={`join-btn ${isJoinable ? "" : (s.recordingAvailable && (s.sessionStatus || s.status) === 'completed' ? "" : "disabled")}`}
                              onClick={() => {
                                if (s.recordingAvailable && (s.sessionStatus || s.status) === 'completed') {
                                  window.open(`/api/sessions/${s.sessionId}/recording`, '_blank');
                                } else if (isJoinable) {
                                  window.open(`/api/learner/sessions/${s.sessionId}/join`, '_blank');
                                }
                              }}
                            >
                              {s.recordingAvailable && (s.sessionStatus || s.status) === 'completed' ? "Watch Recording ↗" : (isJoinable ? "Join now →" : "Not yet")}
                            </button>
                            {startDate.getTime() > currentTime + (2 * 60 * 60 * 1000) && (
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

              <div className="fade-up" style={{ marginTop: "32px", animationDelay: '0.09s' }}>
                <div className="section-hd" style={{ marginBottom: "16px" }}>
                  <div className="section-hd-left">
                    <div className="section-label">Completed</div>
                    <div className="section-title">Past Sessions</div>
                  </div>
                </div>
                <div className="upcoming-list">
                  {sessions.filter(s => ['completed', 'cancelled', 'expired'].includes(s.sessionStatus || s.status)).length > 0 ? sessions.filter(s => ['completed', 'cancelled', 'expired'].includes(s.sessionStatus || s.status)).map((s, i) => {
                    const startDate = new Date(s.scheduledStart);
                    return (
                      <div className="upcoming-card" style={{ opacity: 0.8 }} key={`past-${i}`}>
                        <div className="upcoming-date-block" style={{ background: 'var(--surface-2)' }}>
                          <div className="upcoming-day" style={{ color: 'var(--text-3)' }}>{startDate.getDate()}</div>
                          <div className="upcoming-month" style={{ color: 'var(--text-3)' }}>{startDate.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="upcoming-name" style={{ color: 'var(--text-2)' }}>{s.sessionTitle}</div>
                          <div className="upcoming-meta">
                            {s.courseName} · {s.platform || 'Online'}
                            {s.paymentStatus === 'refunded' && <span style={{ color: 'var(--alert-red)', fontWeight: 600, marginLeft: '8px' }}>· Refunded</span>}
                          </div>
                        </div>
                        <div className="upcoming-right">
                          <span className="upcoming-mode" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                            {s.sessionStatus === 'cancelled' ? '🚫 Cancelled' : '⏺ Completed'}
                          </span>
                          <div className="upcoming-time" style={{ color: 'var(--text-3)' }}>⏰ {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          {s.sessionStatus === 'cancelled' ? (
                            <button className="join-btn disabled" disabled>Cancelled</button>
                          ) : (
                            <button 
                              className={`join-btn ${s.recordingAvailable && (s.sessionStatus || s.status) === 'completed' ? "" : "disabled"}`}
                              onClick={() => {
                                if (s.recordingAvailable && (s.sessionStatus || s.status) === 'completed') {
                                  window.open(`/api/sessions/${s.sessionId}/recording`, '_blank');
                                }
                              }}
                            >
                              {s.recordingAvailable && (s.sessionStatus || s.status) === 'completed' ? "Watch Recording ↗" : "No Recording"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', width: '100%', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
                      No past sessions found.
                    </div>
                  )}
                </div>
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
                                alt={c.courseName || "Workshop Logo"} 
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
                        onClick={(e) => {
                          const url = window.location.origin + `/verify/${c.credentialId}`;
                          navigator.clipboard.writeText(url);
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = 'Copied! ✅';
                          setTimeout(() => btn.innerHTML = originalText, 2000);
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
      <EnrolModal 
        isOpen={isEnrolModalOpen} 
        onClose={() => setIsEnrolModalOpen(false)} 
        initialData={enrolModalData} 
        user={user} 
        onSuccess={() => {
          setActiveView("upcoming");
          // Re-fetch enrolments/sessions to update dashboard state
          fetchEnrolments();
          fetchSessions();
        }} 
      />

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
                {(() => {
                  const hasAvailableSession = availableSessions.some(s => {
                    const isPast = new Date(s.scheduled_start).getTime() < Date.now();
                    const isCancelled = s.status === 'cancelled';
                    const full = !isCancelled && !isPast && s.max_seats !== null && s.max_seats !== undefined && s.max_seats > 0 && (s.max_seats - s.registered_count <= 0);
                    return !isPast && !isCancelled && !full;
                  });

                  return !hasAvailableSession ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)' }}>No upcoming live sessions found for this course. Please check back later.</div>
                  ) : (
                    availableSessions.map(s => {
                      const isPast = new Date(s.scheduled_start).getTime() < Date.now();
                      const isCancelled = s.status === 'cancelled';
                      const full = !isCancelled && !isPast && s.max_seats !== null && s.max_seats !== undefined && s.max_seats > 0 && (s.max_seats - s.registered_count <= 0);
                      const disabled = isBooking || isPast || isCancelled || full;

                      return (
                        <div 
                          key={s.id} 
                          className={`enrol-date-btn ${disabled ? 'disabled' : ''}`}
                          style={{ textAlign: 'left', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '15px', border: '1.5px solid var(--border)', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                          onClick={() => !disabled && handleConfirmBooking(s.id)}
                        >
                          <div className="upcoming-date-block" style={{ width: '40px', height: '40px', background: 'var(--indigo-light)', borderRadius: '8px', margin: 0 }}>
                            <div className="upcoming-day" style={{ fontSize: '14px', color: 'var(--indigo)', fontWeight: 800 }}>{new Date(s.scheduled_start).getDate()}</div>
                            <div className="upcoming-month" style={{ fontSize: '8px', color: 'var(--indigo)', fontWeight: 700 }}>{new Date(s.scheduled_start).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textDecoration: isCancelled ? 'line-through' : 'none' }}>{s.title || 'Live Workshop'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              {new Date(s.scheduled_start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {isCancelled ? 'Cancelled' : isPast ? 'Session Ended' : full ? 'Sold out' : `${s.registered_count}${s.max_seats ? `/${s.max_seats} filled` : ' learners registered'}`}
                            </div>
                          </div>
                          <div style={{ color: 'var(--indigo)', fontWeight: 800 }}>→</div>
                        </div>
                      );
                    })
                  );
                })()}
              </div>
              {bookingError && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  {bookingError}
                </div>
              )}
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
