import React, { useState, useEffect } from 'react';

export default function PaymentFilters({ filters, setFilters }: { filters: any, setFilters: any }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Debounce the search input so we don't spam the API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      if (filters.search !== localSearch) {
        setFilters((prev: any) => ({ ...prev, search: localSearch, page: 1 }));
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [localSearch, filters.search, setFilters]);

  // Sync local search when filters are cleared externally
  useEffect(() => {
    if (filters.search === '') {
      setLocalSearch('');
    }
  }, [filters.search]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, page: 1 });
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
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="admin-label">Status</label>
        <select 
          name="status"
          className="v-input prompt-input"
          value={filters.status || ''}
          onChange={handleSelectChange}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
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
          onChange={handleSelectChange}
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
          onChange={handleSelectChange}
        />
      </div>
      <div className="form-group">
        <label className="admin-label">To Date</label>
        <input 
          type="date" 
          name="to"
          className="v-input prompt-input" 
          value={filters.to || ''}
          onChange={handleSelectChange}
        />
      </div>
      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button 
          className="admin-btn qa-btn" 
          style={{ width: '100%' }}
          onClick={() => {
            setLocalSearch('');
            setFilters({ search: '', status: '', method: '', from: '', to: '', page: 1 });
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
