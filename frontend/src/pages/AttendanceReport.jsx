import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateTime, formatDuration, formatNumber } from '../utils/formatters';

export default function AttendanceReport() {
  const [report, setReport] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters - Mặc định Từ ngày (4 ngày trước) và Đến ngày (hôm nay) theo giờ địa phương
  const getLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default 6 days (5 days ago + today)
  const now = new Date();
  const defaultEnd = getLocalDateStr(now);
  
  const date5DaysAgo = new Date();
  date5DaysAgo.setDate(now.getDate() - 5);
  const defaultStart = getLocalDateStr(date5DaysAgo);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchReport();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (userId) params.user_id = userId;

      const res = await api.get('/attendance/report', { params });
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance report', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Calculate total hours in the current report
  const totalHours = report.reduce((sum, item) => sum + (item.duration_hours || 0), 0);

  // Calculate summary per user
  const userSummary = Object.values(report.reduce((acc, item) => {
    if (!acc[item.user_id]) {
      acc[item.user_id] = { user_id: item.user_id, full_name: item.full_name, total_shifts: 0, total_hours: 0 };
    }
    acc[item.user_id].total_shifts += 1;
    acc[item.user_id].total_hours += item.duration_hours || 0;
    return acc;
  }, {})).sort((a, b) => b.total_shifts - a.total_shifts);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Báo cáo Chấm công</h1>
        <p className="page-subtitle">Thống kê giờ có mặt và ngày làm việc của nhân viên</p>
      </div>

      <div className="page-body">
        {/* Filter Bar */}
        <div className="card mb-lg">
          <form onSubmit={handleFilter}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                <label className="form-label">Từ ngày</label>
                <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                <label className="form-label">Đến ngày</label>
                <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                <label className="form-label">Nhân viên</label>
                <select className="form-select" value={userId} onChange={e => setUserId(e.target.value)}>
                  <option value="">Tất cả nhân viên</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">🔍 Lọc</button>
            </div>
          </form>
        </div>

        {/* Summary Card */}
        <div className="stats-grid mb-lg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-card-icon hours">⏱</div>
            <div className="stat-card-label">Tổng giờ làm việc</div>
            <div className="stat-card-value text-primary">{formatNumber(totalHours)} giờ</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">📅</div>
            <div className="stat-card-label">Tổng lượt chấm công</div>
            <div className="stat-card-value">{report.length}</div>
          </div>
        </div>

        {/* User Summary Table */}
        {!loading && userSummary.length > 0 && (
          <div className="card mb-lg">
            <div className="card-header">
              <div className="card-title">Tổng hợp theo nhân viên</div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th className="text-right">Tổng số ca</th>
                    <th className="text-right">Số tuần làm việc (6 ca/tuần)</th>
                    <th className="text-right">Tổng giờ</th>
                  </tr>
                </thead>
                <tbody>
                  {userSummary.map(user => {
                    const weeks = Math.floor(user.total_shifts / 6);
                    const extraShifts = user.total_shifts % 6;
                    return (
                      <tr key={user.user_id}>
                        <td><strong>{user.full_name}</strong></td>
                        <td className="text-right font-mono">{user.total_shifts}</td>
                        <td className="text-right font-mono text-primary">
                          {weeks > 0 ? `${weeks} tuần` : ''} 
                          {weeks > 0 && extraShifts > 0 ? ' + ' : ''}
                          {extraShifts > 0 ? `${extraShifts} ca` : ''}
                        </td>
                        <td className="text-right font-mono">{formatNumber(user.total_hours)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : report.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">Không có dữ liệu chấm công nào</div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Chi tiết chấm công ({report.length})</div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Ca làm việc</th>
                    <th>Vào ca (Check-in)</th>
                    <th>Tan ca (Check-out)</th>
                    <th className="text-right">Tổng giờ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.full_name}</strong></td>
                      <td>
                        {item.shift_name ? (
                          <span className="badge" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            {item.shift_name}
                          </span>
                        ) : '---'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.check_in)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {item.check_out ? formatDateTime(item.check_out) : <span className="badge badge-active">Đang làm việc</span>}
                      </td>
                      <td className="text-right font-mono">
                        {item.duration_hours ? formatDuration(item.duration_hours) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`badge ${item.check_out ? 'badge-done' : 'badge-active'}`} style={{ width: 'fit-content' }}>
                            {item.check_out ? 'Đã hoàn thành' : 'Chưa tan ca'}
                          </span>
                          {item.status === 'LATE' && (
                            <span className="badge badge-danger" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                              🔴 Đi muộn {item.late_minutes}p
                            </span>
                          )}
                          {item.status === 'ON_TIME' && (
                            <span className="badge badge-success" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                              🟢 Đúng giờ
                            </span>
                          )}
                          {item.overtime_minutes > 0 && (
                            <span className="badge badge-warning" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                              🟡 Tăng ca {item.overtime_minutes}p
                            </span>
                          )}
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
    </>
  );
}
