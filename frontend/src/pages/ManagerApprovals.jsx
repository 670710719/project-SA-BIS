import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function ManagerApprovals() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}`)
      .then((response) => {
        if (!response.ok) throw new Error('ไม่สามารถโหลดผลการประเมินได้');
        return response.json();
      })
      .then((data) => {
        if (isMounted) setSubmissions(data.assessments || []);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      });
    return () => { isMounted = false; };
  }, [user?.username]);

  async function approveSubmission(id) {
    setApprovingId(id);
    setError('');
    try {
      const response = await fetch(`/api/manager/assessments/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'อนุมัติผลการประเมินไม่สำเร็จ');
      setSubmissions((current) => current.map((submission) => (
        submission.id === id ? data.submission : submission
      )));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApprovingId('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const pendingSubmissions = submissions.filter(({ status }) => status !== 'approved');
  const displayName = user?.name || user?.username || 'หัวหน้าแผนก';
  const avatar = displayName.charAt(0);

  return (
    <main className="assessment-history-page">
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

      <section className="assessment-history-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate('/manager-home')}>
          ← กลับหน้าหลัก
        </button>
        <div className="assessment-history-heading">
          <div>
            <span className="assessment-eyebrow">หัวหน้าแผนก</span>
            <h1>อนุมัติผลการประเมิน</h1>
            <p>ผลการประเมินตนเองของพนักงานที่ส่งมาเพื่อรอตรวจสอบ</p>
          </div>
          <span className="assessment-history-count">{pendingSubmissions.length} รายการรออนุมัติ</span>
        </div>

        {error && <p className="assessment-error" role="alert">{error}</p>}
        {pendingSubmissions.length === 0 ? (
          <section className="assessment-history-empty">
            <span aria-hidden="true">✓</span>
            <h2>ยังไม่มีผลการประเมินที่รออนุมัติ</h2>
            <p>เมื่อพนักงานส่งแบบประเมิน ผลการประเมินจะแสดงที่หน้านี้</p>
          </section>
        ) : (
          <div className="assessment-history-list">
            {pendingSubmissions.map((submission) => (
              <article className="assessment-history-card" key={submission.id}>
                <div className="assessment-history-card-heading">
                  <div>
                    <span className="assessment-eyebrow">พนักงาน</span>
                    <h2>{submission.employee}</h2>
                  </div>
                  <span className="assessment-status">รอตรวจสอบ</span>
                </div>
                <div className="assessment-history-summary">
                  <div><span>รหัสพนักงาน</span><strong>{submission.employeeId || 'ไม่พบข้อมูล'}</strong></div>
                  <div><span>รอบประเมิน</span><strong>ปี {submission.year}</strong></div>
                  <div><span>วันที่ส่ง</span><strong>{new Date(submission.submittedAt).toLocaleString('th-TH')}</strong></div>
                </div>
                <details className="assessment-history-details">
                  <summary>ดูรายละเอียดแบบประเมินตนเอง</summary>
                  <div className="assessment-history-detail-content">
                    <p>เป้าหมาย: {submission.assessment?.goals?.length || 0} รายการ</p>
                    <p>จุดเด่น: {submission.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                    <p>สิ่งที่ต้องพัฒนา: {submission.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                  </div>
                </details>
                <button
                  type="button"
                  className="assessment-submit-button"
                  disabled={approvingId === submission.id}
                  onClick={() => approveSubmission(submission.id)}
                >
                  {approvingId === submission.id ? 'กำลังอนุมัติ...' : 'อนุมัติผลการประเมิน'}
                </button>
              </article>
            ))}
          </div>
        )}
        <button type="button" className="logout-button" onClick={handleLogout}>↪ ออกจากระบบ</button>
      </section>
    </main>
  );
}

export default ManagerApprovals;
