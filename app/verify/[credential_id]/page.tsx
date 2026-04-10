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
      } catch (err) {
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
      {/* Dynamic Background matching course theme */}
      <div className={`v-bg-glow ${cert.thumbBg}`}></div>

      <nav className="v-nav">
        <Link href="/" className="v-logo">X<span>WORKS</span></Link>
      </nav>

      <div className="v-main">
        <div className="v-cert-card fade-up">
          <div className="v-cert-header">
            <div className="v-seal">
              <span className="v-seal-check">✓</span>
            </div>
            <div className="v-status">Verified Credential</div>
          </div>

          <div className="v-cert-body">
            <p className="v-cert-label">This certifies that</p>
            <h1 className="v-learner">{cert.learnerName}</h1>
            <p className="v-cert-label">has successfully completed</p>
            
            <div className="v-course-chip">
              <span className="v-emoji">{cert.emoji}</span>
              <h2>{cert.courseName}</h2>
            </div>
            
            <p className="v-duration">({cert.courseDuration} hours of coursework)</p>
          </div>

          <div className="v-cert-footer">
            <div className="v-meta">
              <span className="v-meta-label">Credential ID</span>
              <span className="v-meta-val">{cert.credentialId}</span>
            </div>
            <div className="v-meta">
              <span className="v-meta-label">Issued On</span>
              <span className="v-meta-val">{new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="v-actions fade-up" style={{ animationDelay: "0.2s" }}>
          <button className="v-btn v-btn-primary" onClick={() => window.print()}>
            Download PDF
          </button>
          <button className="v-btn v-btn-secondary" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Verification link copied!");
          }}>
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
}
