import React from 'react';

export default function PaymentStatusBadge({ status }: { status: string }) {
  let cls = 'admin-badge';
  let label = status || 'pending';

  switch(label.toLowerCase()) {
    case 'paid':
    case 'success':
      cls += ' success';
      label = 'Paid';
      break;
    case 'failed':
      cls += ' danger';
      label = 'Failed';
      break;
    case 'refunded':
      cls += ' warning';
      label = 'Refunded';
      break;
    case 'partially_refunded':
      cls += ' warning';
      label = 'Partial Refund';
      break;
    default:
      cls += ' pending';
      label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  return <span className={cls}>{label}</span>;
}
