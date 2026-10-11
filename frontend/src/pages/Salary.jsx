import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const salaryGrades = [
  { grade: 'A', description: 'ผลงานโดดเด่น', percentage: '6.00%' },
  { grade: 'B', description: 'ผลงานดีตามคาดหวัง', percentage: '3.00%' },
  { grade: 'C', description: 'ผลงานตามมาตรฐาน', percentage: '1.50%' },
  { grade: 'D', description: 'ต้องปรับปรุงผลงาน', percentage: '0.00%' },
];

function Salary() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const avatar = displayName.charAt(0);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="home-menu-page">
      {/* ส่วนหัวด้านบน ใช้ layout เดียวกับหน้า Home */}
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">CDG</span>
          <div>
            <strong>ระบบประเมินตนเอง</strong>
            <small>Employee Performance System</small>
          </div>
        </div>
        <div className="home-user">
          <span>{displayName}</span>
          <span className="home-avatar">{avatar}</span>
        </div>
      </header>

      <div className="home-layout">
        {/* Sidebar เพิ่มให้หน้า Salary เหมือนหน้า Home */}
        <aside className={`home-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="home-sidebar-user">
            <span className="home-avatar">{avatar}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{user?.employeeId || 'ผู้ใช้งานระบบ'}</small>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
            title={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
          >
            {isSidebarCollapsed ? '›' : '‹'}
          </button>
          <nav className="home-navigation" aria-label="เมนูหลัก">
            <button type="button" onClick={() => navigate('/home-menu')}>⌂ หน้าหลัก</button>
            <button type="button">▣ ประเมินตนเอง</button>
            <button type="button">✓ ผลการประเมิน</button>
            <button type="button" className="active" onClick={() => navigate('/salary')}>
              ฿ ผลต่อเงินเดือน
            </button>
            <button type="button">▤ ประวัติการประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>
            ↪ ออกจากระบบ
          </button>
        </aside>

        <section className="home-content salary-content">
          <div className="home-heading">
            <div>
              <h1>ผลต่อการขึ้นเงินเดือน</h1>
              <p>ตัวอย่างอัตราการปรับเงินเดือนตามเกรดผลการประเมิน</p>
            </div>
            <span className="home-date">รอบประเมิน: ปี 2568</span>
          </div>

          <div className="salary-grade-grid">
            {salaryGrades.map(({ grade, description, percentage }) => (
              <article className="salary-grade-card" key={grade}>
                <span className="salary-grade-label">เกรด {grade}</span>
                <h2>{description}</h2>
                <p>อัตราปรับเงินเดือนตัวอย่าง</p>
                <strong>{percentage}</strong>
              </article>
            ))}
          </div>

          <p className="salary-example-note">
            หมายเหตุ: เปอร์เซ็นต์ข้างต้นเป็นข้อมูลตัวอย่างเท่านั้น อัตราจริงขึ้นอยู่กับเกณฑ์และการอนุมัติขององค์กร
          </p>

          <button
            type="button"
            className="salary-back-button"
            onClick={() => navigate('/home-menu')}
          >
            ← กลับหน้าหลัก
          </button>
        </section>
      </div>
    </main>
  );
}

export default Salary;
