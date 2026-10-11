import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const evaluationYear = '2568';
const competencies = [
  { id: 'quality', label: 'คุณภาพและความถูกต้องของงาน' },
  { id: 'ownership', label: 'ความรับผิดชอบและการทำงานให้สำเร็จ' },
  { id: 'teamwork', label: 'การทำงานร่วมกับผู้อื่น' },
  { id: 'communication', label: 'การสื่อสารและการประสานงาน' },
  { id: 'improvement', label: 'การเรียนรู้และพัฒนาตนเอง' },
];

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
      <option value="1">1 - ต้องปรับปรุง</option>
      <option value="2">2 - ต่ำกว่าความคาดหวัง</option>
      <option value="3">3 - เป็นไปตามความคาดหวัง</option>
      <option value="4">4 - สูงกว่าความคาดหวัง</option>
      <option value="5">5 - โดดเด่น</option>
    </select>
  );
}

function ManagerAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assessment, setAssessment] = useState(createAssessment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/employees'),
      fetch(`/api/manager/assessments?manager=${encodeURIComponent(user?.username || 'Tob')}&type=manager`),
    ])
      .then(async ([employeesResponse, submissionsResponse]) => {
        if (!employeesResponse.ok || !submissionsResponse.ok) throw new Error('ไม่สามารถโหลดข้อมูลลูกทีมได้');
        return Promise.all([employeesResponse.json(), submissionsResponse.json()]);
      })
      .then(([employeeData, submissionData]) => {
        if (!isMounted) return;
        const loadedEmployees = employeeData.employees || [];
        const loadedSubmissions = submissionData.assessments || [];
        setEmployees(loadedEmployees);
        setSubmissions(loadedSubmissions);
        if (loadedEmployees.length > 0) {
          setSelectedEmployeeId(loadedEmployees[0].id);
          const existing = loadedSubmissions.find(({ employeeId }) => employeeId === loadedEmployees[0].id);
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
  }, [user?.username]);

  const selectedEmployee = employees.find(({ id }) => id === selectedEmployeeId);
  const existingSubmission = submissions.find(({ employeeId }) => employeeId === selectedEmployeeId);
  const isSubmitted = existingSubmission?.status === 'submitted' || existingSubmission?.status === 'approved';

  const averageScore = useMemo(() => {
    const scores = [
      ...assessment.goals.map(({ score }) => Number(score)).filter(Boolean),
      ...Object.values(assessment.ratings).map(({ score }) => Number(score)).filter(Boolean),
    ];
    return scores.length
      ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2)
      : '-';
  }, [assessment]);

  function updateAssessment(updater) {
    setAssessment((current) => (typeof updater === 'function' ? updater(current) : updater));
    setMessage('');
  }

  function selectEmployee(employeeId) {
    const existing = submissions.find(({ employeeId: id }) => id === employeeId);
    setSelectedEmployeeId(employeeId);
    setAssessment(existing?.assessment ? { ...createAssessment(), ...existing.assessment } : createAssessment());
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

  async function saveAssessment(status) {
    setSaving(true);
    setError('');
    setMessage('');
    const updatedAssessment = { ...assessment, status, updatedAt: new Date().toISOString() };
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
      setMessage(status === 'submitted' ? 'ส่งผลการประเมินลูกทีมเรียบร้อยแล้ว' : 'บันทึกร่างเรียบร้อยแล้ว');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
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
            <h1>ประเมินลูกทีม</h1>
            <p>หัวหน้าเป็นผู้ประเมินลูกทีมด้วยตนเอง โดยไม่ใช้ผลจากแบบประเมินตนเองของลูกทีม</p>
          </div>
          <span className={`assessment-status ${isSubmitted ? 'submitted' : ''}`}>
            {isSubmitted ? 'ส่งผลแล้ว' : 'กำลังกรอก'}
          </span>
        </div>

        {error && <p className="assessment-error" role="alert">{error}</p>}
        {message && <p className="assessment-success" role="status">{message}</p>}
        {loading ? <p>กำลังโหลดข้อมูลลูกทีม...</p> : (
          <>
            <section className="assessment-employee-card" aria-label="เลือกพนักงาน">
              <label className="assessment-field">
                <span>พนักงานที่ต้องการประเมิน</span>
                <select value={selectedEmployeeId} onChange={(event) => selectEmployee(event.target.value)} disabled={saving}>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.id} · {employee.name}</option>)}
                </select>
              </label>
              <div><span>ตำแหน่ง</span><strong>{selectedEmployee?.position || '-'}</strong></div>
              <div><span>รอบประเมิน</span><strong>ปี {evaluationYear}</strong></div>
              <div><span>คะแนนเฉลี่ย</span><strong>{averageScore}</strong></div>
            </section>

            <form className="assessment-form" onSubmit={(event) => { event.preventDefault(); saveAssessment('submitted'); }}>
              <section className="assessment-section">
                <div className="assessment-section-heading"><span className="assessment-step">1</span><div><h2>ผลงานตามเป้าหมาย</h2><p>ประเมินเป้าหมาย ผลลัพธ์ และหลักฐานประกอบของลูกทีม</p></div></div>
                {assessment.goals.map((goal, index) => (
                  <fieldset className="assessment-goal" key={goal.id}>
                    <legend>เป้าหมายที่ {index + 1}</legend>
                    <label className="assessment-field"><span>เป้าหมายหรือหน้าที่สำคัญ</span><textarea value={goal.target} onChange={(event) => updateGoal(goal.id, 'target', event.target.value)} required disabled={isSubmitted} rows="2" /></label>
                    <label className="assessment-field"><span>ผลลัพธ์ที่ทำได้</span><textarea value={goal.result} onChange={(event) => updateGoal(goal.id, 'result', event.target.value)} required disabled={isSubmitted} rows="3" /></label>
                    <div className="assessment-field-grid">
                      <label className="assessment-field"><span>คะแนน</span><RatingOptions value={goal.score} onChange={(event) => updateGoal(goal.id, 'score', event.target.value)} required disabled={isSubmitted} /></label>
                      <label className="assessment-field"><span>หลักฐานหรือข้อมูลประกอบ</span><input value={goal.evidence} onChange={(event) => updateGoal(goal.id, 'evidence', event.target.value)} disabled={isSubmitted} /></label>
                    </div>
                  </fieldset>
                ))}
                {!isSubmitted && <button type="button" className="assessment-add-button" onClick={() => updateAssessment((current) => ({ ...current, goals: [...current.goals, { id: Date.now(), target: '', result: '', score: '', evidence: '' }] }))}>+ เพิ่มเป้าหมาย</button>}
              </section>

              <section className="assessment-section">
                <div className="assessment-section-heading"><span className="assessment-step">2</span><div><h2>ทักษะและพฤติกรรม</h2><p>ให้คะแนนพร้อมตัวอย่างพฤติกรรมที่พบ</p></div></div>
                <div className="assessment-rating-guide"><strong>เกณฑ์คะแนน</strong><span>1 ต้องปรับปรุง</span><span>2 ต่ำกว่าคาดหวัง</span><span>3 ตามคาดหวัง</span><span>4 สูงกว่าคาดหวัง</span><span>5 โดดเด่น</span></div>
                <div className="assessment-competencies">
                  {competencies.map(({ id, label }, index) => (
                    <div className="assessment-competency" key={id}>
                      <label className="assessment-field"><span>{index + 1}. {label}</span><RatingOptions value={assessment.ratings[id]?.score || ''} onChange={(event) => updateRating(id, 'score', event.target.value)} required disabled={isSubmitted} /></label>
                      <label className="assessment-field"><span>ตัวอย่างหรือเหตุการณ์ประกอบ</span><input value={assessment.ratings[id]?.example || ''} onChange={(event) => updateRating(id, 'example', event.target.value)} disabled={isSubmitted} /></label>
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

              {!isSubmitted && (
                <div className="assessment-form-actions">
                  <button type="button" className="assessment-draft-button" disabled={saving} onClick={() => saveAssessment('draft')}>{saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</button>
                  <button type="submit" className="assessment-submit-button" disabled={saving}>ส่งผลการประเมิน</button>
                </div>
              )}
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default ManagerAssessment;
