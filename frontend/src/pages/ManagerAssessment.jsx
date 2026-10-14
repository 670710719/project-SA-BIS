import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import {
  calculateAssessmentScore,
  competencies,
  evaluationYear,
  getAssessmentCompletion,
  getAssessmentMissingFields,
  performanceWeights,
  ratingDescriptions,
} from '../assessment/assessmentUtils';

function createAssessment() {
  return {
    goals: [{ id: 1, target: '', result: '', score: '', evidence: '' }],
    ratings: Object.fromEntries(competencies.map(({ id }) => [id, { score: '', example: '' }])),
    strengths: '',
    improvements: '',
    nextGoals: '',
    status: 'draft',
  };
}

function RatingOptions({ value, onChange, required = false, disabled = false }) {
  return (
    <select value={value} onChange={onChange} required={required} disabled={disabled}>
      <option value="">เลือกคะแนน</option>
      {ratingDescriptions.map(({ score, label }) => (
        <option key={score} value={score}>{score} - {label}</option>
      ))}
    </select>
  );
}

function ManagerAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedEmployeeId = searchParams.get('employeeId');
  const forwardToHr = searchParams.get('forwardToHr') === '1';
  const [employees, setEmployees] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selfSubmissions, setSelfSubmissions] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isEmployeeMenuOpen, setIsEmployeeMenuOpen] = useState(false);
  const employeeMenuRef = useRef(null);
  const [assessment, setAssessment] = useState(createAssessment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [validationIssues, setValidationIssues] = useState([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/employees'),
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=manager`),
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=employee`),
    ])
      .then(async ([employeesResponse, submissionsResponse, selfResponse]) => {
        if (!employeesResponse.ok || !submissionsResponse.ok || !selfResponse.ok) throw new Error('ไม่สามารถโหลดข้อมูลลูกทีมได้');
        return Promise.all([employeesResponse.json(), submissionsResponse.json(), selfResponse.json()]);
      })
      .then(([employeeData, submissionData, selfData]) => {
        if (!isMounted) return;
        const loadedEmployees = employeeData.employees || [];
        const loadedSubmissions = submissionData.assessments || [];
        const requestedEmployee = loadedEmployees.find(({ id }) => id === requestedEmployeeId);
        const initialEmployee = requestedEmployeeId ? requestedEmployee : loadedEmployees[0];
        setEmployees(loadedEmployees);
        setSubmissions(loadedSubmissions);
        setSelfSubmissions(selfData.assessments || []);
        if (requestedEmployeeId && !requestedEmployee) {
          setError('ไม่พบพนักงานที่ต้องการประเมิน กรุณากลับไปเลือกรายการใหม่');
        }
        if (initialEmployee) {
          setSelectedEmployeeId(initialEmployee.id);
          const existing = loadedSubmissions.find(({ employeeId, year }) => (
            employeeId === initialEmployee.id && year === evaluationYear
          ));
          if (existing?.assessment) setAssessment({ ...createAssessment(), ...existing.assessment });
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [requestedEmployeeId, user?.username]);

  useEffect(() => {
    function closeEmployeeMenu(event) {
      if (!employeeMenuRef.current?.contains(event.target)) {
        setIsEmployeeMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', closeEmployeeMenu);
    return () => document.removeEventListener('mousedown', closeEmployeeMenu);
  }, []);

  const selectedEmployee = employees.find(({ id }) => id === selectedEmployeeId);
  const existingSubmission = submissions.find(({ employeeId, year }) => (
    employeeId === selectedEmployeeId && year === evaluationYear
  ));
  const selfSubmission = selfSubmissions.find(({ employeeId, year }) => (
    employeeId === selectedEmployeeId && year === evaluationYear
  ));
  const isSubmitted = existingSubmission?.status === 'submitted' || existingSubmission?.status === 'approved';

  const scores = calculateAssessmentScore(assessment);
  const completion = getAssessmentCompletion(assessment);

  function updateAssessment(updater) {
    setAssessment((current) => (typeof updater === 'function' ? updater(current) : updater));
    setMessage('');
    setValidationIssues([]);
  }

  function selectEmployee(employeeId) {
    const existing = submissions.find(({ employeeId: id, year }) => (
      id === employeeId && year === evaluationYear
    ));
    setSelectedEmployeeId(employeeId);
    setAssessment(existing?.assessment ? { ...createAssessment(), ...existing.assessment } : createAssessment());
    setMessage('');
    setIsEmployeeMenuOpen(false);
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

  async function saveAssessment(status) {
    setSaving(true);
    setError('');
    setMessage('');
    const updatedAssessment = {
      ...assessment,
      status,
      updatedAt: new Date().toISOString(),
      submittedAt: status === 'submitted' ? new Date().toISOString() : null,
    };
    const payload = {
      id: `manager:${selectedEmployee.id}:${evaluationYear}`,
      employeeId: selectedEmployee.id,
      employee: selectedEmployee.name,
      manager: user?.username || 'Tob',
      year: evaluationYear,
      submittedAt: status === 'submitted' ? new Date().toISOString() : '',
      status,
      assessmentType: 'manager',
      assessment: updatedAssessment,
    };

    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'บันทึกผลการประเมินไม่สำเร็จ');
      setAssessment(updatedAssessment);
      setSubmissions((current) => [
        ...current.filter(({ employeeId }) => employeeId !== selectedEmployee.id),
        data.submission,
      ]);
      setMessage(status === 'submitted' ? 'ส่งผลการประเมินพนักงานเรียบร้อยแล้ว' : 'บันทึกร่างเรียบร้อยแล้ว');
      setValidationIssues([]);
      setIsConfirmationOpen(false);

      if (status === 'submitted' && forwardToHr) {
        const approvalResponse = await fetch(
          `/api/manager/assessments/${encodeURIComponent(`${selectedEmployee.id}:${evaluationYear}`)}/approve`,
          { method: 'POST' },
        );
        const approvalData = await approvalResponse.json();
        if (!approvalResponse.ok) {
          throw new Error(`บันทึกผลประเมินแล้ว แต่ส่งต่อให้ HR ไม่สำเร็จ: ${approvalData.message || 'กรุณาลองอีกครั้งจากหน้าอนุมัติ'}`);
        }
        window.alert('ประเมินพนักงานเรียบร้อยแล้ว และส่งผลต่อไปยังหน้ารออนุมัติของ HR แล้ว');
        navigate('/manager-approvals', {
          replace: true,
          state: { notice: `ส่งผลประเมินของ ${selectedEmployee.name} ไปยัง HR เรียบร้อยแล้ว` },
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const missingFields = getAssessmentMissingFields(assessment);
    if (missingFields.length) {
      setValidationIssues(missingFields);
      return;
    }
    setIsConfirmationOpen(true);
  }

  const displayName = user?.name || user?.username || 'หัวหน้าแผนก';
  const avatar = displayName.charAt(0);

  return (
    <main className="self-assessment-page">
      <header className="home-topbar">
        <div className="home-brand">
          <div><strong>ระบบประเมินพนักงาน</strong><small>Manager Performance Dashboard</small></div>
        </div>
        <div className="home-user"><ThemeToggle /><span>{displayName}</span><span className="home-avatar">{avatar}</span></div>
      </header>

      <section className="self-assessment-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate('/manager-home')}>← กลับหน้าหลัก</button>
        <div className="assessment-page-heading">
          <div>
            <span className="assessment-eyebrow">หัวหน้าแผนก</span>
            <h1>ประเมินพนักงาน</h1>
            <p>หัวหน้าประเมินแยกจากคะแนนตนเอง โดยอ้างอิงเป้าหมาย ผลลัพธ์ และพฤติกรรมที่สังเกตได้</p>
          </div>
          <span className={`assessment-status ${isSubmitted ? 'submitted' : ''}`}>
            {isSubmitted ? 'ส่งผลแล้ว' : 'กำลังกรอก'}
          </span>
        </div>
        {!isSubmitted && !loading && selectedEmployee && (
          <section className="assessment-progress-card" aria-label="ความครบถ้วนของแบบประเมิน">
            <div><strong>ความครบถ้วนของผลประเมิน</strong><span>{completion}%</span></div>
            <div className="assessment-progress-track"><span style={{ width: `${completion}%` }} /></div>
            <small>{completion === 100 ? 'ข้อมูลครบถ้วน พร้อมส่งให้พนักงานและ HR ตรวจสอบ' : `ยังขาดข้อมูล ${getAssessmentMissingFields(assessment).length} รายการ`}</small>
          </section>
        )}

        {error && <p className="assessment-error" role="alert">{error}</p>}
        {message && <p className="assessment-success" role="status">{message}</p>}
        {loading ? <p>กำลังโหลดข้อมูลลูกทีม...</p> : (
          <>
            {employees.length === 0 ? (
              <section className="assessment-history-empty">
                <span aria-hidden="true">♙</span>
                <h2>ยังไม่มีพนักงานในระบบ</h2>
                <p>เพิ่มรายชื่อพนักงานก่อนเริ่มการประเมิน</p>
              </section>
            ) : (
              <>
            <section className="assessment-employee-card" aria-label="เลือกพนักงาน">
              <label className="assessment-field">
                <span>พนักงานที่ต้องการประเมิน</span>
                <div className="assessment-employee-picker" ref={employeeMenuRef}>
                  <button
                    type="button"
                    className="assessment-employee-picker-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isEmployeeMenuOpen}
                    onClick={() => setIsEmployeeMenuOpen((isOpen) => !isOpen)}
                    disabled={saving}
                  >
                    <span>{selectedEmployee ? `${selectedEmployee.id} · ${selectedEmployee.name}` : 'เลือกพนักงาน'}</span>
                    <span className={`assessment-employee-picker-arrow ${isEmployeeMenuOpen ? 'open' : ''}`} aria-hidden="true" />
                  </button>
                  {isEmployeeMenuOpen && (
                    <div className="assessment-employee-picker-menu" role="listbox" aria-label="รายชื่อพนักงาน">
                      {employees.map((employee) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={employee.id === selectedEmployeeId}
                          className={`assessment-employee-picker-option ${employee.id === selectedEmployeeId ? 'selected' : ''}`}
                          key={employee.id}
                          onClick={() => selectEmployee(employee.id)}
                        >
                          <strong>{employee.id}</strong>
                          <span>{employee.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <div><span>ตำแหน่ง</span><strong>{selectedEmployee?.position || '-'}</strong></div>
              <div><span>รอบประเมิน</span><strong>ปี {evaluationYear}</strong></div>
              <div><span>คะแนนรวมเบื้องต้น</span><strong>{scores.overall}</strong></div>
            </section>

            <details className="assessment-self-perspective">
              <summary>
                <span>มุมมองจากการประเมินตนเอง</span>
                <strong>{selfSubmission?.status === 'submitted' || selfSubmission?.assessment?.status === 'submitted' ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}</strong>
              </summary>
              {selfSubmission ? (
                <div className="assessment-self-perspective-content">
                  <div><span>คะแนนรวมที่พนักงานประเมินตนเอง</span><strong>{calculateAssessmentScore(selfSubmission.assessment).overall} / 5</strong></div>
                  <p><b>จุดแข็ง:</b> {selfSubmission.assessment?.strengths || 'ไม่ได้ระบุ'}</p>
                  <p><b>สิ่งที่ต้องการพัฒนา:</b> {selfSubmission.assessment?.improvements || 'ไม่ได้ระบุ'}</p>
                  {(selfSubmission.assessment?.goals || []).map((goal, index) => (
                    <p key={goal.id || index}><b>เป้าหมาย {index + 1}:</b> {goal.target || 'ไม่ได้ระบุ'} · คะแนน {goal.score || '-'}/5 · {goal.result || 'ยังไม่ระบุผลลัพธ์'}</p>
                  ))}
                  <small>ใช้เพื่อทำความเข้าใจมุมมองของพนักงาน ไม่ใช่คะแนนแทนการประเมินหัวหน้า</small>
                </div>
              ) : (
                <p className="assessment-self-perspective-empty">พนักงานยังไม่ได้ส่งแบบประเมินตนเองในรอบนี้</p>
              )}
            </details>

            <form className="assessment-form" onSubmit={handleSubmit}>
              <section className="assessment-section">
                <div className="assessment-section-heading"><span className="assessment-step">1</span><div><h2>ผลงานตามเป้าหมาย</h2><p>ประเมินเป้าหมาย ผลลัพธ์ และหลักฐานประกอบของลูกทีม</p></div></div>
                {assessment.goals.map((goal, index) => (
                  <fieldset className="assessment-goal" key={goal.id}>
                    <legend>เป้าหมายที่ {index + 1}</legend>
                    <label className="assessment-field"><span>เป้าหมายหรือหน้าที่สำคัญ</span><textarea value={goal.target} onChange={(event) => updateGoal(goal.id, 'target', event.target.value)} required disabled={isSubmitted} rows="2" /></label>
                    <label className="assessment-field"><span>ผลลัพธ์ที่ทำได้</span><textarea value={goal.result} onChange={(event) => updateGoal(goal.id, 'result', event.target.value)} required disabled={isSubmitted} rows="3" /></label>
                    <div className="assessment-field-grid">
                      <label className="assessment-field"><span>คะแนน</span><RatingOptions value={goal.score} onChange={(event) => updateGoal(goal.id, 'score', event.target.value)} required disabled={isSubmitted} /></label>
                      <label className="assessment-field"><span>หลักฐานหรือข้อมูลประกอบ</span><input value={goal.evidence} onChange={(event) => updateGoal(goal.id, 'evidence', event.target.value)} required disabled={isSubmitted} /></label>
                    </div>
                  </fieldset>
                ))}
                {!isSubmitted && <button type="button" className="assessment-add-button" onClick={() => updateAssessment((current) => ({ ...current, goals: [...current.goals, { id: Date.now(), target: '', result: '', score: '', evidence: '' }] }))}>+ เพิ่มเป้าหมาย</button>}
              </section>

              <section className="assessment-section">
                <div className="assessment-section-heading"><span className="assessment-step">2</span><div><h2>ทักษะและพฤติกรรม</h2><p>ให้คะแนนพร้อมตัวอย่างพฤติกรรมที่พบ</p></div></div>
                <div className="assessment-rating-guide"><strong>มาตราส่วนคะแนน</strong>{ratingDescriptions.map(({ score, label, detail }) => <span key={score}><b>{score} · {label}</b> — {detail}</span>)}</div>
                <div className="assessment-competencies">
                  {competencies.map(({ id, label }, index) => (
                    <div className="assessment-competency" key={id}>
                      <label className="assessment-field"><span>{index + 1}. {label}</span><RatingOptions value={assessment.ratings[id]?.score || ''} onChange={(event) => updateRating(id, 'score', event.target.value)} required disabled={isSubmitted} /></label>
                      <label className="assessment-field"><span>ตัวอย่างหรือเหตุการณ์ประกอบ</span><input value={assessment.ratings[id]?.example || ''} onChange={(event) => updateRating(id, 'example', event.target.value)} required disabled={isSubmitted} /></label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="assessment-section">
                <div className="assessment-section-heading"><span className="assessment-step">3</span><div><h2>สรุปและแผนพัฒนา</h2><p>ระบุจุดเด่นและเป้าหมายการพัฒนาของลูกทีม</p></div></div>
                <div className="assessment-summary-fields">
                  <label className="assessment-field"><span>จุดแข็งและความสำเร็จ</span><textarea value={assessment.strengths} onChange={(event) => updateAssessment((current) => ({ ...current, strengths: event.target.value }))} required disabled={isSubmitted} rows="3" /></label>
                  <label className="assessment-field"><span>สิ่งที่ต้องพัฒนา</span><textarea value={assessment.improvements} onChange={(event) => updateAssessment((current) => ({ ...current, improvements: event.target.value }))} required disabled={isSubmitted} rows="3" /></label>
                  <label className="assessment-field"><span>เป้าหมายในรอบถัดไป</span><textarea value={assessment.nextGoals} onChange={(event) => updateAssessment((current) => ({ ...current, nextGoals: event.target.value }))} required disabled={isSubmitted} rows="3" /></label>
                </div>
              </section>

              <section className="assessment-score-summary" aria-live="polite">
                <div className="assessment-overall-score"><span>คะแนนรวมเบื้องต้น</span><strong>{scores.overall}<small>{scores.overall === '-' ? '' : ' / 5'}</small></strong></div>
                <div className="assessment-component-scores">
                  <span>ผลงานตามเป้าหมาย ({performanceWeights.goals}%) <strong>{scores.goals} / 5</strong></span>
                  <span>ทักษะและพฤติกรรม ({performanceWeights.competencies}%) <strong>{scores.competencies} / 5</strong></span>
                </div>
                <p>ผลประเมินจากหัวหน้าแยกจากคะแนนประเมินตนเอง ใช้หลักฐานและพฤติกรรมที่สังเกตได้</p>
              </section>
              {validationIssues.length > 0 && (
                <div className="assessment-validation-summary" role="alert">
                  <strong>ยังส่งผลประเมินไม่ได้ กรุณาตรวจสอบข้อมูลต่อไปนี้</strong>
                  <ul>{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </div>
              )}
              {!isSubmitted && (
                <div className="assessment-form-actions">
                  <button type="button" className="assessment-draft-button" disabled={saving} onClick={() => saveAssessment('draft')}>{saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</button>
                  <button type="submit" className="assessment-submit-button" disabled={saving}>ตรวจความครบและส่ง</button>
                </div>
              )}
            </form>
              </>
            )}
          </>
        )}
      </section>
      {isConfirmationOpen && (
        <div className="assessment-dialog-backdrop">
          <section className="assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="manager-submit-title">
            <h2 id="manager-submit-title">ยืนยันส่งผลการประเมิน</h2>
            <p>คะแนนรวมเบื้องต้น {scores.overall} / 5 เมื่อส่งแล้วจะล็อกแบบประเมินและส่งเข้าสู่ขั้นตอนอนุมัติ</p>
            <div className="assessment-dialog-actions">
              <button type="button" className="assessment-draft-button" disabled={saving} onClick={() => setIsConfirmationOpen(false)}>กลับไปตรวจทาน</button>
              <button type="button" className="assessment-submit-button" disabled={saving} onClick={() => saveAssessment('submitted')}>{saving ? 'กำลังส่ง...' : 'ยืนยันส่งผลประเมิน'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default ManagerAssessment;
