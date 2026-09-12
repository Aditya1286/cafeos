import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { CustomerOrderTrackingPage } from './pages/CustomerOrderTrackingPage';
import { apiRequest, getAuthToken } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await apiRequest('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.error('Session expired');
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, []);

  const handleLoginSuccess = (data: any) => {
    setUser(data.user);
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/register" element={<RegisterPage onRegisterSuccess={handleLoginSuccess} />} />
      
      {/* Super Admin Dashboard */}
      <Route path="/admin/*" element={<SuperAdminDashboard user={user} />} />
      
      {/* Restaurant Owner Dashboard */}
      <Route path="/dashboard/*" element={<OwnerDashboard user={user} />} />

      {/* Public Customer Mobile Ordering Routes */}
      <Route path="/c/:slug" element={<CustomerMenuPage />} />
      <Route path="/c/:slug/t/:qrToken" element={<CustomerMenuPage />} />
      <Route path="/c/:slug/order/:orderId" element={<CustomerOrderTrackingPage />} />
    </Routes>
  );
};

export default App;
