import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const BrowseDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    speciality: '',
    city: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.speciality) params.append('speciality', filters.speciality);
      if (filters.city) params.append('city', filters.city);

      const { data } = await API.get(`/doctors?${params.toString()}`);
      setDoctors(data.doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleBookAppointment = (doctorId) => {
    navigate(`/mr/book-appointment/${doctorId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Browse Doctors</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name or speciality"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Filter by speciality"
              value={filters.speciality}
              onChange={(e) => setFilters({ ...filters, speciality: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Filter by city"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor._id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {doctor.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-800">Dr. {doctor.name}</h3>
                  <p className="text-gray-600">{doctor.speciality}</p>
                </div>
              </div>

              {doctor.qualification && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Qualification:</span> {doctor.qualification}
                </p>
              )}

              {doctor.experience && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Experience:</span> {doctor.experience} years
                </p>
              )}

              {doctor.bookingCycleDays && (
                <p className="text-xs text-blue-600 mb-4 bg-blue-50 px-2 py-1 rounded">
                  📅 Book once every {doctor.bookingCycleDays} day{doctor.bookingCycleDays > 1 ? 's' : ''}
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {doctor.isActive ? 'Available' : 'Offline'}
                </span>

                {doctor.isActive && (
                  <button
                    onClick={() => handleBookAppointment(doctor._id)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Book Appointment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {doctors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No doctors found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseDoctors;
