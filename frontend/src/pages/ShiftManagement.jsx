import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ShiftTemplateModal from './ShiftTemplateModal';
import MultiplierSettings from './MultiplierSettings';
import './ShiftManagement.css';

const API = import.meta.env.VITE_API_URL;
const AVATAR_COLORS = ['blue', 'green', 'amber', 'purple', 'blue'];
const SLUG = { MORNING:'morning', AFTERNOON:'afternoon', NIGHT:'night' };
const slug = (code) => SLUG[code] || code?.toLowerCase() || 'blue';

function weekLabel(days) {
  if (!days?.length) return '';
  const f = new Date(days[0].date + 'T00:00:00');
  const l = new Date(days[6].date + 'T00:00:00');
  const jan1 = new Date(f.getFullYear(), 0, 1);
  const wk = Math.ceil(((f - jan1) / 864e5 + jan1.getDay() + 1) / 7);
  const fmt = (d) => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
  return `Tuần ${wk} — ${fmt(f)} đến ${fmt(l)}/${l.getFullYear()}`;
}

export default function ShiftManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab,          setTab]          = useState('Lịch tuần');
  const [weekData,     setWeekData]     = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayShifts,    setDayShifts]    = useState([]);
  const [selectedShift,setSelectedShift]= useState(null);
  const [attendance,   setAttendance]   = useState([]);
  const [templates,    setTemplates]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);

  const fetchWeek = useCallback(async () => {
    const res = await axios.get(`${API}/shift-management/week?startDate=${selectedDate}`);
    setWeekData(res.data);
    setLoading(false);
  }, [selectedDate]);

  const fetchDay = useCallback(async (date) => {
    const res = await axios.get(`${API}/shift-management/days/${date}/shifts`);
    const shifts = res.data.shifts || [];
    setDayShifts(shifts);
    setSelectedShift(prev => {
      if (prev) { const found = shifts.find(s => s.id === prev.id); return found || shifts[0] || null; }
      return shifts[0] || null;
    });
  }, []);

  const fetchAtt = useCallback(async (id) => {
    const res = await axios.get(`${API}/shift-management/shifts/${id}/attendance`);
    setAttendance(res.data);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await axios.get(`${API}/shift-management/templates`);
    setTemplates(res.data);
  }, []);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);
  useEffect(() => { fetchDay(selectedDate); }, [selectedDate, fetchDay]);
  useEffect(() => { if (selectedShift) fetchAtt(selectedShift.id); else setAttendance([]); }, [selectedShift, fetchAtt]);
  useEffect(() => { if (tab === 'Danh sách ca') fetchTemplates(); }, [tab, fetchTemplates]);

  const otAlerts = dayShifts.filter(s => s.stats?.overtime > 0);

  const fmtStatus = (row) => {
    if (row.status === 'ON_TIME')  return { cls:'ok',     lbl:'Đúng giờ' };
    if (row.status === 'LATE')     return { cls:'warn',   lbl:`Muộn ${row.lateMinutes}p` };
    if (row.status === 'ABSENT')   return { cls:'absent', lbl:'Vắng' };
    if (row.isOT)                  return { cls:'ot',     lbl:`OT ${(row.overtimeMinutes/60).toFixed(1)}h` };
    return { cls:'ok', lbl: row.status };
  };

  if (loading) return (
    <div className="sm"><div className="sm__loading"><div className="sm__spinner"></div>Đang tải...</div></div>
  );

  return (
    <div className="sm">
      {/* ---- Header ---- */}
      <div className="sm__header">
        <div>
          <div className="sm__title">Quản lý Ca làm việc</div>
          <div className="sm__sub">{weekLabel(weekData?.days)}</div>
        </div>
        {isAdmin && (
          <div className="sm__header-actions">
            <button className="sm__btn-ghost" onClick={() => setTab('Cài đặt hệ số')}>⚙ Cài đặt hệ số</button>
            <button className="sm__btn-primary" onClick={() => { setEditTemplate(null); setShowModal(true); }}>＋ Thêm ca</button>
          </div>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="sm__tabs">
        {['Lịch tuần', 'Danh sách ca', ...(isAdmin ? ['Cài đặt hệ số'] : [])].map(t => (
          <div key={t} className={`sm__tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      {/* ===================== TAB: LỊCH TUẦN ===================== */}
      {tab === 'Lịch tuần' && (
        <>
          <div className="sm__week-strip">
            {weekData?.days.map(day => {
              const isHol = day.dayType !== 'NORMAL_WORKDAY' && day.dayType !== 'WEEKLY_REST_DAY';
              return (
                <div key={day.date}
                  className={['sm__day', day.isToday?'is-today':'', selectedDate===day.date?'is-selected':'', isHol?'is-holiday':''].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDate(day.date)}>
                  <div className="sm__day-name">{day.dayName}</div>
                  <div className="sm__day-num">{new Date(day.date+'T00:00:00').getDate()}</div>
                  {day.holidayName && <div className="sm__day-holiday-name">{day.holidayName}</div>}
                  <div className="sm__day-badge">{day.badge}</div>
                </div>
              );
            })}
          </div>

          {/* Removed yellow alert bar as per user request */}

          <div className="sm__shifts-area">
            {dayShifts.length === 0
              ? <div className="sm__empty">Không có ca nào cho ngày này.</div>
              : dayShifts.map(s => (
              <div key={s.id}
                className={`sm__shift-card ${selectedShift?.id===s.id?'is-selected':''}`}
                onClick={() => setSelectedShift(s)}>
                <div className={`sm__shift-accent sm__shift-accent--${slug(s.code)}`}></div>
                <div className="sm__shift-body">
                  <div className="sm__shift-row1">
                    <div>
                      <div className="sm__shift-name">{s.name}</div>
                      <div className="sm__shift-time">{s.displayTime}</div>
                    </div>
                    <div className="sm__shift-multiplier">
                      <div className="sm__shift-multiplier-label">Hệ số lương</div>
                      <div className={`sm__shift-multiplier-val sm__shift-multiplier-val--${slug(s.code)}`}>{s.base_multiplier}x</div>
                    </div>
                  </div>
                  <div className="sm__shift-row2">
                    <div className="sm__shift-meta"><span className="sm__dot sm__dot--green"></span>{s.stats.present}/{s.stats.assigned} có mặt</div>
                    {s.stats.late>0 && <div className="sm__shift-meta"><span className="sm__dot sm__dot--amber"></span>{s.stats.late} đi muộn</div>}
                    {s.stats.absent>0 && <div className="sm__shift-meta"><span className="sm__dot sm__dot--red"></span>{s.stats.absent} vắng</div>}
                    <div className="sm__shift-avatars">
                      {(s.employeeAvatars||[]).slice(0,5).map((av,i) => (
                        <div key={i} className={`sm__avatar sm__avatar--${AVATAR_COLORS[i]}`}>{av.initials}</div>
                      ))}
                      {s.stats.assigned>5 && <div className="sm__avatar">+{s.stats.assigned-5}</div>}
                    </div>
                  </div>
                  <div className="sm__shift-pills">
                    {(s.statusPills||[]).map((p,i) => <span key={i} className={`sm__pill sm__pill--${p.type}`}>{p.label}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedShift && (
            <div className="sm__att-section">
              <div className="sm__section-title">
                Chi tiết chấm công — {selectedShift.name}&nbsp;
                {new Date(selectedDate+'T00:00:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}
              </div>
              <div className="sm__att-table">
                <div className="sm__att-row sm__att-row--header">
                  <div className="sm__att-col-name">Nhân viên</div>
                  <div className="sm__att-col-checkin">Check-in</div>
                  <div className="sm__att-col-checkout">Check-out</div>
                  <div className="sm__att-col-hours">Giờ làm</div>
                  <div className="sm__att-col-status">Trạng thái</div>
                </div>
                {attendance.length === 0
                  ? <div className="sm__empty">Chưa có dữ liệu chấm công.</div>
                  : attendance.map(row => {
                    const st = fmtStatus(row);
                    return (
                      <div key={row.id} className="sm__att-row">
                        <div className="sm__att-col-name">
                          <div className="sm__att-name">{row.name}</div>
                          <div className="sm__att-role">{row.role}</div>
                        </div>
                        <div className="sm__att-col-checkin" style={{color: row.lateMinutes>0?'var(--sm-amber)':'var(--sm-green)'}}>
                          {row.checkIn}{row.lateMinutes>0 && <span className="sm__late-tag">+{row.lateMinutes}p</span>}
                        </div>
                        <div className="sm__att-col-checkout" style={{color: row.isOT?'var(--sm-purple)':'inherit'}}>
                          {row.checkOut}{row.isOT && <span className="sm__ot-tag">OT</span>}
                        </div>
                        <div className="sm__att-col-hours" style={{color: row.isOT?'var(--sm-purple)':'inherit'}}>{row.hours}</div>
                        <div className="sm__att-col-status"><span className={`sm__pill sm__pill--${st.cls}`}>{st.lbl}</span></div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================== TAB: DANH SÁCH CA ===================== */}
      {tab === 'Danh sách ca' && (
        <div className="sm__shifts-area">
          {isAdmin && (
            <button className="sm__add-template-btn" onClick={() => { setEditTemplate(null); setShowModal(true); }}>
              ＋ Thêm ca mới
            </button>
          )}
          {templates.length === 0
            ? <div className="sm__empty">Chưa có mẫu ca. Nhấn "Thêm ca" để tạo.</div>
            : templates.map(t => (
            <div key={t.id} className="sm__shift-card">
              <div className={`sm__shift-accent sm__shift-accent--${slug(t.code)}`}></div>
              <div className="sm__shift-body">
                <div className="sm__shift-row1">
                  <div>
                    <div className="sm__shift-name">{t.name}</div>
                    <div className="sm__shift-time">{t.start_time?.slice(0,5)} — {t.end_time?.slice(0,5)}</div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div className="sm__shift-multiplier">
                      <div className="sm__shift-multiplier-label">Hệ số lương</div>
                      <div className={`sm__shift-multiplier-val sm__shift-multiplier-val--${slug(t.code)}`}>{t.base_multiplier}x</div>
                    </div>
                    {isAdmin && (
                      <button className="sm__icon-btn" title="Sửa ca"
                        onClick={() => { setEditTemplate(t); setShowModal(true); }}>✏</button>
                    )}
                  </div>
                </div>
                <div className="sm__shift-row2" style={{marginTop:8}}>
                  <div className="sm__shift-meta">Nghỉ giữa ca: <strong style={{color:'var(--sm-text)',marginLeft:4}}>{t.break_minutes} phút</strong></div>
                  <div className="sm__shift-meta">Check-in sớm: <strong style={{color:'var(--sm-text)',marginLeft:4}}>-{t.checkin_early_minutes}p</strong></div>
                  <div className="sm__shift-meta">Dung sai muộn: <strong style={{color:'var(--sm-text)',marginLeft:4}}>{t.late_grace_minutes}p</strong></div>
                  <span className={`sm__pill ${t.requires_assignment ? 'sm__pill--ok' : 'sm__pill--warn'}`}>
                    {t.requires_assignment ? '🔒 Cần phân ca' : '🔓 Tự do check-in'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================== TAB: CÀI ĐẶT HỆ SỐ ===================== */}
      {tab === 'Cài đặt hệ số' && <MultiplierSettings />}

      {/* ===================== MODAL ===================== */}
      {showModal && (
        <ShiftTemplateModal
          editData={editTemplate}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchTemplates();
            if (tab === 'Lịch tuần') fetchDay(selectedDate);
          }}
        />
      )}

      <div style={{height:40}}></div>
    </div>
  );
}
