import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LogOut, User as UserIcon } from 'lucide-react';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;

  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-center md:text-left">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={32} />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.displayName || 'Welcome back'}</h1>
                <p className="text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm border border-gray-200 shadow-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Dashboard</h2>
            <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-sm">
              <p>You have successfully authenticated with Firebase Google Sign-In. You can start building your Buddy AI features here.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
