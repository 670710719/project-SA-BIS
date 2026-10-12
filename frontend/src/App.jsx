import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import HomeMenu from './pages/HomeMenu';
import ManagerHome from './pages/ManagerHome';
import HrHome from './pages/HrHome';
import EmployeeManagement from './pages/EmployeeManagement';
import SelfAssessment from './pages/SelfAssessment';
import PeerAssessment from './pages/PeerAssessment';
import AssessmentHistory from './pages/AssessmentHistory';
import AssessmentResults from './pages/AssessmentResults';
import ManagerApprovals from './pages/ManagerApprovals';
import ManagerAssessment from './pages/ManagerAssessment';
import Salary from './pages/Salary';
import ManagerTeamReport from './pages/ManagerTeamReport';
import HrApprovals from './pages/HrApprovals';

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) {
    const destination = user.role === 'hr'
      ? '/hr-home'
      : user.role === 'manager'
        ? '/manager-home'
        : '/home-menu';
    return <Navigate to={destination} replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* เปิดมาที่หน้าแรก ให้เปลี่ยน URL ไปหน้า /login ทันที */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home-menu" element={<RoleRoute roles={['employee']}><HomeMenu /></RoleRoute>} />
          <Route path="/manager-home" element={<RoleRoute roles={['manager']}><ManagerHome /></RoleRoute>} />
          <Route path="/hr-home" element={<RoleRoute roles={['hr']}><HrHome /></RoleRoute>} />
          <Route path="/hr-employees" element={<RoleRoute roles={['hr']}><EmployeeManagement /></RoleRoute>} />
          <Route path="/hr-approvals" element={<RoleRoute roles={['hr']}><HrApprovals /></RoleRoute>} />
          <Route path="/self-assessment" element={<RoleRoute roles={['employee']}><SelfAssessment /></RoleRoute>} />
          <Route path="/peer-assessment" element={<RoleRoute roles={['employee']}><PeerAssessment /></RoleRoute>} />
          <Route path="/assessment-history" element={<RoleRoute roles={['employee']}><AssessmentHistory /></RoleRoute>} />
          <Route path="/assessment-results" element={<RoleRoute roles={['employee']}><AssessmentResults /></RoleRoute>} />
          <Route path="/manager-approvals" element={<RoleRoute roles={['manager']}><ManagerApprovals /></RoleRoute>} />
          <Route path="/manager-assessment" element={<RoleRoute roles={['manager']}><ManagerAssessment /></RoleRoute>} />
          <Route path="/manager-team-report" element={<RoleRoute roles={['manager']}><ManagerTeamReport /></RoleRoute>} />
          {/* Route ของหน้าเงินเดือน: เปิดได้ที่ /salary */}
          <Route path="/salary" element={<RoleRoute roles={['employee', 'manager']}><Salary /></RoleRoute>} />
          <Route path="/dashboard" element={<Navigate to="/home-menu" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;