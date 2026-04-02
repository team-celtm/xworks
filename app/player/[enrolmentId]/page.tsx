"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./player.css";

export default function PlayerPage({ params }: { params: { enrolmentId: string } }) {
  const router = useRouter();
  const { enrolmentId } = params;
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

  const updateProgress = async (newPct: number) => {
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
    }
  };

  if (loading) return <div className="p-loader">Loading your course...</div>;
  if (error) return <div className="p-error">Error: {error} <button onClick={() => router.back()}>Go back</button></div>;

  return (
    <div className="player-shell">
      <div className="player-top">
        <button className="p-back" onClick={() => router.back()}>← Dashboard</button>
        <div className="p-title">{content.title}</div>
      </div>

      <div className="player-main">
        <div className="p-vid-area">
          <div className="p-vid-placeholder">
            <div className="p-vid-icon">🎬</div>
            <div className="p-vid-text">Video Player Placeholder</div>
          </div>
          
          <div className="p-controls">
            <div className="p-prog-bar">
              <div className="p-prog-fill" style={{ width: `${content.currentProgress}%` }}></div>
            </div>
            <div className="p-prog-label">{Math.round(content.currentProgress)}% Completed</div>
            <button 
              className="p-finish-btn" 
              onClick={() => updateProgress(Math.min(100, content.currentProgress + 10))}
              disabled={content.currentProgress >= 100}
            >
              Next Lesson →
            </button>
          </div>
        </div>

        <div className="p-curric">
          <h3>Course Content</h3>
          <div className="p-list">
            {content.curriculum.map((item: any) => (
              <div className={`p-item ${item.completed ? 'done' : ''}`} key={item.id}>
                <div className="p-item-icon">{item.completed ? '✅' : '🔴'}</div>
                <div className="p-item-info">
                  <div className="p-item-title">{item.title}</div>
                  <div className="p-item-dur">{item.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
