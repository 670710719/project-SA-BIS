import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const role = user?.role || 'ไม่พบข้อมูล';
  const profileFields = [
    ['ชื่อผู้ใช้งาน', displayName],
    ['รหัสพนักงาน', user?.employeeId || 'ไม่พบข้อมูล'],
    ['บทบาท', role],
    ['ฝ่าย', user?.department || 'ไม่พบข้อมูล'],
    ['ตำแหน่ง', user?.position || 'ไม่พบข้อมูล'],
  ];

  return (
    <main className="home-menu-page profile-page">
      <header className="home-topbar">
        <div className="home-brand">
          <div>
            <strong>ระบบประเมินพนักงาน</strong>
            <small>ข้อมูลส่วนตัว</small>
          </div>
        </div>
        <div className="home-user">
          <ThemeToggle />
          <span>{displayName}</span>
          <span className="home-avatar">{displayName.charAt(0)}</span>
        </div>
      </header>

      <section className="profile-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate(-1)}>
          ← กลับหน้าก่อนหน้า
        </button>
        <div className="profile-card">
          <div className="profile-heading">
            <span className="profile-avatar">{displayName.charAt(0)}</span>
            <div>
              <span className="assessment-eyebrow">ข้อมูลของฉัน</span>
              <h1>{displayName}</h1>
              <p>{role}</p>
            </div>
          </div>
          <div className="profile-details">
            {profileFields.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
