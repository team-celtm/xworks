import React, { useState, useEffect } from 'react';
import { Calendar, Download, RefreshCw, Filter, ChevronDown } from 'lucide-react';

export default function RevenueCommandBar() {
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [reportType, setReportType] = useState('revenue');
  const [exportFormat, setExportFormat] = useState('csv');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

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

        {/* Export Button */}
        <button 
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm" 
          title="Export Reports"
        >
          <Download className="w-4 h-4 text-gray-500" />
          Export Reports
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

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4 text-left">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Export Platform Report</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Report Type</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="revenue">Revenue Report</option>
                  <option value="instructors">Instructors Report</option>
                  <option value="enrollments">Enrollments Report</option>
                  <option value="attendance">Live Attendance Report</option>
                  <option value="completions">Course Completions Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Export Format</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                    <input type="radio" name="exportFormat" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} className="accent-indigo-600" />
                    CSV Spreadsheet
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                    <input type="radio" name="exportFormat" checked={exportFormat === 'pdf'} onChange={() => setExportFormat('pdf')} className="accent-indigo-600" />
                    PDF Document
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                  <input 
                    type="date" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                  <input 
                    type="date" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  window.open(`/api/admin/reports/export?type=${reportType}&format=${exportFormat}&from=${fromDate}&to=${toDate}`, '_blank');
                  setShowExportModal(false);
                }}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
