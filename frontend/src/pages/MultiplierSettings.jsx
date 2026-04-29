import { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const RULE_LABELS = {
  OT_NORMAL_DAY:    'Làm thêm ngày thường',
  OT_WEEKLY_REST:   'Làm thêm ngày nghỉ hằng tuần',
  OT_PUBLIC_HOLIDAY:'Làm thêm ngày lễ / Tết',
  NIGHT_REGULAR:    'Phụ cấp làm ca đêm',
};

const DAY_TYPE_LABEL = {
  PUBLIC_HOLIDAY:   'Ngày lễ / Tết',
  COMPANY_HOLIDAY:  'Nghỉ công ty',
  WEEKLY_REST_DAY:  'Nghỉ hằng tuần',
  NORMAL_WORKDAY:   'Ngày thường',
};

export default function MultiplierSettings() {
  const [rules,    setRules]    = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [newHol, setNewHol] = useState({ holidayDate:'', name:'', dayType:'PUBLIC_HOLIDAY', defaultMultiplier:3.0 });
  const [showAddHol, setShowAddHol] = useState(false);
  const [saved, setSaved] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [r, h] = await Promise.all([
      axios.get(`${API}/shift-management/multiplier-rules`),
      axios.get(`${API}/shift-management/holidays`),
    ]);
    setRules(r.data);
    setHolidays(h.data);
  };

  const saveRule = async (rule) => {
    setWarning(''); setSaved('');
    try {
      await axios.put(`${API}/shift-management/multiplier-rules/${rule.id}`, { multiplier: rule.multiplier });
      setSaved('✅ Đã lưu hệ số!');
      setEditingRule(null);
      fetchAll();
    } catch (err) {
      setWarning(err.response?.data?.error || 'Lỗi lưu hệ số');
    }
  };

  const addHoliday = async () => {
    if (!newHol.holidayDate || !newHol.name) { setWarning('Vui lòng điền đủ ngày và tên.'); return; }
    try {
      await axios.post(`${API}/shift-management/holidays`, newHol);
      setShowAddHol(false);
      setNewHol({ holidayDate:'', name:'', dayType:'PUBLIC_HOLIDAY', defaultMultiplier:3.0 });
      setSaved('✅ Đã thêm ngày lễ!');
      fetchAll();
    } catch (err) {
      setWarning(err.response?.data?.error || 'Lỗi thêm ngày lễ');
    }
  };

  const deleteHoliday = async (id) => {
    if (!confirm('Xóa ngày lễ này?')) return;
    await axios.delete(`${API}/shift-management/holidays/${id}`);
    fetchAll();
  };

  return (
    <div className="sm__settings">

      {saved   && <div className="sm__alert-success">{saved}</div>}
      {warning && <div className="sm__alert-warn">{warning}</div>}

      {/* --- Section 1: Multiplier Rules --- */}
      <div className="sm__settings-section">
        <div className="sm__settings-section-title">1. Hệ số tính lương</div>
        <p className="sm__settings-section-desc">
          Cấu hình hệ số OT và phụ cấp. Hệ thống sẽ cảnh báo nếu cấu hình thấp hơn mức tối thiểu pháp lý theo Điều 98 BLLĐ 2019.
        </p>
        <div className="sm__rules-table">
          <div className="sm__rules-row sm__rules-header">
            <div className="sm__rules-col-name">Loại thời gian</div>
            <div className="sm__rules-col-mult">Hệ số hiện tại</div>
            <div className="sm__rules-col-legal">Tối thiểu pháp lý</div>
            <div className="sm__rules-col-action"></div>
          </div>
          {rules.map(r => (
            <div key={r.id} className="sm__rules-row">
              <div className="sm__rules-col-name">
                <div className="sm__rules-name">{RULE_LABELS[r.code] || r.name}</div>
                <div className="sm__rules-code">{r.code}</div>
              </div>
              <div className="sm__rules-col-mult">
                {editingRule === r.id ? (
                  <input
                    className="sm__form-input sm__rules-input"
                    type="number" step="0.1" min="1"
                    defaultValue={r.multiplier}
                    onKeyDown={e => e.key === 'Enter' && saveRule({ ...r, multiplier: +e.target.value })}
                    onBlur={e => saveRule({ ...r, multiplier: +e.target.value })}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`sm__pill ${r.multiplier < r.minimum_legal_multiplier ? 'sm__pill--absent' : 'sm__pill--ot'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEditingRule(r.id)}
                    title="Click để sửa"
                  >
                    {r.multiplier}x ✏
                  </span>
                )}
              </div>
              <div className="sm__rules-col-legal" style={{ color: 'var(--sm-text2)', fontSize: 12 }}>
                {r.minimum_legal_multiplier}x
              </div>
              <div className="sm__rules-col-action">
                {r.multiplier < r.minimum_legal_multiplier && (
                  <span className="sm__warning-badge">⚠ Dưới mức pháp lý</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Section 2: Holidays --- */}
      <div className="sm__settings-section">
        <div className="sm__settings-section-title">2. Ngày lễ áp dụng</div>
        <p className="sm__settings-section-desc">
          Các ngày lễ sẽ được áp hệ số lương cao hơn. Ca làm việc qua đêm lễ sẽ được tách segment tự động.
        </p>
        <div className="sm__rules-table">
          <div className="sm__rules-row sm__rules-header">
            <div className="sm__rules-col-date">Ngày</div>
            <div className="sm__rules-col-name" style={{flex:3}}>Tên ngày lễ</div>
            <div className="sm__rules-col-mult">Hệ số</div>
            <div className="sm__rules-col-action">Thao tác</div>
          </div>
          {holidays.map(h => (
            <div key={h.id} className="sm__rules-row">
              <div className="sm__rules-col-date" style={{ fontFamily:'var(--sm-mono)', fontSize:13 }}>
                {(() => {
                  const d = new Date((h.holiday_date || '').slice(0, 10) + 'T00:00:00');
                  return isNaN(d) ? h.holiday_date : d.toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit'});
                })()}
              </div>
              <div style={{ flex:3 }}>
                <div style={{ fontSize:13, color:'var(--sm-text)' }}>{h.name}</div>
                <div style={{ fontSize:11, color:'var(--sm-text3)' }}>{DAY_TYPE_LABEL[h.day_type] || h.day_type}</div>
              </div>
              <div className="sm__rules-col-mult">
                <span className="sm__pill sm__pill--absent">{h.default_multiplier}x</span>
              </div>
              <div className="sm__rules-col-action">
                <button className="sm__icon-btn sm__icon-btn--danger" onClick={() => deleteHoliday(h.id)} title="Xóa">🗑</button>
              </div>
            </div>
          ))}

          {showAddHol ? (
            <div className="sm__rules-row" style={{ gap: 8, flexWrap:'wrap', padding:'12px 14px' }}>
              <input className="sm__form-input" type="date" style={{ flex:'1 1 130px' }}
                value={newHol.holidayDate} onChange={e => setNewHol(p => ({ ...p, holidayDate: e.target.value }))} />
              <input className="sm__form-input" placeholder="Tên ngày lễ" style={{ flex:'3 1 180px' }}
                value={newHol.name} onChange={e => setNewHol(p => ({ ...p, name: e.target.value }))} />
              <select className="sm__form-input" style={{ flex:'1 1 160px' }}
                value={newHol.dayType} onChange={e => setNewHol(p => ({ ...p, dayType: e.target.value }))}>
                <option value="PUBLIC_HOLIDAY">Ngày lễ / Tết</option>
                <option value="COMPANY_HOLIDAY">Nghỉ công ty</option>
              </select>
              <input className="sm__form-input" type="number" step="0.5" min="1" style={{ flex:'0 0 80px' }}
                value={newHol.defaultMultiplier} onChange={e => setNewHol(p => ({ ...p, defaultMultiplier: +e.target.value }))} />
              <button className="sm__btn-primary" style={{ padding:'7px 14px' }} onClick={addHoliday}>Lưu</button>
              <button className="sm__btn-ghost" onClick={() => setShowAddHol(false)}>Hủy</button>
            </div>
          ) : (
            <div className="sm__rules-row" style={{ padding:'10px 14px', borderBottom:'none' }}>
              <button className="sm__add-row-btn" onClick={() => setShowAddHol(true)}>
                ＋ Thêm ngày lễ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Section 3: Legal note --- */}
      <div className="sm__settings-section sm__settings-legal">
        <div className="sm__settings-section-title">📋 Căn cứ pháp lý</div>
        <ul className="sm__legal-list">
          <li>Điều 98 BLLĐ 2019: OT ngày thường ≥ 1.5x, ngày nghỉ ≥ 2.0x, ngày lễ ≥ 3.0x</li>
          <li>NĐ 145/2020, Điều 55-57: Phụ cấp đêm ≥ 30% so với ban ngày</li>
          <li>Hệ thống sẽ hiển thị cảnh báo ⚠ khi hệ số cấu hình thấp hơn mức tối thiểu.</li>
        </ul>
      </div>
    </div>
  );
}
