import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const COLORS = [
  { value: 'amber',  label: 'Vàng (Ca Sáng)' },
  { value: 'blue',   label: 'Xanh (Ca Chiều)' },
  { value: 'purple', label: 'Tím (Ca Đêm)' },
  { value: 'green',  label: 'Xanh Lá' },
  { value: 'red',    label: 'Đỏ' },
];

export default function ShiftTemplateModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;
  const [form, setForm] = useState(editData ? {
    code: editData.code,
    name: editData.name,
    startTime: editData.start_time?.slice(0, 5) || '',
    endTime: editData.end_time?.slice(0, 5) || '',
    breakMinutes: editData.break_minutes ?? 0,
    baseMultiplier: editData.base_multiplier ?? 1.0,
    color: editData.color || 'blue',
    checkinEarlyMinutes: editData.checkin_early_minutes ?? 30,
    checkinLateMinutes: editData.checkin_late_minutes ?? 120,
    lateGraceMinutes: editData.late_grace_minutes ?? 5,
    checkoutGraceMinutes: editData.checkout_grace_minutes ?? 5,
    requiresAssignment: editData.requires_assignment ?? true,
  } : {
    code: '', name: '', startTime: '', endTime: '',
    breakMinutes: 0, baseMultiplier: 1.0, color: 'amber',
    checkinEarlyMinutes: 30, checkinLateMinutes: 120,
    lateGraceMinutes: 5, checkoutGraceMinutes: 5,
    requiresAssignment: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.startTime || !form.endTime) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setLoading(true); setError('');
    try {
      if (isEdit) {
        await axios.put(`${API}/shift-management/templates/${editData.id}`, form);
      } else {
        await axios.post(`${API}/shift-management/templates`, form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const colorMap = { amber:'#f5a623', blue:'#4f8ef7', purple:'#a78bfa', green:'#22c87a', red:'#f0506e' };

  return (
    <div className="sm__modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sm__modal">
        <div className="sm__modal-header">
          <div className="sm__modal-title">{isEdit ? '✏️ Sửa ca làm việc' : '➕ Thêm ca mới'}</div>
          <button className="sm__modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sm__modal-body">
            {error && <div className="sm__form-error">{error}</div>}

            <div className="sm__form-row2">
              <div className="sm__form-group">
                <label className="sm__form-label">Mã ca <span style={{color:'#f0506e'}}>*</span></label>
                <input className="sm__form-input" placeholder="VD: MORNING" value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  disabled={isEdit} />
              </div>
              <div className="sm__form-group">
                <label className="sm__form-label">Tên ca <span style={{color:'#f0506e'}}>*</span></label>
                <input className="sm__form-input" placeholder="VD: Ca Sáng" value={form.name}
                  onChange={e => set('name', e.target.value)} />
              </div>
            </div>

            <div className="sm__form-row2">
              <div className="sm__form-group">
                <label className="sm__form-label">Giờ bắt đầu <span style={{color:'#f0506e'}}>*</span></label>
                <input className="sm__form-input" type="time" value={form.startTime}
                  onChange={e => set('startTime', e.target.value)} />
              </div>
              <div className="sm__form-group">
                <label className="sm__form-label">Giờ kết thúc <span style={{color:'#f0506e'}}>*</span></label>
                <input className="sm__form-input" type="time" value={form.endTime}
                  onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>

            <div className="sm__form-row2">
              <div className="sm__form-group">
                <label className="sm__form-label">Nghỉ giữa ca (phút)</label>
                <input className="sm__form-input" type="number" min="0" value={form.breakMinutes}
                  onChange={e => set('breakMinutes', +e.target.value)} />
              </div>
              <div className="sm__form-group">
                <label className="sm__form-label">Hệ số lương</label>
                <input className="sm__form-input" type="number" min="1" step="0.1" value={form.baseMultiplier}
                  onChange={e => set('baseMultiplier', +e.target.value)} />
              </div>
            </div>

            <div className="sm__form-group">
              <label className="sm__form-label">Màu hiển thị</label>
              <div className="sm__color-picker">
                {COLORS.map(c => (
                  <button key={c.value} type="button"
                    className={`sm__color-btn ${form.color === c.value ? 'active' : ''}`}
                    style={{ '--c': colorMap[c.value] }}
                    onClick={() => set('color', c.value)}
                    title={c.label}>
                    <span className="sm__color-swatch" style={{ background: colorMap[c.value] }}></span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm__form-divider">⚙ Cài đặt cửa sổ check-in</div>

            <div className="sm__form-row3">
              <div className="sm__form-group">
                <label className="sm__form-label">Check-in sớm nhất (phút)</label>
                <input className="sm__form-input" type="number" min="0" value={form.checkinEarlyMinutes}
                  onChange={e => set('checkinEarlyMinutes', +e.target.value)} />
              </div>
              <div className="sm__form-group">
                <label className="sm__form-label">Check-in muộn nhất (phút)</label>
                <input className="sm__form-input" type="number" min="0" value={form.checkinLateMinutes}
                  onChange={e => set('checkinLateMinutes', +e.target.value)} />
              </div>
              <div className="sm__form-group">
                <label className="sm__form-label">Dung sai đi muộn (phút)</label>
                <input className="sm__form-input" type="number" min="0" value={form.lateGraceMinutes}
                  onChange={e => set('lateGraceMinutes', +e.target.value)} />
              </div>
            </div>

            <div className="sm__form-group">
              <label className="sm__form-toggle">
                <input type="checkbox" checked={form.requiresAssignment}
                  onChange={e => set('requiresAssignment', e.target.checked)} />
                <span className="sm__toggle-track"></span>
                <span className="sm__toggle-label">Yêu cầu phân ca trước khi check-in</span>
              </label>
            </div>
          </div>

          <div className="sm__modal-footer">
            <button type="button" className="sm__btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="sm__btn-primary" disabled={loading}>
              {loading ? '⏳ Đang lưu...' : isEdit ? '💾 Cập nhật' : '➕ Tạo ca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
