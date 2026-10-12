import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { evaluationYear } from '../assessment/assessmentUtils';

function HrHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [selfSubmissions, setSelfSubmissions] = useState([]);
  const [managerReviews, setManagerReviews] = useState([]);
  const [dataError, setDataError] = useState('');
  const displayName = user?.name || user?.username || 'ฝ่ายทรัพยากรบุคคล';
  const avatar = displayName.charAt(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/employees'),
      fetch('/api/manager/assessments?type=employee'),
      fetch('/api/manager/assessments?type=manager'),
    ])
      .then(async ([employeesResponse, selfResponse, managerResponse]) => {
        if (!employeesResponse.ok || !selfResponse.ok || !managerResponse.ok) {
          throw new Error('ไม่สามารถโหลดภาพรวมรอบประเมินได้');
        }
        return Promise.all([
          employeesResponse.json(),
          selfResponse.json(),
          managerResponse.json(),
        ]);
      })
      .then(([employeeData, selfData, managerData]) => {
        if (!isMounted) return;
        setEmployeeCount(employeeData.count || employeeData.employees?.length || 0);
        setSelfSubmissions(selfData.assessments || []);
        setManagerReviews(managerData.assessments || []);
      })
      .catch((error) => {
        if (isMounted) setDataError(error.message);
      });
    return () => { isMounted = false; };
  }, []);

  const assessmentOverview = useMemo(() => {
    const submittedSelf = selfSubmissions.filter(({ status, assessment, year }) => year === evaluationYear && (
      status === 'submitted' || status === 'approved' || assessment?.status === 'submitted'
    ));
    const managerSubmitted = managerReviews.filter(({ status, assessment, year }) => year === evaluationYear && (
      status === 'submitted' || status === 'approved' || assessment?.status === 'submitted'
    ));
    const reviewedIds = new Set(managerSubmitted.map(({ employeeId }) => employeeId));
    const selfSubmittedIds = new Set(submittedSelf.map(({ employeeId }) => employeeId));
    const readyForApproval = submittedSelf.filter(({ employeeId }) => reviewedIds.has(employeeId)).length;
    const approved = submittedSelf.filter(({ status }) => status === 'approved').length;
    return {
      submitted: selfSubmittedIds.size,
      waitingManager: Math.max(selfSubmittedIds.size - reviewedIds.size, 0),
      readyForApproval,
      approved,
      pendingSelf: Math.max(employeeCount - selfSubmittedIds.size, 0),
    };
  }, [employeeCount, managerReviews, selfSubmissions]);
  const selfSubmissionPercent = employeeCount
    ? Math.min(100, Math.round((assessmentOverview.submitted / employeeCount) * 100))
    : 0;
  const managerReviewPercent = assessmentOverview.submitted
    ? Math.min(100, Math.round(((assessmentOverview.submitted - assessmentOverview.waitingManager) / assessmentOverview.submitted) * 100))
    : 0;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="home-menu-page hr-home-page">
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">HR</span>
          <div>
            <strong>ศูนย์ปฏิบัติงาน HR</strong>
            <small>PEOPLE & PERFORMANCE</small>
          </div>
        </div>
        <div className="home-user">
          <ThemeToggle />
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
            <button type="button" onClick={() => navigate('/hr-employees')}>▣ จัดการพนักงาน</button>
            <button type="button" onClick={() => navigate('/hr-approvals')}>✓ อนุมัติผลประเมิน</button>
            <button type="button" onClick={() => document.getElementById('hr-assessment-progress')?.scrollIntoView({ behavior: 'smooth' })}>▤ ความคืบหน้ารอบประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>
            ↪ ออกจากระบบ
          </button>
        </aside>

        <section className="home-content hr-dashboard-content">
          <div className="hr-dashboard-hero">
            <div>
              <span className="hr-dashboard-eyebrow">HR WORKSPACE · ปีประเมิน {evaluationYear}</span>
              <h1>สวัสดี, {displayName}</h1>
              <p>ติดตามข้อมูลบุคลากรและความคืบหน้าการประเมินของพนักงานทั้งองค์กร</p>
              <small>บัญชี HR ใช้สำหรับดูแลระบบและติดตามงาน ไม่ใช่บัญชีประเมินตนเอง</small>
            </div>
            <button type="button" className="hr-dashboard-cta" onClick={() => navigate('/hr-employees')}>
              <span aria-hidden="true">＋</span> จัดการรายชื่อพนักงาน
            </button>
          </div>

          <div className="home-stat-grid">
            <article><span>พนักงานในระบบ</span><strong>{employeeCount}</strong><small>ทุกแผนก</small></article>
            <article><span>พนักงานส่งแบบประเมิน</span><strong>{assessmentOverview.submitted}</strong><small>จาก {employeeCount} คน</small></article>
            <article><span>รอหัวหน้าประเมิน</span><strong>{assessmentOverview.waitingManager}</strong><small>ส่งแบบประเมินแล้ว</small></article>
            <article><span>รอพนักงานส่งแบบประเมิน</span><strong>{assessmentOverview.pendingSelf}</strong><small>ติดตามตามรอบประเมิน</small></article>
          </div>
          {dataError && <p className="assessment-error" role="alert">{dataError}</p>}

          <div className="hr-dashboard-panels">
            <section className="home-panel hr-progress-panel" id="hr-assessment-progress">
              <div className="home-panel-title">
                <div><h2>ความคืบหน้ารอบประเมินพนักงาน</h2><p>ปีประเมิน {evaluationYear} · สรุปเพื่อการติดตามโดย HR</p></div>
                <span className="hr-cycle-status">● รอบประเมิน</span>
              </div>
              <div className="hr-progress-item">
                <div className="hr-progress-heading"><span>พนักงานส่งแบบประเมินแล้ว</span><strong>{assessmentOverview.submitted} / {employeeCount} คน <small>{selfSubmissionPercent}%</small></strong></div>
                <div className="hr-progress-track"><span style={{ width: `${selfSubmissionPercent}%` }} /></div>
                <small className="hr-progress-caption">เป็นการติดตามแบบประเมินที่พนักงานส่ง ไม่ใช่แบบประเมินของบัญชี HR</small>
              </div>
              <div className="hr-progress-item">
                <div className="hr-progress-heading"><span>หัวหน้าส่งผลประเมินแล้ว</span><strong>{assessmentOverview.submitted - assessmentOverview.waitingManager} / {assessmentOverview.submitted} คน <small>{managerReviewPercent}%</small></strong></div>
                <div className="hr-progress-track manager-progress"><span style={{ width: `${managerReviewPercent}%` }} /></div>
              </div>
              <div className="hr-progress-legend">
                <span><i className="submitted-dot" /> อนุมัติแล้ว {assessmentOverview.approved}</span>
                <span><i className="ready-dot" /> พร้อมเข้าสู่ขั้นอนุมัติ {assessmentOverview.readyForApproval}</span>
              </div>
            </section>
            <section className="home-panel hr-action-panel">
              <div className="home-panel-title"><div><h2>ทางลัดสำหรับ HR</h2><p>งานจัดการบุคลากรและติดตามรอบประเมิน</p></div></div>
              <button type="button" className="hr-action-card" onClick={() => navigate('/hr-employees')}>
                <span className="hr-action-icon">♙</span><span><strong>จัดการพนักงาน</strong><small>ลงทะเบียน ค้นหา แก้ไขข้อมูล และดูบัญชีผู้ใช้</small></span><b aria-hidden="true">→</b>
              </button>
              <button type="button" className="hr-action-card" onClick={() => navigate('/hr-approvals')}>
                <span className="hr-action-icon">✓</span><span><strong>อนุมัติผลประเมิน</strong><small>ให้คะแนน เขียน feedback และส่งผลกลับพนักงาน</small></span><b aria-hidden="true">→</b>
              </button>
              <button type="button" className="hr-action-card" onClick={() => document.getElementById('hr-assessment-progress')?.scrollIntoView({ behavior: 'smooth' })}>
                <span className="hr-action-icon hr-action-icon-blue">▤</span><span><strong>ติดตามรอบประเมิน</strong><small>ดูจำนวนที่ส่งแล้ว รอหัวหน้าประเมิน และอนุมัติแล้ว</small></span><b aria-hidden="true">→</b>
              </button>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HrHome;
