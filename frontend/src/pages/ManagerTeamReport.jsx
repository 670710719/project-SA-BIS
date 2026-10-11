import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import UserProfileButton from '../components/UserProfileButton';

function ManagerTeamReport() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [error, setError] = useState('');
  const displayName = user?.name || user?.username || 'หัวหน้าแผนก';
  const avatar = displayName.charAt(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/manager/assessments?manager=Tob&type=employee'),
      fetch('/api/employees'),
    ])
      .then(async ([assessmentResponse, employeeResponse]) => {
        if (!assessmentResponse.ok || !employeeResponse.ok) {
          throw new Error('ไม่สามารถโหลดรายงานความคืบหน้าการประเมินได้');
        }
        return Promise.all([assessmentResponse.json(), employeeResponse.json()]);
      })
      .then(([assessmentData, employeeData]) => {
        if (isMounted) {
          setSubmissions(assessmentData.assessments || []);
          setTeamEmployees(employeeData.employees || []);
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      });
    return () => { isMounted = false; };
  }, []);

  const report = useMemo(() => {
    const evaluated = submissions.filter(({ status, assessment }) => (
      status === 'approved' || assessment?.status === 'submitted'
    ));
    const scores = evaluated.flatMap(({ assessment }) => [
      ...(assessment?.goals || []).map(({ score }) => Number(score)).filter(Boolean),
      ...Object.values(assessment?.ratings || {}).map(({ score }) => Number(score)).filter(Boolean),
    ]);
    const average = scores.length
      ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2)
      : '-';
    const evaluatedIds = new Set(evaluated.map(({ employeeId }) => employeeId).filter(Boolean));
    const pending = Math.max(teamEmployees.length - evaluatedIds.size, 0);
    return {
      evaluated,
      average,
      pending,
      completion: teamEmployees.length ? Math.round((evaluatedIds.size / teamEmployees.length) * 100) : 0,
    };
  }, [submissions, teamEmployees]);

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
          <ThemeToggle />
          <UserProfileButton user={user} />
        </div>
      </header>

      <div className="home-layout">
        <aside className={`home-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="home-sidebar-user">
            <span className="home-avatar">{avatar}</span>
            <div><strong>{displayName}</strong><small>หัวหน้าแผนก</small></div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
          >
            <span className="sidebar-arrow" aria-hidden="true">{isSidebarCollapsed ? '›' : '‹'}</span>
          </button>
          <nav className="home-navigation" aria-label="เมนูหัวหน้าแผนก">
            <button type="button" onClick={() => navigate('/manager-home')}>⌂ หน้าหลัก</button>
            <button type="button" onClick={() => navigate('/manager-assessment')}>▣ ประเมินลูกทีม</button>
            <button type="button" onClick={() => navigate('/manager-approvals')}>✓ อนุมัติผลการประเมิน</button>
            <button type="button" className="active">▤ รายงานความคืบหน้าการประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>↪ ออกจากระบบ</button>
        </aside>

        <section className="home-content team-report-content">
          <div className="home-heading">
            <div>
              <span className="assessment-eyebrow">หัวหน้าแผนก</span>
              <h1>รายงานความคืบหน้าการประเมินของทีม</h1>
              <p>สรุปผลการดำเนินงานและภาพรวมการประเมินของทีม</p>
            </div>
            <span className="home-date">รอบประเมิน: ปี 2568</span>
          </div>

          {error && <p className="assessment-error" role="alert">{error}</p>}
          <div className="home-stat-grid team-report-stats">
            <article><span>สมาชิกในทีม</span><strong>{teamEmployees.length}</strong><small>คน</small></article>
            <article><span>ประเมินแล้ว</span><strong>{report.evaluated.length}</strong><small>รายการ</small></article>
            <article><span>รอดำเนินการ</span><strong>{report.pending}</strong><small>คน</small></article>
            <article><span>คะแนนเฉลี่ยทีม</span><strong>{report.average}</strong><small>จาก 5.00</small></article>
          </div>

          <div className="team-report-grid">
            <section className="home-panel">
              <div className="home-panel-title"><h2>ความคืบหน้าการประเมิน</h2><strong>{report.completion}%</strong></div>
              <div className="team-report-progress"><span style={{ width: `${report.completion}%` }} /></div>
              <p className="team-report-muted">ประเมินแล้ว {report.evaluated.length} จาก {teamEmployees.length} คน</p>
              <div className="team-report-notice">
                <strong>{report.pending ? 'ควรติดตามการประเมิน' : 'การประเมินครบถ้วนแล้ว'}</strong>
                <span>{report.pending ? `มีพนักงาน ${report.pending} คนที่ยังไม่ได้ส่งแบบประเมิน` : 'ไม่มีรายการค้างดำเนินการในรอบนี้'}</span>
              </div>
            </section>
            <section className="home-panel">
              <div className="home-panel-title"><h2>สถานะการดำเนินงาน</h2></div>
              <div className="team-report-status-row"><span>ผลประเมินที่อนุมัติแล้ว</span><b className="success">{submissions.filter(({ status }) => status === 'approved').length}</b></div>
              <div className="team-report-status-row"><span>รอหัวหน้าอนุมัติ</span><b className="warning">{submissions.filter(({ status }) => status !== 'approved').length}</b></div>
              <div className="team-report-status-row"><span>สถานะรอบประเมิน</span><b>กำลังดำเนินการ</b></div>
            </section>
          </div>

          <section className="home-panel team-report-table-panel">
            <div className="home-panel-title"><h2>รายชื่อและสถานะสมาชิกในทีม</h2><span>{teamEmployees.length} คน</span></div>
            <div className="team-report-table-wrap">
              <table className="team-report-table">
                <thead><tr><th>พนักงาน</th><th>รหัสพนักงาน</th><th>สถานะ</th><th>คะแนน</th></tr></thead>
                <tbody>
                  {teamEmployees.map((employee) => {
                    const result = report.evaluated.find(({ employeeId }) => employeeId === (employee.id || employee.employeeId));
                    const scores = result?.assessment?.goals?.map(({ score }) => Number(score)).filter(Boolean) || [];
                    const score = scores.length ? (scores.reduce((total, value) => total + value, 0) / scores.length).toFixed(2) : '-';
                    return (
                      <tr key={employee.id || employee.employeeId || employee.username}>
                        <td><strong>{employee.name || employee.username || 'ไม่ระบุชื่อ'}</strong></td>
                        <td>{employee.id || employee.employeeId || '-'}</td>
                        <td><span className={`team-report-badge ${result ? 'complete' : ''}`}>{result ? 'ประเมินแล้ว' : 'รอดำเนินการ'}</span></td>
                        <td>{score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default ManagerTeamReport;
