import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorDashboard from './pages/DoctorDashboardEnhanced';
import MRDashboard from './pages/MRDashboard';
import DoctorAvailability from './pages/DoctorAvailability';
import DoctorHospitals from './pages/DoctorHospitals';
import BrowseDoctors from './pages/BrowseDoctors';
import Appointments from './pages/Appointments';
import Notifications from './pages/Notifications';
import BookAppointment from './pages/BookAppointment';
import DoctorProfile from './pages/DoctorProfile';
import MRProfile from './pages/MRProfile';
import Chat from './pages/Chat';
import TaskManager from './pages/TaskManager';
import VisitTracking from './pages/VisitTracking';
import AdminDashboard from './pages/AdminDashboard';
import ProductCatalog from './pages/ProductCatalog';
import LeaveManagement from './pages/LeaveManagement';
import { initSocket, disconnectSocket } from './utils/socket';

// Home redirect
const Home = () => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" />;
  return <Navigate to="/mr/dashboard" />;
};

// Socket initialization
const SocketInitializer = () => {
  const { user, token } = useContext(AuthContext);
  
  useEffect(() => {
    if (user && token) {
      initSocket(token);
    }
    return () => disconnectSocket();
  }, [user, token]);
  
  return null;
};

// Main content with layout
const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Auth pages without layout
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }
  
  // All other pages with layout
  return (
    <Layout>
      <Routes>
        <Route path="/doctor/dashboard" element={<PrivateRoute role="doctor"><DoctorDashboard /></PrivateRoute>} />
        <Route path="/doctor/availability" element={<PrivateRoute role="doctor"><DoctorAvailability /></PrivateRoute>} />
        <Route path="/doctor/hospitals" element={<PrivateRoute role="doctor"><DoctorHospitals /></PrivateRoute>} />
        <Route path="/doctor/appointments" element={<PrivateRoute role="doctor"><Appointments /></PrivateRoute>} />
        <Route path="/doctor/profile" element={<PrivateRoute role="doctor"><DoctorProfile /></PrivateRoute>} />
        <Route path="/doctor/leaves" element={<PrivateRoute role="doctor"><LeaveManagement /></PrivateRoute>} />
        
        <Route path="/mr/dashboard" element={<PrivateRoute role="mr"><MRDashboard /></PrivateRoute>} />
        <Route path="/mr/doctors" element={<PrivateRoute role="mr"><BrowseDoctors /></PrivateRoute>} />
        <Route path="/mr/appointments" element={<PrivateRoute role="mr"><Appointments /></PrivateRoute>} />
        <Route path="/mr/book-appointment/:doctorId" element={<PrivateRoute role="mr"><BookAppointment /></PrivateRoute>} />
        <Route path="/mr/profile" element={<PrivateRoute role="mr"><MRProfile /></PrivateRoute>} />
        
        {/* Shared routes */}
        <Route path="/leaves" element={<PrivateRoute><LeaveManagement /></PrivateRoute>} />
        
        <Route path="/tasks" element={<PrivateRoute role="mr"><TaskManager /></PrivateRoute>} />
        <Route path="/visits" element={<PrivateRoute role="mr"><VisitTracking /></PrivateRoute>} />
        
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductCatalog /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        
        <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        
        <Route path="/" element={<Home />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <SocketInitializer />
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
