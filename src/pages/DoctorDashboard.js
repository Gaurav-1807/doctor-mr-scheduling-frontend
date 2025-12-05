import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const DoctorDashboard = () => {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    totalAppointments: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [todayRes, upcomingRes, allRes] = await Promise.all([
        API.get(`/appointments?date=${today}`),
        API.get('/appointments?status=scheduled'),
        API.get('/appointments')
      ]);

      setStats({
        todayAppointments: todayRes.data.appointments.length,
        upcomingAppointments: upcomingRes.data.appointments.length,
        totalAppointments: allRes.data.appointments.length
      });

      setAppointments(todayRes.data.appointments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await API.patch('/doctors/toggle-availability');
      setIsActive(data.isActive);
      alert(data.message);
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
          <button
            onClick={toggleAvailability}
            className={`px-6 py-2 rounded-lg font-semibold ${
              isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
            } text-white`}
          >
            {isActive ? 'Available' : 'Offline'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <p className="text-3xl font-bold text-primary mt-2">{stats.todayAppointments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Upcoming Appointments</h3>
            <p className="text-3xl font-bold text-secondary mt-2">{stats.upcomingAppointments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Appointments</h3>
            <p className="text-3xl font-bold text-gray-700 mt-2">{stats.totalAppointments}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/doctor/availability"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Availability</h3>
            <p className="text-gray-600">Set your weekly schedule and slot duration</p>
          </Link>

          <Link
            to="/doctor/hospitals"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Hospitals</h3>
            <p className="text-gray-600">Add and manage your clinic/hospital details</p>
          </Link>

          <Link
            to="/doctor/appointments"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">View Appointments</h3>
            <p className="text-gray-600">See all scheduled and past appointments</p>
          </Link>

          <Link
            to="/doctor/profile"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Profile Settings</h3>
            <p className="text-gray-600">Update your personal information</p>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Schedule</h2>
          {appointments.length === 0 ? (
            <p className="text-gray-500">No appointments for today</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div key={apt._id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{apt.mrId.name}</p>
                      <p className="text-sm text-gray-600">{apt.mrId.company}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {apt.startTime} - {apt.endTime}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
