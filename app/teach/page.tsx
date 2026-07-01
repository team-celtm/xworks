"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '../components/Logo';

export default function TeachPage() {
  const router = useRouter();

  useEffect(() => {
    // Show toast for direct route access
    const timeout = setTimeout(() => {
      // Simulate toast without heavy components
      const toast = document.createElement('div');
      toast.className = 'alert alert-info';
      toast.innerHTML = '<span class="alert-icon">💡</span><div class="alert-content">Instructor applications are temporarily unavailable.</div>';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.zIndex = '9999';
      toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="shell">
      {/* ══ LEFT HERO PANEL ══ */}
      <div className="panel-left">
        <div className="grid-bg"></div>
        <div className="orb orb-a"></div><div className="orb orb-b"></div><div className="orb orb-c"></div>
        <div className="bars-motif">
          <div className="bm" style={{ width: '200px' }}></div>
          <div className="bm" style={{ width: '130px' }}></div>
          <div className="bm" style={{ width: '270px' }}></div>
          <div className="bm" style={{ width: '90px' }}></div>
          <div className="bm" style={{ width: '210px' }}></div>
          <div className="bm" style={{ width: '160px' }}></div>
        </div>
        <div className="left-content">
          <Logo className="logo" />
          <div>
            <div className="eyebrow"><div className="eyebrow-dash"></div>Become an Instructor</div>
            <h1 className="hero-title">Share your knowledge.<br /><em>Empower</em><br />learners today.</h1>
            <p className="hero-body">Join the cyber-tech revolution. Share your expertise with 5,000+ curious minds, build immersive learning experiences, and earn revenue doing what you love.</p>
            <div className="chips">
              <div className="chip"><div className="chip-dot"></div>Industry standard payout splits</div>
              <div className="chip"><div className="chip-dot"></div>Global Audience</div>
              <div className="chip"><div className="chip-dot"></div>Flexible Scheduling</div>
            </div>
          </div>
          <div className="proof">
            <div className="proof-stat"><div className="num">5<b>k+</b></div><div className="lbl">Active Learners</div></div>
            <div className="proof-stat"><div className="num">80<b>/</b>20</div><div className="lbl">Base Rev Split</div></div>
          </div>
          <a href="#" className="back-btn" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>← Back to Dashboard</a>
        </div>
      </div>

      {/* ══ RIGHT FORM PANEL ══ */}
      <div className="panel-right">
        <div className="form-wrap">
          <div className="fview on">
            <div className="success-wrap" style={{ textAlign: 'center' }}>
              <span className="success-icon" style={{ background: '#F1F5F9', color: '#64748B' }}>🔒</span>
              <div className="success-title">Instructor Program Coming Soon</div>
              <div className="success-sub" style={{ marginBottom: '16px' }}>
                We're currently improving the instructor onboarding experience. Applications are temporarily paused and will reopen soon.
              </div>
              <div className="next-steps" style={{ textAlign: 'left', marginTop: '24px', opacity: 0.8 }}>
                <div className="ns-label">What you can expect</div>
                <div className="ns-item"><div className="ns-num">1</div>Streamlined onboarding process</div>
                <div className="ns-item"><div className="ns-num">2</div>Enhanced course builder tools</div>
                <div className="ns-item"><div className="ns-num">3</div>Better audience analytics</div>
              </div>
              <button className="btn-cta" onClick={() => router.push('/dashboard')} style={{ marginTop: '32px' }}>
                <span className="btn-txt">Return to Dashboard →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
