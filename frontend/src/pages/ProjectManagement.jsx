import { useState, useEffect } from 'react';
import api from '../utils/api';
import { getStatusLabel, getStatusBadgeClass, formatDateTime } from '../utils/formatters';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ project_name: '', status: 'ACTIVE', item_ids: [] });
  const [error, setError] = useState('');

  useEffect(() => { 
    fetchProjects(); 
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      const res = await api.get('/project-items');
      setAvailableItems(res.data);
    } catch (err) {
      console.error('Failed to fetch project items', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setForm({ project_name: '', status: 'ACTIVE', item_ids: [] });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setForm({ 
      project_name: project.project_name, 
      status: project.status,
      item_ids: project.items ? project.items.map(i => i.id) : []
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleItem = (itemId) => {
    setForm(prev => {
      const item_ids = prev.item_ids.includes(itemId)
        ? prev.item_ids.filter(id => id !== itemId)
        : [...prev.item_ids, itemId];
      return { ...prev, item_ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, form);
      } else {
        await api.post('/projects', form);
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (project) => {
    if (!confirm(`Bạn có chắc muốn xóa dự án "${project.project_name}"?`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Quản lý Dự án</h1>
        <p className="page-subtitle">Tạo và quản lý các dự án</p>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Thêm dự án
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">Chưa có dự án nào</div>
            <button className="btn btn-primary mt-md" onClick={openCreateModal}>Tạo dự án đầu tiên</button>
          </div>
        ) : (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {projects.map(project => (
              <div className="card" key={project.id} style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{project.project_name}</h3>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Tạo: {formatDateTime(project.created_at)}
                    </span>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                
                {project.items && project.items.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {project.items.map(item => (
                      <span key={item.id} className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        {item.name}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEditModal(project)}>✏️ Sửa</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(project)} style={{ color: 'var(--color-danger)' }}>🗑️ Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Tên dự án</label>
                  <input className="form-input" required value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} placeholder="Nhập tên dự án" />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="ON_HOLD">Tạm dừng</option>
                    <option value="COMPLETED">Hoàn thành</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hạng mục triển khai</label>
                  {availableItems.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Chưa có hạng mục nào. Vui lòng tạo hạng mục trước.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      {availableItems.map(item => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={form.item_ids.includes(item.id)}
                            onChange={() => handleToggleItem(item.id)}
                          />
                          {item.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingProject ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
