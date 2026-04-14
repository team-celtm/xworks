"use client";
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="home-footer" id="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-brand-name">X<span>WORKS</span></div>
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
            <Link href="/" className="footer-link">About us</Link>
            <Link href="/teach" className="footer-link">Teach on XWORKS</Link>
            <Link href="/" className="footer-link">Blog</Link>
            <Link href="/" className="footer-link">Careers</Link>
            <Link href="/" className="footer-link">Press</Link>
          </div>
          <div>
            <div className="footer-col-title">Support</div>
            <Link href="/" className="footer-link">Contact us</Link>
            <Link href="/" className="footer-link">FAQs</Link>
            <Link href="/" className="footer-link">Privacy Policy</Link>
            <Link href="/" className="footer-link">Terms of Use</Link>
            <Link href="/" className="footer-link">Refund Policy</Link>
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
