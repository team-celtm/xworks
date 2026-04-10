"use client"
import React, { useState, useEffect } from 'react';
import '../dashboard/dashboard.css';

export default function InstructorDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instructor/sessions')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggleRecording = async (sessionId: string, currentAvailable: boolean) => {
    let recordingUrl = null;
    if (!currentAvailable) {
      recordingUrl = prompt("Enter the recording URL for learners:");
      if (!recordingUrl) return;
    }

    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/recording`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingUrl, available: !currentAvailable })
      });
      if (res.ok) {
        alert("Recording status updated!");
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, recordingAvailable: !currentAvailable } : s));
      }
    } catch (e) {
      alert("Error updating recording status");
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this live session? All registrants will be notified immediately and refunded if eligible.")) return;

    try {
      const res = await fetch(`/api/instructor/sessions/${sessionId}/cancel`, {
        method: 'PUT'
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Session cancelled! Notified ${result.registrantsNotified} registrants.`);
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, sessionStatus: 'cancelled' } : s));
      } else {
        alert("Failed to cancel: " + result.error);
      }
    } catch (e) {
      alert("Error cancelling session");
    }
  };

  return (
    <div style={{ padding: '60px', fontFamily: 'var(--font-primary)' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Instructor Dashboard</h1>
      <p style={{ color: 'var(--text-3)', marginBottom: '40px' }}>Manage your upcoming live sessions and courses.</p>

      {loading ? (
        <div>Loading sessions...</div>
      ) : sessions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
             <button onClick={() => window.location.href = '/dashboard'} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>← Switch to Learner Dashboard</button>
          </div>
          {sessions.map(s => (
            <div key={s.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{s.sessionTitle}</h3>
                <div style={{ color: 'var(--text-3)', fontSize: '14px' }}>
                  {s.courseName} • {new Date(s.scheduledStart).toLocaleString()} • {s.registrantCount} learners registered
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {s.sessionStatus === 'cancelled' ? (
                  <span style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '100px', fontWeight: 600, fontSize: '13px' }}>
                    Cancelled
                  </span>
                ) : (
                  <>
                    <button 
                      className="join-btn"
                      style={{ padding: '10px 24px' }}
                      onClick={() => s.hostUrl ? window.open(s.hostUrl, '_blank') : alert('Host URL not configured')}
                    >
                      Start Session →
                    </button>
                    <button 
                      onClick={() => handleToggleRecording(s.sessionId, s.recordingAvailable)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--ink)', padding: '10px 18px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                      {s.recordingAvailable ? "Recording Live ✅" : "Share Recording 📽️"}
                    </button>
                    <button 
                      onClick={() => handleCancel(s.sessionId)}
                      style={{ background: 'none', border: 'none', color: 'var(--alert-red)', padding: '10px', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)' }}>
          You have no live sessions mapped to your account.
        </div>
      )}
    </div>
  );
}
