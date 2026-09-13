import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { apiRequest, getAuthToken, removeAuthToken } from './services/api';
import { routes } from './routes';
import { RequireAuth } from './components/RequireAuth';

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
          // Token is stale/invalid (e.g. user no longer exists) - drop it so
          // the guards below correctly treat this as signed-out instead of
          // leaving a dead token in localStorage forever.
          removeAuthToken();
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, []);

  const handleAuthSuccess = (data: any) => {
    setUser(data.user);
  };

  return (
    <>
    <Toaster position="top-right" richColors closeButton />
    <Routes>
      {routes.map(({ path, access, element }) => {
        const page = element({ user, onAuthSuccess: handleAuthSuccess });
        return (
          <Route
            key={path}
            path={path}
            element={
              access === 'public' ? (
                page
              ) : (
                <RequireAuth access={access} user={user} loading={loading}>
                  {page}
                </RequireAuth>
              )
            }
          />
        );
      })}
    </Routes>
    </>
  );
};

export default App;
