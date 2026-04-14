"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import "../player.css";

export default function PlayerPage({ params }: { params: Promise<{ enrolmentId: string }> }) {
  const router = useRouter();
  const { enrolmentId } = React.use(params) as { enrolmentId: string };
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/learner/enrolments/${enrolmentId}/access`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to access course");
          return;
        }
        const data = await res.json();
        setContent(data);
      } catch (err) {
        console.error("Player fetch error:", err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [enrolmentId]);

  const [isUpdating, setIsUpdating] = useState(false);

  const updateProgress = async (newPct: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/learner/enrolments/${enrolmentId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPct: newPct }),
      });
      if (res.ok) {
        const updatedEnrol = await res.json();
        setContent((prev: any) => ({ ...prev, currentProgress: updatedEnrol.progress_pct }));
      }
    } catch (err) {
      console.error("Progress update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="p-loader">Loading your course...</div>;
  if (error) return <div className="p-error">Error: {error} <button onClick={() => router.back()}>Go back</button></div>;

  return (
    <div className="player-shell">
      <nav className="player-top">
        <div className="p-nav-left">
           <Logo />
           <div className="p-nav-divider"></div>
           <div className="p-title">{content.title}</div>
        </div>
        <div className="p-nav-right">
           <button className="p-back" onClick={() => router.back()}>← Back to Dashboard</button>
        </div>
      </nav>

      <div className="player-main">
        <div className="p-vid-area">
          <div className="p-video-container">
            <video 
              src={content.videoUrl || "https://vjs.zencdn.net/v/oceans.mp4"} 
              className="p-video"
              controls 
              autoPlay 
              muted
              playsInline
              poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
            />
          </div>
          
          <div className="p-controls">
            <div className="p-prog-container">
               <div className="p-prog-meta">
                 <span>Course Progress</span>
                 <span>{Math.round(content.currentProgress)}% Completed</span>
               </div>
               <div className="p-prog-bar">
                 <div className="p-prog-fill" style={{ width: `${content.currentProgress}%` }}></div>
               </div>
            </div>
            <button 
              className={`p-finish-btn ${isUpdating ? 'p-loading' : ''}`} 
              onClick={() => updateProgress(Math.min(100, content.currentProgress + 15))}
              disabled={content.currentProgress >= 100 || isUpdating}
            >
              {isUpdating ? "Updating..." : (content.currentProgress >= 100 ? "Course Completed" : "Mark Lesson as Complete →")}
            </button>
          </div>
        </div>
 
        <div className="p-curric">
           <div className="p-curric-header">
              <div className="p-section-title">Course Modules</div>
           </div>
           
           <div className="p-curric-scroll">
              <div className="p-list">
                {content.curriculum.map((item: any, idx: number) => {
                  const isItemDone = content.currentProgress >= ((idx + 1) * 33.3);
                  return (
                  <div className={`p-item ${isItemDone ? 'done' : ''} ${idx === 0 ? 'active-item' : ''}`} key={item.id}>
                    <div className="p-item-icon">{isItemDone ? '✓' : idx + 1}</div>
                    <div className="p-item-info">
                       <div className="p-item-title">{item.title}</div>
                       <div className="p-item-dur">{item.duration} · Video Module</div>
                    </div>
                  </div>
                  );
                })}
              </div>
    
              <div className="p-curric-header" style={{ marginTop: '24px', paddingLeft: 0, paddingRight: 0 }}>
                <div className="p-section-title">Recordings & Sessions</div>
              </div>
              
              <div className="p-list">
                {content.sessions && content.sessions.length > 0 ? content.sessions.map((s: any) => (
                  <div 
                    className={`p-item ${s.recordingAvailable ? 'active-item' : ''}`} 
                    key={s.id} 
                    onClick={() => {
                      if (s.recordingAvailable) {
                        window.open(`/api/sessions/${s.id}/recording`, '_blank');
                      }
                    }}
                  >
                    <div className="p-item-icon">{s.recordingAvailable ? '📽' : '🕒'}</div>
                    <div className="p-item-info">
                       <div className="p-item-title">{s.title}</div>
                       <div className="p-item-dur">
                        {s.recordingAvailable ? 'Watch Recording ↗' : `Scheduled for ${new Date(s.startTime).toLocaleDateString()}`}
                       </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '16px', fontSize: '11px', color: 'var(--player-text-dim)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--player-border)' }}>
                    No bonus recordings yet.
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
