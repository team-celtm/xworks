'use client';

import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function AlertModal({ isOpen, onClose, title, message }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-backdrop" onClick={onClose}>
      <div className="custom-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-alert-icon-wrap">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="custom-alert-title">{title}</h3>
        <p className="custom-alert-message">{message}</p>
        <button className="custom-alert-btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
