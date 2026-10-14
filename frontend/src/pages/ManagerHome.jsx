import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { calculateAssessmentScore, evaluationYear } from '../assessment/assessmentUtils';

function ManagerHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [managerReviews, setManagerReviews] = useState([]);
  const [submissionError, setSubmissionError] = useState('');
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [employeeError, setEmployeeError] = useState('');
  const displayName = user?.name || user?.username || 'หัวหน้าแผนก';
  const avatar = displayName.charAt(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=employee`),
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=manager`),
    ])
      .then(async ([selfResponse, managerResponse]) => {
        if (!selfResponse.ok || !managerResponse.ok) throw new Error('ไม่สามารถโหลดแบบประเมินของทีมได้');
        return Promise.all([selfResponse.json(), managerResponse.json()]);
      })
      .then(([selfData, managerData]) => {
        if (isMounted) {
          setSubmissions(selfData.assessments || []);
          setManagerReviews(managerData.assessments || []);
        }
      })
      .catch((error) => {
        if (isMounted) setSubmissionError(error.message);
      });
    return () => { isMounted = false; };
  }, [user?.username]);

  useEffect(() => {
  let isMounted = true;
  fetch('/api/employees')
    .then((response) => {
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลลูกทีมได้');
      return response.json();
    })
    .then((data) => {
      if (isMounted) setTeamEmployees(data.employees || []);
    })
    .catch((error) => {
      if (isMounted) setEmployeeError(error.message);
    });
  return () => { isMounted = false; };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const currentSubmissions = submissions.filter(({ year }) => year === evaluationYear);
  const currentManagerReviews = managerReviews.filter(({ year }) => year === evaluationYear);
  const teamSize = teamEmployees.length;
  const evaluatedEmployeeIds = new Set(
    currentManagerReviews
      .filter(({ status, assessment }) => (
        status === 'submitted' || status === 'approved' || assessment?.status === 'submitted'
      ))
      .map(({ employeeId }) => employeeId)
      .filter(Boolean),
  );
  const evaluatedCount = Math.min(evaluatedEmployeeIds.size, teamSize);
  const pendingEvaluationCount = Math.max(teamSize - evaluatedCount, 0);
  const submittedSelfIds = new Set(
    currentSubmissions
      .filter(({ status, assessment }) => status === 'submitted' || status === 'approved' || assessment?.status === 'submitted')
      .map(({ employeeId }) => employeeId)
      .filter(Boolean),
  );
  const readyForApprovalCount = [...submittedSelfIds].filter((employeeId) => evaluatedEmployeeIds.has(employeeId)).length;
  const teamSummary = useMemo(() => {
    const assessments = managerReviews
      .filter(({ year }) => year === evaluationYear)
      .filter(({ status, assessment }) => status === 'submitted' || status === 'approved' || assessment?.status === 'submitted')
      .map(({ assessment }) => assessment)
      .filter(Boolean);
    const scoreRows = assessments.map(calculateAssessmentScore);
    const average = (scores) => {
      const values = scores.map(Number).filter(Number.isFinite);
      return values.length ? (values.reduce((total, score) => total + score, 0) / values.length).toFixed(2) : '-';
    };
    const overallScores = scoreRows.map(({ overall }) => overall);
    const goalsScores = scoreRows.map(({ goals }) => goals);
    const competencyScores = scoreRows.map(({ competencies }) => competencies);

    return {
      hasResults: assessments.length > 0 && overallScores.some((score) => score !== '-'),
      average: average(overallScores),
      goalsAverage: average(goalsScores),
      competencyAverage: average(competencyScores),
    };
  }, [managerReviews]);

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
            <span className="sidebar-arrow" aria-hidden="true">{isSidebarCollapsed ? '›' : '‹'}</span>
          </button>
          <nav className="home-navigation" aria-label="เมนูหัวหน้าแผนก">
            <button type="button" className="active">⌂ หน้าหลัก</button>
            <button type="button" onClick={() => navigate('/manager-assessment')}>▣ ประเมินพนักงาน</button>
            <button type="button" onClick={() => navigate('/manager-approvals')}>✓ อนุมัติผลการประเมิน</button>
            <button type="button" onClick={() => navigate('/manager-team-report')}>▤ รายงานความคืบหน้าการประเมิน</button>
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
            <span className="home-date">รอบประเมิน: ปี {evaluationYear}</span>
          </div>

          <div className="home-summary-grid">
            <article className="home-summary-card time-card">
              <span>รอบการประเมิน</span>
              <strong>ปี {evaluationYear}</strong>
              <small>ประเมินประจำปี</small>
            </article>
            <article className="home-summary-card status-card">
              <span>สถานะรอบประเมิน</span>
              <strong>กำลังดำเนินการ</strong>
              <small>ติดตามสถานะตามกำหนดการขององค์กร</small>
            </article>
          </div>

          <div className="home-stat-grid">
            <article><span>พนักงานในทีม</span><strong>{teamSize}</strong></article>
            <article><span>ประเมินแล้ว</span><strong>{evaluatedCount}</strong></article>
            <article><span>รอประเมิน</span><strong>{pendingEvaluationCount}</strong></article>
            <article><span>พร้อมอนุมัติ</span><strong>{readyForApprovalCount}</strong></article>
          </div>

          <div className="home-panels">
            <section className="home-panel">
              <div className="home-panel-title"><h2>งานที่ต้องดำเนินการ</h2><a href="#manager-tasks">ดูทั้งหมด</a></div>
              {submissionError && <p className="assessment-error" role="alert">{submissionError}</p>}
              {employeeError && <p className="assessment-error" role="alert">{employeeError}</p>}
              {currentSubmissions.filter(({ status, assessment }) => status === 'submitted' || status === 'approved' || assessment?.status === 'submitted').length === 0 ? (
                <div className="home-task"><span>อนุมัติผลการประเมิน</span><small>ยังไม่มีแบบประเมินที่พนักงานส่งเข้ามา</small><b>รอตรวจสอบ</b></div>
              ) : (
                currentSubmissions
                  .filter(({ status, assessment }) => status === 'submitted' || status === 'approved' || assessment?.status === 'submitted')
                  .map((submission) => {
                    const hasManagerReview = currentManagerReviews.some(({ employeeId, status }) => (
                      employeeId === submission.employeeId && (status === 'submitted' || status === 'approved')
                    ));
                    return (
                      <div className="home-task" key={submission.id}>
                        <span>{submission.employee}</span>
                        <small>{hasManagerReview ? 'หัวหน้าส่งผลประเมินแล้ว' : `ส่งแบบประเมินเมื่อ ${new Date(submission.submittedAt).toLocaleString('th-TH')}`}</small>
                        <b className={hasManagerReview ? 'success' : 'warning'}>{hasManagerReview ? 'พร้อมอนุมัติ' : 'รอประเมิน'}</b>
                      </div>
                    );
                  })
              )}
              <div className="home-task"><span>ติดตามการประเมินของทีม</span><small>พนักงาน {pendingEvaluationCount} คนยังไม่ได้ส่งแบบประเมิน</small><b>ติดตาม</b></div>
              <div className="home-task">
                <span>สรุปผลการประเมินทีม</span>
                <small>
                  {teamSummary.hasResults
                    ? `คะแนนเฉลี่ยของทีม ${teamSummary.average} / 5.00`
                    : 'ยังไม่มีผลการประเมิน'}
                </small>
                <b className={teamSummary.hasResults ? 'success' : ''}>
                  {teamSummary.hasResults ? 'มีผลประเมิน' : 'รอดำเนินการ'}
                </b>
              </div>
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>ความคืบหน้าการประเมินทีม</h2><button type="button" onClick={() => navigate('/manager-team-report')}>ดูรายงานความคืบหน้า</button></div>
              <div className="home-request">
                <span>ผลงานตามเป้าหมาย</span>
                <small>
                  {teamSummary.hasResults
                    ? `คะแนนเฉลี่ย ${teamSummary.goalsAverage} / 5.00`
                    : 'ยังไม่มีผลการประเมิน'}
                </small>
                <div><button type="button">ดูรายละเอียด</button></div>
              </div>
              <div className="home-request">
                <span>ทักษะและพฤติกรรม</span>
                <small>
                  {teamSummary.hasResults
                    ? `คะแนนเฉลี่ย ${teamSummary.competencyAverage} / 5.00`
                    : 'ยังไม่มีผลการประเมิน'}
                </small>
                <div><button type="button">ดูรายละเอียด</button></div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ManagerHome;
