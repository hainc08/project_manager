import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateTime } from '../utils/formatters';

export default function ProjectItemManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/project-items');
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch project items', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({ name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingItem) {
        await api.put(`/project-items/${editingItem.id}`, form);
      } else {
        await api.post('/project-items', form);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Bạn có chắc muốn xóa hạng mục "${item.name}"?`)) return;
    try {
      await api.delete(`/project-items/${item.id}`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa hạng mục này');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📚 Quản lý Hạng mục</h1>
        <p className="page-subtitle">Định nghĩa các hạng mục công việc dùng chung cho các dự án</p>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Thêm hạng mục mới
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-text">Chưa có hạng mục nào được định nghĩa</div>
            <button className="btn btn-primary mt-md" onClick={openCreateModal}>Tạo hạng mục đầu tiên</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên hạng mục</th>
                  <th>Mô tả</th>
                  <th>Ngày tạo</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td data-label="Tên hạng mục"><strong>{item.name}</strong></td>
                    <td data-label="Mô tả" className="text-muted">{item.description || '---'}</td>
                    <td data-label="Ngày tạo">{formatDateTime(item.created_at)}</td>
                    <td className="text-right" data-label="Hành động">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditModal(item)}>Sửa</button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <h2 className="modal-title">{editingItem ? 'Sửa hạng mục' : 'Thêm hạng mục mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Tên hạng mục</label>
                  <input 
                    className="form-input" 
                    required 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="Ví dụ: Thi công thô, Hoàn thiện..." 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả (tùy chọn)</label>
                  <textarea 
                    className="form-input" 
                    rows="3"
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    placeholder="Mô tả chi tiết về hạng mục này"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
