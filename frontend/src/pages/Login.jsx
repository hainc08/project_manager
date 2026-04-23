import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: '123456', role: 'Quản đốc', name: 'Nguyễn Văn Quản Đốc' },
  { username: 'ktoan', password: '123456', role: 'Kế toán', name: 'Trần Thị Kế Toán' },
  { username: 'thocnc1', password: '123456', role: 'Thợ CNC', name: 'Lê Văn CNC' },
  { username: 'thocnc2', password: '123456', role: 'Thợ Tiện', name: 'Hoàng Văn Tiện' },
  { username: 'thonguoi', password: '123456', role: 'Thợ Nguội', name: 'Phạm Văn Nguội' },
];

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      const apiError = err.response?.data?.error;
      setError(typeof apiError === 'string' ? apiError : 'Đăng nhập thất bại. Không kết nối được API server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
    setLoading(true);

    try {
      await login(account.username, account.password);
    } catch (err) {
      const apiError = err.response?.data?.error;
      setError(typeof apiError === 'string' ? apiError : 'Đăng nhập thất bại. Không kết nối được API server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">LM</div>
        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">Hệ thống Quản lý Nhân công</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div className="login-demo">
          <div className="login-demo-title">Tài khoản demo (mật khẩu: 123456)</div>
          <div className="login-demo-accounts">
            {DEMO_ACCOUNTS.map(acc => (
              <div
                key={acc.username}
                className="login-demo-account"
                onClick={() => handleDemoLogin(acc)}
              >
                <div>
                  <div className="login-demo-account-name">{acc.name}</div>
                  <div className="login-demo-account-role">{acc.username}</div>
                </div>
                <span className="badge badge-purple">{acc.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
