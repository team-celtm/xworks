"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function ContactPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Contact Us</h1>
          <p className="legal-updated">Get in touch with the XWORKS team</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>📍</span> Registered Office</h2>
            <p><strong>CELTM Global Pvt Ltd</strong><br />
            E704, Titanium City Center,<br />
            Nr Income Tax Office, Satellite,<br />
            Ahmedabad – 380015, Gujarat, India</p>
          </section>

          <section>
            <h2><span>✉️</span> Email Us</h2>
            <p>For support, enquiries, or collaborations, reach out to us at:<br />
            <a href="mailto:team@celtm.com" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>team@celtm.com</a></p>
          </section>

          <section>
            <h2><span>🌐</span> Official Website</h2>
            <p>Visit us at:<br />
            <a href="https://xworks.celtm.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>xworks.celtm.com</a></p>
          </section>

          <section>
            <h2><span>🕒</span> Business Hours</h2>
            <p>Monday – Friday: 10:00 AM – 6:00 PM (IST)<br />
            Saturday: 10:00 AM – 2:00 PM (IST)</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
