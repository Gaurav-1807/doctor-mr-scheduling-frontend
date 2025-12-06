import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const VisitTracking = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVisit, setActiveVisit] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [notes, setNotes] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Timer for active visit
  useEffect(() => {
    let interval;
    if (activeVisit?.checkInTime) {
      interval = setInterval(() => {
        const start = new Date(activeVisit.checkInTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVisit]);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await api.get('/visits');
      const visitsData = res.data.data || [];
      setVisits(visitsData);
      const inProgress = visitsData.find(v => v.status === 'in-progress');
      if (inProgress) {
        setActiveVisit(inProgress);
        setNotes(inProgress.notes || '');
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTodayAppointments = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Fetch all appointments for today (status filter is optional)
      const res = await api.get(`/appointments?date=${today}`);
      const appointments = res.data.appointments || res.data.data || [];
      
      console.log('Today appointments raw:', appointments);
      
      // Filter to only show confirmed appointments that can be visited
      // Exclude completed, cancelled, missed appointments
      const availableAppointments = appointments
        .filter(apt => ['confirmed'].includes(apt.status))
        .map(apt => ({
          ...apt,
          doctor: apt.doctorId || apt.doctor,
          // Format time slot for display
          displayTime: apt.timeSlot || `${apt.startTime} - ${apt.endTime}`
        }));
      
      console.log('Available appointments for visit:', availableAppointments);
      setTodayAppointments(availableAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchTodayAppointments();
  }, [fetchVisits, fetchTodayAppointments]);


  const getLocation = async () => {
    if (!navigator.geolocation) return null;
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.log('Geolocation not available:', error.message);
      return null;
    }
  };

  const checkIn = async () => {
    if (!selectedAppointment || checkingIn) return;
    
    setCheckingIn(true);
    try {
      const location = await getLocation();
      
      // Get doctor ID from either doctor or doctorId field
      const doctorId = selectedAppointment.doctor?._id || 
                       selectedAppointment.doctorId?._id || 
                       selectedAppointment.doctor || 
                       selectedAppointment.doctorId;

      if (!doctorId) {
        throw new Error('Doctor information not found');
      }

      const res = await api.post('/visits', {
        appointment: selectedAppointment._id,
        doctor: doctorId,
        visitType: 'general', // Valid: sample_drop, promotion, stock_check, inquiry_followup, general
        checkInLocation: location
      });

      setActiveVisit(res.data.data);
      setShowCheckInModal(false);
      setSelectedAppointment(null);
      setNotes('');
      fetchVisits();
      fetchTodayAppointments();
    } catch (error) {
      console.error('Error checking in:', error);
      alert(error.response?.data?.message || error.message || 'Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const checkOut = async () => {
    if (!activeVisit || checkingOut) return;
    
    setCheckingOut(true);
    try {
      const location = await getLocation();

      await api.put(`/visits/${activeVisit._id}/check-out`, {
        checkOutLocation: location,
        notes
      });

      setActiveVisit(null);
      setNotes('');
      setElapsedTime('00:00:00');
      fetchVisits();
      fetchTodayAppointments();
    } catch (error) {
      console.error('Error checking out:', error);
      alert(error.response?.data?.message || 'Failed to check out. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Visit Tracking</h1>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>

        {/* Active Visit Card */}
        {activeVisit ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                <h2 className="text-lg font-semibold text-green-800">Active Visit</h2>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-green-700">{elapsedTime}</div>
                <span className="text-xs text-green-600">
                  Started: {formatTime(activeVisit.checkInTime)}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-lg">
                    {activeVisit.doctor?.name?.charAt(0) || 'D'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Dr. {activeVisit.doctor?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{activeVisit.doctor?.specialty || activeVisit.doctor?.speciality || 'Specialist'}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Visit Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this visit (products discussed, feedback, follow-up items...)"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={checkOut}
              disabled={checkingOut}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {checkingOut ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Checking Out...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Check Out
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 mb-6 text-center shadow-sm border">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">No active visit</p>
            <p className="text-sm text-gray-400 mb-4">Start tracking your doctor visit</p>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Start New Visit
            </button>
          </div>
        )}


        {/* Today's Appointments Summary */}
        {!activeVisit && todayAppointments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-blue-800">Today's Appointments</span>
              </div>
              <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
                {todayAppointments.length} scheduled
              </span>
            </div>
          </div>
        )}

        {/* Visit History */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Visit History</h2>
            <span className="text-sm text-gray-500">{visits.length} visits</span>
          </div>
          
          {visits.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">No visits recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Your visit history will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {visits.map(visit => (
                <div key={visit._id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-gray-600 font-medium">
                          {visit.doctor?.name?.charAt(0) || 'D'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Dr. {visit.doctor?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{visit.doctor?.specialty || visit.doctor?.speciality || ''}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(visit.checkInTime)} • {formatTime(visit.checkInTime)}
                          {visit.checkOutTime && ` - ${formatTime(visit.checkOutTime)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        visit.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {visit.status === 'in-progress' ? 'In Progress' : 
                         visit.status === 'completed' ? 'Completed' : visit.status}
                      </span>
                      {visit.duration !== undefined && visit.duration !== null && (
                        <p className="text-sm text-gray-500 mt-2">
                          <span className="text-gray-400">Duration:</span> {formatDuration(visit.duration)}
                        </p>
                      )}
                    </div>
                  </div>
                  {visit.notes && (
                    <div className="mt-3 ml-13 bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">{visit.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-In Modal */}
        {showCheckInModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Start Visit</h2>
                <button 
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedAppointment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Select an appointment to check in
              </p>
              
              {todayAppointments.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No appointments for today</p>
                  <p className="text-sm text-gray-400 mt-1">Book an appointment first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto flex-1 pr-1">
                  {todayAppointments.map(apt => (
                    <div
                      key={apt._id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                        selectedAppointment?._id === apt._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-medium">
                            {apt.doctor?.name?.charAt(0) || 'D'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">Dr. {apt.doctor?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            {apt.displayTime || apt.timeSlot || `${apt.startTime} - ${apt.endTime}`}
                          </p>
                        </div>
                        {selectedAppointment?._id === apt._id && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={checkIn}
                  disabled={!selectedAppointment || checkingIn}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center justify-center"
                >
                  {checkingIn ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Checking In...
                    </>
                  ) : (
                    'Check In'
                  )}
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
