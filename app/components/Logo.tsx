"use client";
import React from 'react';

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
    <div className="logo-standard" style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "0px",
      fontFamily: "var(--font-display)",
      fontSize: fontSize,
      fontWeight: 900,
      letterSpacing: "-0.04em",
      userSelect: "none"
    }}>
      <span style={{ color: xColor }}>X</span>
      <span style={{ color: worksColor }}>WORKS</span>
    </div>
  );
}
