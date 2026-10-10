import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing'); // 'typing' | 'submitting'

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      setStatus('typing');
    }
  }

  return (
    <div className="login-page relative min-h-screen flex flex-col justify-between">
      {/* แถบ Header ด้านซ้ายบน */}
      <div className="login-header flex items-start text-white">
        <div className="login-logo bg-white text-[#0c382b] font-bold rounded tracking-wider">
          CDG
        </div>
        <div className="login-brand leading-tight">
          <p className="font-medium text-white">ระบบบันทึกเวลา และการเข้าทำงาน</p>
          <p className="text-white">CDG Group</p>
        </div>
      </div>

      {/* การ์ดเข้าสู่ระบบตรงกลางหน้าจอ */}
      <div className="login-center flex-1 flex items-center justify-center">
        <div className="login-card bg-white rounded-lg shadow-2xl">
          <h1 className="text-[#0c382b] text-center font-bold">
            เข้าสู่ระบบ
          </h1>

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้"
                required
                className="login-input w-full rounded border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                required
                className="login-input w-full rounded border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 text-center pt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="login-submit w-full rounded bg-[#0c382b] font-medium text-white hover:bg-[#08281f] disabled:bg-gray-400 transition-colors"
            >
              {status === 'submitting' ? 'กำลังบันทึก...' : 'ยืนยัน'}
            </button>
          </form>
        </div>
      </div>

      {/* Spacer ด้านล่างเพื่อความสมดุล */}
      <div className="login-footer"></div>
    </div>
  );
}

export default Login;