"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Wallet, CreditCard, DollarSign, Activity, AlertCircle, FileText
} from 'lucide-react';

export default function EarningsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Payout Management State
  const [payouts, setPayouts] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifsc: '' });
  const [payoutStatus, setPayoutStatus] = useState<{ loading: boolean, error: string | null, success: string | null }>({ loading: false, error: null, success: null });

  const fetchPayouts = () => {
    fetch('/api/instructor/payouts')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPayouts(d.payouts);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetch('/api/instructor/stats')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
      
    fetchPayouts();
  }, []);

  if (loading) {
    return (
      <div className="view active fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="section-label">Creator Studio</div>
        <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Earnings Dashboard
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '140px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          ))}
        </div>
        <div style={{ height: '300px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-md)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      </div>
    );
  }

  if (!data) {
    return <div>Failed to load data.</div>;
  }

  const { stats, charts, transactions } = data;

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const safeStats = {
    net_earnings: Number(stats?.net_earnings || 0),
    pending_payout: Number(stats?.pending_payout || 0),
    total_students: Number(stats?.total_students || 0),
    total_sales: Number(stats?.total_sales || 0),
    platform_fee: Number(stats?.platform_fee || 0),
    refund_amount: Number(stats?.refund_amount || 0)
  };

  const statCards = [
    { title: "Net Earnings", value: `₹ ${safeStats.net_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: <Wallet size={20} color="#10b981" />, bg: "rgba(16, 185, 129, 0.1)" },
    { title: "Pending Payout", value: `₹ ${safeStats.pending_payout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: <DollarSign size={20} color="#3b82f6" />, bg: "rgba(59, 130, 246, 0.1)" },
    { title: "Total Students", value: safeStats.total_students.toLocaleString(), icon: <Users size={20} color="#f97316" />, bg: "rgba(249, 115, 22, 0.1)" },
    { title: "Total Sales", value: safeStats.total_sales.toLocaleString(), icon: <CreditCard size={20} color="#8b5cf6" />, bg: "rgba(139, 92, 246, 0.1)" },
    { title: "Platform Fees (20%)", value: `₹ ${safeStats.platform_fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: <Activity size={20} color="#ef4444" />, bg: "rgba(239, 68, 68, 0.1)" },
    { title: "Refunds", value: `₹ ${safeStats.refund_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: <AlertCircle size={20} color="#64748b" />, bg: "rgba(100, 116, 139, 0.1)" },
  ];

  return (
    <motion.div 
      className="view active" 
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div>
        <div className="section-label">Creator Studio</div>
        <div className="section-title" style={{ fontFamily: "var(--font-d)", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", color: 'var(--ink)' }}>
          Earnings Dashboard
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {statCards.map((card, i) => (
          <motion.div 
            key={i} 
            variants={itemVariants}
            style={{ 
              padding: '24px', background: 'var(--surface)', borderRadius: '20px', 
              border: '1px solid var(--border-md)', display: 'flex', flexDirection: 'column', gap: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}
            whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.title}</div>
            </div>
            <div style={{ color: 'var(--ink)', fontSize: '28px', fontWeight: '900', fontFamily: 'var(--font-d)' }}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#3b82f6" /> 30-Day Revenue Trend
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-md)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue'] as any}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#f97316" /> Top Performing Courses
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.coursePerformance} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-md)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <YAxis dataKey="name" type="category" stroke="var(--text-2)" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--surface-hover)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue'] as any}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Advanced Analytics Section */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#8b5cf6" /> Revenue Split
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>XWORKS uses an 80/20 revenue split for instructors.</p>
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Your Net Earnings', value: safeStats.net_earnings },
                    { name: 'XWORKS Platform Fee', value: safeStats.platform_fee },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <RechartsTooltip formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Amount'] as any} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#f97316" /> Course Earnings Breakdown
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ink)', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-md)', color: 'var(--text-3)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 8px' }}>Course</th>
                  <th style={{ padding: '12px 8px' }}>Sales</th>
                  <th style={{ padding: '12px 8px' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {charts.coursePerformance.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-sm)', fontSize: '14px' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-2)' }}>{c.sales}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#10b981' }}>₹{c.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {charts.coursePerformance.length === 0 && (
               <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>No course earnings yet.</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#64748b" /> Recent Transactions
        </h3>
        
        {transactions.length === 0 ? (
          <div style={{ padding: '40px', border: '2px dashed var(--border-md)', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <img src="https://illustrations.popsy.co/amber/freelancer.svg" alt="No earnings" style={{ width: '200px' }} />
            <p style={{ color: 'var(--text-3)', fontSize: '16px', fontWeight: 'bold' }}>No transactions yet. Publish a course to start earning!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ink)', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-md)', color: 'var(--text-3)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 8px' }}>Course</th>
                  <th style={{ padding: '16px 8px' }}>Student</th>
                  <th style={{ padding: '16px 8px' }}>Date</th>
                  <th style={{ padding: '16px 8px' }}>Gross</th>
                  <th style={{ padding: '16px 8px' }}>Platform Fee</th>
                  <th style={{ padding: '16px 8px' }}>Net Earnings</th>
                  <th style={{ padding: '16px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-sm)', fontSize: '14px' }}>
                    <td style={{ padding: '16px 8px', fontWeight: '600' }}>{tx.courseName}</td>
                    <td style={{ padding: '16px 8px', color: 'var(--text-2)' }}>{tx.studentName}</td>
                    <td style={{ padding: '16px 8px', color: 'var(--text-3)' }}>{new Date(tx.enrolledAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 8px', color: 'var(--text-2)' }}>₹{tx.grossAmount.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px', color: '#ef4444' }}>- ₹{tx.platformFee.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px', fontWeight: 'bold', color: '#10b981' }}>₹{tx.instructorShare.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize',
                        background: tx.status === 'successful' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: tx.status === 'successful' ? '#10b981' : '#ef4444'
                      }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Payouts Management Section */}
      <motion.div variants={itemVariants} style={{ padding: '24px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} color="#10b981" /> Payout Management
          </h3>
          <button 
            onClick={() => setShowWithdrawModal(true)}
            style={{ 
              background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '12px', 
              fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' 
            }}
          >
            Request Withdrawal
          </button>
        </div>

        {payouts.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>No payout requests yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ink)', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-md)', color: 'var(--text-3)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 8px' }}>Date</th>
                  <th style={{ padding: '16px 8px' }}>Amount</th>
                  <th style={{ padding: '16px 8px' }}>Bank Account</th>
                  <th style={{ padding: '16px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-sm)', fontSize: '14px' }}>
                    <td style={{ padding: '16px 8px', color: 'var(--text-2)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>₹{p.amount.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px', color: 'var(--text-3)' }}>{p.bankDetails.accountNumber.slice(-4).padStart(p.bankDetails.accountNumber.length, '*')}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize',
                        background: p.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : p.status === 'Failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: p.status === 'Paid' ? '#10b981' : p.status === 'Failed' ? '#ef4444' : '#3b82f6'
                      }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ 
              background: 'var(--surface)', padding: '32px', borderRadius: '24px', 
              width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '8px' }}>Request Payout</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '24px' }}>Available Balance: <strong>₹{safeStats.pending_payout.toFixed(2)}</strong></p>
            
            {payoutStatus.error && <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{payoutStatus.error}</div>}
            {payoutStatus.success && <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{payoutStatus.success}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="number" placeholder="Amount (₹)" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--ink)', width: '100%' }} />
              <input type="text" placeholder="Account Holder Name" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--ink)', width: '100%' }} />
              <input type="text" placeholder="Account Number" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--ink)', width: '100%' }} />
              <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value})} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--ink)', width: '100%' }} />
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  onClick={() => setShowWithdrawModal(false)}
                  style={{ flex: 1, padding: '12px', background: 'var(--border-sm)', color: 'var(--ink)', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setPayoutStatus({ loading: true, error: null, success: null });
                    try {
                      const res = await fetch('/api/instructor/payouts', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: Number(withdrawAmount), bankDetails })
                      });
                      const d = await res.json();
                      if (d.success) {
                        setPayoutStatus({ loading: false, error: null, success: 'Payout requested!' });
                        fetchPayouts(); // refresh
                        setTimeout(() => setShowWithdrawModal(false), 1500);
                      } else {
                        setPayoutStatus({ loading: false, error: d.error || 'Failed to request payout', success: null });
                      }
                    } catch (e) {
                      setPayoutStatus({ loading: false, error: 'Network error', success: null });
                    }
                  }}
                  disabled={payoutStatus.loading || !withdrawAmount || Number(withdrawAmount) > safeStats.pending_payout}
                  style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: (payoutStatus.loading || !withdrawAmount || Number(withdrawAmount) > safeStats.pending_payout) ? 0.5 : 1 }}
                >
                  {payoutStatus.loading ? 'Requesting...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
