import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../auth/AuthContext';
import { calculateAssessmentScore, competencies } from '../assessment/assessmentUtils';

function formatSubmissionDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'ไม่พบวันที่ส่ง' : date.toLocaleString('th-TH');
}

function AssessmentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const employeeKey = user?.employeeId || user?.username || 'user';
  const [history, setHistory] = useState({ records: [], error: '', loading: true });

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/assessments?employeeId=${encodeURIComponent(employeeKey)}&type=employee`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'ไม่สามารถโหลดประวัติการประเมินได้');
        return data;
      })
      .then((data) => {
        const records = (data.assessments || [])
          .filter(({ status, assessment }) => (
            status === 'submitted' || status === 'pending_hr' || status === 'approved' || assessment?.status === 'submitted'
          ))
          .map((submission) => ({
            ...submission.assessment,
            year: submission.year,
            status: submission.status,
            submittedAt: submission.submittedAt || submission.assessment?.submittedAt || submission.assessment?.updatedAt,
          }))
          .sort((first, second) => Number(second.year) - Number(first.year));
        if (isMounted) setHistory({ records, error: '', loading: false });
      })
      .catch((requestError) => {
        if (isMounted) setHistory({ records: [], error: requestError.message, loading: false });
      });
    return () => { isMounted = false; };
  }, [employeeKey]);

  return (
    <main className="assessment-history-page">
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">CDG</span>
          <div>
            <strong>ระบบประเมินตนเอง</strong>
            <small>Employee Performance System</small>
          </div>
        </div>
        <div className="home-user">
          <ThemeToggle />
          <span>{displayName}</span>
          <span className="home-avatar">{displayName.charAt(0)}</span>
        </div>
      </header>

      <section className="assessment-history-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate('/home-menu')}>
          ← กลับหน้าหลัก
        </button>

        <div className="assessment-history-heading">
          <div>
            <span className="assessment-eyebrow">แบบประเมินที่พนักงานส่งให้หัวหน้า</span>
            <h1>ประวัติการประเมิน</h1>
            <p>ประวัติข้อมูลที่คุณกรอกและส่งให้หัวหน้า โดยไม่รวมผลสรุปจาก HR</p>
          </div>
          <span className="assessment-history-count">{history.records.length} รอบ</span>
        </div>

        {history.error && <p className="assessment-error" role="alert">{history.error}</p>}

        {history.loading ? (
          <section className="assessment-history-empty"><p>กำลังโหลดประวัติการประเมิน...</p></section>
        ) : history.records.length === 0 ? (
          <section className="assessment-history-empty">
            <span aria-hidden="true">▤</span>
            <h2>ยังไม่มีประวัติการประเมิน</h2>
            <p>เมื่อส่งแบบประเมินเรียบร้อยแล้ว รายการจะปรากฏในหน้านี้</p>
            <button type="button" className="assessment-submit-button" onClick={() => navigate('/self-assessment')}>
              ไปหน้าประเมินตนเอง
            </button>
          </section>
        ) : (
          <div className="assessment-history-list">
            {history.records.map((record) => (
              <article className="assessment-history-card" key={record.year}>
                <div className="assessment-history-card-heading">
                  <div>
                    <span className="assessment-eyebrow">รอบประเมิน</span>
                    <h2>ปี {record.year}</h2>
                  </div>
                  <span className={`assessment-status ${record.status === 'approved' ? 'submitted' : ''}`}>
                    {record.status === 'approved'
                      ? 'HR ส่งผลกลับแล้ว'
                      : record.status === 'pending_hr'
                        ? 'รอ HR อนุมัติ'
                        : 'ส่งแล้ว · รอตรวจสอบ'}
                  </span>
                </div>

                <div className="assessment-history-summary">
                  <div>
                    <span>วันที่ส่ง</span>
                    <strong>{formatSubmissionDate(record.submittedAt)}</strong>
                  </div>
                  <div>
                    <span>คะแนนเฉลี่ยที่ประเมินตนเอง</span>
                    <strong>{calculateAssessmentScore(record).overall}{calculateAssessmentScore(record).overall === '-' ? '' : ' / 5'}</strong>
                  </div>
                  <div>
                    <span>จำนวนเป้าหมาย</span>
                    <strong>{record.goals?.length || 0} เป้าหมาย</strong>
                  </div>
                </div>

                <details className="assessment-history-details">
                  <summary>ดูรายละเอียดแบบประเมิน</summary>
                  <div className="assessment-history-detail-content">
                    <h3>ผลงานตามเป้าหมาย</h3>
                    {record.goals?.length ? record.goals.map((goal, index) => (
                      <section className="assessment-history-goal" key={goal.id || index}>
                        <strong>เป้าหมายที่ {index + 1} · คะแนน {goal.score || '-'}/5</strong>
                        <p><b>เป้าหมาย:</b> {goal.target || 'ไม่ได้ระบุ'}</p>
                        <p><b>ผลลัพธ์:</b> {goal.result || 'ไม่ได้ระบุ'}</p>
                        {goal.evidence && <p><b>หลักฐาน:</b> {goal.evidence}</p>}
                      </section>
                    )) : <p>ไม่มีข้อมูลเป้าหมาย</p>}

                    <h3>ทักษะและพฤติกรรม</h3>
                    <div className="assessment-history-ratings">
                      {competencies.map(({ id, label: name }) => (
                        <div key={id}>
                          <span>{name}</span>
                          <strong>{record.ratings?.[id]?.score || '-'}/5</strong>
                          {record.ratings?.[id]?.example && <p>{record.ratings[id].example}</p>}
                        </div>
                      ))}
                    </div>

                    <h3>สรุปและแผนพัฒนา</h3>
                    <p><b>จุดแข็งและความสำเร็จ:</b> {record.strengths || 'ไม่ได้ระบุ'}</p>
                    <p><b>สิ่งที่ต้องการพัฒนา:</b> {record.improvements || 'ไม่ได้ระบุ'}</p>
                    <p><b>เป้าหมายรอบถัดไป:</b> {record.nextGoals || 'ไม่ได้ระบุ'}</p>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AssessmentHistory;
