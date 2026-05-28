import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, TrendingUp, Award, Medal } from 'lucide-react';

export default function Leaderboards({ deepAnalytics }: { deepAnalytics: any }) {
  if (!deepAnalytics) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
      
      {/* Top Selling Courses */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Top Selling Courses</h3>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
        </div>
        <div className="p-0">
          {(deepAnalytics.topCourses || []).slice(0, 5).map((course: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center font-bold text-indigo-700 shadow-sm relative overflow-hidden">
                  {idx === 0 && <div className="absolute top-0 right-0 w-4 h-4 bg-orange-400 rotate-45 transform translate-x-2 -translate-y-2"></div>}
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{course.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium text-gray-500">{course.enrollments} enrollments</span>
                    <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <TrendingUp className="w-3 h-3 mr-1" /> +12%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-gray-900">₹{parseFloat(course.revenue || '0').toLocaleString()}</div>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 ml-auto overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(20, 100 - idx * 15)}%` }}></div>
                </div>
              </div>
            </div>
          ))}
          {(!deepAnalytics.topCourses || deepAnalytics.topCourses.length === 0) && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Trophy className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-gray-900 font-bold mb-1">No Course Sales Yet</h4>
              <p className="text-sm text-gray-500 max-w-[250px]">Your top selling courses will appear here once students start enrolling.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Instructor Leaderboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900">Instructor Leaderboard</h3>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
        </div>
        <div className="p-0">
          {(deepAnalytics.instructorLeaderboard || []).slice(0, 5).map((inst: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center font-bold text-blue-700 shadow-sm border-2 border-white">
                    {inst.first_name?.[0]}{inst.last_name?.[0]}
                  </div>
                  {idx < 3 && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <Medal className={`w-4 h-4 ${idx === 0 ? 'text-orange-400' : idx === 1 ? 'text-gray-400' : 'text-orange-700'}`} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{inst.first_name} {inst.last_name}</h4>
                  <div className="flex items-center gap-1 mt-1 text-xs font-medium text-orange-500">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current text-orange-200" />
                    <span className="text-gray-500 ml-1">(4.8)</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-indigo-600">₹{parseFloat(inst.instructor_cut || '0').toLocaleString()} Cut</div>
                <div className="text-xs font-medium text-gray-500 mt-1">Generated: ₹{parseFloat(inst.total_generated || '0').toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(!deepAnalytics.instructorLeaderboard || deepAnalytics.instructorLeaderboard.length === 0) && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Award className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-gray-900 font-bold mb-1">No Instructor Data</h4>
              <p className="text-sm text-gray-500 max-w-[250px]">Once your instructors start generating sales, their rankings will appear here.</p>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}
