import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitor from './pages/LiveMonitor';
import UserManagement from './pages/UserManagement';
import ProjectManagement from './pages/ProjectManagement';
import FinancialReport from './pages/FinancialReport';
import StaffWorklog from './pages/StaffWorklog';
import AttendanceReport from './pages/AttendanceReport';
import TaskManagement from './pages/TaskManagement';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <span>Đang tải...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'STAFF') return <Navigate to="/worklog" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? (
          user.role === 'STAFF' ? <Navigate to="/worklog" replace /> : <Navigate to="/dashboard" replace />
        ) : (
          <Login />
        )
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={
          user?.role === 'STAFF' ? <Navigate to="/worklog" replace /> : <Navigate to="/dashboard" replace />
        } />
        <Route path="dashboard" element={
          <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="live-monitor" element={
          <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
            <LiveMonitor />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="tasks" element={
          <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
            <TaskManagement />
          </ProtectedRoute>
        } />
        <Route path="projects" element={
          <ProtectedRoute roles={['ADMIN']}>
            <ProjectManagement />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
            <FinancialReport />
          </ProtectedRoute>
        } />
        <Route path="attendance-report" element={
          <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
            <AttendanceReport />
          </ProtectedRoute>
        } />
        <Route path="worklog" element={
          <ProtectedRoute roles={['STAFF']}>
            <StaffWorklog />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
