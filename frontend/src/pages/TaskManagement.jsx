import { useState, useEffect } from 'react';
import api from '../utils/api';
import { getStatusLabel, getStatusBadgeClass, formatDateTime } from '../utils/formatters';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');
  
  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    project_id: '',
    project_item_id: '',
    assignee_ids: [],
    assigned_to: '',
    location_type: 'WORKSHOP',
    target_shift_id: '',
    description: '',
    status: 'TODO'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filterProject, filterUser, filterStatus]);

  const fetchInitialData = async () => {
    try {
      const [projRes, userRes, shiftRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users'),
        api.get('/shift-management/templates')
      ]);
      // Store all projects including their items
      setProjects(projRes.data.filter(p => p.status === 'ACTIVE'));
      setUsers(userRes.data.filter(u => u.role === 'STAFF'));
      setShiftTemplates(shiftRes.data);
      fetchTasks();
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      if (filterUser) params.assigned_to = filterUser;
      if (filterStatus) params.status = filterStatus;

      const res = await api.get('/tasks', { params });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      project_id: '',
      project_item_id: '',
      assignee_ids: [],
      assigned_to: '',
      location_type: 'WORKSHOP',
      target_shift_id: '',
      description: '',
      status: 'TODO'
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      project_id: task.project_id,
      project_item_id: task.project_item_id || '',
      assignee_ids: [],
      assigned_to: task.assigned_to,
      location_type: task.location_type || 'WORKSHOP',
      target_shift_id: task.target_shift_id || '',
      description: task.description,
      status: task.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Form validation manually for assignee_ids on create
    if (!editingTask && form.assignee_ids.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhân viên thực hiện');
      return;
    }

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, form);
      } else {
        await api.post('/tasks', form);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (task) => {
    if (!confirm(`Bạn có chắc muốn xóa công việc "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể xóa');
    }
  };

  const handleApprove = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}/approve`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể duyệt');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Quản lý Công việc</h1>
        <p className="page-subtitle">Giao việc cho nhân viên và theo dõi tiến độ</p>
      </div>

      <div className="page-body">
        <div className="card mb-lg">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Dự án</label>
              <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                <option value="">Tất cả dự án</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Nhân viên</label>
              <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="">Tất cả nhân viên</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="TODO">Chưa bắt đầu</option>
                <option value="DOING">Đang làm</option>
                <option value="FINISHED_BY_STAFF">Chờ duyệt</option>
                <option value="DONE">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>
              ➕ Giao việc mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">Chưa có công việc nào được giao</div>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Công việc</th>
                    <th>Địa điểm</th>
                    <th>Hạng mục</th>
                    <th>Dự án</th>
                    <th>Ca dự kiến</th>
                    <th>Nhân viên</th>
                    <th>Trạng thái</th>
                    <th>Ngày giao</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td data-label="Công việc">
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        {task.description && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{task.description}</div>}
                      </td>
                      <td data-label="Địa điểm">
                        <span className={`badge ${task.location_type === 'SITE' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                          {task.location_type === 'SITE' ? '📍 Công trường' : '🏠 Tại xưởng'}
                        </span>
                      </td>
                      <td data-label="Hạng mục">
                        {task.project_item_name ? (
                          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{task.project_item_name}</span>
                        ) : '---'}
                      </td>
                      <td data-label="Dự án">{task.project_name}</td>
                      <td data-label="Ca dự kiến">
                        {task.target_shift_name ? (
                          <span className="badge" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            {task.target_shift_name}
                          </span>
                        ) : '---'}
                      </td>
                      <td data-label="Nhân viên">{task.assignee_name}</td>
                      <td data-label="Trạng thái">
                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td data-label="Ngày giao">{formatDateTime(task.created_at)}</td>
                      <td className="text-right" data-label="Hành động">
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {task.status === 'FINISHED_BY_STAFF' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(task.id)}>✅ Duyệt</button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(task)}>✏️</button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(task)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Sửa công việc' : 'Giao việc mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error">{error}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Dự án</label>
                    <select className="form-select" required value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value, project_item_id: ''})}>
                      <option value="">-- Chọn dự án --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hạng mục</label>
                    <select 
                      className="form-select" 
                      value={form.project_item_id} 
                      onChange={e => setForm({...form, project_item_id: e.target.value})}
                      disabled={!form.project_id}
                    >
                      <option value="">-- Thuộc hạng mục (tùy chọn) --</option>
                      {form.project_id && (() => {
                        const project = projects.find(p => String(p.id) === String(form.project_id));
                        if (!project || !project.items || project.items.length === 0) return null;
                        return project.items.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ));
                      })()}
                    </select>
                    {form.project_id && projects.find(p => String(p.id) === String(form.project_id))?.items?.length === 0 && (
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        ⚠️ Dự án này chưa được gán hạng mục nào.
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nhân viên thực hiện</label>
                  {editingTask ? (
                    <select className="form-select" required value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                      <option value="">-- Chọn nhân viên --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      {users.map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={form.assignee_ids.includes(u.id)} onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...form.assignee_ids, u.id] 
                              : form.assignee_ids.filter(id => id !== u.id);
                            setForm({...form, assignee_ids: ids});
                          }} />
                          {u.full_name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ca làm việc dự kiến</label>
                    <select className="form-select" value={form.target_shift_id} onChange={e => setForm({...form, target_shift_id: e.target.value})}>
                      <option value="">-- Chọn ca --</option>
                      {shiftTemplates.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0,5)} - {s.end_time.slice(0,5)})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa điểm làm việc</label>
                    <select className="form-select" value={form.location_type} onChange={e => setForm({...form, location_type: e.target.value})}>
                      <option value="WORKSHOP">Xưởng</option>
                      <option value="SITE">Công trường</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết</label>
                  <textarea 
                    className="form-input" 
                    rows={2} 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    placeholder="Mô tả yêu cầu..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="TODO">Chưa bắt đầu</option>
                    <option value="DOING">Đang làm</option>
                    <option value="FINISHED_BY_STAFF">Chờ duyệt</option>
                    <option value="DONE">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Cập nhật' : 'Giao việc'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
