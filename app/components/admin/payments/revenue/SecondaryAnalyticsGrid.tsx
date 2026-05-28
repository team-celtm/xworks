import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';

export default function SecondaryAnalyticsGrid({ deepAnalytics }: { deepAnalytics?: any }) {
  // Use real data from API if available, otherwise fallback to empty state
  const categoryData = deepAnalytics?.categoryData && deepAnalytics.categoryData.length > 0 
    ? deepAnalytics.categoryData.map((d: any, i: number) => ({
        ...d,
        color: ['#312e81', '#4f46e5', '#fb923c', '#a855f7', '#818cf8'][i % 5]
      }))
    : [];

  const paymentMethodData = deepAnalytics?.paymentMethodData && deepAnalytics.paymentMethodData.length > 0
    ? deepAnalytics.paymentMethodData.map((d: any, i: number) => ({
        ...d,
        color: ['#4f46e5', '#fb923c', '#312e81', '#a855f7'][i % 4]
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* Revenue by Category - Horizontal Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue by Category</h3>
        <div className="h-[250px] w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontWeight: 600, fontSize: 13 }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={24}>
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm font-semibold text-gray-500">No category sales yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Payment Methods - Donut */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Methods</h3>
        <div className="h-[200px] w-full relative">
          {paymentMethodData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentMethodData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Share']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-gray-900">
                  {Math.round((paymentMethodData[0].value / paymentMethodData.reduce((acc: number, val: any) => acc + val.value, 0)) * 100)}%
                </span>
                <span className="text-xs font-semibold text-gray-500">{paymentMethodData[0].name} (Top)</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 m-auto w-32 h-32 rounded-full border-[16px] border-gray-100 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-gray-400">0%</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No Data</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-y-3 mt-4">
          {paymentMethodData.map((method: any) => (
            <div key={method.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }}></div>
              <span className="text-sm font-medium text-gray-600">{method.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Revenue Split Widget */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2 flex flex-col justify-center"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Split</h3>
        <div className="w-full h-8 flex rounded-full overflow-hidden mb-4 shadow-inner bg-gray-100">
          {(deepAnalytics?.revenueSplit?.platformAbs || 0) > 0 || (deepAnalytics?.revenueSplit?.instructorAbs || 0) > 0 ? (
            <>
              <div className="bg-indigo-900 h-full flex items-center justify-center text-xs font-bold text-white transition-all hover:opacity-90" style={{ width: `${deepAnalytics?.revenueSplit?.platform || 30}%` }} title={`Platform Share (${deepAnalytics?.revenueSplit?.platform?.toFixed(1) || 30}%)`}>{(deepAnalytics?.revenueSplit?.platform || 30).toFixed(0)}%</div>
              <div className="h-full flex items-center justify-center text-xs font-bold text-white transition-all hover:opacity-90" style={{ width: `${deepAnalytics?.revenueSplit?.instructors || 60}%`, backgroundColor: '#FB923C' }} title={`Instructor Share (${deepAnalytics?.revenueSplit?.instructors?.toFixed(1) || 60}%)`}>{(deepAnalytics?.revenueSplit?.instructors || 60).toFixed(0)}%</div>
              <div className="bg-indigo-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all hover:opacity-90" style={{ width: `${deepAnalytics?.revenueSplit?.taxes || 7}%` }} title={`Taxes (${deepAnalytics?.revenueSplit?.taxes?.toFixed(1) || 7}%)`}>{(deepAnalytics?.revenueSplit?.taxes || 7).toFixed(0)}%</div>
              <div className="bg-gray-300 h-full flex items-center justify-center text-xs font-bold text-gray-600 transition-all hover:opacity-90" style={{ width: `${deepAnalytics?.revenueSplit?.pending || 3}%` }} title={`Pending (${deepAnalytics?.revenueSplit?.pending?.toFixed(1) || 3}%)`}>{(deepAnalytics?.revenueSplit?.pending || 3).toFixed(0)}%</div>
            </>
          ) : (
            <div className="bg-gray-200 h-full flex items-center justify-center text-xs font-bold text-gray-500 w-full">Awaiting Sales Data</div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 justify-between">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-900"></div><span className="text-sm font-medium text-gray-600">Platform ({(deepAnalytics?.revenueSplit?.platform || 30).toFixed(1)}%)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FB923C' }}></div><span className="text-sm font-medium text-gray-600">Instructors ({(deepAnalytics?.revenueSplit?.instructors || 60).toFixed(1)}%)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="text-sm font-medium text-gray-600">Taxes ({(deepAnalytics?.revenueSplit?.taxes || 7).toFixed(1)}%)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-300"></div><span className="text-sm font-medium text-gray-600">Pending ({(deepAnalytics?.revenueSplit?.pending || 3).toFixed(1)}%)</span></div>
        </div>
      </motion.div>

      {/* AI Forecasting */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-md p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="flex items-center gap-2 mb-4 text-indigo-200">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wider">AI Forecast</span>
        </div>
        <h3 className="text-3xl font-extrabold mb-1">
          {deepAnalytics?.forecast?.predicted > 0 ? `₹${deepAnalytics.forecast.predicted.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
        </h3>
        <p className="text-indigo-200 text-sm mb-6 font-medium">
          {deepAnalytics?.forecast?.predicted > 0 ? 'Predicted revenue for next 30 days' : 'Insufficient historical data for forecasting.'}
        </p>
        
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-indigo-100 font-medium">Confidence Score</span>
            <span className="text-sm font-bold text-green-400">{deepAnalytics?.forecast?.confidence || 92}% High</span>
          </div>
          <div className="w-full bg-indigo-950/50 rounded-full h-2">
            <div className="bg-gradient-to-r from-emerald-400 to-green-300 h-2 rounded-full" style={{ width: `${deepAnalytics?.forecast?.confidence || 92}%` }}></div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
