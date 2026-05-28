import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueCards({ analytics, chartData, deepAnalytics }: { analytics: any, chartData?: any[], deepAnalytics?: any }) {
  if (!analytics) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Chart Section */}
      {chartData && chartData.length > 0 && (
        <div className="admin-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--indigo-dark)', marginBottom: '24px' }}>
            Daily Revenue Trends
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--indigo)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--indigo)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-3)' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-3)' }}
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                  dx={-10}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-md)" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: 'var(--text-3)', fontWeight: 600, marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--indigo)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metrics Section */}
      <div className="overview-grid">
        <div className="overview-card">
          <span className="overview-icon">💰</span>
          <span className="overview-label">Total Revenue</span>
          <span className="overview-value">₹{analytics.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="overview-card">
          <span className="overview-icon">📈</span>
          <span className="overview-label">Net Revenue</span>
          <span className="overview-value">₹{analytics.netRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="overview-card">
          <span className="overview-icon">💸</span>
          <span className="overview-label">Refunded Amount</span>
          <span className="overview-value">₹{analytics.refundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="overview-card">
          <span className="overview-icon">📊</span>
          <span className="overview-label">Avg Order Value</span>
          <span className="overview-value">₹{analytics.avgOrderValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="overview-card">
          <span className="overview-icon">❌</span>
          <span className="overview-label">Failed Payments</span>
          <span className="overview-value">{analytics.failedPayments || 0}</span>
        </div>
        <div className="overview-card">
          <span className="overview-icon">📉</span>
          <span className="overview-label">Refund Rate</span>
          <span className="overview-value">{analytics.refundRate?.toFixed(1) || '0.0'}%</span>
        </div>
      </div>

      {/* Deep Analytics Section */}
      {deepAnalytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
          
          <div className="admin-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ink)', marginBottom: '16px' }}>Top Selling Courses</h3>
            {deepAnalytics.topCourses?.map((course: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{course.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{course.enrollments} enrollments</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--green)' }}>₹{parseFloat(course.revenue || '0').toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="admin-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ink)', marginBottom: '16px' }}>Instructor Leaderboard</h3>
            {deepAnalytics.instructorLeaderboard?.map((inst: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{inst.first_name} {inst.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Total Generated: ₹{parseFloat(inst.total_generated || '0').toLocaleString()}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--indigo)' }}>Cut: ₹{parseFloat(inst.instructor_cut || '0').toLocaleString()}</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
