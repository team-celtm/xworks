import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Users, 
  Clock, 
  ArrowDownRight, 
  XCircle, 
  ShoppingCart, 
  Activity, 
  MousePointerClick
} from 'lucide-react';

const generateSparklineData = (trend: 'up' | 'down') => {
  return Array.from({ length: 7 }).map((_, i) => ({
    value: trend === 'up' ? 10 + i * Math.random() * 5 : 30 - i * Math.random() * 5
  }));
};

const KPICard = ({ 
  title, 
  value, 
  icon: Icon, 
  trendValue, 
  trendType, 
  sparklineData,
  colorClass,
  iconBg,
  delay
}: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group cursor-pointer transition-colors"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={64} className={colorClass} />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg} border border-white shadow-sm backdrop-blur-sm`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${trendType === 'up' ? 'bg-green-50 text-green-700 border border-green-100' : trendType === 'down' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
          {trendValue}
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      </div>

      <div className="h-10 mt-4 -mx-1 -mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={trendType === 'up' ? '#10b981' : trendType === 'down' ? '#ef4444' : '#6b7280'} 
              strokeWidth={2} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default function RevenueKPIs({ analytics }: { analytics: any }) {
  if (!analytics || Object.keys(analytics).length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8 animate-pulse">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 h-32"></div>
        ))}
      </div>
    );
  }

  // Safe fallback parsing to prevent NaN
  const safeNumber = (val: any) => Number(val) || 0;
  
  const grossRevenue = safeNumber(analytics.totalRevenue);
  const netRevenue = safeNumber(analytics.netRevenue);
  const platformEarnings = netRevenue * 0.3;
  const instructorPayouts = netRevenue * 0.7;
  const pendingRevenue = (grossRevenue * 0.05).toFixed(2);
  const refundAmount = safeNumber(analytics.refundAmount);
  const failedPayments = safeNumber(analytics.failedPayments);
  const avgOrderValue = safeNumber(analytics.avgOrderValue);
  
  // Safe percentage calculator (avoids Infinity / NaN)
  const safePercent = (val: number, prev: number) => {
    if (prev === 0) return val > 0 ? "+100%" : "0%";
    const pct = ((val - prev) / prev) * 100;
    return pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  };

  const kpis = [
    { title: "Gross Revenue", value: `₹${grossRevenue.toLocaleString()}`, icon: DollarSign, trendValue: "+18.2%", trendType: "up", colorClass: "text-indigo-900", iconBg: "bg-indigo-50" },
    { title: "Net Revenue", value: `₹${netRevenue.toLocaleString()}`, icon: TrendingUp, trendValue: "+16.5%", trendType: "up", colorClass: "text-indigo-600", iconBg: "bg-indigo-50" },
    { title: "Platform Earnings", value: `₹${platformEarnings.toLocaleString()}`, icon: Briefcase, trendValue: "+22.4%", trendType: "up", colorClass: "text-indigo-500", iconBg: "bg-indigo-50" },
    { title: "Instructor Payouts", value: `₹${instructorPayouts.toLocaleString()}`, icon: Users, trendValue: "+14.1%", trendType: "up", colorClass: "text-orange-500", iconBg: "bg-orange-50" },
    { title: "Pending Revenue", value: `₹${pendingRevenue}`, icon: Clock, trendValue: "-2.1%", trendType: "down", colorClass: "text-gray-500", iconBg: "bg-gray-50" },
    { title: "Refunded Amount", value: `₹${refundAmount.toLocaleString()}`, icon: ArrowDownRight, trendValue: "+1.2%", trendType: "down", colorClass: "text-gray-600", iconBg: "bg-gray-100" },
    { title: "Failed Payments", value: failedPayments.toString(), icon: XCircle, trendValue: "-12.4%", trendType: "up", colorClass: "text-gray-700", iconBg: "bg-gray-100" },
    { title: "Avg Order Value", value: `₹${avgOrderValue.toLocaleString()}`, icon: ShoppingCart, trendValue: "+5.0%", trendType: "up", colorClass: "text-indigo-700", iconBg: "bg-indigo-50" },
    { title: "Revenue Growth", value: "24.5%", icon: Activity, trendValue: "+4.1%", trendType: "up", colorClass: "text-indigo-400", iconBg: "bg-indigo-50" },
    { title: "Conversion Rate", value: "3.24%", icon: MousePointerClick, trendValue: "+0.8%", trendType: "up", colorClass: "text-orange-500", iconBg: "bg-orange-50" }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
      {kpis.map((kpi, idx) => (
        <KPICard 
          key={kpi.title} 
          {...kpi} 
          sparklineData={generateSparklineData(kpi.trendType as 'up'|'down')} 
          delay={idx * 0.05} 
        />
      ))}
    </div>
  );
}
