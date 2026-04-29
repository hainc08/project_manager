import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import './Quotation.css';

export default function QuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuotations();
  }, [filter, search]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales/quotations?status=${filter}&search=${search}`);
      setQuotations(res.data);
    } catch (err) {
      console.error('Failed to fetch quotations', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Bản nháp',
      PENDING_APPROVAL: 'Chờ duyệt',
      SENT: 'Đã gửi',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      CONVERTED: 'Đã chuyển dự án',
      EXPIRED: 'Hết hạn'
    };
    return labels[status] || status;
  };

  return (
    <div className="quotation-page">
      <div className="quotation-header">
        <div>
          <h1 className="page-title">Quản lý Báo giá</h1>
          <p className="page-subtitle">Theo dõi và quản lý các bản chào giá khách hàng</p>
        </div>
        <Link to="/sales/quotations/new" className="btn btn-primary">
          <span>+</span> Tạo Báo giá mới
        </Link>
      </div>

      <div className="quotation-tabs">
        <div className={`quotation-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tất cả</div>
        <div className={`quotation-tab ${filter === 'DRAFT' ? 'active' : ''}`} onClick={() => setFilter('DRAFT')}>Bản nháp</div>
        <div className={`quotation-tab ${filter === 'SENT' ? 'active' : ''}`} onClick={() => setFilter('SENT')}>Đã gửi</div>
        <div className={`quotation-tab ${filter === 'APPROVED' ? 'active' : ''}`} onClick={() => setFilter('APPROVED')}>Đã duyệt</div>
      </div>

      <div className="builder-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Tìm kiếm theo số báo giá, khách hàng hoặc dự án..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="item-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}>Đang tải...</div>
      ) : (
        <div className="quotation-grid">
          {quotations.length === 0 ? (
            <div className="flex-center" style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              Không tìm thấy báo giá nào
            </div>
          ) : (
            <table className="items-table">
              <thead>
                <tr>
                  <th>Số báo giá</th>
                  <th>Khách hàng</th>
                  <th>Dự án / Hạng mục</th>
                  <th className="text-right">Tổng cộng</th>
                  <th className="text-center">Ngày tạo</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id} className="hover-row">
                    <td className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{q.quote_number}</td>
                    <td>{q.customer_name}</td>
                    <td>{q.project_name}</td>
                    <td className="text-right font-bold">{formatCurrency(q.total_amount)}</td>
                    <td className="text-center text-sm">{formatDate(q.created_at)}</td>
                    <td className="text-center">
                      <span className={`status-pill status-${q.status.toLowerCase()}`}>
                        {getStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex-gap-sm justify-end">
                        <button className="btn-icon" onClick={() => navigate(`/sales/quotations/${q.id}/preview`)} title="Xem trước">👁️</button>
                        {q.status === 'DRAFT' && (
                          <button className="btn-icon" onClick={() => navigate(`/sales/quotations/${q.id}/edit`)} title="Chỉnh sửa">✏️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
