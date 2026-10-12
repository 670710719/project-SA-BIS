import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const emptyForm = {
  id: '',
  name: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  password: '',
};

function EmployeeManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [employees, setEmployees] = useState(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [evaluationFilter, setEvaluationFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('name');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [registeredUsername, setRegisteredUsername] = useState('');
  const displayName = user?.name || user?.username || 'ฝ่ายทรัพยากรบุคคล';
  const avatar = displayName.charAt(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/employees')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'ไม่สามารถโหลดรายชื่อพนักงานได้');
        return data;
      })
      .then((data) => {
        if (isMounted) setEmployees(data.employees || []);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      });
    return () => { isMounted = false; };
  }, []);

  const departments = useMemo(
    () => [...new Set((employees || []).map(({ department }) => department).filter(Boolean))].sort(),
    [employees],
  );
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (employees || []).filter((employee) => {
      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
      const matchesEvaluation = !evaluationFilter || employee.evaluationStatus === evaluationFilter;
      const hasAccount = Boolean(employee.accountUsername);
      const matchesAccount = !accountFilter || (accountFilter === 'active' ? hasAccount : !hasAccount);
      const searchableText = `${employee.id} ${employee.name} ${employee.department} ${employee.position} ${employee.email || ''} ${employee.phone || ''}`.toLocaleLowerCase();
      return matchesDepartment && matchesEvaluation && matchesAccount && (!query || searchableText.includes(query));
    }).sort((left, right) => {
      const leftValue = sortOrder === 'id' ? left.id : left.name;
      const rightValue = sortOrder === 'id' ? right.id : right.name;
      return leftValue.localeCompare(rightValue, 'th');
    });
  }, [accountFilter, departmentFilter, employees, evaluationFilter, search, sortOrder]);
  const accountDataReady = (employees || []).every(({ accountUsername }) => typeof accountUsername === 'string');
  const activeAccounts = (employees || []).filter(({ accountUsername }) => accountUsername).length;
  const awaitingApproval = (employees || []).filter(({ evaluationStatus }) => evaluationStatus === 'รออนุมัติ').length;
  const completedEvaluations = (employees || []).filter(({ evaluationStatus }) => evaluationStatus === 'อนุมัติแล้ว').length;
  const evaluationStatuses = [...new Set((employees || []).map(({ evaluationStatus }) => evaluationStatus).filter(Boolean))].sort();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function openCreateForm() {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
    setRegisteredUsername('');
    setIsFormOpen(true);
  }

  function openEditForm(employee) {
    setEditingEmployee(employee);
    setForm({
      id: employee.id,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
    });
    setError('');
    setNotice('');
    setRegisteredUsername('');
    setIsFormOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    setRegisteredUsername('');
    try {
      const isEditing = Boolean(editingEmployee);
      const response = await fetch(isEditing
        ? `/api/employees/${encodeURIComponent(editingEmployee.id)}`
        : '/api/employees', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: form.id.trim().toUpperCase(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status}) กรุณาตรวจสอบว่า backend เป็นเวอร์ชันล่าสุด`);
      }
      if (!response.ok) throw new Error(data.message || 'ไม่สามารถลงทะเบียนพนักงานได้');
      setEmployees((current) => isEditing
        ? current.map((employee) => employee.id === data.employee.id ? data.employee : employee)
        : [...(current || []), data.employee]);
      setNotice(isEditing
        ? `${data.message || 'บันทึกข้อมูลเรียบร้อยแล้ว'}${form.password ? ' รหัสผ่านเข้าสู่ระบบได้รับการเปลี่ยนแล้ว' : ''}`
        : `${data.message || 'ลงทะเบียนพนักงานเรียบร้อยแล้ว'} สามารถเข้าสู่ระบบด้วยรหัสพนักงาน ${data.employee.id} และรหัสผ่านที่กำหนด`);
      if (!isEditing) setRegisteredUsername(data.employee.id);
      setForm(emptyForm);
      setIsFormOpen(false);
    } catch (saveError) {
      setError(saveError.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(employee) {
    if (!window.confirm(`ต้องการลบ ${employee.name} (${employee.id}) ใช่หรือไม่?\n\nการลบจะนำบัญชีเข้าสู่ระบบและประวัติการประเมินของพนักงานออกจากระบบอย่างถาวร`)) return;
    setDeletingId(employee.id);
    setError('');
    setNotice('');
    setRegisteredUsername('');
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employee.id)}`, { method: 'DELETE' });
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`);
      }
      if (!response.ok) throw new Error(data.message || 'ไม่สามารถลบรายชื่อพนักงานได้');
      setEmployees((current) => current.filter(({ id }) => id !== employee.id));
      setNotice(data.message || 'ลบรายชื่อพนักงานเรียบร้อยแล้ว');
    } catch (deleteError) {
      setError(deleteError.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <main className="home-menu-page hr-home-page employee-management-page">
      <header className="home-topbar">
        <div className="home-brand">
          <span className="home-brand-logo">HR</span>
          <div>
            <strong>ศูนย์ปฏิบัติงาน HR</strong>
            <small>PEOPLE & PERFORMANCE</small>
          </div>
        </div>
        <div className="home-user">
          <ThemeToggle />
          <span>{displayName}</span>
          <span className="home-avatar">{avatar}</span>
        </div>
      </header>

      <div className="home-layout">
        <aside className={`home-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="home-sidebar-user">
            <span className="home-avatar">{avatar}</span>
            <div><strong>{displayName}</strong><small>ฝ่ายทรัพยากรบุคคล (HR)</small></div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'หดแถบเมนู'}
          >
            <span className="sidebar-arrow" aria-hidden="true">{isSidebarCollapsed ? '›' : '‹'}</span>
          </button>
          <nav className="home-navigation" aria-label="เมนูฝ่ายทรัพยากรบุคคล">
            <button type="button" onClick={() => navigate('/hr-home')}>⌂ หน้าหลัก</button>
            <button type="button" className="active">▣ จัดการพนักงาน</button>
            <button type="button" onClick={() => navigate('/hr-approvals')}>✓ อนุมัติผลประเมิน</button>
            <button type="button" onClick={() => navigate('/hr-home#hr-assessment-progress')}>▤ ความคืบหน้ารอบประเมิน</button>
          </nav>
          <button type="button" className="logout-button" onClick={handleLogout}>↪ ออกจากระบบ</button>
        </aside>

        <section className="home-content employee-management-content">
          <div className="home-heading employee-management-heading">
            <div>
              <span className="employee-eyebrow">ฝ่ายทรัพยากรบุคคล</span>
              <h1>จัดการพนักงาน</h1>
              <p>ลงทะเบียนรหัสพนักงาน ดูแลบัญชี และจัดการรายชื่อในระบบ</p>
            </div>
            <button type="button" className="employee-primary-button" disabled={employees === null} onClick={openCreateForm}>
              <span aria-hidden="true">＋</span> ลงทะเบียนพนักงาน
            </button>
          </div>

          {error && <p className="employee-feedback employee-feedback-error" role="alert">{error}</p>}
          {!accountDataReady && employees?.length > 0 && (
            <p className="employee-feedback employee-feedback-info" role="status">
              API ที่กำลังทำงานเป็นเวอร์ชันก่อน จึงยังตรวจสอบบัญชีและบันทึกการแก้ไขไม่ได้ โปรดสำรองข้อมูลก่อนอัปเดต backend เพราะข้อมูลปัจจุบันอาจยังไม่ถูกเก็บถาวร
            </p>
          )}
          {notice && (
            <div className="employee-feedback employee-feedback-success" role="status">
              <span>{notice}</span>
              {registeredUsername && (
                <button
                  type="button"
                  className="employee-login-link"
                  onClick={() => navigate('/login', { state: { username: registeredUsername } })}
                >
                  ไปหน้าเข้าสู่ระบบ →
                </button>
              )}
            </div>
          )}

          <div className="employee-summary-grid">
            <article className="employee-summary-card">
              <span className="employee-summary-icon">♙</span>
              <div><small>พนักงานทั้งหมด</small><strong>{employees?.length || 0}</strong><span>{departments.length} แผนกในระบบ</span></div>
            </article>
            <article className="employee-summary-card">
              <span className="employee-summary-icon department-icon">▦</span>
              <div><small>บัญชีพร้อมใช้งาน</small><strong>{accountDataReady ? activeAccounts : '—'}</strong><span>{accountDataReady ? 'มีชื่อผู้ใช้สำหรับเข้าสู่ระบบ' : 'รอ backend เวอร์ชันล่าสุด'}</span></div>
            </article>
            <article className="employee-summary-card">
              <span className="employee-summary-icon pending-icon">◷</span>
              <div><small>รอประเมิน</small><strong>{Math.max((employees?.length || 0) - completedEvaluations - awaitingApproval, 0)}</strong><span>ยังไม่อนุมัติผล</span></div>
            </article>
            <article className="employee-summary-card">
              <span className="employee-summary-icon approval-icon">✓</span>
              <div><small>รออนุมัติ</small><strong>{awaitingApproval}</strong><span>ส่งผลประเมินแล้ว</span></div>
            </article>
          </div>

          <section className="employee-list-panel">
            <div className="employee-list-heading">
              <div>
                <h2>รายชื่อพนักงาน</h2>
                <p>ข้อมูลพนักงานและบัญชีผู้ใช้จากระบบ</p>
              </div>
              <span className="employee-count">{filteredEmployees.length} จาก {employees?.length || 0} คน</span>
            </div>
            <div className="employee-toolbar">
              <label className="employee-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาชื่อ รหัส แผนก อีเมล หรือเบอร์โทร"
                  aria-label="ค้นหาชื่อ รหัส แผนก อีเมล หรือเบอร์โทร"
                />
              </label>
              <label className="employee-department-filter">
                <span>แผนก</span>
                <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                  <option value="">ทุกแผนก</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
              <label className="employee-department-filter">
                <span>ผลประเมิน</span>
                <select value={evaluationFilter} onChange={(event) => setEvaluationFilter(event.target.value)}>
                  <option value="">ทุกสถานะ</option>
                  {evaluationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="employee-department-filter">
                <span>เรียงตาม</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                  <option value="name">ชื่อพนักงาน</option>
                  <option value="id">รหัสพนักงาน</option>
                </select>
              </label>
              {(search || departmentFilter || evaluationFilter || accountFilter) && (
                <button type="button" className="employee-clear-filters" onClick={() => {
                  setSearch('');
                  setDepartmentFilter('');
                  setEvaluationFilter('');
                  setAccountFilter('');
                }}>ล้างตัวกรอง</button>
              )}
            </div>
            <div className="employee-quick-filters" aria-label="ตัวกรองบัญชี">
              <button type="button" className={!accountFilter ? 'selected' : ''} onClick={() => setAccountFilter('')}>ทั้งหมด</button>
              <button type="button" className={accountFilter === 'active' ? 'selected' : ''} disabled={!accountDataReady} onClick={() => setAccountFilter('active')}>มีบัญชีเข้าสู่ระบบ</button>
              <button type="button" className={accountFilter === 'missing' ? 'selected' : ''} disabled={!accountDataReady} onClick={() => setAccountFilter('missing')}>ไม่มีบัญชี</button>
            </div>

            {employees === null ? (
              <div className="employee-table-message">{error || 'กำลังโหลดข้อมูลพนักงาน...'}</div>
            ) : filteredEmployees.length ? (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr><th>พนักงาน</th><th>แผนก / ตำแหน่ง</th><th>ข้อมูลติดต่อ</th><th>บัญชีผู้ใช้</th><th>สถานะประเมิน</th><th>จัดการ</th></tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <div className="employee-identity">
                            <span className="employee-initial">{employee.name?.charAt(0) || '?'}</span>
                            <div><strong>{employee.name}</strong><small>{employee.id}</small></div>
                          </div>
                        </td>
                        <td><strong className="employee-department">{employee.department}</strong><small className="employee-position">{employee.position}</small></td>
                        <td><span className="employee-contact">{employee.email || '—'}</span><small className="employee-position">{employee.phone || 'ไม่ระบุเบอร์โทร'}</small></td>
                        <td>
                          {!accountDataReady
                            ? <span className="employee-account-pill employee-account-unknown">ตรวจสอบไม่ได้</span>
                            : employee.accountUsername
                            ? <span className="employee-account-pill"><i />{employee.accountUsername}</span>
                            : <span className="employee-account-pill employee-account-missing">ยังไม่มีบัญชี</span>}
                        </td>
                        <td><span className={`employee-status ${employee.evaluationStatus === 'อนุมัติแล้ว' ? 'employee-status-approved' : ''}`}><i />{employee.evaluationStatus || 'ยังไม่เริ่มประเมิน'}</span></td>
                        <td>
                          <div className="employee-row-actions">
                            <button type="button" className="employee-edit-button" onClick={() => openEditForm(employee)}>แก้ไข</button>
                          <button
                            type="button"
                            className="employee-delete-button"
                            onClick={() => handleDelete(employee)}
                            disabled={deletingId === employee.id}
                            aria-label={`ลบ ${employee.name}`}
                          >
                            {deletingId === employee.id ? 'กำลังลบ...' : 'ลบรายชื่อ'}
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="employee-table-message">
                {employees?.length ? 'ไม่พบพนักงานที่ตรงกับคำค้นหา' : 'ยังไม่มีรายชื่อพนักงานในระบบ'}
              </div>
            )}
          </section>
        </section>
      </div>

      {isFormOpen && (
        <div className="employee-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false);
        }}>
          <section className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
            <div className="employee-modal-heading">
              <div><span>{editingEmployee ? 'จัดการข้อมูลพนักงาน' : 'เพิ่มข้อมูลเข้าสู่ระบบ'}</span><h2 id="employee-modal-title">{editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'ลงทะเบียนพนักงาน'}</h2></div>
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} aria-label="ปิดหน้าต่าง">×</button>
            </div>
            <p className="employee-modal-description">{editingEmployee ? 'แก้ไขข้อมูลทั่วไปและข้อมูลติดต่อได้ หากต้องการเปลี่ยนรหัสผ่านให้กรอกรหัสใหม่ด้านล่าง' : 'กรอกรหัสพนักงานและข้อมูลที่จำเป็น พร้อมกำหนดรหัสผ่านเริ่มต้นสำหรับเข้าใช้งาน'}</p>
            {error && <p className="employee-feedback employee-feedback-error" role="alert">{error}</p>}
            <form className="employee-form" onSubmit={handleSave}>
              <label>รหัสพนักงาน<input required disabled={Boolean(editingEmployee)} value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="เช่น EMP021" /></label>
              <label>ชื่อ-นามสกุล<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="ระบุชื่อพนักงาน" /></label>
              <div className="employee-form-row">
                <label>แผนก<input required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="เช่น การตลาด" /></label>
                <label>ตำแหน่ง<input required value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="ระบุตำแหน่ง" /></label>
              </div>
              <div className="employee-form-row">
                <label>อีเมล (ไม่บังคับ)<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" autoComplete="email" /></label>
                <label>เบอร์โทรศัพท์ (ไม่บังคับ)<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="08X-XXX-XXXX" autoComplete="tel" /></label>
              </div>
              <label>{editingEmployee ? 'ตั้งรหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)' : 'รหัสผ่านเริ่มต้น'}<input required={!editingEmployee} type="password" minLength="4" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingEmployee ? 'เว้นว่างเพื่อใช้รหัสเดิม' : 'อย่างน้อย 4 ตัวอักษร'} autoComplete="new-password" /></label>
              <p className="employee-form-hint">{editingEmployee ? `ชื่อผู้ใช้สำหรับเข้าสู่ระบบ: ${editingEmployee.accountUsername || 'ไม่พบบัญชีผู้ใช้'}` : 'หลังลงทะเบียน พนักงานเลือกประเภท “พนักงาน” แล้วเข้าสู่ระบบด้วยรหัสพนักงานและรหัสผ่านนี้'}</p>
              <div className="employee-form-actions">
                <button type="button" className="employee-cancel-button" onClick={() => setIsFormOpen(false)} disabled={isSaving}>ยกเลิก</button>
                <button type="submit" className="employee-primary-button" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : editingEmployee ? 'บันทึกการแก้ไข' : 'บันทึกและลงทะเบียน'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default EmployeeManagement;
