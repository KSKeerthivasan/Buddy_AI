import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewTask from './pages/NewTask';
import ReviewPlan from './pages/ReviewPlan';
import TaskDetail from './pages/TaskDetail';
import { TaskProvider } from './context/TaskContext';

function App() {
  return (
    <TaskProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="new-task" element={<NewTask />} />
            <Route path="review-plan" element={<ReviewPlan />} />
            <Route path="task/:taskId" element={<TaskDetail />} />
          </Route>
        </Routes>
      </Router>
    </TaskProvider>
  );
}

export default App;
