import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, RefreshCcw, XCircle, DollarSign, WifiOff, Loader2, Activity } from 'lucide-react';

const mockNames = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Gupta', 'Vikram Singh', 'Anjali Desai'];
const mockCourses = ['Full Stack React Masterclass', 'UI/UX Design Bootcamp', 'Advanced Python Programming', 'Data Science Fundamentals'];

const generateRandomEvent = () => {
  const typeRand = Math.random();
  let type: 'purchase' | 'refund' | 'failed' | 'payout' = 'purchase';
  if (typeRand > 0.8) type = 'refund';
  else if (typeRand > 0.9) type = 'failed';
  else if (typeRand > 0.95) type = 'payout';

  return {
    id: Math.random().toString(36).substr(2, 9) + Date.now(),
    type,
    user: mockNames[Math.floor(Math.random() * mockNames.length)],
    course: mockCourses[Math.floor(Math.random() * mockCourses.length)],
    amount: type === 'payout' ? Math.floor(Math.random() * 50000) + 10000 : Math.floor(Math.random() * 5000) + 999,
    time: new Date()
  };
};

export default function LiveActivityFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>('connected');
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    let timeout: any;
    
    const fetchLiveFeed = async () => {
      try {
        const res = await fetch('/api/admin/revenue/live-feed');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
          setConnectionStatus('connected');
          setErrorCount(0); // Reset on success
        }
      } catch (err) {
        console.error('Failed to fetch live feed', err);
        setConnectionStatus('reconnecting');
        setErrorCount(prev => prev + 1);
      }
      
      // Calculate backoff time: 5s, 10s, 20s... max 30s
      const nextDelay = errorCount === 0 ? 5000 : Math.min(30000, 5000 * Math.pow(2, errorCount - 1));
      timeout = setTimeout(fetchLiveFeed, nextDelay);
    };

    fetchLiveFeed(); // Initial fetch

    return () => clearTimeout(timeout);
  }, [errorCount, setConnectionStatus]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'refund': return <RefreshCcw className="w-4 h-4 text-amber-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'payout': return <DollarSign className="w-4 h-4 text-indigo-600" />;
      default: return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-emerald-50 border-emerald-100';
      case 'refund': return 'bg-amber-50 border-amber-100';
      case 'failed': return 'bg-red-50 border-red-100';
      case 'payout': return 'bg-indigo-50 border-indigo-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Live Activity Feed</h3>
        {connectionStatus === 'connected' ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-600">Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px] font-bold">Reconnecting</span>
          </div>
        )}
      </div>

      <div className="space-y-3 relative overflow-hidden flex-1" style={{ minHeight: '400px' }}>
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70 p-6 pt-20">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-semibold mb-1">No Recent Activity</p>
            <p className="text-sm text-gray-400">Live transactions will appear here.</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, type: 'spring', bounce: 0.25 }}
                  className={`p-3 rounded-xl border ${getEventBg(event.type)} flex items-start gap-3`}
                >
                  <div className="mt-0.5 bg-white p-1.5 rounded-lg shadow-sm">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1 pr-2">
                        {event.type === 'purchase' ? 'New Enrollment' :
                         event.type === 'refund' ? 'Refund Processed' :
                         event.type === 'failed' ? 'Payment Failed' : 'Instructor Payout'}
                      </p>
                      <p className="text-sm font-extrabold whitespace-nowrap" style={{ color: event.type === 'failed' ? '#dc2626' : event.type === 'refund' ? '#d97706' : '#059669' }}>
                        {event.type === 'refund' ? '-' : ''}₹{event.amount.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-snug">
                      <span className="font-medium text-gray-800">{event.user}</span> • {event.course}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1.5 font-semibold">Just now</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Fade out bottom to prevent hard cut off */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          </>
        )}
      </div>
    </div>
  );
}
