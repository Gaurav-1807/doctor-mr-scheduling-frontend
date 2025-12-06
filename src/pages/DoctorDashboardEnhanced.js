import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API, { getUploadUrl } from '../utils/api';

const DoctorDashboardEnhanced = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalMRs: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [frequentVisitors, setFrequentVisitors] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [appointmentsRes] = await Promise.all([
        API.get('/appointments')
      ]);

      const allAppointments = appointmentsRes.data.appointments || [];

      // Today's appointments
      const todayApts = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime() && 
               ['pending', 'confirmed', 'scheduled'].includes(apt.status);
      });

      // Upcoming appointments
      const upcomingApts = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() > today.getTime() && 
               ['pending', 'confirmed', 'scheduled'].includes(apt.status);
      });

      // Completed appointments
      const completedCount = allAppointments.filter(apt => apt.status === 'completed').length;

      // Calculate frequent visitors
      const mrVisitCount = {};
      allAppointments.forEach(apt => {
        if (apt.status === 'completed' && apt.mrId) {
          const mrId = apt.mrId._id || apt.mrId;
          if (!mrVisitCount[mrId]) {
            mrVisitCount[mrId] = {
              mr: apt.mrId,
              count: 0
            };
          }
          mrVisitCount[mrId].count++;
        }
      });

      const frequentMRs = Object.values(mrVisitCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate weekly stats (last 7 days)
      const weekStats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayApts = allAppointments.filter(apt => {
          const aptDate = new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === date.getTime();
        });

        weekStats.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count: dayApts.length
        });
      }

      setTodayAppointments(todayApts);
      setFrequentVisitors(frequentMRs);
      setWeeklyStats(weekStats);
      setStats({
        todayAppointments: todayApts.length,
        upcomingAppointments: upcomingApts.length,
        completedAppointments: completedCount,
        totalMRs: Object.keys(mrVisitCount).length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const maxWeeklyCount = Math.max(...weeklyStats.map(s => s.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, Dr. {user?.name}!</h1>
        <p className="text-blue-100 mt-1">Here's your practice overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-2xl font-bold text-blue-600">{stats.todayAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-2xl font-bold text-green-600">{stats.upcomingAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{stats.completedAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total MRs</p>
              <p className="text-2xl font-bold text-gray-700">{stats.totalMRs}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Appointments Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Weekly Appointments</h2>
          <div className="space-y-3">
            {weeklyStats.map((stat, index) => (
              <div key={index} className="flex items-center">
                <div className="w-12 text-sm text-gray-600">{stat.date}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${(stat.count / maxWeeklyCount) * 100}%` }}
                    >
                      {stat.count > 0 && (
                        <span className="text-white text-xs font-semibold">{stat.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequent Visitors */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Visiting MRs</h2>
          {frequentVisitors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No completed visits yet</p>
          ) : (
            <div className="space-y-3">
              {frequentVisitors.map((visitor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{visitor.mr?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{visitor.mr?.company || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{visitor.count}</p>
                    <p className="text-xs text-gray-500">visits</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Today's Appointments</h2>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        
        {todayAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="divide-y">
            {todayAppointments.map((apt) => {
              const mr = apt.mrId || apt.mr;
              return (
                <div key={apt._id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {mr?.profileImage ? (
                        <img 
                          src={getUploadUrl(mr.profileImage)}
                          alt={mr?.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {(mr?.name || 'M').charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{mr?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{mr?.company || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">{apt.startTime || apt.timeSlot}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/doctor/availability" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition group">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">Manage Availability</p>
              <p className="text-sm text-gray-500">Set your schedule</p>
            </div>
          </div>
        </Link>

        <Link to="/doctor/leaves" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition group">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">Leave Management</p>
              <p className="text-sm text-gray-500">Manage your leaves</p>
            </div>
          </div>
        </Link>

        <Link to="/chat" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition group">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">Messages</p>
              <p className="text-sm text-gray-500">Chat with MRs</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default DoctorDashboardEnhanced;
