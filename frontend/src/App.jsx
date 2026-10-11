import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './pages/Login';
import HomeMenu from './pages/HomeMenu';
import ManagerHome from './pages/ManagerHome';
import HrHome from './pages/HrHome';
import SelfAssessment from './pages/SelfAssessment';
import AssessmentHistory from './pages/AssessmentHistory';
import ManagerApprovals from './pages/ManagerApprovals';
import Salary from './pages/Salary';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* เปิดมาที่หน้าแรก ให้เปลี่ยน URL ไปหน้า /login ทันที */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home-menu" element={<HomeMenu />} />
          <Route path="/manager-home" element={<ManagerHome />} />
          <Route path="/hr-home" element={<HrHome />} />
          <Route path="/self-assessment" element={<SelfAssessment />} />
          <Route path="/assessment-history" element={<AssessmentHistory />} />
          <Route path="/manager-approvals" element={<ManagerApprovals />} />
          {/* Route ของหน้าเงินเดือน: เปิดได้ที่ /salary */}
          <Route path="/salary" element={<Salary />} />
          <Route path="/dashboard" element={<Navigate to="/home-menu" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;