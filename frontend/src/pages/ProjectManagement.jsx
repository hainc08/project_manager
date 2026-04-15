import { useState, useEffect } from 'react';
import api from '../utils/api';
import { getStatusLabel, getStatusBadgeClass, formatDateTime } from '../utils/formatters';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ project_name: '', status: 'ACTIVE' });
  const [error, setError] = useState('');

  useEffect(() => { fetchProjects(); }, []);

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
    setForm({ project_name: '', status: 'ACTIVE' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setForm({ project_name: project.project_name, status: project.status });
    setError('');
    setShowModal(true);
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
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
