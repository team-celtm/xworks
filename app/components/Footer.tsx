"use client";
import React from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="home-footer" id="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <Logo />
            <div className="footer-brand-desc">Curated workshops for every curious mind. From school to silver — we believe learning never stops.</div>
          </div>
          <div>
            <div className="footer-col-title">Workshops</div>
            <Link href="/catalogue?q=Artificial Intelligence" className="footer-link">Artificial Intelligence</Link>
            <Link href="/catalogue?q=Programming" className="footer-link">Programming</Link>
            <Link href="/catalogue?q=Cybersecurity" className="footer-link">Cybersecurity</Link>
            <Link href="/catalogue?q=Data" className="footer-link">Data & Analytics</Link>
            <Link href="/catalogue?q=Design" className="footer-link">Design</Link>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <Link href="/#about" className="footer-link" suppressHydrationWarning>About us</Link>
            <Link href="/teach" className="footer-link">Teach on XWORKS</Link>
            <Link href="/" className="footer-link">Blog</Link>
            <Link href="/" className="footer-link">Careers</Link>
            <Link href="/" className="footer-link">Press</Link>
          </div>
          <div>
            <div className="footer-col-title">Support</div>
            <Link href="/#footer" className="footer-link" suppressHydrationWarning>Contact us</Link>
            <Link href="/" className="footer-link">FAQs</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/terms" className="footer-link">Terms of Use</Link>
            <Link href="/refund" className="footer-link">Refund Policy</Link>
            <Link href="/data-policy" className="footer-link">Data Policy (DPDP)</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bars"><div className="footer-bar"></div><div className="footer-bar"></div>&nbsp; © 2026 XWORKS. All rights reserved.</div>
          <div>Made with curiosity in India 🇮🇳</div>
        </div>
      </div>
    </footer>
  );
}
