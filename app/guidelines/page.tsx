"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function GuidelinesPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Community Guidelines & Code of Conduct</h1>
          <p className="legal-updated">Last Updated: May 2026</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>6.1</span> Purpose</h2>
            <p>XWORKS communities are designed to foster learning, collaboration, curiosity, and respectful interaction.</p>
          </section>

          <section>
            <h2><span>6.2</span> Expected Conduct</h2>
            <p>Members are expected to:</p>
            <ul>
              <li>Treat others respectfully</li>
              <li>Maintain professionalism</li>
              <li>Encourage constructive discussions</li>
              <li>Respect diversity and inclusion</li>
              <li>Support ethical learning</li>
            </ul>
          </section>

          <section>
            <h2><span>6.3</span> Prohibited Conduct</h2>
            <p>The following are strictly prohibited:</p>
            <ul>
              <li>Harassment</li>
              <li>Hate speech</li>
              <li>Bullying</li>
              <li>Spam</li>
              <li>Unauthorized promotions</li>
              <li>Sharing pirated content</li>
              <li>Sharing illegal material</li>
              <li>Disruptive behavior</li>
              <li>Privacy violations</li>
              <li>Recording or redistributing private discussions without consent</li>
            </ul>
          </section>

          <section>
            <h2><span>6.4</span> Community Platforms</h2>
            <p>Communities may operate through:</p>
            <ul>
              <li>WhatsApp</li>
              <li>Discord</li>
              <li>Email groups</li>
              <li>Other collaboration tools</li>
            </ul>
            <p>Users remain subject to both XWORKS policies and the rules of such platforms.</p>
          </section>

          <section>
            <h2><span>6.5</span> Enforcement</h2>
            <p>Violations may result in:</p>
            <ul>
              <li>Warnings</li>
              <li>Temporary suspension</li>
              <li>Permanent removal</li>
              <li>Revocation of workshop access</li>
              <li>Legal escalation where necessary</li>
            </ul>
            <p>No refund shall be provided for removals due to misconduct.</p>
          </section>

          <section style={{ marginTop: '60px', padding: '32px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '16px', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
            <p>For legal, compliance, privacy, or operational queries:</p>
            <p><strong>CELTM Global Pvt Ltd</strong><br />
            E704, Titanium City Center, Nr Income Tax Office, Satellite, Ahmedabad – 380015, Gujarat, India<br />
            Email: <a href="mailto:team@celtm.com" style={{ color: 'var(--indigo)', fontWeight: 600 }}>team@celtm.com</a><br />
            Website: <a href="https://xworks.celtm.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--indigo)', fontWeight: 600 }}>xworks.celtm.com</a></p>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '24px' }}>These policies are effective as of the date of publication on the XWORKS platform and may be updated periodically without prior notice.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
