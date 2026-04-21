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

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchReport();
  }, []);

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
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (projectId) params.project_id = projectId;

      const res = await api.get('/worklogs/report', { params });
      setWorklogs(res.data.worklogs);
      setSummary(res.data.summary);
      setItemSummary(res.data.item_summary || []);
    } catch (err) {
      console.error('Failed to fetch report', err);
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
        <h1 className="page-title">Báo cáo Tài chính</h1>
        <p className="page-subtitle">Thống kê doanh thu, chi phí, lợi nhuận theo bộ lọc</p>
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
              <button type="submit" className="btn btn-primary">🔍 Lọc</button>
              <button type="button" className="btn btn-success" onClick={handleExport} disabled={exporting}>
                {exporting ? '⏳ Đang xuất...' : '📥 Xuất Excel'}
              </button>
            </div>
          </form>
        </div>

        {/* Summary Indicators */}
        {summary && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon revenue">💰</div>
              <div className="stat-card-label">Tổng doanh thu</div>
              <div className="stat-card-value text-success">{formatCurrency(summary.total_revenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon cost">📉</div>
              <div className="stat-card-label">Tổng chi phí</div>
              <div className="stat-card-value text-danger">{formatCurrency(summary.total_cost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon profit">📈</div>
              <div className="stat-card-label">Lợi nhuận</div>
              <div className="stat-card-value text-info">{formatCurrency(summary.profit)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon hours">⏱</div>
              <div className="stat-card-label">Tổng giờ / Số bản ghi</div>
              <div className="stat-card-value">{formatNumber(summary.total_hours)}h <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({summary.total_records})</span></div>
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
                    <th className="text-right">Chi phí</th>
                    <th className="text-right">Doanh thu</th>
                    <th className="text-right">Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {itemSummary.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.item_name}</strong></td>
                      <td className="text-right font-mono">{formatDuration(item.total_hours)}</td>
                      <td className="text-right font-mono text-danger">{formatCurrency(item.total_cost)}</td>
                      <td className="text-right font-mono text-success">{formatCurrency(item.total_revenue)}</td>
                      <td className="text-right font-mono text-info" style={{ fontWeight: 600 }}>{formatCurrency(item.profit)}</td>
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
                    <th>Công việc</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th className="text-right">Số giờ</th>
                    <th className="text-right">Chi phí</th>
                    <th className="text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {worklogs.map(w => (
                    <tr key={w.id}>
                      <td><strong>{w.full_name}</strong></td>
                      <td>{w.project_name}</td>
                      <td className="text-muted">{w.task_content || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.start_time)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(w.end_time)}</td>
                      <td className="text-right font-mono">{formatDuration(w.duration_hours)}</td>
                      <td className="text-right font-mono text-danger">{formatCurrency(w.actual_cost)}</td>
                      <td className="text-right font-mono text-success">{formatCurrency(w.actual_revenue)}</td>
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
