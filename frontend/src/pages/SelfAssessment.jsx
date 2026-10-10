import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const evaluationYear = '2568';
const competencies = [
  { id: 'quality', label: 'คุณภาพและความถูกต้องของงาน' },
  { id: 'ownership', label: 'ความรับผิดชอบและการทำงานให้สำเร็จ' },
  { id: 'teamwork', label: 'การทำงานร่วมกับผู้อื่น' },
  { id: 'communication', label: 'การสื่อสารและการประสานงาน' },
  { id: 'improvement', label: 'การเรียนรู้และพัฒนาตนเอง' },
];

function createEmptyAssessment() {
  return {
    goals: [{ id: 1, target: '', result: '', score: '', evidence: '' }],
    ratings: Object.fromEntries(competencies.map(({ id }) => [id, { score: '', example: '' }])),
    strengths: '',
    improvements: '',
    nextGoals: '',
    status: 'draft',
    updatedAt: null,
    submittedAt: null,
  };
}

function RatingOptions({ value, onChange, required = false, disabled = false, id }) {
  return (
    <select id={id} value={value} onChange={onChange} required={required} disabled={disabled}>
      <option value="">เลือกคะแนน</option>
      <option value="1">1 - ต้องปรับปรุง</option>
      <option value="2">2 - ต่ำกว่าความคาดหวัง</option>
      <option value="3">3 - เป็นไปตามความคาดหวัง</option>
      <option value="4">4 - สูงกว่าความคาดหวัง</option>
      <option value="5">5 - โดดเด่น</option>
    </select>
  );
}

function SelfAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const storageKey = `self-assessment:${user?.employeeId || user?.username || 'user'}:${evaluationYear}`;
  const [storedState] = useState(() => {
    try {
      const savedAssessment = localStorage.getItem(storageKey);
      return {
        assessment: savedAssessment
          ? { ...createEmptyAssessment(), ...JSON.parse(savedAssessment) }
          : createEmptyAssessment(),
        error: '',
      };
    } catch {
      return {
        assessment: createEmptyAssessment(),
        error: 'ไม่สามารถอ่านแบบประเมินที่บันทึกไว้ได้ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์',
      };
    }
  });
  const [assessment, setAssessment] = useState(storedState.assessment);
  const [storageError, setStorageError] = useState(storedState.error);
  const [message, setMessage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitConfirmationOpen, setIsSubmitConfirmationOpen] = useState(false);

  const averageScore = useMemo(() => {
    const scores = [
      ...assessment.goals.map(({ score }) => Number(score)).filter(Boolean),
      ...Object.values(assessment.ratings).map(({ score }) => Number(score)).filter(Boolean),
    ];
    return scores.length ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2) : '-';
  }, [assessment.goals, assessment.ratings]);

  function updateAssessment(updater) {
    setAssessment((current) => (typeof updater === 'function' ? updater(current) : updater));
    setMessage('');
  }

  function updateGoal(goalId, field, value) {
    updateAssessment((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, [field]: value } : goal),
    }));
  }

  function updateRating(id, field, value) {
    updateAssessment((current) => ({
      ...current,
      ratings: { ...current.ratings, [id]: { ...current.ratings[id], [field]: value } },
    }));
  }

  function saveAssessment(status) {
    const updatedAssessment = {
      ...assessment,
      status,
      updatedAt: new Date().toISOString(),
      submittedAt: status === 'submitted' ? new Date().toISOString() : null,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedAssessment));
      setAssessment(updatedAssessment);
      setMessage(status === 'submitted' ? 'ส่งแบบประเมินเรียบร้อยแล้ว' : 'บันทึกร่างเรียบร้อยแล้ว');
      setStorageError('');
      setIsSubmitConfirmationOpen(false);
    } catch {
      setStorageError('ไม่สามารถบันทึกแบบประเมินได้ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์แล้วลองอีกครั้ง');
    }
  }

  function addGoal() {
    updateAssessment((current) => ({
      ...current,
      goals: [...current.goals, { id: Date.now(), target: '', result: '', score: '', evidence: '' }],
    }));
  }

  function removeGoal(goalId) {
    updateAssessment((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== goalId),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitConfirmationOpen(true);
  }

  const isSubmitted = assessment.status === 'submitted';

  return (
    <main className="self-assessment-page">
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

      <section className="self-assessment-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate('/home-menu')}>
          ← กลับหน้าหลัก
        </button>

        <div className="assessment-page-heading">
          <div>
            <span className="assessment-eyebrow">แบบประเมินประจำปี</span>
            <h1>ประเมินตนเอง</h1>
            <p>ทบทวนผลงานและพัฒนาการของคุณในรอบการประเมิน</p>
          </div>
          <span className={`assessment-status ${isSubmitted ? 'submitted' : ''}`}>
            {isSubmitted ? 'ส่งแบบประเมินแล้ว' : 'กำลังกรอก'}
          </span>
        </div>

        <section className="assessment-employee-card" aria-label="ข้อมูลพนักงาน">
          <div><span>ชื่อพนักงาน</span><strong>{displayName}</strong></div>
          <div><span>รหัสพนักงาน</span><strong>{user?.employeeId || 'ไม่พบข้อมูล'}</strong></div>
          <div><span>รอบประเมิน</span><strong>ปี {evaluationYear}</strong></div>
        </section>

        <form className="assessment-form" onSubmit={handleSubmit}>
            <section className="assessment-section">
              <div className="assessment-section-heading">
                <span className="assessment-step">1</span>
                <div>
                  <h2>ผลงานตามเป้าหมาย</h2>
                  <p>ระบุเป้าหมาย ผลลัพธ์ที่ทำได้ และคะแนนประเมินตนเอง</p>
                </div>
              </div>
              {assessment.goals.map((goal, index) => (
                <fieldset className="assessment-goal" key={goal.id}>
                  <legend>
                    เป้าหมายที่ {index + 1}
                    {assessment.goals.length > 1 && !isSubmitted && (
                      <button type="button" className="assessment-remove-button" onClick={() => removeGoal(goal.id)}>
                        ลบเป้าหมาย
                      </button>
                    )}
                  </legend>
                  <label className="assessment-field">
                    <span>เป้าหมายหรือหน้าที่สำคัญ</span>
                    <textarea
                      value={goal.target}
                      onChange={(event) => updateGoal(goal.id, 'target', event.target.value)}
                      placeholder="ระบุเป้าหมายที่ได้รับมอบหมาย"
                      required
                      disabled={isSubmitted}
                      rows="2"
                    />
                  </label>
                  <label className="assessment-field">
                    <span>ผลลัพธ์ที่ทำได้</span>
                    <textarea
                      value={goal.result}
                      onChange={(event) => updateGoal(goal.id, 'result', event.target.value)}
                      placeholder="อธิบายผลลัพธ์หรือความสำเร็จที่เกิดขึ้น"
                      required
                      disabled={isSubmitted}
                      rows="3"
                    />
                  </label>
                  <div className="assessment-field-grid">
                    <label className="assessment-field">
                      <span>คะแนนประเมินตนเอง</span>
                      <RatingOptions
                        id={`goal-score-${goal.id}`}
                        value={goal.score}
                        onChange={(event) => updateGoal(goal.id, 'score', event.target.value)}
                        required
                        disabled={isSubmitted}
                      />
                    </label>
                    <label className="assessment-field">
                      <span>หลักฐานหรือข้อมูลประกอบ <small>(ถ้ามี)</small></span>
                      <input
                        value={goal.evidence}
                        onChange={(event) => updateGoal(goal.id, 'evidence', event.target.value)}
                        placeholder="เช่น ตัวเลขผลงาน ลิงก์ หรือรายละเอียด"
                        disabled={isSubmitted}
                      />
                    </label>
                  </div>
                </fieldset>
              ))}
              {!isSubmitted && (
                <button type="button" className="assessment-add-button" onClick={addGoal}>
                  + เพิ่มเป้าหมาย
                </button>
              )}
            </section>

            <section className="assessment-section">
              <div className="assessment-section-heading">
                <span className="assessment-step">2</span>
                <div>
                  <h2>ทักษะและพฤติกรรม</h2>
                  <p>ให้คะแนนตามพฤติกรรมการทำงาน พร้อมตัวอย่างประกอบ</p>
                </div>
              </div>
              <div className="assessment-rating-guide">
                <strong>เกณฑ์คะแนน</strong>
                <span>1 ต้องปรับปรุง</span><span>2 ต่ำกว่าคาดหวัง</span><span>3 ตามคาดหวัง</span>
                <span>4 สูงกว่าคาดหวัง</span><span>5 โดดเด่น</span>
              </div>
              <div className="assessment-competencies">
                {competencies.map(({ id, label }, index) => (
                  <div className="assessment-competency" key={id}>
                    <label className="assessment-field">
                      <span>{index + 1}. {label}</span>
                      <RatingOptions
                        id={`competency-${id}`}
                        value={assessment.ratings[id]?.score || ''}
                        onChange={(event) => updateRating(id, 'score', event.target.value)}
                        required
                        disabled={isSubmitted}
                      />
                    </label>
                    <label className="assessment-field">
                      <span>ตัวอย่างหรือเหตุการณ์ประกอบ <small>(ถ้ามี)</small></span>
                      <input
                        value={assessment.ratings[id]?.example || ''}
                        onChange={(event) => updateRating(id, 'example', event.target.value)}
                        placeholder="อธิบายสั้น ๆ ว่าคะแนนนี้สะท้อนจากอะไร"
                        disabled={isSubmitted}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="assessment-section">
              <div className="assessment-section-heading">
                <span className="assessment-step">3</span>
                <div>
                  <h2>สรุปและแผนพัฒนา</h2>
                  <p>สรุปสิ่งที่ทำได้ดีและสิ่งที่ต้องการพัฒนาในรอบถัดไป</p>
                </div>
              </div>
              <div className="assessment-summary-fields">
                <label className="assessment-field">
                  <span>จุดแข็งและความสำเร็จที่อยากนำเสนอ</span>
                  <textarea
                    value={assessment.strengths}
                    onChange={(event) => updateAssessment((current) => ({ ...current, strengths: event.target.value }))}
                    placeholder="เล่าถึงผลงานหรือจุดแข็งที่ภูมิใจ"
                    required
                    disabled={isSubmitted}
                    rows="3"
                  />
                </label>
                <label className="assessment-field">
                  <span>สิ่งที่ต้องการพัฒนา</span>
                  <textarea
                    value={assessment.improvements}
                    onChange={(event) => updateAssessment((current) => ({ ...current, improvements: event.target.value }))}
                    placeholder="ระบุทักษะหรือเรื่องที่ต้องการพัฒนาเพิ่มเติม"
                    required
                    disabled={isSubmitted}
                    rows="3"
                  />
                </label>
                <label className="assessment-field">
                  <span>เป้าหมายหรือการสนับสนุนที่ต้องการในรอบถัดไป</span>
                  <textarea
                    value={assessment.nextGoals}
                    onChange={(event) => updateAssessment((current) => ({ ...current, nextGoals: event.target.value }))}
                    placeholder="เช่น เป้าหมายใหม่ การอบรม หรือเครื่องมือที่จำเป็น"
                    required
                    disabled={isSubmitted}
                    rows="3"
                  />
                </label>
              </div>
            </section>

            <section className="assessment-score-summary" aria-live="polite">
              <div><span>คะแนนเฉลี่ยที่ให้ตนเอง</span><strong>{averageScore}<small>{averageScore === '-' ? '' : ' / 5'}</small></strong></div>
              <p>คะแนนเฉลี่ยนี้เป็นข้อมูลสรุปเบื้องต้น ไม่ใช่ผลการประเมินขั้นสุดท้าย</p>
            </section>

            {storageError && <p className="assessment-error" role="alert">{storageError}</p>}
            {message && <p className="assessment-message" role="status">{message}</p>}

            <div className="assessment-form-actions">
              {!isSubmitted && (
                <>
                  <button type="button" className="assessment-draft-button" onClick={() => saveAssessment('draft')}>
                    บันทึกร่าง
                  </button>
                  <button type="button" className="assessment-preview-button" onClick={() => setIsPreviewOpen(true)}>
                    ดูตัวอย่าง
                  </button>
                  <button type="submit" className="assessment-submit-button">ส่งแบบประเมิน</button>
                </>
              )}
              {isSubmitted && (
                <button type="button" className="assessment-draft-button" onClick={() => navigate('/home-menu')}>
                  กลับหน้าหลัก
                </button>
              )}
            </div>
            {assessment.updatedAt && (
              <p className="assessment-last-saved">
                {isSubmitted ? 'ส่งเมื่อ' : 'บันทึกล่าสุด'}: {new Date(assessment.submittedAt || assessment.updatedAt).toLocaleString('th-TH')}
              </p>
            )}
        </form>
      </section>

      {(isPreviewOpen || isSubmitConfirmationOpen) && (
        <div className="assessment-dialog-backdrop">
          <section className="assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="assessment-dialog-title">
            <h2 id="assessment-dialog-title">{isPreviewOpen ? 'ตรวจทานแบบประเมิน' : 'ยืนยันการส่งแบบประเมิน'}</h2>
            <p>
              {isPreviewOpen
                ? `คะแนนเฉลี่ยปัจจุบัน ${averageScore}${averageScore === '-' ? '' : ' / 5'} — ตรวจสอบข้อมูลก่อนส่งแบบประเมิน`
                : 'เมื่อส่งแล้วจะไม่สามารถแก้ไขข้อมูลได้ กรุณาตรวจสอบความถูกต้องก่อนยืนยัน'}
            </p>
            {isPreviewOpen && (
              <div className="assessment-preview-content">
                <h3>ผลงานตามเป้าหมาย</h3>
                {assessment.goals.map((goal, index) => (
                  <article key={goal.id}>
                    <strong>เป้าหมาย {index + 1} · คะแนน {goal.score || '-'}/5</strong>
                    <p>{goal.target || 'ยังไม่ได้ระบุเป้าหมาย'}</p>
                    <small>{goal.result || 'ยังไม่ได้ระบุผลลัพธ์'}</small>
                  </article>
                ))}
                <h3>ทักษะและพฤติกรรม</h3>
                <ul>
                  {competencies.map(({ id, label }) => (
                    <li key={id}>{label}: {assessment.ratings[id]?.score || '-'}/5</li>
                  ))}
                </ul>
                <h3>สรุปและแผนพัฒนา</h3>
                <p><strong>จุดแข็ง:</strong> {assessment.strengths || 'ยังไม่ได้ระบุ'}</p>
                <p><strong>สิ่งที่ต้องการพัฒนา:</strong> {assessment.improvements || 'ยังไม่ได้ระบุ'}</p>
                <p><strong>เป้าหมายรอบถัดไป:</strong> {assessment.nextGoals || 'ยังไม่ได้ระบุ'}</p>
              </div>
            )}
            <div className="assessment-dialog-actions">
              <button
                type="button"
                className="assessment-draft-button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setIsSubmitConfirmationOpen(false);
                }}
              >
                กลับไปตรวจสอบ
              </button>
              {isPreviewOpen && !isSubmitted && (
                <button type="button" className="assessment-submit-button" onClick={() => setIsPreviewOpen(false)}>
                  กรอกต่อ
                </button>
              )}
              {isSubmitConfirmationOpen && (
                <button type="button" className="assessment-submit-button" onClick={() => saveAssessment('submitted')}>
                  ยืนยันส่งแบบประเมิน
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SelfAssessment;
