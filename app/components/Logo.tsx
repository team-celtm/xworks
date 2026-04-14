"use client";
import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  href?: string;
}

export default function Logo({ className = "", href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`logo-wrap ${className}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="logo-bars" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div className="logo-bar" style={{ height: '2px', background: 'var(--coral)', borderRadius: '1px', width: '16px' }}></div>
        <div className="logo-bar" style={{ height: '2px', background: 'var(--coral)', borderRadius: '1px', width: '10px', opacity: 0.5 }}></div>
      </div>
      <span className="logo-name" style={{ 
        fontFamily: 'var(--font-display, Syne, sans-serif)', 
        fontSize: '22px', 
        fontWeight: 800, 
        color: '#FFFFFF', 
        letterSpacing: '-0.5px', 
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span>X</span><span style={{ color: 'var(--coral)' }}>WORKS</span>
      </span>
      <style jsx>{`
        .logo-wrap:hover .logo-bar { transform: translateX(2px); transition: 0.2s; }
      `}</style>
    </Link>
  );
}
