import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome to Buddy AI Execution Companion.</p>
      <Link to="/login">Go to Login</Link>
    </div>
  );
};

export default Dashboard;
