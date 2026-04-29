import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import './Quotation.css';

export default function QuotationPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/sales/quotations/${id}`);
      setQuote(res.data);
    } catch (err) {
      console.error('Failed to fetch quotation', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateStatus = async (status) => {
    try {
      await api.patch(`/sales/quotations/${id}/status`, { status });
      fetchQuotation();
    } catch (err) {
      alert('Cập nhật trạng thái thất bại');
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '80vh' }}>Đang tải...</div>;
  if (!quote) return <div className="flex-center">Không tìm thấy báo giá</div>;

  const groups = Array.from(new Set(quote.items.map(i => i.group_name))).sort((a, b) => {
    const itemA = quote.items.find(i => i.group_name === a);
    const itemB = quote.items.find(i => i.group_name === b);
    return itemA.group_order - itemB.group_order;
  });

  return (
    <div className="preview-page">
      <div className="action-bar no-print" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="flex-gap-sm">
          <button className="btn btn-ghost" onClick={() => navigate('/sales/quotations')}>← Quay lại</button>
          <span style={{ color: 'var(--text-secondary)' }}>Báo giá: <strong>{quote.quote_number}</strong></span>
        </div>
        <div className="flex-gap-sm">
          {quote.status === 'DRAFT' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/sales/quotations/${id}/edit`)}>✏️ Chỉnh sửa</button>
              <button className="btn btn-primary" onClick={() => handleUpdateStatus('SENT')}>🚀 Gửi cho khách</button>
            </>
          )}
          {quote.status === 'SENT' && (
            <button className="btn btn-success" onClick={() => handleUpdateStatus('APPROVED')}>✅ Khách đã duyệt</button>
          )}
          <button className="btn btn-primary" style={{ backgroundColor: '#4f8ef7' }} onClick={handlePrint}>🖨️ In / Xuất PDF</button>
        </div>
      </div>

      <div className="paper-wrapper">
        <div className="paper">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #0f1c3a', paddingBottom: '20px' }}>
            <div>
              <h1 style={{ color: '#0f1c3a', fontSize: '28px', marginBottom: '4px' }}>KOSUMI FACTORY</h1>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Hệ thống quản lý sản xuất & nhân công tập trung</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '24px', color: '#0f1c3a' }}>BÁO GIÁ</h2>
              <p style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>No: {quote.quote_number}</p>
              <p style={{ fontSize: '13px' }}>Ngày: {formatDate(quote.created_at)}</p>
            </div>
          </div>

          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            <div>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>ĐƠN VỊ CUNG CẤP</h3>
              <p><strong>CÔNG TY TNHH KOSUMI VIỆT NAM</strong></p>
              <p style={{ fontSize: '13px' }}>Địa chỉ: Lô B2, KCN Thăng Long, Đông Anh, Hà Nội</p>
              <p style={{ fontSize: '13px' }}>Hotline: 0988.XXX.XXX - Email: sales@kosumi.vn</p>
              <p style={{ fontSize: '13px' }}>MST: 0102030405</p>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>ĐỐI TÁC / KHÁCH HÀNG</h3>
              <p><strong>{quote.company_name}</strong></p>
              <p style={{ fontSize: '13px' }}>Người liên hệ: {quote.contact_name || '—'}</p>
              <p style={{ fontSize: '13px' }}>SĐT: {quote.customer_phone || '—'}</p>
              <p style={{ fontSize: '13px' }}>Dự án: {quote.project_name}</p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ background: '#0f1c3a', color: 'white' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', width: '40px' }}>#</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Nội dung hạng mục</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', width: '60px' }}>ĐVT</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', width: '60px' }}>SL</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', width: '120px' }}>Đơn giá (VNĐ)</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', width: '130px' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((groupName, gIndex) => (
                <>
                  <tr key={`pg-${gIndex}`} style={{ background: '#f8fafc' }}>
                    <td colSpan="6" style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: '13px', color: '#0f1c3a' }}>{groupName}</td>
                  </tr>
                  {quote.items.filter(i => i.group_name === groupName).map((item, iIndex) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontSize: '13px', textAlign: 'center' }}>{iIndex + 1}</td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>{item.description}</td>
                      <td style={{ padding: '10px', fontSize: '13px', textAlign: 'center' }}>{item.unit}</td>
                      <td style={{ padding: '10px', fontSize: '13px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right' }}>{formatNumber(item.unit_price)}</td>
                      <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', fontWeight: '500' }}>{formatNumber(item.total_price)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {/* Totals & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
            <div style={{ padding: '15px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '10px', color: '#92400e' }}>ĐIỀU KHOẢN & GHI CHÚ:</h4>
              <ul style={{ fontSize: '12px', color: '#92400e', paddingLeft: '15px', margin: 0 }}>
                <li>Hiệu lực báo giá: {quote.valid_until ? formatDate(quote.valid_until) : '30 ngày kể từ ngày lập'}</li>
                <li>Thời gian giao hàng: {quote.delivery_days} ngày làm việc.</li>
                <li>Thanh toán: {quote.payment_terms === '50_50' ? 'Tạm ứng 50%, thanh toán 50% trước khi giao hàng.' : 'Theo thỏa thuận hợp đồng.'}</li>
                {quote.note && <li style={{ marginTop: '8px' }}>Ghi chú thêm: {quote.note}</li>}
              </ul>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span>Tổng cộng:</span>
                <span>{formatNumber(quote.subtotal)} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#ef4444' }}>
                <span>Chiết khấu ({quote.discount_percent}%):</span>
                <span>-{formatNumber(quote.discount_amount)} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span>Thuế VAT ({quote.vat_percent}%):</span>
                <span>{formatNumber(quote.vat_amount)} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #0f1c3a', fontWeight: 'bold', fontSize: '18px', color: '#0f1c3a' }}>
                <span>TỔNG CỘNG:</span>
                <span>{formatNumber(quote.total_amount)} đ</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '60px' }}>ĐẠI DIỆN KHÁCH HÀNG</p>
              <p style={{ color: '#94a3b8' }}>(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '60px' }}>ĐẠI DIỆN CÔNG TY KOSUMI</p>
              <p style={{ color: '#94a3b8' }}>(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
