/**
 * integration_test.js
 * Full-flow integration test for the Labor Management System.
 * Run: node db/integration_test.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

// ── Tiny HTTP helper ────────────────────────────────────────────────────────
async function req(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// ── Test Runner ────────────────────────────────────────────────────────────
const results = [];
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error('Assertion failed');
    results.push({ name, ok: true, detail: result || '✓' });
    passed++;
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ── State shared across tests ─────────────────────────────────────────────
let adminCookie, staffCookie, accCookie;
let userId, projectId, taskId, shiftInstanceId;

// ============================================================
//  RUN ALL TESTS
// ============================================================
async function run() {
  console.log(`\n🧪  Labor Management — Integration Test Suite`);
  console.log(`📡  Target: ${BASE_URL}\n`);
  console.log('─'.repeat(60));

  // ─────────────────────────────────────────────────────────
  // 1. AUTH
  // ─────────────────────────────────────────────────────────
  await test('AUTH › Login thất bại — sai mật khẩu', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'admin', password: 'wrong' });
    assert(r.status === 401, `Expected 401, got ${r.status}`);
    return `status=${r.status}`;
  });

  await test('AUTH › Login thành công — admin', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'admin', password: '123456' });
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    adminCookie = r.headers.get('set-cookie');
    assert(adminCookie, 'No cookie returned');
    return `userId=${r.data.user?.id}`;
  });

  await test('AUTH › Login thành công — hiep (staff)', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'hiep', password: '123456' });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    staffCookie = r.headers.get('set-cookie');
    return `userId=${r.data.user?.id}`;
  });

  await test('AUTH › Login thành công — lan (kế toán)', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'lan', password: '123456' });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    accCookie = r.headers.get('set-cookie');
    return `userId=${r.data.user?.id}`;
  });

  await test('AUTH › GET /api/auth/me — trả về user đang đăng nhập', async () => {
    const r = await req('GET', '/api/auth/me', null, adminCookie);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.data.username === 'admin', 'Username mismatch');
    return `role=${r.data.role}`;
  });

  await test('AUTH › Từ chối không có token', async () => {
    const r = await req('GET', '/api/users', null, null);
    assert(r.status === 401, `Expected 401, got ${r.status}`);
    return `status=${r.status}`;
  });

  // ─────────────────────────────────────────────────────────
  // 2. USERS
  // ─────────────────────────────────────────────────────────
  await test('USERS › GET /api/users — admin lấy danh sách', async () => {
    const r = await req('GET', '/api/users', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    assert(r.data.length >= 5, `Expected >=5 users, got ${r.data.length}`);
    userId = r.data.find(u => u.username === 'hiep')?.id;
    return `count=${r.data.length}, hiepId=${userId}`;
  });

  await test('USERS › GET /api/users — staff bị từ chối 403', async () => {
    const r = await req('GET', '/api/users', null, staffToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
    return `status=${r.status}`;
  });

  // ─────────────────────────────────────────────────────────
  // 3. PROJECTS
  // ─────────────────────────────────────────────────────────
  await test('PROJECTS › GET /api/projects — lấy danh sách dự án', async () => {
    const r = await req('GET', '/api/projects', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    projectId = r.data[0]?.id;
    return `count=${r.data.length}, firstId=${projectId}`;
  });

  await test('PROJECTS › POST /api/projects — tạo dự án mới', async () => {
    const r = await req('POST', '/api/projects', {
      name: '[TEST] Dự án kiểm thử tự động',
      description: 'Auto-generated by integration_test.js',
      status: 'ACTIVE'
    }, adminCookie);
    assert([200, 201].includes(r.status), `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    projectId = r.data.id || projectId;
    return `id=${projectId}`;
  });

  // ─────────────────────────────────────────────────────────
  // 4. TASKS
  // ─────────────────────────────────────────────────────────
  await test('TASKS › GET /api/tasks — admin lấy tất cả task', async () => {
    const r = await req('GET', '/api/tasks', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    return `count=${r.data.length}`;
  });

  await test('TASKS › POST /api/tasks — tạo task mới', async () => {
    const r = await req('POST', '/api/tasks', {
      title: '[TEST] Task kiểm thử tự động',
      description: 'Auto task',
      assigned_to: userId,
      status: 'TODO'
    }, adminCookie);
    assert([200, 201].includes(r.status), `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    taskId = r.data.id;
    return `id=${taskId}`;
  });

  await test('TASKS › GET /api/tasks/my — staff xem task của mình', async () => {
    const r = await req('GET', '/api/tasks/my', null, staffToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    return `count=${r.data.length}`;
  });

  // ─────────────────────────────────────────────────────────
  // 5. SHIFT MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  await test('SHIFT › GET /api/shift-management/templates — lấy ca làm việc', async () => {
    const r = await req('GET', '/api/shift-management/templates');
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(Array.isArray(r.data) && r.data.length >= 3, `Expected >=3 templates, got ${JSON.stringify(r.data)}`);
    return `count=${r.data.length}: ${r.data.map(t => t.code).join(', ')}`;
  });

  await test('SHIFT › GET /api/shift-management/week — lấy tổng quan tuần', async () => {
    const r = await req('GET', `/api/shift-management/week?startDate=${today}`);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.days?.length === 7, 'Expected 7 days');
    return `weekStart=${r.data.weekStart}, days=${r.data.days.length}`;
  });

  await test('SHIFT › GET /api/shift-management/days/:date/shifts — ca trong ngày', async () => {
    const r = await req('GET', `/api/shift-management/days/${today}/shifts`);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(Array.isArray(r.data.shifts), 'Expected shifts array');
    shiftInstanceId = r.data.shifts[0]?.id;
    return `date=${r.data.date}, shifts=${r.data.shifts.length}, firstInstance=${shiftInstanceId}`;
  });

  await test('SHIFT › GET /api/shift-management/my-shift-today — ca của nhân viên', async () => {
    const r = await req('GET', '/api/shift-management/my-shift-today', null, staffToken);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    return `hasShift=${r.data.hasShift}, msg=${r.data.message || r.data.shift?.name}`;
  });

  await test('SHIFT › GET /api/shift-management/holidays — lịch ngày lễ', async () => {
    const r = await req('GET', '/api/shift-management/holidays');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data) && r.data.length >= 12, `Expected >=12 holidays, got ${r.data.length}`);
    return `count=${r.data.length}`;
  });

  await test('SHIFT › GET /api/shift-management/multiplier-rules — hệ số lương', async () => {
    const r = await req('GET', '/api/shift-management/multiplier-rules');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data) && r.data.length >= 3, `Expected >=3 rules, got ${r.data.length}`);
    return `count=${r.data.length}: ${r.data.map(r => r.code).join(', ')}`;
  });

  // ─────────────────────────────────────────────────────────
  // 6. ATTENDANCE
  // ─────────────────────────────────────────────────────────
  await test('ATTENDANCE › GET /api/attendance/my-status — trạng thái chấm công', async () => {
    const r = await req('GET', '/api/attendance/my-status', null, staffToken);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    return `checkedIn=${r.data.checkedIn}, status=${r.data.status}`;
  });

  await test('ATTENDANCE › GET /api/attendance/report — báo cáo chấm công (admin)', async () => {
    const end = today;
    const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const r = await req('GET', `/api/attendance/report?start_date=${start}&end_date=${end}`, null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    return `records=${Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data)}`;
  });

  // ─────────────────────────────────────────────────────────
  // 7. WORKLOGS
  // ─────────────────────────────────────────────────────────
  await test('WORKLOGS › GET /api/worklogs/dashboard — dashboard admin', async () => {
    const r = await req('GET', '/api/worklogs/dashboard', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    return `activeWorkers=${r.data.activeWorkers ?? r.data.active_count ?? 'N/A'}`;
  });

  await test('WORKLOGS › GET /api/worklogs/my — nhật ký của nhân viên', async () => {
    const r = await req('GET', '/api/worklogs/my', null, staffToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    return `count=${r.data.length}`;
  });

  await test('WORKLOGS › GET /api/worklogs/report — báo cáo kế toán', async () => {
    const r = await req('GET', '/api/worklogs/report', null, accToken);
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    return `records=${Array.isArray(r.data) ? r.data.length : 'N/A'}`;
  });

  await test('WORKLOGS › GET /api/worklogs/active — danh sách đang làm việc', async () => {
    const r = await req('GET', '/api/worklogs/active', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    return `active=${r.data.length}`;
  });

  // ─────────────────────────────────────────────────────────
  // 8. PROJECT ITEMS
  // ─────────────────────────────────────────────────────────
  await test('PROJECT ITEMS › GET /api/project-items — danh sách hạng mục', async () => {
    const r = await req('GET', '/api/project-items', null, adminToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    return `count=${r.data.length}`;
  });

  // ─────────────────────────────────────────────────────────
  // REPORT
  // ─────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(' TEST RESULTS');
  console.log('═'.repeat(60));

  const maxLen = Math.max(...results.map(r => r.name.length));
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    const pad  = r.name.padEnd(maxLen + 2);
    const detail = r.ok ? `\x1b[90m${r.detail}\x1b[0m` : `\x1b[31m${r.detail}\x1b[0m`;
    console.log(`  ${icon}  ${pad}  ${detail}`);
  }

  console.log('\n' + '─'.repeat(60));
  const total = passed + failed;
  const pct   = Math.round((passed / total) * 100);
  const color = failed === 0 ? '\x1b[32m' : '\x1b[33m';
  console.log(`${color}  Kết quả: ${passed}/${total} test passed (${pct}%)\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31m  Cần kiểm tra: ${results.filter(r => !r.ok).map(r => r.name).join(', ')}\x1b[0m`);
  }
  console.log('─'.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n💥 Test runner crashed:', err.message);
  process.exit(1);
});
