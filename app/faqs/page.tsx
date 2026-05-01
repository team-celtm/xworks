"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

const FAQ_DATA = [
  {
    category: "General",
    items: [
      {
        q: "What is XWORKS?",
        a: "XWORKS is a curated workshop platform that brings live, hands-on learning experiences across technology, creativity, wellness, and more to curious minds of all ages."
      },
      {
        q: "Who can join XWORKS workshops?",
        a: "Our workshops are designed for everyone—from school students and college learners to working professionals and senior citizens. If you have a curious mind, there's a workshop for you."
      }
    ]
  },
  {
    category: "Enrolment & Payments",
    items: [
      {
        q: "How do I register for a workshop?",
        a: "Simply browse our catalogue, select a workshop that interests you, and click 'Enrol'. You can pay securely using UPI, Cards, or Netbanking via Razorpay."
      },
      {
        q: "Will I get a confirmation after payment?",
        a: "Yes, you will receive an instant confirmation email and WhatsApp message with your workshop details and access link."
      },
      {
        q: "Can I cancel my enrolment and get a refund?",
        a: "Refunds are generally provided if requested at least 48 hours before the workshop starts. Please refer to our Refund Policy for detailed terms."
      }
    ]
  },
  {
    category: "Workshop Experience",
    items: [
      {
        q: "Are the workshops live or recorded?",
        a: "Most XWORKS workshops are live and interactive, allowing you to ask questions in real-time. However, we also offer some self-paced recorded sessions."
      },
      {
        q: "Will I get a recording of the live session?",
        a: "Yes, for most live workshops, we provide access to the recording for a limited period (usually 7-30 days) so you can revisit the concepts."
      },
      {
        q: "Do I get a certificate after the workshop?",
        a: "Yes! Upon successful completion and meeting the attendance criteria, you will receive a digital certificate from XWORKS."
      }
    ]
  },
  {
    category: "Community & Support",
    items: [
      {
        q: "What are XWORKS communities?",
        a: "XWORKS communities (on WhatsApp or Discord) are spaces where learners can interact, share resources, and get support from mentors even after the workshop ends."
      },
      {
        q: "How do I contact support?",
        a: "You can reach out to us at team@celtm.com for any queries or assistance. We usually respond within 24 hours."
      }
    ]
  }
];

function FAQItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`faq-card ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)} style={{ 
      background: '#FFFFFF', 
      border: '1px solid var(--border)', 
      borderRadius: '16px', 
      padding: '24px', 
      marginBottom: '16px', 
      cursor: 'pointer',
      transition: '0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--indigo-dark)', margin: 0 }}>{q}</h3>
        <span style={{ 
          fontSize: '20px', 
          color: 'var(--indigo)', 
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: '0.3s'
        }}>+</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: '16px', color: '#6B7280', fontSize: '15px', lineHeight: '1.7', borderTop: '1px solid var(--surface-2)', paddingTop: '16px' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container" style={{ maxWidth: '800px' }}>
        <header className="legal-header">
          <h1 className="legal-title">Frequently Asked Questions</h1>
          <p className="legal-updated">Everything you need to know about XWORKS</p>
        </header>

        <div className="legal-content">
          {FAQ_DATA.map((cat, i) => (
            <section key={i}>
              <h2 style={{ fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: '24px' }}>{cat.category}</h2>
              {cat.items.map((item, j) => (
                <FAQItem key={j} q={item.q} a={item.a} />
              ))}
            </section>
          ))}
        </div>

        <section style={{ marginTop: '60px', padding: '40px', background: 'var(--indigo-dark)', borderRadius: '24px', textAlign: 'center', color: '#FFFFFF' }}>
          <h2 style={{ color: '#FFFFFF', fontSize: '24px', marginBottom: '12px' }}>Still have questions?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>We're here to help you on your learning journey.</p>
          <Link href="/contact" className="btn-primary" style={{ background: 'var(--coral)', color: '#FFFFFF' }}>Contact Support</Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
