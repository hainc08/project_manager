import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../utils/api';
import { formatCurrency, formatNumber, formatDuration } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/worklogs/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Tổng quan hoạt động</p>
        </div>
        <div className="page-body">
          <div className="loading-page" style={{ minHeight: '300px' }}>
            <div className="spinner"></div>
          </div>
        </div>
      </>
    );
  }
  const monthlyChartData = (data?.monthly_data || []).map(d => ({
    name: d.month,
    'Chi phí nhân công': d.cost
  }));

  const projectChartData = (data?.project_data || []).map(d => ({
    name: d.project_name.length > 15 ? d.project_name.slice(0, 15) + '...' : d.project_name,
    'Chi phí': d.cost,
    'Số giờ': d.hours
  }));

  const customTooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '13px'
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Tổng quan hoạt động & chi phí nhân công</p>
      </div>

      <div className="page-body">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon cost">📉</div>
            <div className="stat-card-label">Tổng chi phí lương</div>
            <div className="stat-card-value text-danger">{formatCurrency(data?.totals?.total_cost)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon staff">👷</div>
            <div className="stat-card-label">NV đang làm việc</div>
            <div className="stat-card-value">{data?.active_staff || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon hours">⏱</div>
            <div className="stat-card-label">Tổng giờ làm</div>
            <div className="stat-card-value">{formatNumber(data?.totals?.total_hours)} giờ</div>
          </div>
          <div className="stat-card" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
            <div className="stat-card-icon tasks">📁</div>
            <div className="stat-card-label">Dự án hoạt động</div>
            <div className="stat-card-value">
              {data?.project_status_count?.find(s => s.status === 'ACTIVE')?.count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
              Đã xong: {data?.project_status_count?.find(s => s.status === 'COMPLETED')?.count || 0} | 
              Tạm dừng: {data?.project_status_count?.find(s => s.status === 'ON_HOLD')?.count || 0}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          {/* Monthly Cost Chart */}
          <div className="chart-card">
            <div className="chart-title">📊 Chi phí nhân công theo tháng</div>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Chi phí nhân công" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">Chưa có dữ liệu</div>
              </div>
            )}
          </div>

          {/* Project Revenue Chart */}
          <div className="chart-card">
            <div className="chart-title">📁 So sánh theo dự án</div>
            {projectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value, name) => name === 'Số giờ' ? `${value} giờ` : formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Số giờ" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-text">Chưa có dữ liệu dự án</div>
              </div>
            )}
          </div>
        </div>

        {/* Project Summary Table */}
        {data?.project_data?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Tổng hợp theo dự án</div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dự án</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Giờ tiêu chuẩn</th>
                    <th className="text-right">Giờ OT</th>
                    <th className="text-right">Chi phí OT</th>
                    <th className="text-right">Tổng chi phí</th>
                  </tr>
                </thead>
                <tbody>
                  {data.project_data.map((p, i) => (
                    <>
                      <tr key={`p_${i}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td><strong>{p.project_name}</strong></td>
                        <td>
                          {p.status === 'ACTIVE' && <span className="badge badge-success">Đang làm</span>}
                          {p.status === 'COMPLETED' && <span className="badge badge-purple">Hoàn thành</span>}
                          {p.status === 'ON_HOLD' && <span className="badge badge-warn">Tạm dừng</span>}
                        </td>
                        <td className="text-right font-mono">{formatNumber(p.standard_hours)}h</td>
                        <td className="text-right font-mono">{formatNumber(p.ot_hours)}h</td>
                        <td className="text-right font-mono text-warn">{formatCurrency(p.ot_cost)}</td>
                        <td className="text-right font-mono text-danger" style={{ fontWeight: 600 }}>{formatCurrency(p.cost)}</td>
                      </tr>
                      {p.items && p.items.length > 0 && p.items.map((item, j) => (
                        <tr key={`p_${i}_item_${j}`} style={{ fontSize: '0.85rem' }}>
                          <td colSpan="2" style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>
                            └ Hạng mục: {item.item_name}
                          </td>
                          <td className="text-right font-mono text-muted">{formatNumber(item.standard_hours)}h</td>
                          <td colSpan="3"></td>
                        </tr>
                      ))}
                    </>
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
