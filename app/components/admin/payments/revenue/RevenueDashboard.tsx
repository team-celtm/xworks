import React from 'react';
import RevenueCommandBar from './RevenueCommandBar';
import RevenueKPIs from './RevenueKPIs';
import MainRevenueChart from './MainRevenueChart';
import SecondaryAnalyticsGrid from './SecondaryAnalyticsGrid';
import InsightsEngine from './InsightsEngine';
import Leaderboards from './Leaderboards';
import LiveActivityFeed from './LiveActivityFeed';

export default function RevenueDashboard({ analytics, chartData, deepAnalytics }: { analytics: any, chartData?: any[], deepAnalytics?: any }) {
  // Edge Case: Broken API or Empty Dataset
  if (!analytics || Object.keys(analytics).length === 0) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Syncing Financial Data</h2>
        <p className="text-gray-500 text-center max-w-md">Waiting for transaction data and calculating live metrics. If this takes too long, please check your network connection.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ background: '#f9fafb' }}>
      {/* 1. Command Bar */}
      <RevenueCommandBar />

      {/* 2. Main KPIs Grid */}
      <RevenueKPIs analytics={analytics} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          {/* 3. Main Chart Area */}
          <MainRevenueChart chartData={chartData || []} />

          {/* 4. Secondary Grid (Category, Heatmap, Forecast) */}
          <SecondaryAnalyticsGrid deepAnalytics={deepAnalytics} />

          {/* 5. Smart Insights */}
          <InsightsEngine deepAnalytics={deepAnalytics} />

          {/* 6. Leaderboards */}
          <Leaderboards deepAnalytics={deepAnalytics} />
        </div>

        <div className="xl:col-span-1">
          {/* 7. Live Activity Feed (Sticky side panel on desktop) */}
          <div className="sticky top-8">
            <LiveActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
