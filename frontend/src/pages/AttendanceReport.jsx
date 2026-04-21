import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateTime, formatDuration, formatNumber } from '../utils/formatters';

export default function AttendanceReport() {
  const [report, setReport] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
            <div className="stat-card-label">Số lượt chấm công</div>
            <div className="stat-card-value">{report.length}</div>
          </div>
        </div>

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
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.check_in)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {item.check_out ? formatDateTime(item.check_out) : <span className="badge badge-active">Đang làm việc</span>}
                      </td>
                      <td className="text-right font-mono">
                        {item.duration_hours ? formatDuration(item.duration_hours) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${item.check_out ? 'badge-done' : 'badge-active'}`}>
                          {item.check_out ? 'Đã hoàn thành' : 'Chưa tan ca'}
                        </span>
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
