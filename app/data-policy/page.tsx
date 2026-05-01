"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function DataPolicyPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Data Policy (DPDP)</h1>
          <p className="legal-updated">Last Updated: May 2026</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>5.1</span> Commitment to Data Protection</h2>
            <p>CELTM Global Pvt Ltd recognizes the importance of responsible personal data processing and aims to align operationally with the Digital Personal Data Protection Act, 2023 (India) (“DPDP Act”).</p>
          </section>

          <section>
            <h2><span>5.2</span> Data Principles</h2>
            <p>XWORKS endeavors to process personal data using principles including:</p>
            <ul>
              <li>Lawful processing & Purpose limitation</li>
              <li>Data minimization</li>
              <li>Reasonable security safeguards</li>
              <li>Transparency & Consent-based processing</li>
            </ul>
          </section>

          <section>
            <h2><span>5.3</span> Types of Data Processed</h2>
            <p>Data processed may include identity information, contact info, workshop participation records, certification records, communication logs, and payment metadata.</p>
          </section>

          <section>
            <h2><span>5.5</span> Consent</h2>
            <p>By using XWORKS services, users provide consent for relevant operational processing of personal data. Marketing consent may be separately managed, and media/publication consent may be explicitly obtained. Users may withdraw consent subject to operational or legal limitations.</p>
          </section>

          <section>
            <h2><span>5.6</span> Data Security</h2>
            <p>XWORKS adopts reasonable technical and organizational safeguards to reduce risks of unauthorized access or misuse. However, no electronic system can guarantee absolute protection.</p>
          </section>

          <section>
            <h2><span>5.8</span> User Requests</h2>
            <p>Users may request data correction, communication preference changes, or consent withdrawal by submitting a request to <strong>team@celtm.com</strong>.</p>
          </section>

          <section>
            <h2><span>5.10</span> Jurisdiction</h2>
            <p>This Data Policy shall be governed by Indian law and subject to Ahmedabad jurisdiction.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
