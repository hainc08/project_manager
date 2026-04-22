import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDateTime, formatDuration, formatNumber } from '../utils/formatters';

export default function FinancialReport() {
  const [worklogs, setWorklogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [itemSummary, setItemSummary] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchProjects();
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

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (projectId) params.project_id = projectId;
      if (userId) params.user_id = userId;

      const res = await api.get('/worklogs/report', { params });
      setWorklogs(res.data.worklogs);
      setSummary(res.data.summary);
      setItemSummary(res.data.item_summary || []);
    } catch (err) {
      console.error('Failed to fetch report', err);
      setError('Không thể tải dữ liệu báo cáo. Vui lòng kiểm tra lại kết nối hoặc liên hệ quản trị viên.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (projectId) params.project_id = projectId;
      if (userId) params.user_id = userId;

      const res = await api.get('/worklogs/export', {
        params,
        responseType: 'blob'
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Báo cáo Chi phí Nhân công</h1>
        <p className="page-subtitle">Thống kê lương chuẩn, tăng ca và phụ cấp theo bộ lọc</p>
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
                <label className="form-label">Dự án</label>
                <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">Tất cả dự án</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
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
              <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
                {exporting ? '⏳ Đang xuất...' : '📥 Xuất Excel'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger mb-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Summary Indicators */}
        {summary && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon cost">💰</div>
              <div className="stat-card-label">Tổng chi phí lương</div>
              <div className="stat-card-value text-danger">{formatCurrency(summary.total_cost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon hours">⏱</div>
              <div className="stat-card-label">Tổng giờ làm việc</div>
              <div className="stat-card-value">{formatNumber(summary.total_hours)}h</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon tasks">📋</div>
              <div className="stat-card-label">Số bản ghi</div>
              <div className="stat-card-value">{summary.total_records}</div>
            </div>
          </div>
        )}

        {/* Item Breakdown */}
        {!loading && itemSummary.length > 0 && (
          <div className="card mb-lg">
            <div className="card-header">
              <div className="card-title">📊 Thống kê theo Hạng mục</div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hạng mục</th>
                    <th className="text-right">Tổng giờ</th>
                    <th className="text-right">Chi phí lương</th>
                  </tr>
                </thead>
                <tbody>
                  {itemSummary.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.item_name}</strong></td>
                      <td className="text-right font-mono">{formatDuration(item.total_hours)}</td>
                      <td className="text-right font-mono text-danger" style={{ fontWeight: 600 }}>{formatCurrency(item.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Table */}
        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
        ) : worklogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Không có dữ liệu phù hợp với bộ lọc</div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Chi tiết bản ghi ({worklogs.length})</div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Dự án</th>
                    <th>Địa điểm</th>
                    <th className="text-right">Giờ chuẩn</th>
                    <th className="text-right">Giờ tăng ca</th>
                    <th className="text-right">Hệ số</th>
                    <th className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {worklogs.map(w => (
                    <tr key={w.id}>
                      <td><strong>{w.full_name}</strong></td>
                      <td>{w.project_name}</td>
                      <td>
                        <span className={`badge ${w.location_multiplier > 1 ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                          {w.location_multiplier > 1 ? '🏗️ Công trường' : '🏠 Nhà xưởng'}
                        </span>
                      </td>
                      <td className="text-right font-mono">{formatDuration(w.standard_hours)}</td>
                      <td className="text-right font-mono text-warning">{formatDuration(w.ot_hours)}</td>
                      <td className="text-right font-mono" style={{ fontSize: '0.8rem' }}>
                        {w.holiday_multiplier > 1 ? <span className="text-danger">Lễ(x{w.holiday_multiplier})</span> : 
                         w.ot_hours > 0 ? <span>OT(x{w.ot_multiplier})</span> : '-'}
                      </td>
                      <td className="text-right font-mono text-danger" style={{ fontWeight: 600 }}>{formatCurrency(w.actual_cost)}</td>
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
