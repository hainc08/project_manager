import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatElapsedTime, formatDateTime, formatDuration, formatCurrency } from '../utils/formatters';

export default function StaffWorklog() {
  const [projects, setProjects] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (activeTask) {
      // Start timer
      const updateTimer = () => {
        setElapsed(formatElapsedTime(activeTask.start_time));
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsed('00:00:00');
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTask]);

  const fetchData = async () => {
    try {
      const [projectsRes, historyRes] = await Promise.all([
        api.get('/projects'),
        api.get('/worklogs/my')
      ]);
      setProjects(projectsRes.data.filter(p => p.status === 'ACTIVE'));
      
      const allLogs = historyRes.data;
      const active = allLogs.find(w => w.status === 'IN_PROGRESS');
      if (active) setActiveTask(active);
      setHistory(allLogs.filter(w => w.status === 'DONE'));
    } catch (err) {
      console.error('Failed to fetch', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!selectedProject) {
      alert('Vui lòng chọn dự án');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/worklogs/start', {
        project_id: selectedProject,
        task_content: taskContent
      });
      setActiveTask(res.data);
      setTaskContent('');
      setSelectedProject('');
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể bắt đầu công việc');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await api.post('/worklogs/stop');
      setActiveTask(null);
      fetchData(); // Refresh history
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể kết thúc công việc');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Chấm công</h1>
        </div>
        <div className="page-body">
          <div className="flex-center" style={{ minHeight: '300px' }}><div className="spinner"></div></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">⏱ Chấm công</h1>
        <p className="page-subtitle">Bắt đầu và kết thúc công việc của bạn</p>
      </div>

      <div className="page-body">
        {/* Action Area */}
        <div className="card mb-lg">
          <div className="worklog-action-area">
            {activeTask ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <span className="badge badge-active" style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    Đang làm việc
                  </span>
                </div>
                <div className="worklog-current-task">
                  📁 {activeTask.project_name}
                  {activeTask.task_content && <span> — {activeTask.task_content}</span>}
                </div>
                <div className="worklog-timer">{elapsed}</div>
                <button
                  className="btn btn-danger btn-xl"
                  onClick={handleStop}
                  disabled={actionLoading}
                  style={{ minWidth: '220px' }}
                >
                  {actionLoading ? (
                    <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> Đang xử lý...</>
                  ) : (
                    '⏹ KẾT THÚC'
                  )}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚀</div>
                <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>Bắt đầu công việc mới</h2>
                <p className="text-muted mb-lg">Chọn dự án và mô tả công việc, sau đó nhấn Bắt đầu</p>
                
                <div style={{ width: '100%', maxWidth: '400px' }}>
                  <div className="form-group">
                    <select
                      className="form-select"
                      value={selectedProject}
                      onChange={e => setSelectedProject(e.target.value)}
                    >
                      <option value="">-- Chọn dự án --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Mô tả công việc (tùy chọn)"
                      value={taskContent}
                      onChange={e => setTaskContent(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-success btn-xl"
                    onClick={handleStart}
                    disabled={actionLoading || !selectedProject}
                    style={{ width: '100%' }}
                  >
                    {actionLoading ? (
                      <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> Đang xử lý...</>
                    ) : (
                      '▶ BẮT ĐẦU'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Work History */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Lịch sử công việc</div>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Bạn chưa có bản ghi công việc nào</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dự án</th>
                    <th>Công việc</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th className="text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(w => (
                    <tr key={w.id}>
                      <td><strong>{w.project_name}</strong></td>
                      <td className="text-muted">{w.task_content || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.start_time)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.end_time)}</td>
                      <td className="text-right font-mono">{formatDuration(w.duration_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
