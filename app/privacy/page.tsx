"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last Updated: May 2026</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>2.1</span> Introduction</h2>
            <p>CELTM Global Pvt Ltd respects the privacy of users and is committed to responsible handling of personal information. This Privacy Policy explains how XWORKS collects, processes, stores, uses, shares, and protects personal data.</p>
          </section>

          <section>
            <h2><span>2.2</span> Information Collected</h2>
            <p>XWORKS may collect the following information:</p>
            <ul>
              <li><strong>Personal Info:</strong> Name, email, phone, organization, attendance records.</li>
              <li><strong>Transaction Info:</strong> Payment status and identifiers (processed securely via third-party gateways like Razorpay).</li>
              <li><strong>Technical Info:</strong> Device info, IP address, usage analytics, session logs.</li>
              <li><strong>Media:</strong> Workshop recordings, screenshots, and photographs.</li>
            </ul>
          </section>

          <section>
            <h2><span>2.3</span> Purpose of Data Collection</h2>
            <p>Personal data may be used for workshop registration, attendance tracking, certification issuance, communication, security, marketing, and community engagement on WhatsApp/Discord.</p>
          </section>

          <section>
            <h2><span>2.4</span> Communication Consent</h2>
            <p>By registering, users consent to receiving workshop reminders, operational updates, community invites, and promotional announcements. Users may opt out of promotional communications.</p>
          </section>

          <section>
            <h2><span>2.5</span> Data Sharing</h2>
            <p>XWORKS does not sell personal data. Data may be shared with payment gateways, technology providers, certification systems, and legal authorities where required by law.</p>
          </section>

          <section>
            <h2><span>2.7</span> Security Measures</h2>
            <p>XWORKS implements commercially reasonable safeguards including access controls and secure infrastructure. However, no digital platform can guarantee absolute security.</p>
          </section>

          <section>
            <h2><span>2.8</span> User Rights</h2>
            <p>Users may request access to, correction of, or deletion of personal data by contacting team@celtm.com.</p>
          </section>

          <section>
            <h2><span>2.9</span> Children’s Privacy</h2>
            <p>XWORKS services are intended only for users aged 18 years and above. We do not knowingly collect data from minors.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
