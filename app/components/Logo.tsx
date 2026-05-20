"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  href?: string;
}

export default function Logo({ className = "", href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`logo-wrap ${className}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0px' }}>
      <Image
        src="/xworks-logo.png"
        alt="XWORKS"
        width={160}
        height={45}
        priority
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </Link>
  );
}
