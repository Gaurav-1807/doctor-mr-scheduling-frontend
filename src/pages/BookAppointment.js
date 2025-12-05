import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingCycleDays, setBookingCycleDays] = useState(1);
  const [maxBookingDate, setMaxBookingDate] = useState(null);
  const [visitReason, setVisitReason] = useState('');

  useEffect(() => {
    fetchDoctor();
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchDoctor = async () => {
    try {
      const { data } = await API.get(`/doctors/${doctorId}`);
      setDoctor(data.doctor);
    } catch (error) {
      console.error('Error fetching doctor:', error);
    }
  };

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/appointments/slots/${doctorId}?date=${selectedDate}&includeBooked=true`);
      setSlots(data.slots);
      setBookingCycleDays(data.bookingCycleDays || 1);
      setMaxBookingDate(data.maxBookingDate);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot) => {
    if (!slot.isBooked) {
      setSelectedSlot(slot);
      setShowConfirmation(true);
    }
  };

  const handleConfirmBooking = async () => {
    if (!visitReason.trim()) {
      alert('Please provide a reason for your visit');
      return;
    }

    try {
      setLoading(true);
      await API.post('/appointments/book', {
        doctorId,
        slotId: selectedSlot._id,
        visitReason: visitReason.trim()
      });
      alert('Appointment confirmed successfully!');
      navigate('/mr/appointments');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error booking appointment';
      alert(errorMsg);
      setShowConfirmation(false);
      setLoading(false);
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    if (maxBookingDate) {
      return new Date(maxBookingDate).toISOString().split('T')[0];
    }
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + bookingCycleDays);
    return maxDate.toISOString().split('T')[0];
  };

  if (!doctor) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={() => navigate('/mr/doctors')}
          className="mb-4 text-primary hover:underline"
        >
          ← Back to Doctors
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {doctor.name.charAt(0)}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">Dr. {doctor.name}</h1>
              <p className="text-gray-600">{doctor.speciality}</p>
              {doctor.qualification && (
                <p className="text-sm text-gray-500">{doctor.qualification}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Date</h2>
          <div className="mb-3">
            <div className="inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm mb-3">
              📅 Booking Window: Next {bookingCycleDays} day{bookingCycleDays > 1 ? 's' : ''}
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-gray-500 mt-2">
            You can book one appointment every {bookingCycleDays} day{bookingCycleDays > 1 ? 's' : ''} with this doctor
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Available Slots for {new Date(selectedDate).toLocaleDateString()}
          </h2>

          {loading ? (
            <div className="text-center py-8">Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No slots available for this date
            </div>
          ) : (() => {
            // Filter out past time slots for today
            const availableSlots = slots.filter((slot) => {
              const today = new Date();
              const slotDate = new Date(slot.date);
              
              // If slot is not today, show it
              if (slotDate.toDateString() !== today.toDateString()) {
                return true;
              }
              
              // For today, check if slot time has passed
              const [hours, minutes] = slot.startTime.split(':').map(Number);
              const slotTime = new Date();
              slotTime.setHours(hours, minutes, 0, 0);
              
              // Add 5 minutes buffer - don't show slots starting in less than 5 minutes
              const bufferTime = new Date();
              bufferTime.setMinutes(bufferTime.getMinutes() + 5);
              
              return slotTime > bufferTime;
            });

            if (availableSlots.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <p>All slots for today have passed.</p>
                  <p className="text-sm mt-2">Please select a future date to book an appointment.</p>
                </div>
              );
            }

            return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot._id}
                  onClick={() => handleSlotClick(slot)}
                  disabled={slot.isBooked}
                  className={`p-3 rounded-lg border-2 transition ${
                    slot.isBooked
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-primary text-primary hover:bg-primary hover:text-white cursor-pointer'
                  }`}
                >
                  <div className="text-sm font-semibold">{slot.startTime}</div>
                  <div className="text-xs">{slot.endTime}</div>
                  {slot.isBooked && (
                    <div className="text-xs mt-1 text-red-500">Booked</div>
                  )}
                </button>
              ))}
            </div>
            );
          })()}
        </div>

        {showConfirmation && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Appointment</h3>
              
              <div className="space-y-3 mb-6">
                <div>
                  <span className="font-semibold">Doctor:</span> Dr. {doctor.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                </div>
                <div>
                  <span className="font-semibold">Speciality:</span> {doctor.speciality}
                </div>
                <div>
                  <span className="font-semibold">Date:</span> {new Date(selectedSlot.date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold">Time:</span> {selectedSlot.startTime} - {selectedSlot.endTime}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Visit <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  placeholder="Please describe the purpose of your visit (e.g., Product presentation, Follow-up discussion, New product launch)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
