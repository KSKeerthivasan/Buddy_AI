import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const MainLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    const checkProfile = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/profile/${user.uid}`);
        const data = await res.json();
        
        if (data.success && data.profile) {
          if (!data.profile.isOnboarded && location.pathname !== '/onboarding') {
            navigate('/onboarding', { replace: true });
          } else if (data.profile.isOnboarded && location.pathname === '/onboarding') {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to check profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
