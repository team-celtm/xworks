import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/apiClient';

export function useRealtimeSessions(initialSessions: any[]) {
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const lastSyncRef = useRef<number>(Date.now());

  // Update local state ONLY if it's currently empty and we get initial data
  // (Assuming initial data is fetched once by parent on mount)
  useEffect(() => {
    if (sessions.length === 0 && initialSessions.length > 0) {
      setSessions(initialSessions);
      lastSyncRef.current = Date.now();
    }
  }, [initialSessions]);

  useEffect(() => {
    let isMounted = true;
    
    const syncDeltas = async () => {
      try {
        const lastSync = new Date(lastSyncRef.current).toISOString();
        const res = await fetchApi(`/api/events/sync?last_sync=${encodeURIComponent(lastSync)}`);
        
        if (res.ok && isMounted) {
          const updates = await res.json();
          if (updates && updates.length > 0) {
            setSessions(prev => {
              const newSessions = [...prev];
              let changed = false;
              
              updates.forEach((update: any) => {
                const idx = newSessions.findIndex(s => s.sessionId === update.id || s.id === update.id);
                if (idx !== -1) {
                  // Only update if something actually changed to avoid unnecessary renders
                  if (
                    newSessions[idx].sessionStatus !== update.status ||
                    newSessions[idx].status !== update.status ||
                    newSessions[idx].hostUrl !== update.host_url ||
                    newSessions[idx].recordingAvailable !== update.recording_available
                  ) {
                    newSessions[idx] = {
                      ...newSessions[idx],
                      sessionStatus: update.status,
                      status: update.status, // Sometimes student portal uses 'status' vs 'sessionStatus'
                      hostUrl: update.host_url,
                      joinUrl: update.join_url,
                      recordingAvailable: update.recording_available
                    };
                    changed = true;
                  }
                }
              });
              
              return changed ? newSessions : prev;
            });
            lastSyncRef.current = Date.now();
          }
        }
      } catch (err) {
        console.error('Realtime sync failed:', err);
      }
    };

    // Poll every 3 seconds for delta updates
    const interval = setInterval(syncDeltas, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return [sessions, setSessions] as const;
}
