import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatElapsedTime, formatDateTime, formatDuration, getStatusLabel, getStatusBadgeClass } from '../utils/formatters';
import ShiftCheckInWidget from './ShiftCheckInWidget';

export default function StaffWorklog() {
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [activeAttendance, setActiveAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (activeTask) {
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
      const [tasksRes, historyRes, attendanceRes] = await Promise.all([
        api.get('/tasks/my'),
        api.get('/worklogs/my'),
        api.get('/attendance/my-status')
      ]);
      
      setAssignedTasks(tasksRes.data);
      setActiveAttendance(attendanceRes.data.active);
      
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

  const handleStartTask = async (taskId) => {
    if (!activeAttendance) {
      alert('Bạn phải Check-in ca làm việc trước khi bắt đầu công việc');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/worklogs/start', { task_id: taskId });
      setActiveTask(res.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể bắt đầu công việc');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopTask = async () => {
    setActionLoading(true);
    try {
      await api.post('/worklogs/stop');
      setActiveTask(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể kết thúc công việc');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishTask = async (taskId) => {
    if (!confirm('Bạn xác nhận đã hoàn thành công việc này và muốn gửi báo cáo cho Admin?')) return;
    setActionLoading(true);
    try {
      await api.put(`/tasks/${taskId}/finish`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể báo cáo hoàn thành');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">⏱ Chấm công</h1>
        <p className="page-subtitle">Quản lý ca làm việc và các công việc được giao</p>
      </div>

      <div className="page-body">
        {/* Shift Check-in Widget (Ca theo lịch) */}
        <ShiftCheckInWidget onCheckInSuccess={fetchData} activeTask={activeTask} />

        {/* Current Active Task Monitor */}
        {activeTask && (
          <div className="card mb-lg worklog-monitor-card" style={{ border: '1px solid var(--color-success)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div className="worklog-monitor-flex">
              <div className="worklog-monitor-info">
                <div style={{ fontSize: '2rem', background: 'rgba(16, 185, 129, 0.1)', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</div>
                <div style={{ textAlign: 'left' }}>
                  <div className="badge badge-active" style={{ marginBottom: '4px' }}>Đang thực hiện</div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeTask.task_title || activeTask.task_content || 'Công việc không tên'}</h3>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>📁 {activeTask.project_name}</span>
                    <span className={`badge ${activeTask.location_type === 'SITE' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                      {activeTask.location_type === 'SITE' ? '📍 Công trường' : '🏠 Tại xưởng'}
                    </span>
                    {activeTask.project_item_name && <span> | Hạng mục: {activeTask.project_item_name}</span>}
                  </p>
                </div>
              </div>
              <div className="worklog-monitor-timer-section">
                <div className="worklog-timer">{elapsed}</div>
                <button className="btn btn-danger" onClick={handleStopTask} disabled={actionLoading} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                  ⏹ KẾT THÚC CÔNG VIỆC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Tasks Table */}
        <div className={`card mb-lg ${!activeAttendance ? 'opacity-50' : ''}`} style={{ position: 'relative' }}>
          {!activeAttendance && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', backdropFilter: 'blur(2px)' }}>
              <div className="text-center" style={{ padding: '20px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
                <div style={{ fontWeight: 600 }}>Vui lòng Check-in ca làm việc để xem công việc</div>
              </div>
            </div>
          )}
          
          <div className="card-header">
            <h2 className="card-title">📝 Công việc được giao</h2>
          </div>
          
          {assignedTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Hiện tại bạn chưa có công việc nào được giao.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Công việc</th>
                    <th>Địa điểm</th>
                    <th>Ca dự kiến</th>
                    <th>Ngày giao</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedTasks.map(task => (
                    <tr key={task.id} style={{ opacity: task.status === 'FINISHED_BY_STAFF' ? 0.7 : 1 }}>
                      <td data-label="Công việc">
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        {task.project_item_name && (
                          <div style={{ fontSize: '0.75rem' }}>
                            <span className="text-muted">Hạng mục: </span>
                            <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{task.project_item_name}</span>
                          </div>
                        )}
                      </td>
                      <td data-label="Địa điểm">
                        <span className={`badge ${task.location_type === 'SITE' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                          {task.location_type === 'SITE' ? '📍 Công trường' : '🏠 Tại xưởng'}
                        </span>
                      </td>
                      <td data-label="Ca dự kiến">
                        {task.target_shift_name ? (
                          <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            {task.target_shift_name}
                          </span>
                        ) : '---'}
                      </td>
                      <td data-label="Ngày giao">{formatDateTime(task.created_at)}</td>
                      <td data-label="Trạng thái">
                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="text-right" data-label="Hành động">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {task.status !== 'FINISHED_BY_STAFF' && (
                            <>
                              <button 
                                className="btn btn-success btn-sm" 
                                onClick={() => handleStartTask(task.id)}
                                disabled={actionLoading || (activeTask && activeTask.task_id === task.id)}
                              >
                                {activeTask && activeTask.task_id === task.id ? '▶ Đang làm' : '▶ Bắt đầu'}
                              </button>
                              <button 
                                className="btn btn-outline btn-sm" 
                                onClick={() => handleFinishTask(task.id)}
                                disabled={actionLoading || (activeTask && activeTask.task_id === task.id)}
                              >
                                Xong
                              </button>
                            </>
                          )}
                          {task.status === 'FINISHED_BY_STAFF' && (
                             <span className="text-muted" style={{ fontSize: '0.85rem' }}>⌛ Đang chờ duyệt</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work History */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Nhật ký làm việc gần đây</div>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Chưa có nhật ký làm việc</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dự án</th>
                    <th>Công việc</th>
                    <th>Địa điểm</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th className="text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(w => (
                    <tr key={w.id}>
                      <td data-label="Dự án"><strong>{w.project_name}</strong></td>
                      <td data-label="Công việc" className="text-muted">{w.task_title || 'N/A'}</td>
                      <td data-label="Địa điểm">
                        <span className={`badge ${w.location_type === 'SITE' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                          {w.location_type === 'SITE' ? '📍 Công trường' : '🏠 Tại xưởng'}
                        </span>
                      </td>
                      <td data-label="Bắt đầu" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.start_time)}</td>
                      <td data-label="Kết thúc" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.end_time)}</td>
                      <td data-label="Thời gian" className="text-right font-mono">{formatDuration(w.duration_hours)}</td>
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
