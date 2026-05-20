'use client';

import React from 'react';

interface RoleTransitionOverlayProps {
  role: 'admin' | 'instructor' | 'learner';
  type: 'login' | 'logout';
}

export default function RoleTransitionOverlay({ role, type }: RoleTransitionOverlayProps) {
  const getRoleDetails = () => {
    switch (role) {
      case 'admin':
        return {
          emoji: '⚙️',
          title: type === 'login' ? 'Initializing Admin Systems...' : 'Closing Admin Console...',
          subtitle: type === 'login' ? 'Securing administrative shell...' : 'Deauthorizing admin session, goodbye!',
          className: 'admin',
        };
      case 'instructor':
        return {
          emoji: '🚀',
          title: type === 'login' ? 'Entering Creator Studio...' : 'Powering Down Studio...',
          subtitle: type === 'login' ? 'Setting up your creator stage...' : 'Saving your studio configurations, see you soon!',
          className: 'instructor',
        };
      case 'learner':
      default:
        return {
          emoji: '🎓',
          title: type === 'login' ? 'Setting Up Your Learning Desk...' : 'Signing Off for Now...',
          subtitle: type === 'login' ? 'Preparing your personal classroom...' : 'Saving your progress, have a wonderful day!',
          className: 'learner',
        };
    }
  };

  const details = getRoleDetails();

  return (
    <div className={`role-overlay ${details.className}`}>
      <div className="role-icon-container">{details.emoji}</div>
      <h2 className="role-title-text">{details.title}</h2>
      <p className="role-sub-text">{details.subtitle}</p>
      <div className="role-loading-bar">
        <div className="role-loading-fill" />
      </div>
    </div>
  );
}
