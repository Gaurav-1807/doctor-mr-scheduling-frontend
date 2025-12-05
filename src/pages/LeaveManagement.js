import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const LeaveManagement = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [affectedAppointments, setAffectedAppointments] = useState([]);
  const [newLeave, setNewLeave] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'vacation'
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      const leavesData = res.data.data || [];
      
      // For MRs, show all leaves; for doctors, show only their leaves
      setLeaves(leavesData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAppointments = async (e) => {
    e.preventDefault();
    
    if (!newLeave.startDate || !newLeave.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    
    if (newLeave.startDate > newLeave.endDate) {
      toast.error('End date must be after start date');
      return;
    }
    
    try {
      setSubmitting(true);
      const res = await api.post('/leaves/check-appointments', {
        startDate: newLeave.startDate,
        endDate: newLeave.endDate
      });
      
      if (res.data.hasAppointments) {
        // Show appointment handling modal
        setAffectedAppointments(res.data.appointments);
        setShowModal(false);
        setShowAppointmentModal(true);
      } else {
        // No appointments, create leave directly
        await createLeaveWithAction('cancel');
      }
    } catch (error) {
      console.error('Error checking appointments:', error);
      toast.error(error.response?.data?.message || 'Failed to check appointments');
    } finally {
      setSubmitting(false);
    }
  };

  const createLeaveWithAction = async (action) => {
    try {
      setSubmitting(true);
      await api.post('/leaves', {
        ...newLeave,
        handleAppointments: action
      });
      setShowModal(false);
      setShowAppointmentModal(false);
      setNewLeave({ startDate: '', endDate: '', reason: '', leaveType: 'vacation' });
      
      const actionText = action === 'reschedule' ? 'rescheduled' : 'cancelled';
      toast.success(`Leave created! ${affectedAppointments.length} appointment(s) ${actionText}.`);
      setAffectedAppointments([]);
      fetchLeaves();
    } catch (error) {
      console.error('Error creating leave:', error);
      toast.error(error.response?.data?.message || 'Failed to create leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (leaveId) => {
    setPendingDeleteId(leaveId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteLeave = async () => {
    try {
      const res = await api.delete(`/leaves/${pendingDeleteId}`);
      toast.success(res.data.slotsGenerated 
        ? `Leave deleted! ${res.data.slotsGenerated} slots regenerated.`
        : 'Leave deleted successfully!'
      );
      fetchLeaves();
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast.error(error.response?.data?.message || 'Failed to delete leave');
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      vacation: 'bg-blue-100 text-blue-800',
      sick_leave: 'bg-red-100 text-red-800',
      emergency: 'bg-orange-100 text-orange-800',
      conference: 'bg-green-100 text-green-800',
      other: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
          {user.role === 'doctor' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Leave
            </button>
          )}
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Upcoming Leaves</h2>
          </div>
          
          {leaves.filter(l => new Date(l.startDate) >= new Date()).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No upcoming leaves scheduled
            </div>
          ) : (
            <div className="divide-y">
              {leaves
                .filter(l => new Date(l.startDate) >= new Date())
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .map(leave => (
                  <div key={leave._id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {user.role === 'mr' && leave.doctorId && (
                          <p className="font-semibold text-blue-600 mb-2">
                            Dr. {leave.doctorId.name}
                            {leave.doctorId.speciality && (
                              <span className="text-sm text-gray-500 ml-2">({leave.doctorId.speciality})</span>
                            )}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                            {leave.leaveType}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(leave.status)}`}>
                            {leave.status}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-gray-500 mt-1">{leave.reason}</p>
                        )}
                      </div>
                      {user.role === 'doctor' && leave.status === 'active' && (
                        <button
                          onClick={() => handleDeleteClick(leave._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Past Leaves */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Past Leaves</h2>
          </div>
          
          {leaves.filter(l => new Date(l.endDate) < new Date()).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No past leaves
            </div>
          ) : (
            <div className="divide-y">
              {leaves
                .filter(l => new Date(l.endDate) < new Date())
                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                .slice(0, 10)
                .map(leave => (
                  <div key={leave._id} className="p-4 hover:bg-gray-50 opacity-75">
                    <div className="flex justify-between items-start">
                      <div>
                        {user.role === 'mr' && leave.doctorId && (
                          <p className="font-semibold text-gray-700 mb-1">
                            Dr. {leave.doctorId.name}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                            {leave.leaveType}
                          </span>
                        </div>
                        <p className="text-gray-600">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Create Leave Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Add Leave</h2>
              <form onSubmit={checkAppointments}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                    <select
                      value={newLeave.leaveType}
                      onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="vacation">Vacation</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal</option>
                      <option value="conference">Conference</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                    <textarea
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="e.g., Family vacation, Medical appointment, etc."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Checking...' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Appointment Handling Modal */}
        {showAppointmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-orange-600 mb-4">
                ⚠️ Appointments During Leave Period
              </h3>
              
              <p className="text-gray-700 mb-4">
                You have <strong>{affectedAppointments.length}</strong> appointment(s) scheduled during this leave period:
              </p>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {affectedAppointments.map((apt) => (
                  <div key={apt._id} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{apt.mrName}</p>
                        <p className="text-sm text-gray-600">{apt.mrEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(apt.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-gray-600">{apt.startTime}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Auto-Reschedule:</strong> Appointments will be automatically moved to your next available slot after the leave period. MRs will be notified via email.
                </p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>❌ Cancel All:</strong> All appointments will be cancelled. MRs will need to book new appointments.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => createLeaveWithAction('reschedule')}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <span className="mr-2">🔄</span>
                  )}
                  Auto-Reschedule & Create Leave
                </button>
                <button
                  onClick={() => createLeaveWithAction('cancel')}
                  disabled={submitting}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-semibold disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <span className="mr-2">❌</span>
                  )}
                  Cancel All & Create Leave
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  setShowModal(true);
                  setAffectedAppointments([]);
                }}
                disabled={submitting}
                className="w-full mt-3 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}
          onConfirm={confirmDeleteLeave}
          title="Delete Leave"
          message="Are you sure you want to delete this leave? Slots will be automatically regenerated for the leave period."
          confirmText="Delete Leave"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default LeaveManagement;
