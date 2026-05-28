import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function InsightsEngine({ deepAnalytics }: { deepAnalytics?: any }) {
  const defaultInsights = [
    { icon: TrendingUp, text: "Revenue increased 24% compared to last week", type: "positive", color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: Clock, text: "Most purchases happen after 8 PM IST", type: "neutral", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: AlertTriangle, text: "Refund spike detected in Design category", type: "warning", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Lightbulb, text: "UPI transactions convert 31% better than Cards", type: "positive", color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  const mapIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'alert': return AlertTriangle;
      case 'info': return Lightbulb;
      default: return TrendingUp;
    }
  };

  const mapColor = (type: string) => {
    switch (type) {
      case 'trend': return { color: "text-emerald-600", bg: "bg-emerald-50" };
      case 'alert': return { color: "text-amber-600", bg: "bg-amber-50" };
      case 'info': return { color: "text-indigo-600", bg: "bg-indigo-50" };
      default: return { color: "text-blue-600", bg: "bg-blue-50" };
    }
  };

  const insights = deepAnalytics?.insights?.length > 0 
    ? deepAnalytics.insights.map((insight: any) => ({
        icon: mapIcon(insight.type),
        text: insight.text,
        ...mapColor(insight.type)
      }))
    : defaultInsights;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Lightbulb className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Smart Insights Engine</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight: any, idx: number) => {
          const Icon = insight.icon;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + idx * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl border border-gray-100 shadow-sm transition-colors hover:bg-gray-50`}
            >
              <div className={`p-2.5 rounded-full ${insight.bg} ${insight.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-700 leading-snug pt-1">{insight.text}</p>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  );
}
