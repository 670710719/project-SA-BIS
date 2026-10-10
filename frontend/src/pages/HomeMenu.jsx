import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function HomeMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAssessmentAlert, setShowAssessmentAlert] = useState(true);
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const avatar = displayName.charAt(0);
  const assessmentKey = `self-assessment:${user?.employeeId || user?.username || 'user'}:2568`;
  let hasSubmittedAssessment = false;
  let assessmentStatusError = false;

  try {
    const savedAssessment = localStorage.getItem(assessmentKey);
    hasSubmittedAssessment = savedAssessment ? JSON.parse(savedAssessment).status === 'submitted' : false;
  } catch {
    hasSubmittedAssessment = false;
    assessmentStatusError = true;
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function goToSelfAssessment() {
    navigate('/self-assessment');
  }

  return (
    <main className="home-menu-page">
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
            <button type="button" className="active">⌂ หน้าหลัก</button>
            <button type="button" onClick={goToSelfAssessment}>▣ ประเมินตนเอง</button>
            <button type="button">✓ ผลการประเมิน</button>
            <button type="button">฿ ผลต่อเงินเดือน</button>
            <button type="button" onClick={() => navigate('/assessment-history')}>▤ ประวัติการประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>
            ↪ ออกจากระบบ
          </button>
        </aside>

        <section className="home-content">
          <div className="home-heading">
            <div>
              <h1>ยินดีต้อนรับ {displayName}</h1>
              <p>ภาพรวมผลการประเมินและการปรับเงินเดือน</p>
            </div>
            <span className="home-date">รอบประเมิน: ปี 2568</span>
          </div>
          {assessmentStatusError && (
            <p className="assessment-error" role="alert">
              ไม่สามารถตรวจสอบสถานะการประเมินที่บันทึกไว้ได้
            </p>
          )}

          <div className="home-summary-grid">
            <article className="home-summary-card time-card">
              <span>รอบการประเมิน</span>
              <strong>ปี 2568</strong>
              <small>ประเมินประจำปี</small>
            </article>
            <article className="home-summary-card status-card">
              <span>สถานะการประเมิน</span>
              <strong>กำลังประเมิน</strong>
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
              <div className="home-panel-title"><h2>สรุปผลการประเมิน</h2><a href="#all-tasks">ดูทั้งหมด</a></div>
              <div className="home-task"><span>ผลงานตามเป้าหมาย</span><small>คะแนนเฉลี่ย 4.25 / 5.00</small><b className="success">ดีมาก</b></div>
              <div className="home-task"><span>ทักษะและพฤติกรรม</span><small>คะแนนเฉลี่ย 3.80 / 5.00</small><b>ดี</b></div>
              <div className="home-task"><span>เกรดผลการประเมิน</span><small>รอผู้จัดการอนุมัติ</small><b className="warning">รอดำเนินการ</b></div>
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>ผลต่อการขึ้นเงินเดือน</h2><a href="#all-requests">ดูรายละเอียด</a></div>
              <div className="home-request"><span>เกรด A · ผลงานโดดเด่น</span><small>ปรับเงินเดือนแนะนำ 6.00%</small><div><button>ดูเกณฑ์</button></div></div>
              <div className="home-request"><span>เกรด B · ผลงานดีตามคาดหวัง</span><small>ปรับเงินเดือนแนะนำ 3.00%</small><div><button>ดูเกณฑ์</button></div></div>
            </section>
          </div>
        </section>
      </div>

      {showAssessmentAlert && !hasSubmittedAssessment && (
        <div className="assessment-alert-backdrop">
          <section
            className="assessment-alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="assessment-alert-title"
            aria-describedby="assessment-alert-description"
          >
            <button
              type="button"
              className="assessment-alert-close"
              onClick={() => setShowAssessmentAlert(false)}
              aria-label="ปิดการแจ้งเตือน"
            >
              ×
            </button>
            <span className="assessment-alert-icon" aria-hidden="true">!</span>
            <h2 id="assessment-alert-title">กรุณาประเมินตนเอง</h2>
            <p id="assessment-alert-description">
              จำเป็นต้องประเมินตนเองก่อนดำเนินการต่อ
            </p>
            <div className="assessment-alert-actions">
              <button type="button" className="assessment-alert-primary" onClick={goToSelfAssessment}>
                ไปหน้าประเมินตนเอง
              </button>
              <button
                type="button"
                className="assessment-alert-secondary"
                onClick={() => setShowAssessmentAlert(false)}
              >
                ปิด
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default HomeMenu;
