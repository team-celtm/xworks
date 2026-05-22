import React from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

export default function TransactionTable({ payments, onViewDetails }: { payments: any[], onViewDetails: (p: any) => void }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">💳</div>
        <div className="admin-empty-text">No transactions found matching your criteria.</div>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Order ID</th>
            <th>Student</th>
            <th>Course</th>
            <th>Amount</th>
            <th>Net</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td data-label="Date">{new Date(p.created_at).toLocaleDateString()}</td>
              <td data-label="Order ID" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.razorpay_order_id || 'N/A'}</td>
              <td data-label="Student">
                <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{p.email}</div>
              </td>
              <td data-label="Course">{p.course_name || 'Unknown Course'}</td>
              <td data-label="Amount" style={{ fontWeight: 600 }}>₹{parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td data-label="Net">₹{p.net_amount ? parseFloat(p.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
              <td data-label="Status">
                <PaymentStatusBadge status={p.payment_status || p.status} />
              </td>
              <td data-label="Actions">
                <button 
                  className="admin-btn admin-btn-primary"
                  onClick={() => onViewDetails(p)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
