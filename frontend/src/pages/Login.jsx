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

  const from = location.state?.from || '/home-menu';

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError({
        field: err.field || null,
        message: err.message || 'เข้าสู่ระบบไม่สำเร็จ',
      });
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
          <p className="font-medium text-white">ระบบการประเมินผลการทำงาน</p>
          
        </div>
      </div>

      {/* การ์ดเข้าสู่ระบบตรงกลางหน้าจอ */}
      <div className="login-center flex-1 flex items-center justify-center">
        <div className="login-card bg-white rounded-lg shadow-2xl">
          <h1 className="text-[#0c382b] text-center font-bold">
            เข้าสู่ระบบ
          </h1>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="username">ชื่อผู้ใช้</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="กรอกชื่อผู้ใช้"
                autoComplete="username"
                required
                aria-invalid={error?.field === 'username'}
                aria-describedby={error?.field === 'username' ? 'username-error' : undefined}
                className="login-input w-full rounded border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
              {error?.field === 'username' && (
                <p id="username-error" className="login-error">{error.message}</p>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="password">รหัสผ่าน</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
                required
                aria-invalid={error?.field === 'password'}
                aria-describedby={error?.field === 'password' ? 'password-error' : undefined}
                className="login-input w-full rounded border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
              {error?.field === 'password' && (
                <p id="password-error" className="login-error">{error.message}</p>
              )}
            </div>

            {error && !error.field && (
              <p className="login-error login-error-general">{error.message}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="login-submit w-full rounded bg-[#0c382b] font-medium text-white hover:bg-[#08281f] disabled:bg-gray-400 transition-colors"
            >
              {status === 'submitting' ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
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