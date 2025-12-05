import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import TimePicker from '../components/TimePicker';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const DoctorAvailability = () => {
  const toast = useToast();
  const [availabilities, setAvailabilities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    slotDuration: 15
  });
  
  // New states for unavailability
  const [unavailableDate, setUnavailableDate] = useState('');
  const [unavailableStartTime, setUnavailableStartTime] = useState('');
  const [unavailableEndTime, setUnavailableEndTime] = useState('');
  const [conflictingAppointments, setConflictingAppointments] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  
  // States for availability delete with appointments
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAvailabilityId, setDeleteAvailabilityId] = useState(null);
  const [affectedAppointments, setAffectedAppointments] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Confirmation modals
  const [showUnavailableConfirm, setShowUnavailableConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper function to format time in 12-hour format
  const formatTime12h = (time) => {
    if (!time) return '';
    const [hours, mins] = time.split(':').map(Number);
    const hr = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${hr}:${String(mins).padStart(2, '0')} ${period}`;
  };

  // Helper function to calculate number of slots
  const calculateSlots = (start, end, duration) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    if (endMins <= startMins) return 0;
    return Math.floor((endMins - startMins) / duration);
  };

  useEffect(() => {
    fetchAvailabilities();
  }, []);

  const fetchAvailabilities = async () => {
    try {
      const { data } = await API.get('/availability');
      setAvailabilities(data.availabilities);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate times
    if (!formData.startTime || !formData.endTime) {
      toast.error('Please select both start and end times');
      return;
    }
    
    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    try {
      await API.post('/availability', formData);
      toast.success('Availability added successfully!');
      setShowForm(false);
      setFormData({ dayOfWeek: 0, startTime: '', endTime: '', slotDuration: 15 });
      fetchAvailabilities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding availability');
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleteLoading(true);
      // First check for affected appointments
      const { data } = await API.delete(`/availability/${id}?action=check`);
      
      if (data.hasAffectedAppointments && data.affectedAppointments.length > 0) {
        // Show modal with options
        setDeleteAvailabilityId(id);
        setAffectedAppointments(data.affectedAppointments);
        setShowDeleteModal(true);
      } else {
        // No affected appointments, show simple confirm
        setPendingDeleteId(id);
        setShowDeleteConfirm(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error checking availability');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmSimpleDelete = async () => {
    try {
      await API.delete(`/availability/${pendingDeleteId}`);
      toast.success('Availability deleted successfully!');
      fetchAvailabilities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting availability');
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  const handleDeleteWithAction = async (reschedule) => {
    try {
      setDeleteLoading(true);
      const { data } = await API.delete(`/availability/${deleteAvailabilityId}?reschedule=${reschedule}`);
      
      const actionText = reschedule ? 'rescheduled' : 'cancelled';
      toast.success(`Availability deleted! ${data.affectedAppointments} appointment(s) ${actionText}.`);
      
      setShowDeleteModal(false);
      setDeleteAvailabilityId(null);
      setAffectedAppointments([]);
      fetchAvailabilities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting availability');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMarkUnavailable = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!unavailableDate || !unavailableStartTime || !unavailableEndTime) {
      toast.error('Please fill all fields');
      return;
    }
    
    if (unavailableStartTime >= unavailableEndTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    // Show confirmation modal
    setShowUnavailableConfirm(true);
  };

  const confirmMarkUnavailable = async () => {
    setShowUnavailableConfirm(false);
    
    try {
      // Check for conflicting appointments
      const { data } = await API.post('/availability/check-conflicts', {
        date: unavailableDate,
        startTime: unavailableStartTime,
        endTime: unavailableEndTime
      });

      if (data.conflicts && data.conflicts.length > 0) {
        setConflictingAppointments(data.conflicts);
        setShowConflictModal(true);
      } else {
        // No conflicts, proceed to mark unavailable
        await API.post('/availability/mark-unavailable', {
          date: unavailableDate,
          startTime: unavailableStartTime,
          endTime: unavailableEndTime
        });
        
        toast.success('Time marked as unavailable successfully!');
        setUnavailableDate('');
        setUnavailableStartTime('');
        setUnavailableEndTime('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error marking unavailable');
    }
  };

  const handleCancelAllConflicts = async () => {
    try {
      await API.post('/availability/mark-unavailable', {
        date: unavailableDate,
        startTime: unavailableStartTime,
        endTime: unavailableEndTime,
        cancelConflicts: true
      });

      toast.success(`Marked as unavailable and cancelled ${conflictingAppointments.length} appointment(s)`);
      setShowConflictModal(false);
      setConflictingAppointments([]);
      setUnavailableDate('');
      setUnavailableStartTime('');
      setUnavailableEndTime('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing request');
    }
  };

  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerateSlots = () => {
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerateSlots = async () => {
    setShowRegenerateConfirm(false);
    try {
      setRegenerating(true);
      const { data } = await API.post('/availability/regenerate-slots');
      toast.success(`Slots regenerated! ${data.deletedSlots || 0} old slots removed.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error regenerating slots');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Availability</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRegenerateSlots}
              disabled={regenerating}
              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : '🔄 Refresh Slots'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Add Availability'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Add New Availability</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {days.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <TimePicker
                  label="Start Time"
                  required
                  value={formData.startTime}
                  onChange={(time) => setFormData({ ...formData, startTime: time })}
                />
                <TimePicker
                  label="End Time"
                  required
                  value={formData.endTime}
                  onChange={(time) => setFormData({ ...formData, endTime: time })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slot Duration (minutes)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[15, 20, 30, 45, 60].map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setFormData({ ...formData, slotDuration: duration })}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.slotDuration === duration
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {duration}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {formData.startTime && formData.endTime && (
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Preview:</span> Every {days[formData.dayOfWeek]} from{' '}
                    <span className="font-semibold">{formatTime12h(formData.startTime)}</span> to{' '}
                    <span className="font-semibold">{formatTime12h(formData.endTime)}</span> with{' '}
                    <span className="font-semibold">{formData.slotDuration} min</span> slots
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This will generate approximately {calculateSlots(formData.startTime, formData.endTime, formData.slotDuration)} slots per {days[formData.dayOfWeek]}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!formData.startTime || !formData.endTime}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Availability
              </button>
            </form>
          </div>
        )}

        {/* Availability List - Desktop Table */}
        <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden mb-6 sm:mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {availabilities.map((avail) => (
                <tr key={avail._id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{days[avail.dayOfWeek]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatTime12h(avail.startTime)} - {formatTime12h(avail.endTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{avail.slotDuration} min</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(avail._id)}
                      disabled={deleteLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deleteLoading ? 'Checking...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {availabilities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No availability set. Add your first availability above.
            </div>
          )}
        </div>

        {/* Availability List - Mobile Cards */}
        <div className="sm:hidden space-y-3 mb-6">
          {availabilities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No availability set. Add your first availability above.
            </div>
          ) : (
            availabilities.map((avail) => (
              <div key={avail._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{days[avail.dayOfWeek]}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime12h(avail.startTime)} - {formatTime12h(avail.endTime)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {avail.slotDuration} min slots
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(avail._id)}
                    disabled={deleteLoading}
                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleteLoading ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mark Unavailable Section - Always Visible */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Mark Unavailable</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Block specific dates/times when you're not available</p>
          </div>

          <form onSubmit={handleMarkUnavailable} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={unavailableDate}
                onChange={(e) => setUnavailableDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <TimePicker
                label="Start Time"
                required
                value={unavailableStartTime}
                onChange={(time) => setUnavailableStartTime(time)}
              />
              <TimePicker
                label="End Time"
                required
                value={unavailableEndTime}
                onChange={(time) => setUnavailableEndTime(time)}
              />
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 sm:p-4 rounded">
              <p className="text-xs sm:text-sm text-yellow-800">
                <strong>Note:</strong> This will block the selected time period. If there are existing appointments, you'll be asked to confirm cancellation.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-red-600 font-semibold transition duration-200 flex items-center justify-center text-sm sm:text-base"
            >
              <span className="mr-2">🚫</span>
              <span className="hidden sm:inline">Check Conflicts & Mark Unavailable</span>
              <span className="sm:hidden">Mark Unavailable</span>
            </button>
          </form>
        </div>

        {/* Conflict Modal */}
        {showConflictModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-red-600 mb-3 sm:mb-4">
                ⚠️ Conflicting Appointments Found
              </h3>
              
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                The following appointments are scheduled during the time you want to mark as unavailable:
              </p>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 max-h-48 sm:max-h-60 overflow-y-auto">
                {conflictingAppointments.map((apt) => (
                  <div key={apt._id} className="border-l-4 border-red-500 bg-red-50 p-3 sm:p-4 rounded">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{apt.mrId.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{apt.mrId.company}</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {new Date(apt.date).toLocaleDateString()} at {apt.startTime} - {apt.endTime}
                    </p>
                    {apt.visitReason && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Reason: {apt.visitReason}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-yellow-800">
                  <strong>Note:</strong> If you proceed, all these appointments will be cancelled and MRs will be notified via email.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleCancelAllConflicts}
                  className="flex-1 bg-red-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-red-600 font-semibold text-sm sm:text-base"
                >
                  Cancel All & Mark Unavailable
                </button>
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictingAppointments([]);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 sm:py-3 rounded-lg hover:bg-gray-300 font-semibold text-sm sm:text-base"
                >
                  Keep Appointments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Availability Modal with Reschedule Option */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-orange-600 mb-3 sm:mb-4">
                ⚠️ Appointments Will Be Affected
              </h3>
              
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                Deleting this availability will affect <strong>{affectedAppointments.length}</strong> booked appointment(s):
              </p>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 max-h-40 sm:max-h-60 overflow-y-auto">
                {affectedAppointments.map((apt) => (
                  <div key={apt._id} className="border-l-4 border-orange-500 bg-orange-50 p-3 sm:p-4 rounded">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm sm:text-base">{apt.mrName}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{apt.mrEmail}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs sm:text-sm font-medium text-gray-800">
                          {new Date(apt.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">{apt.timeSlot}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>💡 Auto-Reschedule:</strong> Appointments will be automatically moved to your next available slot. MRs will be notified via email.
                </p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-red-800">
                  <strong>❌ Cancel All:</strong> All affected appointments will be cancelled. MRs will need to book new appointments.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => handleDeleteWithAction(true)}
                    disabled={deleteLoading}
                    className="flex-1 bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                  >
                    {deleteLoading ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <span className="mr-2">🔄</span>
                    )}
                    <span className="hidden sm:inline">Auto-Reschedule & Delete</span>
                    <span className="sm:hidden">Reschedule & Delete</span>
                  </button>
                  <button
                    onClick={() => handleDeleteWithAction(false)}
                    disabled={deleteLoading}
                    className="flex-1 bg-red-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-red-600 font-semibold disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                  >
                    {deleteLoading ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <span className="mr-2">❌</span>
                    )}
                    <span className="hidden sm:inline">Cancel All & Delete</span>
                    <span className="sm:hidden">Cancel & Delete</span>
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteAvailabilityId(null);
                    setAffectedAppointments([]);
                  }}
                  disabled={deleteLoading}
                  className="w-full bg-gray-200 text-gray-800 py-2.5 sm:py-3 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50 text-sm sm:text-base"
                >
                  Keep Availability
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modals */}
        <ConfirmModal
          isOpen={showUnavailableConfirm}
          onClose={() => setShowUnavailableConfirm(false)}
          onConfirm={confirmMarkUnavailable}
          title="Mark Time as Unavailable"
          message={`Are you sure you want to mark ${unavailableDate} from ${formatTime12h(unavailableStartTime)} to ${formatTime12h(unavailableEndTime)} as unavailable? This will block bookings for this time period.`}
          confirmText="Yes, Mark Unavailable"
          cancelText="Cancel"
          type="warning"
        />

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}
          onConfirm={confirmSimpleDelete}
          title="Delete Availability"
          message="Are you sure you want to delete this availability? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        <ConfirmModal
          isOpen={showRegenerateConfirm}
          onClose={() => setShowRegenerateConfirm(false)}
          onConfirm={confirmRegenerateSlots}
          title="Regenerate Slots"
          message="This will delete all unbooked slots and regenerate them for the next 30 days based on your current availability settings. Continue?"
          confirmText="Regenerate"
          cancelText="Cancel"
          type="info"
        />
      </div>
    </div>
  );
};

export default DoctorAvailability;
