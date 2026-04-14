"use client";
import React from 'react';
import './Logo.css';

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
  fontSize?: string;
  hideX?: boolean;
  xColor?: string;
  worksColor?: string;
}

export default function Logo({ 
  fontSize = "26px", 
  xColor = "#FFFFFF", 
  worksColor = "var(--coral)" 
}: LogoProps) {
  return (
    <div className="logo-standard" style={{ fontSize }}>
      <span style={{ color: xColor }}>X</span>
      <span style={{ color: worksColor }}>WORKS</span>
    </div>
  );
}
