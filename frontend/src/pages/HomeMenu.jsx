import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import { evaluationYear } from '../assessment/assessmentUtils';


function HomeMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAssessmentAlert, setShowAssessmentAlert] = useState(true);
  const [assessmentRecord, setAssessmentRecord] = useState(null);
  const [assessmentError, setAssessmentError] = useState('');
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const avatar = displayName.charAt(0);
  const hasSubmittedAssessment = assessmentRecord?.assessment?.status === 'submitted';

  useEffect(() => {
    const employeeId = user?.employeeId || user?.username || 'user';
    fetch(`/api/assessments?employeeId=${encodeURIComponent(employeeId)}&year=${evaluationYear}&type=employee`)
      .then((response) => {
        if (!response.ok) throw new Error('ไม่สามารถโหลดผลการประเมินได้');
        return response.json();
      })
      .then((data) => {
        setAssessmentRecord(data.assessments?.[0] || null);
      })
      .catch((error) => {
        setAssessmentError(error.message);
      })
      .finally(() => {
        setIsAssessmentLoading(false);
      });
  }, [user?.employeeId, user?.username]);

  const assessmentSummary = useMemo(() => {
    const assessment = assessmentRecord?.assessment;
    if (!assessment || assessment.status !== 'submitted') {
      return { hasHrResult: false, hrFinalScore: null, hrFeedback: '', status: 'ยังไม่ได้ส่งแบบประเมิน' };
    }

    return {
      hasHrResult: assessmentRecord.status === 'approved',
      hrFinalScore: assessmentRecord.hrFinalScore,
      hrFeedback: assessmentRecord.hrFeedback,
      status: assessmentRecord.status === 'approved'
        ? 'HR อนุมัติแล้ว'
        : assessmentRecord.status === 'pending_hr'
          ? 'รอ HR อนุมัติ'
          : 'รอผู้จัดการอนุมัติ',
    };
  }, [assessmentRecord]);

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
          <div>
            <strong>ระบบประเมินพนักงาน</strong>
            <small>Employee Performance System</small>
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
              <small>
                {user?.role === 'hr'
                  ? 'ฝ่ายทรัพยากรบุคคล (HR)'
                  : user?.role === 'manager'
                    ? 'หัวหน้าแผนก'
                    : (user?.employeeId || 'ผู้ใช้งานระบบ')}
              </small>
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
          <nav className="home-navigation" aria-label="เมนูหลัก">
            <button type="button" className="active">⌂ หน้าหลัก</button>
            <button type="button" onClick={goToSelfAssessment}>▣ ประเมินตนเอง</button>
            <button type="button" onClick={() => navigate('/assessment-results')}>✓ ผลการประเมิน</button>
            <button type="button" onClick={() => navigate('/salary')}>
              ฿ ผลต่อเงินเดือน
            </button>
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
            <span className="home-date">รอบประเมิน: ปี {evaluationYear}</span>
          </div>
          {assessmentError && (
            <p className="assessment-error" role="alert">{assessmentError}</p>
          )}

          <div className="home-summary-grid">
            <article className="home-summary-card time-card">
              <span>รอบการประเมิน</span>
              <strong>ปี {evaluationYear}</strong>
              <small>ประเมินประจำปี</small>
            </article>
            <article className="home-summary-card status-card">
              <span>สถานะการประเมิน</span>
              <strong>{assessmentSummary.status}</strong>
              <small>{assessmentRecord ? 'ส่งแบบประเมินแล้ว' : 'ยังไม่มีแบบประเมินที่ส่ง'}</small>
            </article>
          </div>

          <div className="home-panels">
            <section className="home-panel">
              <div className="home-panel-title">
                <h2>ผลการประเมินจาก HR</h2>
                <button type="button" onClick={() => navigate('/assessment-results')}>ดูผล</button>
              </div>
              <div className="home-task">
                <span>คะแนนสรุปจาก HR</span>
                <small>
                  {assessmentSummary.hasHrResult
                    ? `${assessmentSummary.hrFinalScore ?? '-'}${assessmentSummary.hrFinalScore == null ? '' : ' / 5'}`
                    : 'ยังไม่มีผลสรุปจาก HR'}
                </small>
                <b className={assessmentSummary.hasHrResult ? 'success' : 'warning'}>
                  {assessmentSummary.hasHrResult ? 'ส่งผลกลับแล้ว' : 'รอดำเนินการ'}
                </b>
              </div>
              <div className="home-task">
                <span>สถานะผลการประเมิน</span>
                <small>{assessmentSummary.status}</small>
                <b className={assessmentRecord?.status === 'approved' ? 'success' : 'warning'}>
                  {assessmentRecord?.status === 'approved' ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                </b>
              </div>
              {assessmentSummary.hasHrResult && (
                <div className="home-task">
                  <span>Feedback จาก HR</span>
                  <small>{assessmentSummary.hrFeedback || 'ไม่มี feedback'}</small>
                </div>
              )}
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>ผลต่อการขึ้นเงินเดือน</h2><Link to="/salary">ดูรายละเอียด</Link></div>
              <div className="home-request"><span>เกรด A · ผลงานโดดเด่น</span><small>ปรับเงินเดือนแนะนำ 6.00%</small></div>
              <div className="home-request"><span>เกรด B · ผลงานดีตามคาดหวัง</span><small>ปรับเงินเดือนแนะนำ 3.00%</small></div>
            </section>
          </div>
        </section>
      </div>

      {showAssessmentAlert && !isAssessmentLoading && !hasSubmittedAssessment && (
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
