require('dotenv').config();
const { initDB } = require('./db/index');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
let adminToken = '';
let staffToken = '';
let testData = {
  userId: null,
  projectId: null,
  projectItemId: null,
  taskId: null,
  worklogId: null,
  shiftTemplateId: null,
  shiftInstanceId: null
};

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || JSON.stringify(data), status: res.status };
    }
    return { success: true, data, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function log(msg, status = 'INFO') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${status}] ${msg}`);
}

async function runSystemTest() {
  console.log('🚀 BẮT ĐẦU KIỂM TRA TOÀN BỘ HỆ THỐNG...\n');
  const db = await initDB();

  try {
    // 1. AUTHENTICATION
    console.log('--- 1. XÁC THỰC (AUTHENTICATION) ---');
    const adminLogin = await api('POST', '/auth/login', { username: 'admin', password: '123456' });
    if (!adminLogin.success) throw new Error('Admin login failed: ' + adminLogin.error);
    adminToken = adminLogin.data.token;
    log('Admin đăng nhập thành công', 'PASS');

    // 2. USER MANAGEMENT
    console.log('\n--- 2. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT) ---');
    const newUser = {
      username: 'testuser_' + Date.now(),
      password: 'password123',
      full_name: 'Người dùng Thử nghiệm',
      job_title: 'Công nhân',
      contract_type: 'PARTTIME',
      standard_rate: 50000,
      billing_rate: 100000
    };
    const createUser = await api('POST', '/users', newUser, adminToken);
    if (!createUser.success) throw new Error('Create user failed: ' + createUser.error);
    testData.userId = createUser.data.id;
    log(`Tạo người dùng mới thành công: ${createUser.data.username}`, 'PASS');

    const updateRes = await api('PUT', `/users/${testData.userId}`, { full_name: 'Người dùng Đã Cập Nhật' }, adminToken);
    if (!updateRes.success) throw new Error('Update user failed: ' + updateRes.error);
    log('Cập nhật thông tin người dùng thành công', 'PASS');

    const listUsers = await api('GET', '/users', null, adminToken);
    if (!listUsers.success || !Array.isArray(listUsers.data)) throw new Error('List users failed');
    log(`Danh sách người dùng tải thành công (${listUsers.data.length} users)`, 'PASS');

    // 3. SHIFT MANAGEMENT
    console.log('\n--- 3. QUẢN LÝ CA LÀM (SHIFT MANAGEMENT) ---');
    const templates = await api('GET', '/shift-management/templates', null, adminToken);
    if (!templates.success) throw new Error('Get templates failed');
    const morningShift = templates.data.find(t => t.code === 'MORNING');
    testData.shiftTemplateId = morningShift?.id;
    log('Lấy danh sách ca mẫu thành công', 'PASS');

    // Generate instances for today if not exists by calling the daily shifts endpoint
    const todayStr = new Date().toISOString().split('T')[0];
    const genRes = await api('GET', `/shift-management/days/${todayStr}/shifts`, null, adminToken);
    if (!genRes.success) throw new Error('Generate/Get daily shifts failed: ' + genRes.error);
    log('Khởi tạo/Lấy ca làm việc cho ngày hôm nay thành công', 'PASS');

    const todayMorning = genRes.data.shifts.find(s => s.code === 'MORNING');
    testData.shiftInstanceId = todayMorning?.id;
    if (!testData.shiftInstanceId) {
      log('Không tìm thấy ca MORNING hôm nay, sử dụng ca đầu tiên khả dụng', 'WARN');
      testData.shiftInstanceId = genRes.data.shifts[0]?.id;
    }
    log(`Lấy ca làm việc cụ thể thành công: ${testData.shiftInstanceId}`, 'PASS');


    // 4. PROJECT & ITEM MANAGEMENT
    console.log('\n--- 4. QUẢN LÝ DỰ ÁN & HẠNG MỤC ---');
    const itemRes = await api('POST', '/project-items', { name: 'Hạng mục Test ' + Date.now() }, adminToken);
    if (!itemRes.success) throw new Error('Create item failed');
    testData.projectItemId = itemRes.data.id;
    log(`Tạo hạng mục dự án thành công: ${itemRes.data.name}`, 'PASS');

    const projectRes = await api('POST', '/projects', {
      project_name: 'Dự án Test ' + Date.now(),
      location_type: 'WORKSHOP',
      item_ids: [testData.projectItemId]
    }, adminToken);
    if (!projectRes.success) throw new Error('Create project failed');
    testData.projectId = projectRes.data.id;
    log(`Tạo dự án thành công: ${projectRes.data.project_name}`, 'PASS');

    // 5. TASK MANAGEMENT
    console.log('\n--- 5. QUẢN LÝ CÔNG VIỆC (TASK MANAGEMENT) ---');
    const taskRes = await api('POST', '/tasks', {
      project_id: testData.projectId,
      project_item_id: testData.projectItemId,
      assignee_ids: [testData.userId],
      title: 'Công việc thử nghiệm hệ thống',
      location_type: 'WORKSHOP',
      target_shift_id: testData.shiftTemplateId
    }, adminToken);
    if (!taskRes.success) throw new Error('Create task failed');
    testData.taskId = taskRes.data[0].id;
    log(`Giao việc cho nhân viên thành công: ${taskRes.data[0].title}`, 'PASS');

    // 6. ATTENDANCE & WORKLOGS
    console.log('\n--- 6. CHẤM CÔNG & TIẾN ĐỘ (ATTENDANCE & WORKLOGS) ---');
    // Staff Login
    const staffLogin = await api('POST', '/auth/login', { username: newUser.username, password: newUser.password });
    if (!staffLogin.success) throw new Error('Staff login failed');
    staffToken = staffLogin.data.token;
    log(`Nhân viên (${newUser.username}) đăng nhập thành công`, 'PASS');

    // Check-in
    const checkin = await api('POST', '/attendance/check-in', { shift_instance_id: testData.shiftInstanceId }, staffToken);
    if (!checkin.success) throw new Error('Check-in failed: ' + checkin.error);
    log('Nhân viên điểm danh vào ca (Check-in) thành công', 'PASS');

    // Start Task
    const startTask = await api('POST', '/worklogs/start', { task_id: testData.taskId }, staffToken);
    if (!startTask.success) throw new Error('Start task failed: ' + startTask.error);
    testData.worklogId = startTask.data.id;
    log('Bắt đầu ghi nhận thời gian làm việc thành công', 'PASS');

    // Simulating time (optional, manually update DB for testing duration)
    log('Đang giả lập làm việc (2 tiếng)...', 'INFO');
    await db.prepare("UPDATE worklogs SET start_time = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?").run(testData.worklogId);
    await db.prepare("UPDATE attendance_records SET check_in_at = DATE_SUB(NOW(), INTERVAL 125 MINUTE) WHERE user_id = ? AND check_out_at IS NULL").run(testData.userId);

    // Stop Task
    const stopTask = await api('POST', '/worklogs/stop', null, staffToken);
    if (!stopTask.success) throw new Error('Stop task failed: ' + stopTask.error);
    log(`Dừng công việc thành công. Chi phí ước tính: ${stopTask.data.actual_cost}đ`, 'PASS');

    // Finish Task
    const finishTask = await api('PUT', `/tasks/${testData.taskId}/finish`, null, staffToken);
    if (!finishTask.success) throw new Error('Finish task failed');
    log('Nhân viên báo cáo hoàn thành công việc thành công', 'PASS');

    // Check-out
    const checkout = await api('POST', '/attendance/check-out', null, staffToken);
    if (!checkout.success) throw new Error('Check-out failed: ' + checkout.error);
    const totalMinutes = Math.round((checkout.data.duration_hours || 0) * 60);
    log(`Nhân viên tan ca (Check-out) thành công. Tổng thời gian: ${totalMinutes} phút`, 'PASS');

    // 7. REPORTS & DASHBOARD
    console.log('\n--- 7. BÁO CÁO & THỐNG KÊ (REPORTS & DASHBOARD) ---');
    const approveTask = await api('PUT', `/tasks/${testData.taskId}/approve`, null, adminToken);
    if (!approveTask.success) throw new Error('Approve task failed');
    log('Admin duyệt hoàn thành công việc thành công', 'PASS');

    const financeReport = await api('GET', `/worklogs/report?project_id=${testData.projectId}`, null, adminToken);
    if (!financeReport.success) throw new Error('Finance report failed');
    log(`Báo cáo tài chính tải thành công. Tổng chi phí dự án: ${financeReport.data.summary.total_cost}đ`, 'PASS');

    const dashboard = await api('GET', '/worklogs/dashboard', null, adminToken);
    if (!dashboard.success) throw new Error('Dashboard failed');
    log('Dữ liệu Dashboard tải thành công', 'PASS');

    console.log('\n✨ TẤT CẢ CÁC CHỨC NĂNG ĐÃ ĐƯỢC KIỂM TRA VÀ HOẠT ĐỘNG BÌNH THƯỜNG!');

  } catch (err) {
    log(err.message, 'FAIL');
    console.error(err);
  } finally {
    // 8. CLEANUP
    console.log('\n🧹 Đang dọn dẹp dữ liệu thử nghiệm...');
    try {
      if (testData.worklogId) await db.prepare("DELETE FROM worklogs WHERE id = ?").run(testData.worklogId);
      if (testData.taskId) await db.prepare("DELETE FROM tasks WHERE id = ?").run(testData.taskId);
      if (testData.projectId) {
        await db.prepare("DELETE FROM project_item_mapping WHERE project_id = ?").run(testData.projectId);
        await db.prepare("DELETE FROM projects WHERE id = ?").run(testData.projectId);
      }
      if (testData.projectItemId) await db.prepare("DELETE FROM project_items WHERE id = ?").run(testData.projectItemId);
      if (testData.userId) {
        await db.prepare("DELETE FROM attendance_events WHERE user_id = ?").run(testData.userId);
        await db.prepare("DELETE FROM attendance_records WHERE user_id = ?").run(testData.userId);
        await db.prepare("DELETE FROM users WHERE id = ?").run(testData.userId);
      }
      log('Dọn dẹp thành công!', 'PASS');
    } catch (cleanErr) {
      log('Lỗi khi dọn dẹp: ' + cleanErr.message, 'WARN');
    }
    process.exit(0);
  }

}

runSystemTest();
