import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { calculateAssessmentScore } from '../assessment/assessmentUtils';

function ManagerApprovals() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submissions, setSubmissions] = useState([]);
  const [managerReviews, setManagerReviews] = useState([]);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=employee`),
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=manager`),
    ])
      .then(async ([employeeResponse, managerResponse]) => {
        if (!employeeResponse.ok || !managerResponse.ok) throw new Error('ไม่สามารถโหลดผลการประเมินได้');
        return Promise.all([employeeResponse.json(), managerResponse.json()]);
      })
      .then(([employeeData, managerData]) => {
        if (isMounted) {
          setSubmissions(employeeData.assessments || []);
          setManagerReviews(managerData.assessments || []);
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      });
    return () => { isMounted = false; };
  }, [user?.username]);

  async function approveSubmission(id) {
    const submission = submissions.find((item) => item.id === id);
    if (!submission) {
      setError('ไม่พบรายการประเมินที่ต้องการอนุมัติ กรุณาโหลดหน้าใหม่');
      return;
    }
    const managerReview = managerReviews.find((review) => (
      review.employeeId === submission?.employeeId
      && review.year === submission?.year
      && review.status === 'submitted'
    ));
    if (!managerReview) {
      window.alert('กรุณาประเมินพนักงานคนนี้ก่อน ระบบจะพาไปหน้าประเมินพนักงาน');
      navigate(`/manager-assessment?employeeId=${encodeURIComponent(submission.employeeId)}&forwardToHr=1`);
      return;
    }

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

  const pendingSubmissions = submissions.filter(({ status, assessment }) => (
    status === 'submitted' && assessment?.status === 'submitted'
  ));
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
          <ThemeToggle />
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
            <h1>ตรวจสอบและส่งผลให้ HR</h1>
            <p>ตรวจผลประเมินของพนักงาน แล้วส่งต่อให้ HR อนุมัติขั้นสุดท้าย</p>
          </div>
          <span className="assessment-history-count">{pendingSubmissions.length} รายการรออนุมัติ</span>
        </div>

        {location.state?.notice && <p className="assessment-success" role="status">{location.state.notice}</p>}
        {error && <p className="assessment-error" role="alert">{error}</p>}
        {pendingSubmissions.length === 0 ? (
          <section className="assessment-history-empty">
            <span aria-hidden="true">✓</span>
            <h2>ยังไม่มีผลการประเมินที่รออนุมัติ</h2>
            <p>เมื่อพนักงานส่งแบบประเมิน ผลการประเมินจะแสดงที่หน้านี้</p>
          </section>
        ) : (
          <div className="assessment-history-list">
            {pendingSubmissions.map((submission) => {
              const managerReview = managerReviews.find((review) => (
                review.employeeId === submission.employeeId
                && review.year === submission.year
                && review.status === 'submitted'
              ));
              const selfScore = calculateAssessmentScore(submission.assessment).overall;
              const managerScore = managerReview
                ? calculateAssessmentScore(managerReview.assessment).overall
                : '-';
              return (
              <article className="assessment-history-card" key={submission.id}>
                <div className="assessment-history-card-heading">
                  <div>
                    <span className="assessment-eyebrow">พนักงาน</span>
                    <h2>{submission.employee}</h2>
                  </div>
                  <span className={`assessment-status ${managerReview ? 'submitted' : ''}`}>{managerReview ? 'พร้อมส่งให้ HR' : 'รอหัวหน้าตรวจสอบ'}</span>
                </div>
                <div className="assessment-history-summary">
                  <div><span>รหัสพนักงาน</span><strong>{submission.employeeId || 'ไม่พบข้อมูล'}</strong></div>
                  <div><span>รอบประเมิน</span><strong>ปี {submission.year}</strong></div>
                  <div><span>วันที่ส่ง</span><strong>{new Date(submission.submittedAt).toLocaleString('th-TH')}</strong></div>
                  <div><span>คะแนนประเมินตนเอง</span><strong>{selfScore}{selfScore === '-' ? '' : ' / 5'}</strong></div>
                  <div><span>คะแนนประเมินหัวหน้า</span><strong>{managerScore}{managerScore === '-' ? '' : ' / 5'}</strong></div>
                </div>
                <details className="assessment-history-details">
                  <summary>ดูรายละเอียดแบบประเมินตนเอง</summary>
                  <div className="assessment-history-detail-content">
                    <p>เป้าหมาย: {submission.assessment?.goals?.length || 0} รายการ</p>
                    <p>จุดเด่น: {submission.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                    <p>สิ่งที่ต้องพัฒนา: {submission.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                  </div>
                </details>
                {managerReview ? (
                  <details className="assessment-history-details">
                    <summary>ดูผลประเมินและข้อเสนอแนะจากหัวหน้า</summary>
                    <div className="assessment-history-detail-content">
                      <p>คะแนนผลงาน: {calculateAssessmentScore(managerReview.assessment).goals} / 5</p>
                      <p>คะแนนทักษะและพฤติกรรม: {calculateAssessmentScore(managerReview.assessment).competencies} / 5</p>
                      <p>จุดแข็ง: {managerReview.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                      <p>สิ่งที่ต้องพัฒนา: {managerReview.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                    </div>
                  </details>
                ) : (
                  <p className="assessment-approval-note">ยังไม่มีผลประเมินแยกจากหัวหน้า สามารถส่งรายการให้ HR ตรวจและให้คะแนนได้</p>
                )}
                <button
                  type="button"
                  className="assessment-submit-button approval-action-button"
                  disabled={approvingId === submission.id}
                  onClick={() => approveSubmission(submission.id)}
                >
                  {approvingId === submission.id ? 'กำลังส่งให้ HR...' : 'อนุมัติและส่งให้ HR'}
                </button>
              </article>
              );
            })}
          </div>
        )}
        <button type="button" className="logout-button" onClick={handleLogout}>↪ ออกจากระบบ</button>
      </section>
    </main>
  );
}

export default ManagerApprovals;
