import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const competencyNames = {
  quality: 'คุณภาพและความถูกต้องของงาน',
  ownership: 'ความรับผิดชอบและการทำงานให้สำเร็จ',
  teamwork: 'การทำงานร่วมกับผู้อื่น',
  communication: 'การสื่อสารและการประสานงาน',
  improvement: 'การเรียนรู้และพัฒนาตนเอง',
};

function loadAssessmentHistory(employeeKey) {
  const keyPrefix = `self-assessment:${employeeKey}:`;
  const records = [];
  const errors = [];

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(keyPrefix)) continue;

      try {
        const assessment = JSON.parse(localStorage.getItem(key));
        if (assessment?.status === 'submitted') {
          records.push({
            ...assessment,
            year: key.slice(keyPrefix.length),
            submittedAt: assessment.submittedAt || assessment.updatedAt,
          });
        }
      } catch {
        errors.push(key);
      }
    }
  } catch {
    return {
      records: [],
      error: 'ไม่สามารถอ่านประวัติการประเมินจากเบราว์เซอร์ได้',
    };
  }

  records.sort((first, second) => new Date(second.submittedAt) - new Date(first.submittedAt));
  return {
    records,
    error: errors.length ? 'มีข้อมูลประเมินบางรายการอ่านไม่ได้ จึงไม่แสดงรายการที่เสียหาย' : '',
  };
}

function calculateAverage(assessment) {
  const scores = [
    ...(assessment.goals || []).map(({ score }) => Number(score)).filter(Boolean),
    ...Object.values(assessment.ratings || {}).map(({ score }) => Number(score)).filter(Boolean),
  ];
  return scores.length
    ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2)
    : '-';
}

function formatSubmissionDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'ไม่พบวันที่ส่ง' : date.toLocaleString('th-TH');
}

function AssessmentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const employeeKey = user?.employeeId || user?.username || 'user';
  const [history] = useState(() => loadAssessmentHistory(employeeKey));

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
            <span className="assessment-eyebrow">รายการที่ส่งเรียบร้อยแล้ว</span>
            <h1>ประวัติการประเมิน</h1>
            <p>ตรวจสอบแบบประเมินตนเองที่ส่งในแต่ละรอบ</p>
          </div>
          <span className="assessment-history-count">{history.records.length} รอบ</span>
        </div>

        {history.error && <p className="assessment-error" role="alert">{history.error}</p>}

        {history.records.length === 0 ? (
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
                  <span className="assessment-status submitted">ส่งแล้ว</span>
                </div>

                <div className="assessment-history-summary">
                  <div>
                    <span>วันที่ส่ง</span>
                    <strong>{formatSubmissionDate(record.submittedAt)}</strong>
                  </div>
                  <div>
                    <span>คะแนนเฉลี่ยที่ประเมินตนเอง</span>
                    <strong>{calculateAverage(record)}{calculateAverage(record) === '-' ? '' : ' / 5'}</strong>
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
                      {Object.entries(competencyNames).map(([id, name]) => (
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
