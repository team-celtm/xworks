import React from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

export default function PaymentDetails({ payment, onClose, onRefund }: { payment: any, onClose: () => void, onRefund: (id: string, amount: string) => void }) {
  if (!payment) return null;

  const [refundAmount, setRefundAmount] = React.useState(payment.amount);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="admin-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-3)' }}
        >
          ✕
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--ink)' }}>Transaction Details</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="admin-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Download Invoice (PDF)</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div className="admin-label">Order ID</div>
            <div style={{ fontFamily: 'monospace' }}>{payment.razorpay_order_id || 'N/A'}</div>
          </div>
          <div>
            <div className="admin-label">Payment ID</div>
            <div style={{ fontFamily: 'monospace' }}>{payment.razorpay_payment_id || 'N/A'}</div>
          </div>
          <div>
            <div className="admin-label">Status</div>
            <div><PaymentStatusBadge status={payment.payment_status || payment.status} /></div>
          </div>
          <div>
            <div className="admin-label">Date</div>
            <div>{new Date(payment.created_at).toLocaleString()}</div>
          </div>
          {payment.risk_score !== undefined && (
            <div>
              <div className="admin-label">Fraud Risk Score</div>
              <div style={{ fontWeight: 600, color: payment.risk_score > 70 ? 'var(--red)' : 'var(--green)' }}>{payment.risk_score}/100</div>
            </div>
          )}
          {payment.ip_address && (
            <div>
              <div className="admin-label">IP Address</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{payment.ip_address}</div>
            </div>
          )}
        </div>

        <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--ink)' }}>Financials</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-3)' }}>Gross Amount:</span>
            <span style={{ fontWeight: 600 }}>₹{parseFloat(payment.amount).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-3)' }}>Gateway Fee:</span>
            <span style={{ color: 'var(--red)' }}>- ₹{parseFloat(payment.gateway_fee || '0').toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-3)' }}>Tax:</span>
            <span style={{ color: 'var(--red)' }}>- ₹{parseFloat(payment.tax_amount || '0').toLocaleString()}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-md)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Net Revenue:</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>₹{parseFloat(payment.net_amount || payment.amount).toLocaleString()}</span>
          </div>
        </div>

        {payment.metadata && (
          <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--ink)' }}>Gateway Metadata</h3>
            <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text-3)', fontFamily: 'monospace' }}>
              {JSON.stringify(payment.metadata, null, 2)}
            </pre>
          </div>
        )}

        {(payment.payment_status === 'paid' || payment.payment_status === 'success' || payment.payment_status === 'partially_refunded') && (
          <div style={{ background: '#FFF1F2', padding: '16px', borderRadius: '12px', border: '1px solid #FECDD3' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#BE123C' }}>Issue Refund</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="number" 
                className="v-input prompt-input"
                style={{ background: '#fff', flex: 1 }}
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                max={payment.amount}
              />
              <button 
                className="admin-btn admin-btn-danger"
                onClick={() => onRefund(payment.id, refundAmount)}
              >
                Process Refund
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#BE123C', marginTop: '8px' }}>
              Max refundable: ₹{parseFloat(payment.amount).toLocaleString()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
