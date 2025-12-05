import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const VisitTracking = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVisit, setActiveVisit] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchVisits();
    fetchTodayAppointments();
  }, []);

  const fetchVisits = async () => {
    try {
      const res = await api.get('/visits');
      setVisits(res.data.data || []);
      const inProgress = res.data.data?.find(v => v.status === 'in-progress');
      if (inProgress) setActiveVisit(inProgress);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/appointments?date=${today}&status=confirmed`);
      setTodayAppointments(res.data.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const checkIn = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Get current location
      let location = null;
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      }

      const res = await api.post('/visits', {
        appointment: selectedAppointment._id,
        doctor: selectedAppointment.doctor._id,
        visitType: 'scheduled',
        checkInLocation: location
      });

      setActiveVisit(res.data.data);
      setShowCheckInModal(false);
      fetchVisits();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in. Please try again.');
    }
  };

  const checkOut = async () => {
    if (!activeVisit) return;
    
    try {
      let location = null;
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      }

      await api.put(`/visits/${activeVisit._id}/check-out`, {
        checkOutLocation: location,
        notes
      });

      setActiveVisit(null);
      setNotes('');
      fetchVisits();
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to check out. Please try again.');
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Visit Tracking</h1>

        {/* Active Visit Card */}
        {activeVisit ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                <h2 className="text-lg font-semibold text-green-800">Active Visit</h2>
              </div>
              <span className="text-sm text-green-600">
                Started: {new Date(activeVisit.checkInTime).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="font-medium">Dr. {activeVisit.doctor?.name}</p>
              <p className="text-sm text-gray-500">{activeVisit.doctor?.specialty}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Visit Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this visit..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>

            <button
              onClick={checkOut}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Check Out
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 mb-6 text-center">
            <p className="text-gray-500 mb-4">No active visit</p>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Start New Visit
            </button>
          </div>
        )}

        {/* Visit History */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Visit History</h2>
          </div>
          
          {visits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No visits recorded yet
            </div>
          ) : (
            <div className="divide-y">
              {visits.map(visit => (
                <div key={visit._id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Dr. {visit.doctor?.name}</p>
                      <p className="text-sm text-gray-500">{visit.doctor?.specialty}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(visit.checkInTime).toLocaleDateString()} at{' '}
                        {new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        visit.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {visit.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-2">
                        Duration: {formatDuration(visit.duration)}
                      </p>
                    </div>
                  </div>
                  {visit.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                      {visit.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-In Modal */}
        {showCheckInModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Start Visit</h2>
              
              {todayAppointments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No confirmed appointments for today
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {todayAppointments.map(apt => (
                    <div
                      key={apt._id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedAppointment?._id === apt._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium">Dr. {apt.doctor?.name}</p>
                      <p className="text-sm text-gray-500">{apt.timeSlot}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={checkIn}
                  disabled={!selectedAppointment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Check In
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitTracking;
