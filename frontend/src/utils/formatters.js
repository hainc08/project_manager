/**
 * Format currency in VND
 */
export function formatCurrency(value) {
  if (value == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format number with separators
 */
export function formatNumber(value, decimals = 2) {
  if (value == null) return '0';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format datetime
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format date only
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Format elapsed time from start_time to now (or end_time)
 */
export function formatElapsedTime(startTime, endTime = null) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format duration in hours to readable text
 */
export function formatDuration(hours) {
  if (hours == null) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}h ${m}m`;
}

/**
 * Get initials from full name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Role display name
 */
export function getRoleLabel(role) {
  const labels = {
    ADMIN: 'Quản trị viên',
    ACCOUNTANT: 'Kế toán',
    STAFF: 'Nhân viên'
  };
  return labels[role] || role;
}

/**
 * Contract type display name
 */
export function getContractLabel(type) {
  const labels = {
    FULLTIME: 'Toàn thời gian',
    PARTTIME: 'Bán thời gian',
    FREELANCER: 'Freelancer'
  };
  return labels[type] || type;
}

/**
 * Status display helpers
 */
export function getStatusLabel(status) {
  const labels = {
    ACTIVE: 'Đang hoạt động',
    COMPLETED: 'Hoàn thành',
    ON_HOLD: 'Tạm dừng',
    IN_PROGRESS: 'Đang thực hiện',
    TODO: 'Chưa bắt đầu',
    DOING: 'Đang làm',
    FINISHED_BY_STAFF: 'Chờ duyệt',
    DONE: 'Hoàn thành',
    CANCELLED: 'Đã hủy'
  };
  return labels[status] || status;
}

export function getStatusBadgeClass(status) {
  const classes = {
    ACTIVE: 'badge-success',
    COMPLETED: 'badge-info',
    ON_HOLD: 'badge-warning',
    IN_PROGRESS: 'badge-active',
    TODO: 'badge-muted',
    DOING: 'badge-active',
    FINISHED_BY_STAFF: 'badge-warning',
    DONE: 'badge-success',
    CANCELLED: 'badge-danger'
  };
  return classes[status] || 'badge-info';
}
