import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LogOut, User as UserIcon, CheckSquare } from 'lucide-react';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import TaskCard from '../components/common/TaskCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        const data = await response.json();
        if (data.status === 'ok') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };
    
    const fetchTasks = async () => {
      try {
        if (!user?.uid) return;
        const response = await fetch(`http://localhost:5000/api/tasks?userId=${user.uid}`);
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    };
    
    checkBackend();
    if (user) {
      fetchTasks();
    }
  }, [user]);

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
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={24} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.displayName || 'Welcome back'}</h1>
                <p className="text-gray-500 text-sm mb-2">{user.email}</p>
                <div className="flex items-center">
                  {backendStatus === 'checking' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Checking backend...
                    </span>
                  )}
                  {backendStatus === 'connected' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm">
                      Backend Connected ✅
                    </span>
                  )}
                  {backendStatus === 'offline' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 shadow-sm">
                      Backend Offline ❌
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm border border-gray-200 shadow-sm"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Your Tasks</h2>
          <button
            onClick={() => navigate('/new-task')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            + New Task
          </button>
        </div>

        {tasksLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading your tasks...</h3>
            <p className="text-gray-500">Please wait while we fetch your active tasks.</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">No active tasks yet.</h3>
            <button
              onClick={() => navigate('/new-task')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
