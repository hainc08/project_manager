import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, getRoleLabel, getContractLabel } from '../utils/formatters';

// Format number with comma separators for display
function formatMoneyDisplay(value) {
  if (!value && value !== 0) return '';
  const num = String(value).replace(/[^0-9]/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Parse formatted string back to number
function parseMoneyValue(str) {
  if (!str) return '';
  return str.replace(/[^0-9]/g, '');
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', role: 'STAFF',
    contract_type: 'FULLTIME', standard_rate: '', billing_rate: ''
  });
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', full_name: '', role: 'STAFF', contract_type: 'FULLTIME', standard_rate: '', billing_rate: '', standard_rate_display: '', billing_rate_display: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role: user.role,
      contract_type: user.contract_type,
      standard_rate: user.standard_rate,
      billing_rate: user.billing_rate,
      standard_rate_display: formatMoneyDisplay(user.standard_rate),
      billing_rate_display: formatMoneyDisplay(user.billing_rate)
    });
    setError('');
    setShowModal(true);
  };

  const handleMoneyChange = (field, value) => {
    const raw = parseMoneyValue(value);
    setForm(prev => ({
      ...prev,
      [field]: raw,
      [field + '_display']: formatMoneyDisplay(raw)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          full_name: form.full_name,
          role: form.role,
          contract_type: form.contract_type,
          standard_rate: Number(form.standard_rate),
          billing_rate: Number(form.billing_rate)
        });
      } else {
        if (!form.password) { setError('Vui lòng nhập mật khẩu'); return; }
        await api.post('/users', {
          ...form,
          standard_rate: Number(form.standard_rate) || 0,
          billing_rate: Number(form.billing_rate) || 0
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Bạn có chắc muốn xóa "${user.full_name}"?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa');
    }
  };

  const handleSetRate = async (userId, standard_rate, billing_rate) => {
    try {
      await api.put(`/users/${userId}/rate`, { standard_rate, billing_rate });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Quản lý Nhân viên</h1>
        <p className="page-subtitle">Thêm, sửa, xóa nhân viên và thiết lập đơn giá</p>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div className="toolbar-search">
            <span className="toolbar-search-icon">🔍</span>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm kiếm nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Thêm nhân viên
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Hợp đồng</th>
                  <th className="text-right">Chi phí/giờ</th>
                  <th className="text-right">Đơn giá/giờ</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div><strong>{user.full_name}</strong></div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>@{user.username}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-danger' : user.role === 'ACCOUNTANT' ? 'badge-info' : 'badge-success'}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td><span className="text-secondary">{getContractLabel(user.contract_type)}</span></td>
                    <td className="text-right font-mono">{formatCurrency(user.standard_rate)}</td>
                    <td className="text-right font-mono">{formatCurrency(user.billing_rate)}</td>
                    <td className="text-right">
                      <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)} title="Sửa">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(user)} title="Xóa">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '32px' }}>Không tìm thấy nhân viên</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error">{error}</div>}

                {!editingUser && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tên đăng nhập</label>
                      <input className="form-input" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mật khẩu</label>
                      <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-input" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vai trò</label>
                    <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="STAFF">Nhân viên</option>
                      <option value="ACCOUNTANT">Kế toán</option>
                      <option value="ADMIN">Quản trị viên</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loại hợp đồng</label>
                    <select className="form-select" value={form.contract_type} onChange={e => setForm({...form, contract_type: e.target.value})}>
                      <option value="FULLTIME">Toàn thời gian</option>
                      <option value="PARTTIME">Bán thời gian</option>
                      <option value="FREELANCER">Freelancer</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chi phí / giờ (VND)</label>
                    <input className="form-input" type="text" inputMode="numeric" placeholder="0" value={form.standard_rate_display || ''} onChange={e => handleMoneyChange('standard_rate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đơn giá / giờ (VND)</label>
                    <input className="form-input" type="text" inputMode="numeric" placeholder="0" value={form.billing_rate_display || ''} onChange={e => handleMoneyChange('billing_rate', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
