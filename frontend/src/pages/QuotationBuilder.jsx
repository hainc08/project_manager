import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/formatters';
import './Quotation.css';

const ITEM_TYPES = [
  { id: 'labor', label: 'Nhân công', icon: '👤' },
  { id: 'material', label: 'Vật tư', icon: '🏗️' },
  { id: 'outsource', label: 'Thuê ngoài', icon: '🤝' },
  { id: 'service', label: 'Dịch vụ', icon: '⚙️' },
  { id: 'delivery', label: 'Vận chuyển', icon: '🚚' }
];

export default function QuotationBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  // Header Info
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [formData, setFormData] = useState({
    project_name: '',
    quantity_desc: '',
    payment_terms: '50_50',
    delivery_days: 30,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: '',
    discount_percent: 0,
    vat_percent: 10
  });

  // Items State
  const [items, setItems] = useState([
    { id: 'temp-1', group_name: 'I. Chi phí chính', group_order: 0, item_order: 0, description: '', item_type: 'labor', quantity: 1, unit: 'bộ', unit_price: 0, total_price: 0 }
  ]);

  useEffect(() => {
    if (isEdit) {
      fetchQuotation();
    }
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/sales/quotations/${id}`);
      const data = res.data;
      setFormData({
        project_name: data.project_name,
        quantity_desc: data.quantity_desc,
        payment_terms: data.payment_terms,
        delivery_days: data.delivery_days,
        valid_until: data.valid_until ? data.valid_until.split('T')[0] : '',
        note: data.note || '',
        discount_percent: Number(data.discount_percent),
        vat_percent: Number(data.vat_percent)
      });
      setCustomer({ id: data.customer_id, company_name: data.company_name });
      setItems(data.items.map(item => ({ ...item, id: item.id || Math.random().toString(36).substr(2, 9) })));
    } catch (err) {
      console.error('Failed to fetch quotation', err);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (val) => {
    setCustomerSearch(val);
    if (val.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const res = await api.get(`/sales/customers?search=${val}`);
      setCustomers(res.data);
      setShowCustomerSearch(true);
    } catch (err) {
      console.error('Customer search failed', err);
    }
  };

  const handleAddItem = (groupName, groupOrder) => {
    const newItems = [...items];
    const groupItems = newItems.filter(i => i.group_name === groupName);
    const maxOrder = groupItems.length > 0 ? Math.max(...groupItems.map(i => i.item_order)) : -1;
    
    newItems.push({
      id: Math.random().toString(36).substr(2, 9),
      group_name: groupName,
      group_order: groupOrder,
      item_order: maxOrder + 1,
      description: '',
      item_type: 'labor',
      quantity: 1,
      unit: '',
      unit_price: 0,
      total_price: 0
    });
    setItems(newItems);
  };

  const updateItem = (itemId, field, value) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity || 0) * Number(updated.unit_price || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    if (items.length === 1) return;
    setItems(items.filter(i => i.id !== itemId));
  };

  // Calculations
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const discountAmount = (subtotal * Number(formData.discount_percent || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = (afterDiscount * Number(formData.vat_percent || 0)) / 100;
    const totalAmount = afterDiscount + vatAmount;
    return { subtotal, discountAmount, vatAmount, totalAmount };
  }, [items, formData.discount_percent, formData.vat_percent]);

  const handleSave = async () => {
    if (!customer) return alert('Vui lòng chọn khách hàng');
    if (!formData.project_name) return alert('Vui lòng nhập tên dự án');
    
    setSaving(true);
    const payload = {
      ...formData,
      customer_id: customer.id,
      ...totals,
      items
    };

    try {
      if (isEdit) {
        await api.put(`/sales/quotations/${id}`, payload);
      } else {
        await api.post('/sales/quotations', payload);
      }
      navigate('/sales/quotations');
    } catch (err) {
      console.error('Save failed', err);
      alert('Không thể lưu báo giá. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const groups = Array.from(new Set(items.map(i => i.group_name))).sort((a, b) => {
    const itemA = items.find(i => i.group_name === a);
    const itemB = items.find(i => i.group_name === b);
    return itemA.group_order - itemB.group_order;
  });

  if (loading) return <div className="flex-center" style={{ height: '80vh' }}>Đang tải...</div>;

  return (
    <div className="quotation-page">
      <div className="quotation-header">
        <h1 className="page-title">{isEdit ? 'Chỉnh sửa Báo giá' : 'Tạo Báo giá mới'}</h1>
        <div className="flex-gap-sm">
          <button className="btn btn-ghost" onClick={() => navigate('/sales/quotations')}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu báo giá'}
          </button>
        </div>
      </div>

      <div className="builder-container">
        <div className="builder-main">
          {/* Customer Info */}
          <div className="builder-card">
            <div className="builder-section-title">👤 Thông tin Khách hàng</div>
            <div className="grid-2">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Khách hàng / Công ty</label>
                <div className="flex-gap-sm">
                  {customer ? (
                    <div className="selected-entity">
                      <strong>{customer.company_name}</strong>
                      <button className="btn-text" onClick={() => setCustomer(null)}>Thay đổi</button>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      className="item-input" 
                      placeholder="Tìm khách hàng..." 
                      value={customerSearch}
                      onChange={(e) => searchCustomers(e.target.value)}
                    />
                  )}
                </div>
                {showCustomerSearch && !customer && customers.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {customers.map(c => (
                      <div key={c.id} className="dropdown-item" onClick={() => { setCustomer(c); setShowCustomerSearch(false); }}>
                        {c.company_name} - {c.contact_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Tên Dự án / Hạng mục</label>
                <input 
                  type="text" 
                  className="item-input" 
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="VD: Gia công 3 bộ khuôn đúc"
                />
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="builder-card">
            <div className="builder-section-title">📦 Chi tiết Hạng mục</div>
            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Mô tả hạng mục</th>
                    <th style={{ width: '15%' }}>Loại</th>
                    <th style={{ width: '10%' }}>SL</th>
                    <th style={{ width: '10%' }}>ĐVT</th>
                    <th style={{ width: '12%' }}>Đơn giá</th>
                    <th style={{ width: '13%' }} className="text-right">Thành tiền</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((groupName, gIndex) => (
                    <>
                      <tr className="group-header-row" key={`g-${gIndex}`}>
                        <td colSpan="7">{groupName}</td>
                      </tr>
                      {items.filter(i => i.group_name === groupName).map(item => (
                        <tr key={item.id}>
                          <td>
                            <input 
                              className="item-input" 
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Nhập mô tả..."
                            />
                          </td>
                          <td>
                            <select 
                              className="item-input"
                              value={item.item_type}
                              onChange={(e) => updateItem(item.id, 'item_type', e.target.value)}
                            >
                              {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="item-input"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              className="item-input"
                              value={item.unit}
                              onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                              placeholder="kg, bộ..."
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="item-input"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                            />
                          </td>
                          <td className="text-right font-mono">
                            {formatNumber(item.total_price)}
                          </td>
                          <td>
                            <button className="btn-icon text-danger" onClick={() => removeItem(item.id)}>×</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan="7">
                          <button className="btn-text" onClick={() => handleAddItem(groupName, gIndex)}>+ Thêm dòng trong nhóm</button>
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="builder-card">
            <div className="builder-section-title">📝 Điều khoản & Ghi chú</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Điều khoản Thanh toán</label>
                <select 
                  className="item-input"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                >
                  <option value="50_50">Tạm ứng 50% - 50% trước khi giao</option>
                  <option value="30_70">Tạm ứng 30% - 70% sau nghiệm thu</option>
                  <option value="100_advance">Thanh toán 100% trước</option>
                  <option value="cod">Thanh toán khi giao hàng (COD)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Thời gian giao hàng (ngày)</label>
                <input 
                  type="number" 
                  className="item-input"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group mt-12">
              <label>Ghi chú cho khách hàng</label>
              <textarea 
                className="item-input" 
                rows="3"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="VD: Báo giá chưa bao gồm thuế VAT..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="builder-sidebar">
          <div className="summary-card">
            <div className="builder-section-title">📊 Tóm tắt Tài chính</div>
            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{formatNumber(totals.subtotal)} đ</span>
            </div>
            <div className="summary-row">
              <span>Chiết khấu (%)</span>
              <input 
                type="number" 
                className="item-input" 
                style={{ width: '60px', textAlign: 'right' }}
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
              />
            </div>
            <div className="summary-row">
              <span>Số tiền chiết khấu</span>
              <span>-{formatNumber(totals.discountAmount)} đ</span>
            </div>
            <div className="summary-row">
              <span>VAT (%)</span>
              <input 
                type="number" 
                className="item-input" 
                style={{ width: '60px', textAlign: 'right' }}
                value={formData.vat_percent}
                onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
              />
            </div>
            <div className="summary-row">
              <span>Tiền thuế VAT</span>
              <span>{formatNumber(totals.vatAmount)} đ</span>
            </div>
            <div className="summary-row total">
              <span>TỔNG CỘNG</span>
              <span className="text-accent">{formatNumber(totals.totalAmount)} đ</span>
            </div>
          </div>

          <div className="summary-card no-print">
            <div className="builder-section-title">🚀 Thao tác</div>
            <button className="btn btn-primary w-full mb-12" onClick={handleSave}>💾 Lưu báo giá</button>
            <button className="btn btn-outline w-full" onClick={() => window.print()}>🖨️ In nháp</button>
          </div>
        </div>
      </div>
    </div>
  );
}
