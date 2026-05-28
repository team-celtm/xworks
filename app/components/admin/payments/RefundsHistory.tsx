import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/apiClient';

export default function RefundsHistory() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We are re-using the transactions endpoint filtered by refunded status
    fetchApi('/api/admin/transactions?status=refunded,partially_refunded')
      .then(res => res.json())
      .then(data => {
        if (data.transactions) setRefunds(data.transactions);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div className="dashboard-loader"></div></div>;
  }

  return (
    <div className="admin-card">
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)' }}>Refunds History</h3>
        <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Monitor approved, processed, and failed refunds.</p>
      </div>

      {refunds.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">💸</div>
          <div className="admin-empty-text">No refunds have been processed yet.</div>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Order ID</th>
                <th>Refund Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map(r => (
                <tr key={r.id}>
                  <td data-label="Date">{new Date(r.created_at).toLocaleString()}</td>
                  <td data-label="User">
                    <div style={{ fontWeight: 600 }}>{r.user_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.user_email}</div>
                  </td>
                  <td data-label="Order ID" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.razorpay_order_id}</td>
                  <td data-label="Refund Amount" style={{ fontWeight: 600, color: 'var(--red)' }}>
                    - ₹{parseFloat(r.amount).toLocaleString()}
                  </td>
                  <td data-label="Status">
                    <span className="admin-badge success">Refunded</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
