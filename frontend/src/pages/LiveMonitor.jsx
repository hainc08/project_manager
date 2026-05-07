import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { getInitials, formatElapsedTime, formatNumber } from '../utils/formatters';

export default function LiveMonitor() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const formatVnTime = (date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
  };

  const calculateLiveCost = (startTime, standardRate) => {
    const start = new Date(startTime);
    const end = now;
    const totalHours = (end - start) / (1000 * 60 * 60);
    
    // Tăng ca 1 (sau 17:15)
    const ot1Cutoff = new Date(start);
    ot1Cutoff.setHours(17, 15, 0, 0);
    
    let stdHours = 0;
    let otHours = 0;
    
    const cut1 = ot1Cutoff.getTime();
    const segStart = start.getTime();
    const segEnd = end.getTime();
    
    if (segEnd <= cut1) {
      stdHours = totalHours;
    } else if (segStart >= cut1) {
      otHours = totalHours;
    } else {
      stdHours = (cut1 - segStart) / (1000 * 60 * 60);
      otHours = (segEnd - cut1) / (1000 * 60 * 60);
    }
    
    // Calculate cost based on frontend estimation
    const rate = parseFloat(standardRate) || 0;
    const stdCost = stdHours * rate;
    const otCost = otHours * rate * 1.5;
    
    return {
      total: Math.round(stdCost + otCost),
      stdCost: Math.round(stdCost),
      otCost: Math.round(otCost)
    };
  };

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

    // Update timers every minute instead of second to save performance for cost calculation
    const interval = setInterval(() => {
      setActiveTasks(prev => [...prev]); // Force re-render for timers
      setNow(new Date());
    }, 60000);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            🕒 {formatVnTime(now)} (VNT)
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
                <div className="live-card-info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="live-card-name">{task.full_name}</div>
                    {task.active_shift_name && (
                      <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        {task.active_shift_name}
                      </span>
                    )}
                  </div>
                  <div className="live-card-project" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>📁 {task.project_name}</span>
                    {task.project_item_name && (
                      <span style={{ opacity: 0.8 }}>• {task.project_item_name}</span>
                    )}
                    <span className={`badge ${task.location_type === 'SITE' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                      {task.location_type === 'SITE' ? '📍 Công trường' : '🏠 Tại xưởng'}
                    </span>
                  </div>
                  {task.task_content && (
                    <div className="live-card-task">"{task.task_content}"</div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className="live-card-timer">
                    {formatElapsedTime(task.start_time)}
                  </div>
                  
                  {(() => {
                    const cost = calculateLiveCost(task.start_time, task.standard_rate);
                    return (
                      <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--danger-color)' }}>
                          💰 {formatNumber(cost.total)}đ
                        </div>
                        {cost.otCost > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--warning-color)' }}>
                            (OT: {formatNumber(cost.otCost)}đ)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
