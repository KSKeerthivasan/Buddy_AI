import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, CalendarDays, Activity, CheckSquare, Settings, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Hide sidebar on onboarding page
  if (location.pathname === '/onboarding') {
    return <Outlet />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Calendar', path: '/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Activity', path: '/activity', icon: <Activity size={20} /> },
    { name: 'Commitments', path: '/commitments', icon: <CheckSquare size={20} /> },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#fbffb1] via-[#e2f4de] to-[#d6e3ff] selection:bg-indigo-100 font-sans overflow-hidden">
      
      {/* Global Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between hidden md:flex shrink-0 shadow-sm">
        <div>
          {/* Logo */}
          <div className="h-24 flex items-center px-8 border-b border-white/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#5d46e2] text-white flex items-center justify-center font-black text-xl shadow-md">
                B
              </div>
              <span className="font-extrabold text-gray-900 text-lg tracking-tight">Buddy AI</span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 mt-4">
            {navItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    isActive 
                      ? 'bg-[#f4f0ff] text-[#5d46e2] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Bottom Actions */}
        <div className="p-4 space-y-1.5 mb-4">
          <Link
            to="/settings/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              location.pathname.startsWith('/settings')
                ? 'bg-[#f4f0ff] text-[#5d46e2] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Settings size={20} />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-white/50 transition-all text-left"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
};

export default MainLayout;
