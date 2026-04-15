import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { getInitials, formatElapsedTime } from '../utils/formatters';

export default function LiveMonitor() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    fetchActiveTasks();

    // Connect to Socket.io
    const socket = io(window.location.origin);

    socket.on('task:started', (task) => {
      setActiveTasks(prev => [task, ...prev.filter(t => t.id !== task.id)]);
    });

    socket.on('task:stopped', (task) => {
      setActiveTasks(prev => prev.filter(t => t.id !== task.id));
    });

    // Update timers every second
    const interval = setInterval(() => {
      setActiveTasks(prev => [...prev]); // Force re-render for timers
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchActiveTasks = async () => {
    try {
      const res = await api.get('/worklogs/active');
      setActiveTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch active tasks', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 className="page-title">Theo dõi trực tiếp</h1>
            <p className="page-subtitle">Nhân viên đang làm việc real-time</p>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-page" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">😴</div>
            <div className="empty-state-text">Hiện tại không có nhân viên nào đang làm việc</div>
            <p className="text-muted">Khi nhân viên bắt đầu task, thông tin sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <>
            <div className="mb-lg">
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 14px' }}>
                {activeTasks.length} nhân viên đang hoạt động
              </span>
            </div>
            {activeTasks.map(task => (
              <div className="live-card" key={task.id}>
                <div className="live-card-avatar">
                  {getInitials(task.full_name)}
                </div>
                <div className="live-card-info">
                  <div className="live-card-name">{task.full_name}</div>
                  <div className="live-card-project">📁 {task.project_name}</div>
                  {task.task_content && (
                    <div className="live-card-task">"{task.task_content}"</div>
                  )}
                </div>
                <div className="live-card-timer">
                  {formatElapsedTime(task.start_time)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
