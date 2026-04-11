"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeachPage() {
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [appStatus, setAppStatus] = useState<string>('none');

  useEffect(() => {
    fetch('/api/instructor/status')
      .then(res => res.json())
      .then(data => {
        if (data.application_status) {
          setAppStatus(data.application_status);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(false);

    try {
      const res = await fetch('/api/teach/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, linkedin_url: linkedin })
      });
      const data = await res.json();

      if (res.ok) {
        setAppStatus('pending');
      } else {
        setError(true);
        setMessage(data.error || 'Failed to submit application. Make sure you are logged in.');
      }
    } catch (err) {
      setError(true);
      setMessage('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            <div className="logo-icon"><div className="lb"></div><div className="lb"></div></div>
            <span className="logo-text">X<span>WORKS</span></span>
          </a>
          <div>
            <div className="eyebrow"><div className="eyebrow-dash"></div>Become an Instructor</div>
            <h1 className="hero-title">Share your knowledge.<br/><em>Empower</em><br/>learners today.</h1>
            <p className="hero-body">Join the cyber-tech revolution. Share your expertise with 40,000+ curious minds, build immersive learning experiences, and earn revenue doing what you love.</p>
            <div className="chips">
              <div className="chip"><div className="chip-dot"></div>Industry standard payout splits</div>
              <div className="chip"><div className="chip-dot"></div>Global Audience</div>
              <div className="chip"><div className="chip-dot"></div>Flexible Scheduling</div>
            </div>
          </div>
          <div className="proof">
            <div className="proof-stat"><div className="num">40<b>k+</b></div><div className="lbl">Active Learners</div></div>
            <div className="proof-stat"><div className="num">80<b>/</b>20</div><div className="lbl">Base Rev Split</div></div>
          </div>
          <a href="#" className="back-btn" onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}>← Back to Dashboard</a>
        </div>
      </div>

      {/* ══ RIGHT FORM PANEL ══ */}
      <div className="panel-right">
        <div className="form-wrap">
          
          {loading ? (
             <div className="fview on"><div style={{ color: 'var(--text-3)' }}>Checking status...</div></div>
          ) : appStatus === 'none' ? (
            <div className="fview on">
              <div className="greeting">Instructor Application</div>
              <div className="subline">Tell us about your technical background and why you want to teach.</div>
              
              {message && (
                <div className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
                  <span className="alert-icon">{error ? '⚠️' : '✨'}</span>
                  <div className="alert-content">{message}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Bio / Experience</label>
                  <textarea 
                    className="inp" 
                    rows={4} 
                    style={{ resize: 'vertical', minHeight: '100px' }}
                    required 
                    placeholder="Describe your technical background..." 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                  />
                </div>
                
                <div className="field">
                  <label>LinkedIn URL</label>
                  <input 
                    className="inp" 
                    type="url" 
                    required 
                    placeholder="https://linkedin.com/in/..." 
                    value={linkedin} 
                    onChange={(e) => setLinkedin(e.target.value)} 
                  />
                </div>
                
                <div className="check-row" style={{ marginTop: '16px' }}>
                  <input type="checkbox" id="tc" required />
                  <label className="check-lbl" htmlFor="tc">I agree to the Instructor Revenue Share <a href="#">Terms of Service</a> and content guidelines.</label>
                </div>

                <button type="submit" className={`btn-cta ${loading ? 'loading' : ''}`} disabled={loading} style={{ marginTop: '12px' }}>
                  <span className="spinner"></span><span className="btn-txt">Submit Application →</span>
                </button>
              </form>
            </div>
          ) : appStatus === 'pending' ? (
            <div className="fview on">
               <div className="success-wrap" style={{ textAlign: 'center' }}>
                  <span className="success-icon">⏳</span>
                  <div className="success-title">Application Pending Review</div>
                  <div className="success-sub" style={{ marginBottom: '16px' }}>
                    Our team is currently reviewing your recent application. In the meantime, you can continue exploring XWORKS.
                  </div>
                  <div className="next-steps" style={{ textAlign: 'left', marginTop: '24px' }}>
                    <div className="ns-label">What&apos;s next</div>
                    <div className="ns-item"><div className="ns-num">1</div>Admin review within 24-48 hours</div>
                    <div className="ns-item"><div className="ns-num">2</div>Instructor Portal unlocked upon approval</div>
                    <div className="ns-item"><div className="ns-num">3</div>Build your first draft course!</div>
                  </div>
                  <button className="btn-cta" onClick={() => router.push('/dashboard')} style={{ marginTop: '24px' }}>
                    <span className="btn-txt">Go to my dashboard →</span>
                  </button>
               </div>
            </div>
          ) : (
            <div className="fview on">
               <div className="success-wrap" style={{ textAlign: 'center' }}>
                  <span className="success-icon">✅</span>
                  <div className="success-title">You're Approved!</div>
                  <div className="success-sub" style={{ marginBottom: '16px' }}>
                    Your application was approved by the admin. You now have full access to the Creator Studio.
                  </div>
                  <button className="btn-cta" onClick={() => router.push('/instructor')} style={{ marginTop: '24px' }}>
                    <span className="btn-txt">Go to Creator Studio 🚀</span>
                  </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
