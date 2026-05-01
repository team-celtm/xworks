"use client";
import React from 'react';
import Link from 'next/link';
import '../home.css';
import '../legal.css';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div className="legal-wrapper">
      <nav className="legal-nav">
        <Logo />
        <Link href="/" className="nav-link-sm" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Back to Home</Link>
      </nav>

      <main className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Terms & Conditions</h1>
          <p className="legal-updated">Last Updated: May 2026</p>
        </header>

        <div className="legal-content">
          <section>
            <h2><span>1.1</span> Introduction</h2>
            <p>Welcome to XWORKS, a curated workshop platform operated by CELTM Global Pvt Ltd (“CELTM”, “XWORKS”, “we”, “our”, or “us”).</p>
            <p>By accessing, browsing, registering for, or participating in any workshop, training session, event, program, certification activity, community interaction, or related service provided through XWORKS, you agree to comply with and be bound by these Terms & Conditions.</p>
            <p>If you do not agree with these Terms, you must not access or use the platform or services.</p>
          </section>

          <section>
            <h2><span>1.2</span> Nature of Services</h2>
            <p>XWORKS provides curated learning experiences including but not limited to:</p>
            <ul>
              <li>Online workshops</li>
              <li>Offline workshops</li>
              <li>Hybrid workshops</li>
              <li>Corporate training programs</li>
              <li>College and institutional workshops</li>
              <li>Public learning sessions</li>
              <li>Skill-building programs</li>
              <li>Wellness and awareness sessions</li>
              <li>Technology and creativity workshops</li>
              <li>Community learning initiatives</li>
            </ul>
            <p>XWORKS reserves the right to modify, suspend, discontinue, or update any service, workshop, or feature at any time without prior notice.</p>
          </section>

          <section>
            <h2><span>1.3</span> Eligibility</h2>
            <p>Participation in XWORKS workshops and services is restricted to individuals who are 18 years of age or older.</p>
            <p>By registering, users confirm that:</p>
            <ul>
              <li>They are legally competent to enter into binding agreements.</li>
              <li>The information submitted by them is accurate and complete.</li>
              <li>They shall use the platform lawfully and responsibly.</li>
            </ul>
          </section>

          <section>
            <h2><span>1.4</span> User Accounts</h2>
            <p>Certain services may require users to create an account. Users are responsible for:</p>
            <ul>
              <li>Maintaining confidentiality of login credentials</li>
              <li>Restricting unauthorized access to their account</li>
              <li>Ensuring all account information remains accurate and updated</li>
              <li>Activities conducted through their account</li>
            </ul>
            <p>CELTM shall not be liable for losses arising due to unauthorized access caused by user negligence.</p>
          </section>

          <section>
            <h2><span>1.5</span> Intellectual Property</h2>
            <p>All workshop content, training material, videos, presentations, recordings, assessments, frameworks, templates, branding elements, graphics, documents, and related intellectual property remain the exclusive property of CELTM Global Pvt Ltd and/or its licensors.</p>
            <p>Participants are granted a limited, non-transferable, non-exclusive, revocable license for personal educational use only.</p>
            <strong>Participants shall NOT:</strong>
            <ul>
              <li>Copy or redistribute workshop material</li>
              <li>Record sessions without written authorization</li>
              <li>Share workshop links or credentials</li>
              <li>Republish training content</li>
              <li>Commercially exploit any workshop material</li>
              <li>Upload workshop recordings to public or private platforms</li>
              <li>Reproduce course material for institutional use</li>
            </ul>
            <p>Unauthorized use may result in immediate termination of access, permanent suspension, and legal action.</p>
          </section>

          <section>
            <h2><span>1.6</span> Certificates</h2>
            <p>Certificates may be issued at the sole discretion of XWORKS subject to attendance, participation, and assessment performance. XWORKS reserves the right to refuse or revoke certificates in cases of misconduct.</p>
            <p>Certificates issued by XWORKS represent participation or completion status only and are not employment guarantees or academic degrees.</p>
          </section>

          <section>
            <h2><span>1.7</span> Community Participation</h2>
            <p>Users may optionally engage with XWORKS communities (WhatsApp, Discord). All community interactions are governed by our <Link href="/guidelines" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Community Guidelines</Link>.</p>
            <p>XWORKS reserves the right to remove users from communities without refund or notice in cases of harassment, spam, or disruptive conduct as outlined in the guidelines.</p>
          </section>

          <section>
            <h2><span>1.8</span> Workshop Recordings & Media</h2>
            <p>Certain workshops may be recorded for operational, quality, or promotional purposes. By participating, users consent to being recorded and having screenshots used for XWORKS promotional materials.</p>
          </section>

          <section>
            <h2><span>1.10</span> Limitation of Liability</h2>
            <p>To the maximum extent permitted under applicable law, CELTM Global Pvt Ltd shall not be liable for learning outcome failures, career losses, or technical disruptions. All workshops are delivered on a best-effort educational basis.</p>
          </section>

          <section>
            <h2><span>1.14</span> Governing Law & Jurisdiction</h2>
            <p>These Terms shall be governed by the laws of India. All disputes shall fall under the exclusive jurisdiction of the competent courts located in Ahmedabad, Gujarat.</p>
          </section>

          <hr style={{ margin: '60px 0', border: 0, borderTop: '1px solid var(--border)', opacity: 0.5 }} />

          <header className="legal-header" style={{ marginBottom: '40px', textAlign: 'left' }}>
            <h1 className="legal-title" style={{ fontSize: '32px' }}>Terms of Use</h1>
          </header>

          <section>
            <h2><span>3.1</span> Acceptable Use</h2>
            <p>Users agree to use XWORKS responsibly and lawfully. Users shall NOT:</p>
            <ul>
              <li>Misrepresent identity</li>
              <li>Share unauthorized recordings</li>
              <li>Attempt unauthorized system access</li>
              <li>Disrupt workshops</li>
              <li>Harass participants</li>
              <li>Upload malware or malicious content</li>
              <li>Engage in piracy</li>
              <li>Violate intellectual property rights</li>
              <li>Use workshops for illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2><span>3.2</span> Ethical Participation</h2>
            <p>Participants are expected to maintain respectful conduct, avoid discriminatory behavior, respect trainers and participants, and follow workshop instructions.</p>
          </section>

          <section>
            <h2><span>3.4</span> AI, Cybersecurity & Tool Usage</h2>
            <p>Certain workshops include demonstrations involving AI tools, security testing concepts, and automation utilities. Users are solely responsible for ensuring lawful and ethical usage of such tools.</p>
            <p>XWORKS strictly prohibits unauthorized hacking, illegal surveillance, fraudulent activity, harmful cyber activity, or privacy violations. Educational exposure does not constitute permission to perform illegal actions.</p>
          </section>

          <section>
            <h2><span>3.5</span> Platform Availability</h2>
            <p>XWORKS does not guarantee uninterrupted platform availability. Maintenance, outages, or technical disruptions may occasionally occur.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
