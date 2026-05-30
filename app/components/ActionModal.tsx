import React, { useState, useEffect } from 'react';
import { validateMeetingLink } from '@/lib/meetingLink';

export interface ActionModalState {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  inputPlaceholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  validationType?: 'meeting_link';
  initialValue?: string;
}

export default function ActionModal({
  config,
  onClose
}: {
  config: ActionModalState;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (config.isOpen) {
      setInputValue(config.initialValue || '');
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [config.isOpen, config.initialValue]);

  if (!config.isOpen && !isVisible) return null;

  const isMeetingLink = config.validationType === 'meeting_link';
  const valResult = isMeetingLink ? validateMeetingLink(inputValue) : { isValid: true };
  const isInputValid = valResult.isValid;
  const validationError = valResult.error || '';

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (config.onConfirm) {
      config.onConfirm(config.type === 'prompt' ? inputValue : undefined);
    }
    setInputValue('');
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) config.onCancel();
    setInputValue('');
    onClose();
  };
  
  const isError = config.title.toLowerCase().includes('error') || config.title.toLowerCase().includes('fail');
  const isSuccess = config.title.toLowerCase().includes('success');
  
  let headerColor = 'var(--ink)';
  let icon = null;
  if (isError) {
    headerColor = '#ef4444';
    icon = '⚠️';
  } else if (isSuccess) {
    headerColor = '#10b981';
    icon = '✨';
  } else if (config.type === 'confirm' || config.type === 'prompt') {
    headerColor = '#3b82f6';
    icon = '💬';
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: config.isOpen ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0)', 
      backdropFilter: config.isOpen ? 'blur(4px)' : 'blur(0px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.25s ease-out',
      opacity: config.isOpen ? 1 : 0,
      pointerEvents: config.isOpen ? 'auto' : 'none'
    }}>
      <form 
        onSubmit={handleConfirm}
        style={{
          background: 'var(--surface)', padding: '32px', borderRadius: '24px',
          width: '420px', maxWidth: '90%', border: '1px solid var(--border-sm)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          transform: config.isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
          <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: headerColor }}>{config.title}</h3>
        </div>
        
        <p style={{ color: 'var(--text-2)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px 0' }}>{config.message}</p>
        
        {config.type === 'prompt' && (
          <div style={{ width: '100%', marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
            <input 
              type="text" 
              placeholder={config.inputPlaceholder || 'Enter value...'}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ 
                width: '100%', marginBottom: '8px', backgroundColor: '#f8fafc', 
                border: isMeetingLink ? (isInputValid ? '2px solid #10b981' : '2px solid #ef4444') : '2px solid #e2e8f0', 
                color: '#0f172a', padding: '14px 16px',
                borderRadius: '12px', fontSize: '15px', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={e => {
                if (!isMeetingLink) e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={e => {
                if (!isMeetingLink) e.target.style.borderColor = '#e2e8f0';
              }}
              autoFocus
            />
            {isMeetingLink && (
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: isInputValid ? '#10b981' : '#ef4444',
                marginTop: '4px',
                display: 'block'
              }}>
                {isInputValid ? '✅ Valid meeting link' : `❌ ${validationError}`}
              </span>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: config.type !== 'prompt' ? '8px' : '0' }}>
          {config.type !== 'alert' && (
            <button 
              type="button"
              onClick={handleCancel}
              style={{ 
                background: '#f1f5f9', border: 'none', color: '#475569', 
                padding: '10px 20px', borderRadius: '12px', fontWeight: '700', 
                cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit"
            className="enrol-cta coral"
            disabled={isMeetingLink && !isInputValid}
            style={{ 
              margin: 0, 
              padding: '10px 28px', 
              borderRadius: '12px', 
              boxShadow: (isMeetingLink && !isInputValid) ? 'none' : '0 4px 14px 0 rgba(251, 146, 60, 0.39)',
              opacity: (isMeetingLink && !isInputValid) ? 0.5 : 1,
              cursor: (isMeetingLink && !isInputValid) ? 'not-allowed' : 'pointer',
              border: 'none',
              color: '#ffffff'
            }}
          >
            {config.type === 'alert' ? 'Got it' : (config.confirmText || 'Confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
