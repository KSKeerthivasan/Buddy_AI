import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewTask from './pages/NewTask';
import ReviewPlan from './pages/ReviewPlan';
import TaskDetail from './pages/TaskDetail';
import Activity from './pages/Activity';
import Calendar from './pages/Calendar.tsx';
import FocusMode from './pages/FocusMode.tsx';
import Availability from './pages/Availability';
import Onboarding from './pages/Onboarding';
import ProfileSettings from './pages/ProfileSettings';
import Commitments from './pages/Commitments';
import { TaskProvider } from './context/TaskContext';

function App() {
  return (
    <TaskProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="activity" element={<Activity />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="focus/:taskId/:sessionId" element={<FocusMode />} />
            <Route path="new-task" element={<NewTask />} />
            <Route path="review-plan" element={<ReviewPlan />} />
            <Route path="task/:taskId" element={<TaskDetail />} />
            <Route path="settings/availability" element={<Availability />} />
            <Route path="settings/profile" element={<ProfileSettings />} />
            <Route path="commitments" element={<Commitments />} />
          </Route>
        </Routes>
      </Router>
    </TaskProvider>
  );
}

export default App;
