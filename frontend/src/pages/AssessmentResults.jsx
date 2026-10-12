import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../auth/AuthContext';
import { calculateAssessmentScore } from '../assessment/assessmentUtils';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'ไม่พบวันที่' : date.toLocaleString('th-TH');
}

function AssessmentResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const employeeKey = user?.employeeId || user?.username || 'user';
  const [results, setResults] = useState({ records: [], error: '', loading: true });

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/assessments?employeeId=${encodeURIComponent(employeeKey)}&type=employee`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'ไม่สามารถโหลดผลการประเมินจาก HR ได้');
        return data;
      })
      .then((data) => {
        const records = (data.assessments || [])
          .filter(({ status }) => status === 'approved')
          .sort((first, second) => Number(second.year) - Number(first.year));
        if (isMounted) setResults({ records, error: '', loading: false });
      })
      .catch((error) => {
        if (isMounted) setResults({ records: [], error: error.message, loading: false });
      });
    return () => { isMounted = false; };
  }, [employeeKey]);

  return (
    <main className="assessment-history-page">
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">CDG</span>
          <div>
            <strong>ระบบประเมินพนักงาน</strong>
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
            <span className="assessment-eyebrow">ผลสรุปที่ HR ส่งกลับ</span>
            <h1>ผลการประเมิน</h1>
            <p>แสดงเฉพาะรอบที่ HR อนุมัติ พร้อมคะแนนและ feedback สำหรับคุณ</p>
          </div>
          <span className="assessment-history-count">{results.records.length} รอบ</span>
        </div>

        {results.error && <p className="assessment-error" role="alert">{results.error}</p>}

        {results.loading ? (
          <section className="assessment-history-empty"><p>กำลังโหลดผลการประเมิน...</p></section>
        ) : results.records.length === 0 ? (
          <section className="assessment-history-empty">
            <span aria-hidden="true">✓</span>
            <h2>ยังไม่มีผลการประเมินจาก HR</h2>
            <p>เมื่อ HR ตรวจสอบและอนุมัติแล้ว คะแนนและ feedback จะแสดงที่หน้านี้</p>
          </section>
        ) : (
          <div className="assessment-history-list">
            {results.records.map((record) => {
              const selfScore = calculateAssessmentScore(record.assessment).overall;
              return (
                <article className="assessment-history-card" key={record.id}>
                  <div className="assessment-history-card-heading">
                    <div>
                      <span className="assessment-eyebrow">รอบประเมิน</span>
                      <h2>ปี {record.year}</h2>
                    </div>
                    <span className="assessment-status submitted">HR อนุมัติแล้ว</span>
                  </div>

                  <div className="assessment-history-summary">
                    <div>
                      <span>คะแนนสรุปจาก HR</span>
                      <strong>{record.hrFinalScore ?? '-'}{record.hrFinalScore == null ? '' : ' / 5'}</strong>
                    </div>
                    <div>
                      <span>วันที่ HR อนุมัติ</span>
                      <strong>{formatDate(record.hrReviewedAt)}</strong>
                    </div>
                    <div>
                      <span>คะแนนประเมินตนเอง</span>
                      <strong>{selfScore}{selfScore === '-' ? '' : ' / 5'}</strong>
                    </div>
                  </div>

                  <section className="assessment-history-details">
                    <h3>Feedback จาก HR</h3>
                    <div className="assessment-history-detail-content">
                      <p>{record.hrFeedback || 'ไม่มี feedback'}</p>
                    </div>
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default AssessmentResults;
