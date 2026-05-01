"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function RefundPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Refund Policy</h1>
          <p className="legal-updated">Last Updated: May 2026</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>4.1</span> General Refund Position</h2>
            <p>All workshop registrations made through XWORKS are generally <strong>non-refundable</strong>.</p>
            <p>Due to the nature of digital learning, limited seats, trainer scheduling, infrastructure commitments, and operational allocation, refunds are ordinarily not provided.</p>
          </section>

          <section>
            <h2><span>4.2</span> Exceptional Circumstances</h2>
            <p>Refunds may be considered solely at the discretion of CELTM Global Pvt Ltd in exceptional situations including:</p>
            <ul>
              <li>Duplicate payment</li>
              <li>Technical payment errors</li>
              <li>Workshop cancellation by XWORKS</li>
              <li>Extraordinary medical emergencies</li>
              <li>Other situations deemed appropriate by management</li>
            </ul>
            <p>Submission of a refund request does not guarantee approval.</p>
          </section>

          <section>
            <h2><span>4.3</span> Non-Refundable Situations</h2>
            <p>Refunds shall NOT be provided for:</p>
            <ul>
              <li>Change of mind</li>
              <li>Scheduling conflicts</li>
              <li>Partial attendance / Failure to attend</li>
              <li>Lack of technical readiness</li>
              <li>Dissatisfaction based on subjective expectations</li>
              <li>Recorded content access</li>
              <li>Community removals due to misconduct</li>
            </ul>
          </section>

          <section>
            <h2><span>4.4</span> Transfer Requests</h2>
            <p>In certain cases, XWORKS may permit batch transfers, credit notes, or alternate workshop allocation. Such decisions remain entirely discretionary.</p>
          </section>

          <section>
            <h2><span>4.5</span> Payment Processing</h2>
            <p>Payments are processed through Razorpay and related banking/payment infrastructure. Approved refunds, where applicable, may require reasonable processing time depending on banking systems and payment providers.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
