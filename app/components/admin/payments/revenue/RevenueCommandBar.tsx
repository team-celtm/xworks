import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Filter, ChevronDown } from 'lucide-react';

export default function RevenueCommandBar() {
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(`${Math.floor(Math.random() * 59) + 1} seconds ago`);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated('Just now');
    }, 1000);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-gray-200/50 pb-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
          Revenue Analytics
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700">Live Syncing</span>
          </div>
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          Monitor platform revenue, refunds, payment trends, and financial performance in real time.
        </p>
        <p className="text-xs text-gray-400 mt-1">Updated {lastUpdated}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Date Selector */}
        <div className="relative group">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            Last 30 Days
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="relative group">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            Filters
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 mx-1"></div>

        {/* Actions */}
        <button className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm" title="Export CSV">
          <Download className="w-4 h-4" />
        </button>
        
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          style={{ backgroundColor: '#FB923C' }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
