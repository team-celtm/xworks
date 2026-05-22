import React from 'react';

export default function PaymentFilters({ filters, setFilters }: { filters: any, setFilters: any }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="admin-filters-grid" style={{ marginBottom: '24px' }}>
      <div className="form-group">
        <label className="admin-label">Search</label>
        <input 
          type="text" 
          name="search"
          className="v-input prompt-input" 
          placeholder="Name, email, order ID..."
          value={filters.search || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label className="admin-label">Status</label>
        <select 
          name="status"
          className="v-input prompt-input"
          value={filters.status || ''}
          onChange={handleChange}
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>
      </div>
      <div className="form-group">
        <label className="admin-label">Method</label>
        <select 
          name="method"
          className="v-input prompt-input"
          value={filters.method || ''}
          onChange={handleChange}
        >
          <option value="">All Methods</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Netbanking</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>
      <div className="form-group">
        <label className="admin-label">From Date</label>
        <input 
          type="date" 
          name="from"
          className="v-input prompt-input" 
          value={filters.from || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label className="admin-label">To Date</label>
        <input 
          type="date" 
          name="to"
          className="v-input prompt-input" 
          value={filters.to || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button 
          className="admin-btn qa-btn" 
          style={{ width: '100%' }}
          onClick={() => setFilters({ search: '', status: '', method: '', from: '', to: '', page: 1 })}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
