import React, { useState } from 'react';

export interface ActionModalState {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  inputPlaceholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

export default function ActionModal({
  config,
  onClose
}: {
  config: ActionModalState;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');

  if (!config.isOpen) return null;

  const handleConfirm = () => {
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--surface)', padding: '24px', borderRadius: '16px',
        width: '400px', maxWidth: '90%', border: '1px solid var(--border-md)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{config.title}</h3>
        <p style={{ color: 'var(--text-3)', marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>{config.message}</p>
        
        {config.type === 'prompt' && (
          <input 
            type="text" 
            className="prompt-input" 
            placeholder={config.inputPlaceholder || 'Enter value...'}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            style={{ width: '100%', marginBottom: '24px', backgroundColor: '#fff', borderColor: '#d1d5db', color: '#111827' }}
            autoFocus
          />
        )}
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: config.type !== 'prompt' ? '24px' : '0' }}>
          {config.type !== 'alert' && (
            <button 
              onClick={handleCancel}
              style={{ background: 'transparent', border: '1px solid var(--border-md)', color: 'var(--text-2)', padding: '8px 16px', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleConfirm}
            className="enrol-cta coral"
            style={{ margin: 0, padding: '8px 24px', borderRadius: '100px' }}
          >
            {config.type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
