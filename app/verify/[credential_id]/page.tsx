"use client";

import React, { useEffect, useState } from "react";
import "../verify.css";
import Link from "next/link";

interface CertData {
  credentialId: string;
  learnerName: string;
  courseName: string;
  courseDuration: number;
  issuedAt: string;
  status: string;
  emoji: string;
  thumbBg: string;
}

export default function VerifyPage({ params }: { params: Promise<{ credential_id: string }> }) {
  const { credential_id } = React.use(params) as { credential_id: string };
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkCert = async () => {
      try {
        const res = await fetch(`/api/certificates/verify/${credential_id}`);
        if (!res.ok) {
          setError("Certificate not found or invalid.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setCert(data);
      } catch {
        setError("Error verifying certificate.");
      } finally {
        setLoading(false);
      }
    };
    checkCert();
  }, [credential_id]);

  if (loading) {
    return (
      <div className="v-shell v-center">
        <div className="v-loader"></div>
        <p>Verifying Credential...</p>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="v-shell v-center">
        <div className="v-error-box">
          <div className="v-error-icon">⚠️</div>
          <h2>Credential Not Found</h2>
          <p>We couldn&apos;t verify a certificate with the ID: {credential_id}</p>
          <Link href="/" className="v-btn">Return to Homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="v-shell">
      <nav className="v-nav">
        <Link href="/" className="v-logo"><span style={{ color: '#FFD54A' }}>X</span><span>WORKS</span></Link>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--cert-orange)", letterSpacing: "0.5px" }}>
          CREDENTIAL ID: {cert.credentialId}
        </div>
      </nav>

      <div className="v-cert-container fade-up">
        {/* Background Clusters */}
        <div className="v-shape v-s1"></div>
        <div className="v-shape v-s2"></div>
        <div className="v-shape v-s3"></div>
        <div className="v-shape v-s4"></div>
        <div className="v-shape v-s5"></div>
        <div className="v-shape v-s6"></div>
        <div className="v-shape v-s7"></div>
        <div className="v-shape v-s8"></div>
        <div className="v-shape v-s9"></div>
        <div className="v-shape v-s10"></div>

        <div className="v-cert-inner">
          <div className="v-cert-branding">
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--cert-ink)", letterSpacing: "-0.3px", marginBottom: "0" }}>
                <span style={{ color: '#FFD54A' }}>X</span><span style={{ color: "var(--cert-orange)" }}>WORKS</span>
              </div>
              <div style={{ fontSize: "10px", color: "var(--cert-indigo)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginTop: "2px" }}>Skills for the Future</div>
            </div>
          </div>

          <h1 className="v-title-main">CERTIFICATE</h1>
          <p className="v-title-sub">of Course Completion</p>

          <p className="v-presented">This certificate is proudly presented to</p>
          <h2 className="v-learner-name">{cert.learnerName}</h2>

          <p className="v-successfully">for successfully completing training as a</p>
          <h3 className="v-course-title">{cert.courseName}</h3>
          <p className="v-at-works">at <strong>XWORKS</strong> on {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <p className="v-body-p">
            During this period, {cert.learnerName.split(' ')[0]} demonstrated exceptional creativity, technical proficiency, and a
            strong work ethic, making significant contributions to our organization. We commend {cert.learnerName.split(' ')[0]}
            for the dedication, professionalism, and outstanding performance throughout the course.
          </p>

          <p className="v-wish">We wish them continued success in all future endeavors.</p>

          <div className="v-cert-footer-row">
            <div className="v-cert-id-badge">
              Credential ID: {cert.credentialId}
            </div>
            <div className="v-qr-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                alt="Scan to Verify"
                style={{ width: '70px', height: '70px', border: '1px solid #ddd', padding: '3px', borderRadius: '4px', background: '#fff' }}
              />
              <span style={{ fontSize: '9px', color: 'var(--cert-indigo)', fontWeight: 'bold' }}>Scan to Verify</span>
            </div>
            <div className="v-signature-box">
              <div className="v-sig-name">Nitesh Shetty</div>
              <div className="v-sig-title">Founder, XWORKS</div>
            </div>
          </div>
        </div>
      </div>

      <div className="v-actions fade-up" style={{ animationDelay: "0.2s" }}>
        <button className="v-btn v-btn-primary" onClick={() => window.print()}>
          Download PDF ↓
        </button>
        <button className="v-btn v-btn-secondary" onClick={(e) => {
          navigator.clipboard.writeText(window.location.href);
          const btn = e.currentTarget;
          const originalText = btn.innerHTML;
          btn.innerHTML = 'Copied! ✅';
          setTimeout(() => btn.innerHTML = originalText, 2000);
        }}>
          Share Verification Link
        </button>
      </div>
    </div>
  );
}
