import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../auth/AuthContext';
import { calculateAssessmentScore, evaluationYear } from '../assessment/assessmentUtils';

async function readJsonResponse(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    if (response.status === 404) {
      throw new Error('ไม่พบ API อนุมัติของ HR — backend ที่กำลังทำงานเป็นเวอร์ชันเก่า กรุณารีสตาร์ต backend');
    }
    throw new Error('เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON กรุณาตรวจสอบว่า backend API ทำงานอยู่');
  }
}

function HrApprovals() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [managerReviews, setManagerReviews] = useState([]);
  const [reviews, setReviews] = useState({});
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/hr/assessments'),
      fetch('/api/manager/assessments?type=manager'),
    ])
      .then(async ([pendingResponse, managerResponse]) => {
        const [pendingData, managerData] = await Promise.all([
          readJsonResponse(pendingResponse),
          readJsonResponse(managerResponse),
        ]);
        if (!pendingResponse.ok || !managerResponse.ok) {
          throw new Error(pendingData.message || managerData.message || 'ไม่สามารถโหลดรายการประเมินได้');
        }
        return [pendingData, managerData];
      })
      .then(([pendingData, managerData]) => {
        if (isMounted) {
          setSubmissions((pendingData.assessments || []).filter(({ year }) => year === evaluationYear));
          setManagerReviews(managerData.assessments || []);
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      });
    return () => { isMounted = false; };
  }, []);

  function updateReview(id, field, value) {
    setReviews((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function approveSubmission(submission) {
    const review = reviews[submission.id] || {};
    const score = Number(review.score);
    const feedback = review.feedback?.trim() || '';
    if (!Number.isFinite(score) || score < 1 || score > 5 || !feedback) {
      setError('กรุณาให้คะแนนระหว่าง 1 ถึง 5 และเขียน feedback ก่อนอนุมัติ');
      setSuccess('');
      return;
    }

    setSavingId(submission.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/hr/assessments/${encodeURIComponent(submission.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || 'อนุมัติผลการประเมินไม่สำเร็จ');
      setSubmissions((current) => current.filter(({ id }) => id !== submission.id));
      setSuccess(`อนุมัติและส่งผลการประเมินพร้อม feedback ให้ ${submission.employee} เรียบร้อยแล้ว`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName = user?.name || user?.username || 'ฝ่ายทรัพยากรบุคคล';
  const avatar = displayName.charAt(0);

  return (
    <main className="home-menu-page hr-home-page">
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">HR</span>
          <div><strong>ศูนย์ปฏิบัติงาน HR</strong><small>PEOPLE & PERFORMANCE</small></div>
        </div>
        <div className="home-user">
          <ThemeToggle />
          <span>{displayName}</span>
          <span className="home-avatar">{avatar}</span>
        </div>
      </header>

      <div className="home-layout">
        <aside className="home-sidebar">
          <div className="home-sidebar-user">
            <span className="home-avatar">{avatar}</span>
            <div><strong>{displayName}</strong><small>ฝ่ายทรัพยากรบุคคล (HR)</small></div>
          </div>
          <nav className="home-navigation" aria-label="เมนูฝ่ายทรัพยากรบุคคล">
            <button type="button" onClick={() => navigate('/hr-home')}>⌂ หน้าหลัก</button>
            <button type="button" onClick={() => navigate('/hr-employees')}>▣ จัดการพนักงาน</button>
            <button type="button" className="active">✓ อนุมัติผลประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>↪ ออกจากระบบ</button>
        </aside>

        <section className="home-content">
          <div className="assessment-history-heading">
            <div>
              <span className="assessment-eyebrow">ฝ่ายทรัพยากรบุคคล · ปี {evaluationYear}</span>
              <h1>อนุมัติผลการประเมิน</h1>
              <p>ตรวจทานผลจากหัวหน้า ให้คะแนนและเขียน feedback เพื่อส่งผลกลับไปยังพนักงาน</p>
            </div>
            <span className="assessment-history-count">{submissions.length} รายการรออนุมัติ</span>
          </div>

          {error && <p className="assessment-error" role="alert">{error}</p>}
          {success && <p className="assessment-success" role="status">{success}</p>}
          {submissions.length === 0 ? (
            <section className="assessment-history-empty">
              <span aria-hidden="true">✓</span>
              <h2>ไม่มีรายการรออนุมัติจาก HR</h2>
              <p>รายการจะแสดงที่นี่หลังจากหัวหน้าแผนกอนุมัติและส่งต่อมา</p>
            </section>
          ) : (
            <div className="assessment-history-list">
              {submissions.map((submission) => {
                const managerReview = managerReviews.find((review) => (
                  review.employeeId === submission.employeeId
                  && review.year === submission.year
                  && review.status === 'submitted'
                ));
                return (
                  <article className="assessment-history-card" key={submission.id}>
                    <div className="assessment-history-card-heading">
                      <div><span className="assessment-eyebrow">พนักงาน</span><h2>{submission.employee}</h2></div>
                      <span className="assessment-status submitted">รอ HR อนุมัติ</span>
                    </div>
                    <div className="assessment-history-summary">
                      <div><span>รหัสพนักงาน</span><strong>{submission.employeeId}</strong></div>
                      <div><span>รอบประเมิน</span><strong>ปี {submission.year}</strong></div>
                      <div><span>คะแนนประเมินตนเอง</span><strong>{calculateAssessmentScore(submission.assessment).overall} / 5</strong></div>
                      <div><span>คะแนนประเมินหัวหน้า</span><strong>{managerReview ? `${calculateAssessmentScore(managerReview.assessment).overall} / 5` : '-'}</strong></div>
                    </div>
                    <details className="assessment-history-details">
                      <summary>ดูข้อมูลและผลประเมินจากพนักงาน</summary>
                      <div className="assessment-history-detail-content">
                        <p><b>จุดแข็ง:</b> {submission.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                        <p><b>สิ่งที่ต้องพัฒนา:</b> {submission.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                        <p><b>เป้าหมายรอบถัดไป:</b> {submission.assessment?.nextGoals || 'ไม่ได้ระบุ'}</p>
                        {managerReview && (
                          <>
                            <h3>ผลประเมินจากหัวหน้า</h3>
                            <p>คะแนนรวม: {calculateAssessmentScore(managerReview.assessment).overall} / 5</p>
                            <p><b>จุดแข็ง:</b> {managerReview.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                            <p><b>สิ่งที่ต้องพัฒนา:</b> {managerReview.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                          </>
                        )}
                      </div>
                    </details>
                    <div className="assessment-summary-fields">
                      <label className="assessment-field">
                        <span>คะแนนผลการประเมิน HR (1–5)</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.01"
                          value={reviews[submission.id]?.score || ''}
                          onChange={(event) => updateReview(submission.id, 'score', event.target.value)}
                          required
                        />
                      </label>
                      <label className="assessment-field">
                        <span>Feedback สำหรับพนักงาน</span>
                        <textarea
                          value={reviews[submission.id]?.feedback || ''}
                          onChange={(event) => updateReview(submission.id, 'feedback', event.target.value)}
                          placeholder="เขียนข้อเสนอแนะและแนวทางพัฒนาสำหรับพนักงาน"
                          rows="4"
                          required
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="assessment-submit-button approval-action-button"
                      disabled={savingId === submission.id}
                      onClick={() => approveSubmission(submission)}
                    >
                      {savingId === submission.id ? 'กำลังส่งผลให้พนักงาน...' : 'อนุมัติและส่งผลกลับพนักงาน'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HrApprovals;
