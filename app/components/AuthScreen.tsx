'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthScreenProps {
  defaultTab?: 'in' | 'up';
}

export default function AuthScreen({ defaultTab = 'in' }: AuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'in' | 'up' | 'forgot' | 'reset'>(
    searchParams?.get('reset_token') ? 'reset' : defaultTab
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'signin' | 'signup'>('signin');
  const [showPwd, setShowPwd] = useState(false);
  const [showUpPwd, setShowUpPwd] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMsg('Email verified! You can now sign in.');
    }
    
    if (searchParams.get('google_success') === 'true') {
      const type = searchParams.get('success_type') as 'signin' | 'signup';
      if (type === 'signup') {
        setSuccessType('signup');
        setShowSuccess(true);
        setNeedsVerify(false); // Google users are pre-verified
      } else {
        router.push('/dashboard');
      }
    }

    if (searchParams.get('error') === 'google_signup_disabled') {
      setErrorText('No account found for this email. Please register using the form below to get started!');
      setTab('up');
    }
  }, [searchParams, router]);

  // Form states
  const [inEmail, setInEmail] = useState('');
  const [inPwd, setInPwd] = useState('');
  const [upFirst, setUpFirst] = useState(searchParams?.get('firstName') || '');
  const [upLast, setUpLast] = useState(searchParams?.get('lastName') || '');
  const [upEmail, setUpEmail] = useState(searchParams?.get('email') || '');
  const [upPhone, setUpPhone] = useState('');
  const [upProfile, setUpProfile] = useState('');
  const [upBio, setUpBio] = useState('');
  const [upLinkedin, setUpLinkedin] = useState('');
  const [upPwd, setUpPwd] = useState('');
  const [tcChecked, setTcChecked] = useState(false);

  const [resetToken] = useState(searchParams?.get('reset_token') || '');
  const [resetPwd, setResetPwd] = useState('');
  const [confirmResetPwd, setConfirmResetPwd] = useState('');

  const [loading, setLoading] = useState(false);
  const [wiggleBtn, setWiggleBtn] = useState(false);

  const switchTab = (newTab: 'in' | 'up' | 'forgot' | 'reset') => {
    setTab(newTab);
    setErrorText('');
    setSuccessMsg('');
    if (newTab === 'in' || newTab === 'up') {
      router.push(newTab === 'in' ? '/Login' : '/Registration');
    }
  };

  // Password strength
  const checkStr = (v: string) => {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    
    const cls = score <= 1 ? 'w' : score === 2 ? 'f' : 'g';
    const labels = {
      w: 'Weak — add numbers & symbols',
      f: 'Fair — almost there!',
      g: score === 3 ? 'Good' : 'Strong 💪'
    };
    return { score, cls, label: labels[cls as keyof typeof labels] };
  };

  const strength = checkStr(upPwd);

  const handleGoogle = () => {
    setLoading(true);
    // Redirect to backend OAuth route
    window.location.href = '/api/auth/google';
  };

  const doForgotPassword = async () => {
    if (!inEmail) {
      setErrorText('Please enter your email address.');
      setWiggleBtn(true);
      setTimeout(() => setWiggleBtn(false), 350);
      return;
    }
    setLoading(true);
    setErrorText('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Reset link sent to your email.');
      } else {
        setErrorText(data.error || 'Failed to send reset email.');
        setWiggleBtn(true);
        setTimeout(() => setWiggleBtn(false), 350);
      }
    } catch (e) {
      console.error(e);
      setErrorText('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const doResetPassword = async () => {
    if (!resetPwd || !confirmResetPwd) {
      setErrorText('Please fill in all fields.');
      setWiggleBtn(true);
      setTimeout(() => setWiggleBtn(false), 350);
      return;
    }
    if (resetPwd !== confirmResetPwd) {
      setErrorText('Passwords do not match.');
      setWiggleBtn(true);
      setTimeout(() => setWiggleBtn(false), 350);
      return;
    }
    
    setLoading(true);
    setErrorText('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPwd })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Password has been successfully updated.');
        setTab('in');
      } else {
        setErrorText(data.error || 'Failed to reset password.');
        setWiggleBtn(true);
        setTimeout(() => setWiggleBtn(false), 350);
      }
    } catch (e) {
      console.error(e);
      setErrorText('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const doSignin = async () => {
    if (!inEmail || !inPwd) {
      setWiggleBtn(true);
      setTimeout(() => setWiggleBtn(false), 350);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inEmail, password: inPwd })
      });
      const data = await res.json();
      if (res.ok) {
        const returnUrl = searchParams?.get('returnUrl');
        if (returnUrl) {
          router.push(returnUrl);
        } else if (data.user?.role === 'admin') {
          router.push('/admin');
        } else if (data.user?.role === 'instructor') {
          router.push('/instructor');
        } else {
          router.push('/dashboard');
        }
      } else {
        if (data.needsVerification) {
          setErrorText('Please verify your email address.');
        } else {
          setErrorText('Login failed: ' + (data.error || 'Invalid credentials'));
        }
        setWiggleBtn(true);
        setTimeout(() => setWiggleBtn(false), 350);
      }
    } catch (e) {
      console.error(e);
      setErrorText('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async () => {
    if (!upEmail || !upPhone || !tcChecked || !upPwd) {
      setWiggleBtn(true);
      setTimeout(() => setWiggleBtn(false), 350);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: upFirst,
          lastName: upLast,
          email: upEmail,
          phone: upPhone,
          profile: upProfile,
          password: upPwd,
          bio: upBio,
          linkedin: upLinkedin
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNeedsVerify(true);
        setSuccessType('signup');
        setShowSuccess(true); 
      } else {
        setErrorText('Registration failed: ' + (data.error || 'Could not create account'));
        setWiggleBtn(true);
        setTimeout(() => setWiggleBtn(false), 350);
      }
    } catch (e) {
      console.error(e);
      setErrorText('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell">
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
          <a href="#" className="logo">
            <div className="logo-icon"><div className="lb"></div><div className="lb"></div></div>
            <span className="logo-text" onClick={()=>router.push('/')}>X<span>WORKS</span></span>
          </a>
          <div>
            <div className="eyebrow"><div className="eyebrow-dash"></div>Where skills come alive</div>
            <h1 className="hero-title">Learn something<br/><em>extraordinary</em><br/>today.</h1>
            <p className="hero-body">Join 40,000+ curious minds. From AI to guitar, investing to yoga — your next skill is one click away.</p>
            <div className="chips">
              <div className="chip"><div className="chip-dot"></div>200+ workshops</div>
              <div className="chip"><div className="chip-dot"></div>All skill levels</div>
              <div className="chip"><div className="chip-dot"></div>Expert instructors</div>
              <div className="chip"><div className="chip-dot"></div>Certificates</div>
            </div>
          </div>
          <div className="proof">
            <div className="proof-stat"><div className="num">40<b>k+</b></div><div className="lbl">Learners</div></div>
            <div className="proof-stat"><div className="num">200<b>+</b></div><div className="lbl">Workshops</div></div>
            <div className="proof-stat"><div className="num">4.8<b>★</b></div><div className="lbl">Avg rating</div></div>
            <div className="proof-stat"><div className="num">10<b>+</b></div><div className="lbl">Categories</div></div>
          </div>
          <a href="#" className="back-btn">← Back to XWORKS</a>
        </div>
      </div>

      <div className="panel-right">
        <div className="form-wrap">
          {!showSuccess && tab !== 'forgot' && tab !== 'reset' && (
            <div className="tabs">
              <button className={`tab-btn ${tab === 'in' ? 'on' : ''}`} onClick={() => switchTab('in')}>Sign In</button>
              <button className={`tab-btn ${tab === 'up' ? 'on' : ''}`} onClick={() => switchTab('up')}>Create Account</button>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {!showSuccess && tab === 'in' && (
            <div className="fview on">
              <div className="greeting">Welcome back 👋</div>
              <div className="subline">Continue your learning journey</div>
              <button className="btn-goog" onClick={handleGoogle} disabled={loading}>
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#9294B8" strokeWidth="2.5" strokeDasharray="28 56" strokeLinecap="round" style={{ transformOrigin: 'center', animation: 'spin .7s linear infinite' }}/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>
              <div className="or-row"><div className="or-line"></div><span className="or-text">or sign in with email</span><div className="or-line"></div></div>
              {successMsg && (
                <div className="alert alert-success">
                  <span className="alert-icon">✨</span>
                  <div className="alert-content">{successMsg}</div>
                </div>
              )}
              {errorText && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">{errorText}</div>
                </div>
              )}
              <div className="field">
                <label>Email address</label>
                <input className="inp" type="email" placeholder="you@example.com" value={inEmail} onChange={(e) => setInEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <div className="pwd-wrap">
                  <input className="inp" type={showPwd ? "text" : "password"} placeholder="••••••••" value={inPwd} onChange={(e) => setInPwd(e.target.value)} />
                  <button className="eye-btn" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>{showPwd ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div className="forgot-row"><a href="#" className="link" onClick={(e) => { e.preventDefault(); setErrorText(''); setSuccessMsg(''); setTab('forgot'); }}>Forgot password?</a></div>
              <button className={`btn-cta ${loading ? 'loading' : ''} ${wiggleBtn ? 'shake' : ''}`} onClick={doSignin}>
                <span className="spinner"></span><span className="btn-txt">Sign In →</span>
              </button>
              <div className="fine">No account? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('up'); }}>Create one free</a></div>
            </div>
          )}

          {/* SIGN UP VIEW */}
          {!showSuccess && tab === 'up' && (
            <div className="fview on">
              <div className="greeting">Join XWORKS ✨</div>
              <div className="subline">Free forever · No credit card needed</div>
              {errorText && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">{errorText}</div>
                </div>
              )}
              <div className="two-col">
                <div className="field">
                  <label>First name</label>
                  <input className="inp" type="text" placeholder="Priya" value={upFirst} onChange={(e) => setUpFirst(e.target.value)} />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input className="inp" type="text" placeholder="Rajan" value={upLast} onChange={(e) => setUpLast(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Email address</label>
                <input className="inp" type="email" placeholder="you@example.com" value={upEmail} onChange={(e) => setUpEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Phone number</label>
                <input className="inp" type="tel" placeholder="+91 98765 43210" value={upPhone} onChange={(e) => setUpPhone(e.target.value)} />
              </div>
              <div className="field">
                <label>I am a…</label>
                <select className="sel" value={upProfile} onChange={(e) => setUpProfile(e.target.value)}>
                  <option value="">Choose your profile</option>
                  <option>Learner</option>
                  <option>Instructor</option>
                </select>
              </div>
              <div className="field">
                <label>Create a password</label>
                <div className="pwd-wrap">
                  <input className="inp" type={showUpPwd ? "text" : "password"} placeholder="Min. 8 characters" value={upPwd} onChange={(e) => setUpPwd(e.target.value)} />
                  <button className="eye-btn" onClick={() => setShowUpPwd(!showUpPwd)} tabIndex={-1}>{showUpPwd ? '🙈' : '👁'}</button>
                </div>
                <div className={`strength ${upPwd ? 'show' : ''}`}>
                  <div className="bars">
                    <div className={`sbar ${strength.score >= 1 ? strength.cls : ''}`}></div>
                    <div className={`sbar ${strength.score >= 2 ? strength.cls : ''}`}></div>
                    <div className={`sbar ${strength.score >= 3 ? strength.cls : ''}`}></div>
                    <div className={`sbar ${strength.score >= 4 ? strength.cls : ''}`}></div>
                  </div>
                  <div className="s-lbl" style={{ color: strength.cls === 'w' ? '#EF4444' : strength.cls === 'f' ? 'var(--coral)' : '#22C55E' }}>
                    {upPwd ? strength.label : 'Enter a password'}
                  </div>
                </div>
              </div>
              <div className="check-row">
                <input type="checkbox" id="tc" checked={tcChecked} onChange={(e) => setTcChecked(e.target.checked)} />
                <label className="check-lbl" htmlFor="tc">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. Happy to receive workshop recommendations.</label>
              </div>
              <button className={`btn-cta ${loading ? 'loading' : ''} ${wiggleBtn ? 'shake' : ''}`} onClick={doSignup}>
                <span className="spinner"></span><span className="btn-txt">Create My Account →</span>
              </button>
              <div className="fine">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchTab('in'); }}>Sign in here</a></div>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {!showSuccess && tab === 'forgot' && (
            <div className="fview on">
              <div className="greeting">Reset Password</div>
              <div className="subline">Enter your email and we&apos;ll send a reset link.</div>
              {successMsg && (
                <div className="alert alert-success">
                  <span className="alert-icon">✨</span>
                  <div className="alert-content">{successMsg}</div>
                </div>
              )}
              {errorText && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">{errorText}</div>
                </div>
              )}
              <div className="field">
                <label>Email address</label>
                <input className="inp" type="email" placeholder="you@example.com" value={inEmail} onChange={(e) => setInEmail(e.target.value)} />
              </div>
              <button className={`btn-cta ${loading ? 'loading' : ''} ${wiggleBtn ? 'shake' : ''}`} onClick={doForgotPassword}>
                <span className="spinner"></span><span className="btn-txt">Send Reset Link →</span>
              </button>
              <div className="fine"><a href="#" onClick={(e) => { e.preventDefault(); setErrorText(''); setSuccessMsg(''); setTab('in'); }}>← Back to login</a></div>
            </div>
          )}

          {/* RESET PASSWORD VIEW */}
          {!showSuccess && tab === 'reset' && (
            <div className="fview on">
              <div className="greeting">New Password</div>
              <div className="subline">Enter your new password below.</div>
              {successMsg && (
                <div className="alert alert-success">
                  <span className="alert-icon">✨</span>
                  <div className="alert-content">{successMsg}</div>
                </div>
              )}
              {errorText && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">{errorText}</div>
                </div>
              )}
              <div className="field">
                <label>New Password</label>
                <div className="pwd-wrap">
                  <input className="inp" type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
                  <button className="eye-btn" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>{showPwd ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <div className="pwd-wrap">
                  <input className="inp" type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" value={confirmResetPwd} onChange={(e) => setConfirmResetPwd(e.target.value)} />
                </div>
              </div>
              <button className={`btn-cta ${loading ? 'loading' : ''} ${wiggleBtn ? 'shake' : ''}`} onClick={doResetPassword}>
                <span className="spinner"></span><span className="btn-txt">Update Password →</span>
              </button>
            </div>
          )}

          {/* SUCCESS VIEW */}
          {showSuccess && (
            <div className="fview on">
              <div className="success-wrap">
                <span className="success-icon">{needsVerify ? '📧' : '🎉'}</span>
                <div className="success-title">
                  {needsVerify ? "Check your email!" : (successType === 'signup' ? "You're in!" : "Welcome back 👋")}
                </div>
                <div className="success-sub">
                  {needsVerify 
                    ? `We've sent a verification link to ${upEmail}. Please click it to activate your account.`
                    : (successType === 'signup' 
                        ? "Welcome to XWORKS. Your learning journey starts now." 
                        : "Great to see you again. Pick up where you left off.")}
                </div>
                {needsVerify ? (
                  <div className="next-steps">
                    <div className="ns-label">Verification Steps</div>
                    <div className="ns-item"><div className="ns-num">1</div>Open your inbox in a new tab</div>
                    <div className="ns-item"><div className="ns-num">2</div>Find the email from XWORKS info</div>
                    <div className="ns-item"><div className="ns-num">3</div>Click the &quot;Verify email&quot; button</div>
                  </div>
                ) : (
                  <div className="next-steps">
                    <div className="ns-label">What&apos;s next</div>
                    <div className="ns-item"><div className="ns-num">1</div>Browse 200+ workshops across 10 categories</div>
                    <div className="ns-item"><div className="ns-num">2</div>Enrol in your first session and get a calendar invite</div>
                    <div className="ns-item"><div className="ns-num">3</div>Earn a certificate and build your learning streak</div>
                  </div>
                )}
                {!needsVerify && (
                  <button className="btn-cta" onClick={() => router.push('/dashboard')}>
                    <span className="btn-txt">Go to my dashboard →</span>
                  </button>
                )}
                {needsVerify && (
                  <button className="btn-cta" onClick={() => setShowSuccess(false)}>
                    <span className="btn-txt">Got it, back to login</span>
                  </button>
                )}
                <div className="fine" style={{ marginTop: '12px' }}><a href="#" className="link" onClick={(e)=>{e.preventDefault(); setShowSuccess(false);}}>← Explore workshops first</a></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
