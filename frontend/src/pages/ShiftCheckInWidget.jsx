import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const BASE = '';   // api.js already has baseURL = VITE_API_URL


const COLOR_MAP = {
  amber:  { accent: '#f5a623', dim: '#3d2a0a', text: '#f5a623' },
  blue:   { accent: '#4f8ef7', dim: '#1e3a6e', text: '#4f8ef7' },
  purple: { accent: '#a78bfa', dim: '#2d1f5e', text: '#a78bfa' },
  green:  { accent: '#22c87a', dim: '#0d3d28', text: '#22c87a' },
  red:    { accent: '#f0506e', dim: '#3d1220', text: '#f0506e' },
};
const DEFAULT_COLOR = COLOR_MAP.blue;

function useCountdown(endAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const diff = new Date(endAt) - Date.now();
      if (diff <= 0) { setLabel('Đã kết thúc'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${h > 0 ? h + 'h ' : ''}${String(m).padStart(2,'0')}p ${String(s).padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return label;
}

function useElapsed(fromAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!fromAt) return;
    const tick = () => {
      const diff = Date.now() - new Date(fromAt);
      if (diff < 0) return;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${h > 0 ? h + 'h ' : ''}${String(m).padStart(2,'0')}p ${String(s).padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fromAt]);
  return label;
}

function fmtTime(isoStr) {
  if (!isoStr) return '---';
  return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ShiftCheckInWidget({ onCheckInSuccess }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [toast,   setToast]   = useState(null);

  const fetchShift = useCallback(async () => {
    try {
      const res = await api.get('/shift-management/my-shift-today');
      setData(res.data);
    } catch (e) {
      console.error('ShiftWidget fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShift();
    const id = setInterval(fetchShift, 60000);
    return () => clearInterval(id);
  }, [fetchShift]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const res = await api.post('/shift-management/staff-check-in', {
        shiftInstanceId: data.shift.instanceId
      });
      showToast(res.data.message, 'success');
      await fetchShift();
      if (onCheckInSuccess) onCheckInSuccess();
    } catch (e) {
      showToast(e.response?.data?.error || 'Không thể check-in', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Bạn chắc chắn muốn check-out ca làm việc?')) return;
    setBusy(true);
    try {
      const res = await api.post('/shift-management/staff-check-out', {
        shiftInstanceId: data.shift.instanceId
      });
      showToast(res.data.message, 'success');
      await fetchShift();
    } catch (e) {
      showToast(e.response?.data?.error || 'Không thể check-out', 'error');
    } finally {
      setBusy(false);
    }
  };

  // countdown / elapsed hooks always called
  const remaining = useCountdown(data?.shift?.endAt ?? null);
  const elapsed   = useElapsed(data?.attendance?.checkInAt ?? null);

  if (loading) return null;

  const shift = data?.shift;
  const att   = data?.attendance;
  const col   = COLOR_MAP[shift?.color] || DEFAULT_COLOR;

  /* ─── Không có ca ─── */
  if (!data?.hasShift) {
    return (
      <div style={styles.card}>
        <div style={styles.row}>
          <span style={{ fontSize: 28 }}>📋</span>
          <div>
            <div style={styles.title}>Hôm nay chưa được phân ca</div>
            <div style={styles.sub}>Liên hệ quản lý nếu cần cập nhật lịch làm việc.</div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Đang trong ca (đã check-in, chưa check-out) ─── */
  if (att?.checkInAt && !att?.checkOutAt) {
    return (
      <div style={{ ...styles.card, borderColor: col.accent, background: `${col.dim}66` }}>
        {toast && <ToastBar toast={toast} />}
        <div style={{ ...styles.accentBar, background: col.accent }}></div>
        <div style={styles.body}>
          <div style={styles.row}>
            <div style={{ ...styles.iconBox, background: col.dim, color: col.accent }}>🟢</div>
            <div style={{ flex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <span style={{ ...styles.statusBadge, background: col.dim, color: col.accent }}>Đang trong ca</span>
                {att.status === 'LATE' && <span style={{ ...styles.statusBadge, background:'#3d2a0a', color:'#f5a623' }}>Muộn {att.lateMinutes}p</span>}
              </div>
              <div style={styles.title}>{shift.name} &nbsp;<span style={{ fontFamily:'monospace', color: col.accent }}>{shift.displayTime}</span></div>
              <div style={styles.sub}>Check-in lúc {fmtTime(att.checkInAt)} &nbsp;·&nbsp; Hệ số: <strong style={{ color: col.accent }}>{shift.baseMultiplier}x</strong></div>
            </div>
            <div style={styles.timerBox}>
              <div style={styles.timerLabel}>Đã làm</div>
              <div style={{ ...styles.timerVal, color: col.accent }}>{elapsed}</div>
              <div style={styles.timerLabel}>Còn lại: {remaining}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display:'flex', justifyContent:'flex-end' }}>
            <button style={{ ...styles.btn, background:'transparent', color:'#f0506e', border:'1px solid #f0506e' }}
              onClick={handleCheckOut} disabled={busy}>
              {busy ? '⏳ Đang xử lý...' : '🚪 CHECK-OUT CA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Đã hoàn thành ca ─── */
  if (att?.checkOutAt) {
    return null;
  }

  /* ─── Chưa check-in ─── */
  return (
    <div style={{ ...styles.card, borderColor: att?.windowExpired ? '#f0506e44' : col.accent }}>
      {toast && <ToastBar toast={toast} />}
      <div style={{ ...styles.accentBar, background: col.accent }}></div>
      <div style={styles.body}>
        <div style={styles.row}>
          <div style={{ ...styles.iconBox, background: col.dim, color: col.accent }}>🕒</div>
          <div style={{ flex: 1 }}>
            <div style={styles.title}>{shift.name}</div>
            <div style={styles.sub}>
              <span style={{ fontFamily:'monospace' }}>{shift.displayTime}</span>
              &nbsp;·&nbsp; Hệ số: <strong style={{ color: col.accent }}>{shift.baseMultiplier}x</strong>
            </div>
            <div style={{ ...styles.sub, marginTop: 4 }}>
              {att?.windowNotOpenYet
                ? <span style={{ color:'#8b96b8' }}>⏳ Cửa sổ check-in chưa mở — Mở lúc {fmtTime(shift.windowStart)}</span>
                : att?.windowExpired
                  ? <span style={{ color:'#f0506e' }}>❌ Đã hết cửa sổ check-in</span>
                  : <span style={{ color:'#22c87a' }}>✅ Cửa sổ check-in đang mở — Đến {fmtTime(shift.windowEnd)}</span>
              }
            </div>
          </div>
          <div>
            <button
              style={{
                ...styles.btn,
                background: att?.canCheckIn ? col.accent : '#2a3350',
                color: att?.canCheckIn ? '#fff' : '#4a5578',
                cursor: att?.canCheckIn && !busy ? 'pointer' : 'not-allowed',
                opacity: att?.canCheckIn ? 1 : 0.6,
              }}
              onClick={att?.canCheckIn ? handleCheckIn : undefined}
              disabled={!att?.canCheckIn || busy}
              title={!att?.canCheckIn ? 'Ngoài cửa sổ check-in' : ''}
            >
              {busy ? '⏳' : '🚀 CHECK-IN CA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToastBar({ toast }) {
  return (
    <div style={{
      position: 'absolute', top: -44, left: 0, right: 0,
      background: toast.type === 'success' ? '#0d3d28' : '#3d1220',
      border: `1px solid ${toast.type === 'success' ? '#22c87a' : '#f0506e'}`,
      color: toast.type === 'success' ? '#22c87a' : '#f0506e',
      borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 10,
      animation: 'fadeIn 0.2s ease',
    }}>
      {toast.msg}
    </div>
  );
}

const styles = {
  card: {
    background: '#161b27',
    border: '1px solid #2a3350',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    display: 'flex',
    position: 'relative',
    transition: 'border-color 0.2s',
  },
  accentBar: { width: 4, flexShrink: 0 },
  body: { flex: 1, padding: '16px 18px' },
  row: { display: 'flex', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 42, height: 42, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: 600, color: '#e2e8f8' },
  sub:   { fontSize: 12, color: '#8b96b8', marginTop: 3 },
  statusBadge: { fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500 },
  timerBox: { textAlign: 'right', flexShrink: 0 },
  timerLabel: { fontSize: 11, color: '#8b96b8' },
  timerVal: { fontSize: 18, fontWeight: 600, fontFamily: 'monospace', margin: '2px 0' },
  btn: {
    border: 'none', borderRadius: 8, padding: '9px 18px',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'opacity 0.15s',
  },
};
