import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import UserProfileButton from '../components/UserProfileButton';

function HrHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const displayName = user?.name || user?.username || 'ฝ่ายทรัพยากรบุคคล';
  const avatar = displayName.charAt(0);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="home-menu-page hr-home-page">
      <header className="home-topbar">
        <div className="home-brand">
          <div>
            <strong>ระบบประเมินพนักงาน</strong>
            <small>HR Performance Dashboard</small>
          </div>
        </div>
        <div className="home-user">
          <ThemeToggle />
          <UserProfileButton user={user} />
        </div>
      </header>

      <div className="home-layout">
        <aside className={`home-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="home-sidebar-user">
            <span className="home-avatar">{avatar}</span>
            <div>
              <strong>{displayName}</strong>
              <small>ฝ่ายทรัพยากรบุคคล (HR)</small>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
            title={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
          >
            <span className="sidebar-arrow" aria-hidden="true">{isSidebarCollapsed ? '›' : '‹'}</span>
          </button>
          <nav className="home-navigation" aria-label="เมนูฝ่ายทรัพยากรบุคคล">
            <button type="button" className="active">⌂ หน้าหลัก</button>
            <button type="button">▣ จัดการพนักงาน</button>
            <button type="button">✓ ตรวจสอบผลการประเมิน</button>
            <button type="button">฿ จัดการการปรับเงินเดือน</button>
            <button type="button">▤ รายงานภาพรวม</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>
            ↪ ออกจากระบบ
          </button>
        </aside>

        <section className="home-content">
          <div className="home-heading">
            <div>
              <h1>ยินดีต้อนรับ {displayName}</h1>
              <p>ภาพรวมการประเมินผลพนักงานทั้งองค์กร</p>
            </div>
            <span className="home-date">รอบประเมิน: ปี 2568</span>
          </div>

          <div className="home-summary-grid">
            <article className="home-summary-card time-card">
              <span>รอบการประเมิน</span>
              <strong>ปี 2568</strong>
              <small>ประเมินประจำปี</small>
            </article>
            <article className="home-summary-card status-card">
              <span>สถานะรอบประเมิน</span>
              <strong>กำลังดำเนินการ</strong>
              <small>ปิดรอบวันที่ 31 ธ.ค. 2568</small>
            </article>
          </div>

          <div className="home-stat-grid">
            <article><span>พนักงานทั้งหมด</span><strong>156</strong></article>
            <article><span>ประเมินแล้ว</span><strong>142</strong></article>
            <article><span>รอการประเมิน</span><strong>14</strong></article>
            <article><span>รออนุมัติผล</span><strong>7</strong></article>
          </div>

          <div className="home-panels">
            <section className="home-panel">
              <div className="home-panel-title"><h2>งานที่ต้องดำเนินการ</h2><a href="#hr-tasks">ดูทั้งหมด</a></div>
              <div className="home-task"><span>ตรวจสอบผลการประเมิน</span><small>มี 7 รายการรอตรวจสอบ</small><b className="warning">รอดำเนินการ</b></div>
              <div className="home-task"><span>ติดตามพนักงานที่ยังไม่ประเมิน</span><small>มี 14 คนยังไม่ได้ส่งแบบประเมิน</small><b>ติดตาม</b></div>
              <div className="home-task"><span>จัดทำรายงานประจำรอบ</span><small>กำหนดส่งภายใน 31 ธ.ค. 2568</small><b className="success">ตามกำหนด</b></div>
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>ภาพรวมผลการประเมิน</h2><a href="#hr-report">ดูรายงาน</a></div>
              <div className="home-request"><span>ผลการประเมินระดับ A</span><small>32 คน · 20.5% ของพนักงานทั้งหมด</small><div><button type="button">ดูรายละเอียด</button></div></div>
              <div className="home-request"><span>คำขอปรับเงินเดือน</span><small>มี 12 รายการรอพิจารณา</small><div><button type="button">ดูรายละเอียด</button></div></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HrHome;
