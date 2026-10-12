import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
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
    peerEmployeeId: '',
    peerEmployeeName: '',
    ratings: Object.fromEntries(competencies.map(({ id }) => [id, { score: '', example: '' }])),
    strengths: '',
    improvements: '',
  };
}

function PeerAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || user?.username || 'ผู้ใช้งาน';
  const employeeId = user?.employeeId || '';
  const [employees, setEmployees] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || !employeeId) {
      navigate('/login', { replace: true, state: { from: '/peer-assessment' } });
      return undefined;
    }

    let isCurrent = true;

    async function loadPageData() {
      setIsLoading(true);
      setError('');

      try {
        const [employeeResponse, submissionResponse] = await Promise.all([
          fetch('/api/employees'),
          fetch(`/api/assessments?employeeId=${encodeURIComponent(employeeId)}&year=${evaluationYear}&type=peer`),
        ]);

        if (!employeeResponse.ok || !submissionResponse.ok) {
          throw new Error('ไม่สามารถโหลดรายชื่อพนักงานหรือแบบประเมินได้');
        }

        const [employeeData, submissionData] = await Promise.all([
          employeeResponse.json(),
          submissionResponse.json(),
        ]);
        if (!Array.isArray(employeeData.employees) || !Array.isArray(submissionData.assessments)) {
          throw new Error('เซิร์ฟเวอร์ส่งข้อมูลพนักงานหรือแบบประเมินไม่ถูกต้อง');
        }

        if (isCurrent) {
          setEmployees(employeeData.employees.filter((employee) => employee.id !== employeeId));
          setSubmissions(Object.fromEntries(
            submissionData.assessments.map((submission) => [
              submission.assessment?.peerEmployeeId,
              submission,
            ]).filter(([id]) => id),
          ));
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadPageData();
    return () => {
      isCurrent = false;
    };
  }, [employeeId, navigate, user]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );
  const currentSubmission = submissions[selectedEmployeeId];
  const assessment = currentSubmission?.assessment || createEmptyAssessment();
  const isSubmitted = currentSubmission?.status === 'submitted';

  function updateAssessment(field, value) {
    setSubmissions((current) => ({
      ...current,
      [selectedEmployeeId]: {
        ...(current[selectedEmployeeId] || {}),
        assessment: { ...assessment, [field]: value },
      },
    }));
    setMessage('');
  }

  function updateRating(id, field, value) {
    updateAssessment('ratings', {
      ...assessment.ratings,
      [id]: { ...assessment.ratings[id], [field]: value },
    });
  }

  async function saveAssessment(status) {
    if (!selectedEmployee || !employeeId) {
      setError('ไม่พบข้อมูลพนักงานของผู้ประเมิน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');
    const submittedAt = status === 'submitted' ? new Date().toISOString() : '';
    const updatedAssessment = {
      ...assessment,
      peerEmployeeId: selectedEmployee.id,
      peerEmployeeName: selectedEmployee.name,
      status,
      updatedAt: new Date().toISOString(),
      submittedAt: submittedAt || null,
    };
    const submission = {
      id: `${employeeId}:${evaluationYear}:peer:${selectedEmployee.id}`,
      employeeId,
      employee: displayName,
      manager: 'Tob',
      year: evaluationYear,
      submittedAt,
      status,
      assessmentType: 'peer',
      assessment: updatedAssessment,
    };

    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'ไม่สามารถบันทึกแบบประเมินได้');
      }

      const savedSubmission = responseData.submission || submission;
      setSubmissions((current) => ({ ...current, [selectedEmployee.id]: savedSubmission }));
      setMessage(status === 'submitted' ? 'ส่งแบบประเมินเพื่อนร่วมงานเรียบร้อยแล้ว' : 'บันทึกร่างเรียบร้อยแล้ว');
    } catch (saveError) {
      setError(saveError.message || 'ไม่สามารถบันทึกแบบประเมินได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveAssessment('submitted');
  }

  return (
    <main className="self-assessment-page">
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

      <section className="self-assessment-content">
        <button type="button" className="self-assessment-back" onClick={() => navigate('/home-menu')}>
          ← กลับหน้าหลัก
        </button>

        <div className="assessment-page-heading">
          <div>
            <span className="assessment-eyebrow">แบบประเมินประจำปี {evaluationYear}</span>
            <h1>ประเมินเพื่อนร่วมงาน</h1>
            <p>ให้คะแนนจากการทำงานร่วมกันจริง พร้อมยกตัวอย่างประกอบอย่างสร้างสรรค์</p>
          </div>
          {selectedEmployee && (
            <span className={`assessment-status ${isSubmitted ? 'submitted' : ''}`}>
              {isSubmitted ? 'ส่งแบบประเมินแล้ว' : currentSubmission ? 'บันทึกร่างแล้ว' : 'ยังไม่เริ่มประเมิน'}
            </span>
          )}
        </div>

        <section className="assessment-employee-card" aria-label="ข้อมูลการประเมิน">
          <label className="assessment-field">
            <span>เลือกเพื่อนร่วมงาน</span>
            <select
              value={selectedEmployeeId}
              onChange={(event) => {
                setSelectedEmployeeId(event.target.value);
                setMessage('');
                setError('');
              }}
              disabled={isLoading || employees.length === 0}
              required
            >
              <option value="">{isLoading ? 'กำลังโหลดรายชื่อ...' : 'เลือกพนักงานที่ต้องการประเมิน'}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.id} · {employee.department}
                </option>
              ))}
            </select>
          </label>
          <div><span>ผู้ประเมิน</span><strong>{displayName}</strong></div>
          <div><span>รอบประเมิน</span><strong>ปี {evaluationYear}</strong></div>
        </section>

        {error && <p className="assessment-error" role="alert">{error}</p>}
        {message && <p className="assessment-success" role="status">{message}</p>}

        {selectedEmployee && (
          <form className="assessment-form" onSubmit={handleSubmit}>
            <section className="assessment-section">
              <div className="assessment-section-heading">
                <span className="assessment-step">1</span>
                <div>
                  <h2>สมรรถนะในการทำงานร่วมกัน</h2>
                  <p>ให้คะแนน 1–5 และระบุตัวอย่างพฤติกรรมที่พบ</p>
                </div>
              </div>
              <div className="assessment-rating-guide">
                <strong>เกณฑ์คะแนน:</strong>
                <span>1 ต้องปรับปรุง</span>
                <span>2 ต่ำกว่าความคาดหวัง</span>
                <span>3 ตามความคาดหวัง</span>
                <span>4 สูงกว่าความคาดหวัง</span>
                <span>5 โดดเด่น</span>
              </div>
              <div className="assessment-competencies">
                {competencies.map(({ id, label }) => (
                  <div className="assessment-competency" key={id}>
                    <label className="assessment-field">
                      <span>{label}</span>
                      <select
                        value={assessment.ratings?.[id]?.score || ''}
                        onChange={(event) => updateRating(id, 'score', event.target.value)}
                        required
                        disabled={isSubmitted || isSaving}
                      >
                        <option value="">เลือกคะแนน</option>
                        <option value="1">1 - ต้องปรับปรุง</option>
                        <option value="2">2 - ต่ำกว่าความคาดหวัง</option>
                        <option value="3">3 - ตามความคาดหวัง</option>
                        <option value="4">4 - สูงกว่าความคาดหวัง</option>
                        <option value="5">5 - โดดเด่น</option>
                      </select>
                    </label>
                    <label className="assessment-field">
                      <span>ตัวอย่างพฤติกรรม</span>
                      <textarea
                        value={assessment.ratings?.[id]?.example || ''}
                        onChange={(event) => updateRating(id, 'example', event.target.value)}
                        placeholder="ยกตัวอย่างเหตุการณ์หรือผลงานที่สังเกตได้"
                        required
                        disabled={isSubmitted || isSaving}
                        rows="2"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="assessment-section assessment-summary-fields">
              <label className="assessment-field">
                <span>จุดเด่นที่ควรรักษาไว้</span>
                <textarea
                  value={assessment.strengths || ''}
                  onChange={(event) => updateAssessment('strengths', event.target.value)}
                  placeholder="ระบุจุดแข็งหรือสิ่งที่เพื่อนร่วมงานทำได้ดี"
                  required
                  disabled={isSubmitted || isSaving}
                  rows="3"
                />
              </label>
              <label className="assessment-field">
                <span>ข้อเสนอแนะเพื่อการพัฒนา</span>
                <textarea
                  value={assessment.improvements || ''}
                  onChange={(event) => updateAssessment('improvements', event.target.value)}
                  placeholder="เสนอแนะแนวทางพัฒนาอย่างสุภาพและนำไปใช้ได้จริง"
                  required
                  disabled={isSubmitted || isSaving}
                  rows="3"
                />
              </label>
            </section>

            {!isSubmitted && (
              <div className="assessment-form-actions">
                <button
                  type="button"
                  className="assessment-add-button"
                  onClick={() => saveAssessment('draft')}
                  disabled={isSaving}
                >
                  บันทึกร่าง
                </button>
                <button type="submit" className="assessment-submit-button" disabled={isSaving}>
                  {isSaving ? 'กำลังบันทึก...' : 'ส่งแบบประเมิน'}
                </button>
              </div>
            )}
          </form>
        )}
      </section>
    </main>
  );
}

export default PeerAssessment;
