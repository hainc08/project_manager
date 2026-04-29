import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDateTime } from '../utils/formatters';
import './Quotation.css';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_code: '',
    source: 'other'
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/sales/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sales/customers', formData);
      setShowModal(false);
      fetchCustomers();
      setFormData({ company_name: '', contact_name: '', phone: '', email: '', address: '', tax_code: '', source: 'other' });
    } catch (err) {
      alert('Không thể lưu khách hàng');
    }
  };

  return (
    <div className="quotation-page">
      <div className="quotation-header">
        <div>
          <h1 className="page-title">Quản lý Khách hàng</h1>
          <p className="page-subtitle">Danh sách đối tác và khách hàng của nhà máy</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+</span> Thêm Khách hàng
        </button>
      </div>

      <div className="builder-card">
        {loading ? (
          <div className="flex-center" style={{ height: '200px' }}>Đang tải...</div>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>Công ty</th>
                <th>Người liên hệ</th>
                <th>SĐT / Email</th>
                <th>Địa chỉ</th>
                <th className="text-center">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="font-bold">{c.company_name}</td>
                  <td>{c.contact_name}</td>
                  <td>
                    <div>{c.phone}</div>
                    <div className="text-sm text-secondary">{c.email}</div>
                  </td>
                  <td className="text-sm">{c.address}</td>
                  <td className="text-center text-sm">{formatDateTime(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="builder-card" style={{ width: '500px', maxWidth: '90%' }}>
            <div className="builder-section-title">Thêm Khách hàng mới</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-12">
                <label>Tên Công ty *</label>
                <input required className="item-input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group mb-12">
                  <label>Người liên hệ</label>
                  <input className="item-input" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
                </div>
                <div className="form-group mb-12">
                  <label>Số điện thoại</label>
                  <input className="item-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group mb-12">
                <label>Email</label>
                <input className="item-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group mb-12">
                <label>Địa chỉ</label>
                <input className="item-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="flex-gap-sm justify-end mt-20">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu khách hàng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
