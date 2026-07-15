import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Auth Pages
import LandingPage from './pages/auth/LandingPage';
import AdminLogin from './pages/auth/AdminLogin';
import CoordinatorLogin from './pages/auth/CoordinatorLogin';
import StudentLogin from './pages/auth/StudentLogin';
import ChangePassword from './pages/auth/ChangePassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import StudentManagement from './pages/admin/StudentManagement';
import CoordinatorManagement from './pages/admin/CoordinatorManagement';
import TimetableManagement from './pages/admin/TimetableManagement';
import Reports from './pages/admin/Reports';
import Analytics from './pages/admin/Analytics';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import AttendanceMarking from './pages/coordinator/AttendanceMarking';
import MarksEntry from './pages/coordinator/MarksEntry';
import StudentList from './pages/coordinator/StudentList';
import TrainingSchedule from './pages/coordinator/TrainingSchedule';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import InternalTimetable from './pages/student/InternalTimetable';
import ExternalTimetable from './pages/student/ExternalTimetable';
import AttendanceSummary from './pages/student/AttendanceSummary';
import MarksView from './pages/student/MarksView';
import Feedback from './pages/student/Feedback';
import FeedbackHistory from './pages/student/FeedbackHistory';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#141d35',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#fff' },
            },
          }}
        />

        <ErrorBoundary>
          <Routes>
            {/* ─── Public Routes ─────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/coordinator/login" element={<CoordinatorLogin />} />
          <Route path="/student/login" element={<StudentLogin />} />

          {/* ─── Change Password (all roles) ───────────────── */}
          <Route path="/admin/change-password" element={<ProtectedRoute allowedRoles={['admin']}><ChangePassword /></ProtectedRoute>} />
          <Route path="/coordinator/change-password" element={<ProtectedRoute allowedRoles={['coordinator']}><ChangePassword /></ProtectedRoute>} />
          <Route path="/student/change-password" element={<ProtectedRoute allowedRoles={['student']}><ChangePassword /></ProtectedRoute>} />

          {/* ─── Admin Routes ──────────────────────────────── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><DepartmentManagement /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentManagement /></ProtectedRoute>} />
          <Route path="/admin/coordinators" element={<ProtectedRoute allowedRoles={['admin']}><CoordinatorManagement /></ProtectedRoute>} />
          <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['admin']}><TimetableManagement /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

          {/* ─── Coordinator Routes ────────────────────────── */}
          <Route path="/coordinator/dashboard" element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
          <Route path="/coordinator/attendance" element={<ProtectedRoute allowedRoles={['coordinator']}><AttendanceMarking /></ProtectedRoute>} />
          <Route path="/coordinator/marks" element={<ProtectedRoute allowedRoles={['coordinator']}><MarksEntry /></ProtectedRoute>} />
          <Route path="/coordinator/students" element={<ProtectedRoute allowedRoles={['coordinator']}><StudentList /></ProtectedRoute>} />
          <Route path="/coordinator/schedule" element={<ProtectedRoute allowedRoles={['coordinator']}><TrainingSchedule /></ProtectedRoute>} />

          {/* ─── Student Routes ────────────────────────────── */}
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
          <Route path="/student/timetable/internal" element={<ProtectedRoute allowedRoles={['student']}><InternalTimetable /></ProtectedRoute>} />
          <Route path="/student/timetable/external" element={<ProtectedRoute allowedRoles={['student']}><ExternalTimetable /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><AttendanceSummary /></ProtectedRoute>} />
          <Route path="/student/marks" element={<ProtectedRoute allowedRoles={['student']}><MarksView /></ProtectedRoute>} />
          <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={['student']}><Feedback /></ProtectedRoute>} />
          <Route path="/student/feedback/history" element={<ProtectedRoute allowedRoles={['student']}><FeedbackHistory /></ProtectedRoute>} />

          {/* ─── Fallback ──────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  </BrowserRouter>
  );
}

export default App;
