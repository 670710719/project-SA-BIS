import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function ManagerHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionError, setSubmissionError] = useState('');
  const displayName = user?.name || user?.username || 'หัวหน้าแผนก';
  const avatar = displayName.charAt(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/manager/assessments?manager=Tob')
      .then((response) => {
        if (!response.ok) throw new Error('ไม่สามารถโหลดแบบประเมินของทีมได้');
        return response.json();
      })
      .then((data) => {
        if (isMounted) setSubmissions(data.assessments || []);
      })
      .catch((error) => {
        if (isMounted) setSubmissionError(error.message);
      });
    return () => { isMounted = false; };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="home-menu-page manager-home-page">
      <header className="home-topbar">
        <div className="home-brand">
          <div>
            <strong>ระบบประเมินพนักงาน</strong>
            <small>Manager Performance Dashboard</small>
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
              <small>หัวหน้าแผนก</small>
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
          <nav className="home-navigation" aria-label="เมนูหัวหน้าแผนก">
            <button type="button" className="active">⌂ หน้าหลัก</button>
            <button type="button">▣ ประเมินลูกทีม</button>
            <button type="button" onClick={() => navigate('/manager-approvals')}>✓ อนุมัติผลการประเมิน</button>
            <button type="button">▤ รายงานทีม</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>
            ↪ ออกจากระบบ
          </button>
        </aside>

        <section className="home-content">
          <div className="home-heading">
            <div>
              <h1>ยินดีต้อนรับ {displayName}</h1>
              <p>ภาพรวมการประเมินผลของทีมในความรับผิดชอบ</p>
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
            <article><span>พนักงานในทีม</span><strong>24</strong></article>
            <article><span>ประเมินแล้ว</span><strong>18</strong></article>
            <article><span>รอประเมิน</span><strong>6</strong></article>
            <article><span>รออนุมัติ</span><strong>{submissions.length}</strong></article>
          </div>

          <div className="home-panels">
            <section className="home-panel">
              <div className="home-panel-title"><h2>งานที่ต้องดำเนินการ</h2><a href="#manager-tasks">ดูทั้งหมด</a></div>
              {submissionError && <p className="assessment-error" role="alert">{submissionError}</p>}
              {submissions.length === 0 ? (
                <div className="home-task"><span>อนุมัติผลการประเมิน</span><small>ยังไม่มีแบบประเมินที่พนักงานส่งเข้ามา</small><b>รอตรวจสอบ</b></div>
              ) : (
                submissions.map((submission) => (
                  <div className="home-task" key={submission.id}>
                    <span>{submission.employee}</span>
                    <small>ส่งแบบประเมินเมื่อ {new Date(submission.submittedAt).toLocaleString('th-TH')}</small>
                    <b className="warning">รอตรวจสอบ</b>
                  </div>
                ))
              )}
              <div className="home-task"><span>ติดตามการประเมินของทีม</span><small>พนักงาน 6 คนยังไม่ได้ส่งแบบประเมิน</small><b>ติดตาม</b></div>
              <div className="home-task"><span>สรุปผลการประเมินทีม</span><small>คะแนนเฉลี่ยของทีม 4.12 / 5.00</small><b className="success">ดีมาก</b></div>
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>ภาพรวมทีม</h2><a href="#team-report">ดูรายงาน</a></div>
              <div className="home-request"><span>ผลงานตามเป้าหมาย</span><small>ผ่านเกณฑ์ 20 จาก 24 คน</small><div><button type="button">ดูรายละเอียด</button></div></div>
              <div className="home-request"><span>ทักษะและพฤติกรรม</span><small>คะแนนเฉลี่ย 3.95 / 5.00</small><div><button type="button">ดูรายละเอียด</button></div></div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ManagerHome;
