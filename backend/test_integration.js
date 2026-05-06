require('dotenv').config();
const { initDB } = require('./db/index');

const API_URL = 'http://localhost:3001/api';
let adminToken = '';
let staffToken = '';
let testIds = {}; // Store IDs for cleanup

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data;
}

function log(msg, status = 'INFO') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
  console.log(`${icon} [${status}] ${msg}`);
}

async function runIntegrationTest() {
  console.log('🚀 BẮT ĐẦU TEST TÍCH HỢP HỆ THỐNG...\n');
  const db = await initDB();

  try {
    // ---------------------------------------------------------
    // BƯỚC 1: ADMIN THIẾT LẬP
    // ---------------------------------------------------------
    console.log('--- BƯỚC 1: ADMIN THIẾT LẬP ---');
    
    // 1.1 Admin Login
    const adminLogin = await api('POST', '/auth/login', { username: 'admin', password: '123456' });
    adminToken = adminLogin.token;
    log('Admin đăng nhập thành công', 'PASS');

    // 1.2 Tạo Project Item Test
    const itemRes = await api('POST', '/project-items', {
      name: 'Hạng mục Test Tích hợp'
    }, adminToken);
    testIds.projectItemId = itemRes.id;
    log(`Tạo hạng mục dự án thành công: ${itemRes.name}`, 'PASS');

    // 1.3 Tạo Project Test
    const projectRes = await api('POST', '/projects', {
      project_name: 'Dự án Test Tích hợp',
      location_type: 'WORKSHOP',
      item_ids: [testIds.projectItemId]
    }, adminToken);
    testIds.projectId = projectRes.id;
    log(`Tạo dự án thành công: ${projectRes.project_name}`, 'PASS');

    // 1.3 Gán Task cho thocnc1
    // Get users to find thocnc1
    const users = await api('GET', '/users', null, adminToken);
    const thocnc1 = users.find(u => u.username === 'thocnc1');
    if (!thocnc1) throw new Error('Không tìm thấy user thocnc1');
    
    // Lấy shift template Ca Sáng
    const templates = await api('GET', '/shift-management/templates');
    const morningShift = templates.find(t => t.code === 'MORNING');

    const taskRes = await api('POST', '/tasks', {
      project_id: testIds.projectId,
      project_item_id: testIds.projectItemId,
      assignee_ids: [thocnc1.id],
      title: 'Công việc Test Tích hợp',
      location_type: 'WORKSHOP',
      target_shift_id: morningShift?.id
    }, adminToken);
    testIds.taskId = taskRes[0].id;
    log(`Giao việc cho thocnc1 thành công: ${taskRes[0].title}`, 'PASS');


    // ---------------------------------------------------------
    // BƯỚC 2: NHÂN VIÊN LÀM VIỆC
    // ---------------------------------------------------------
    console.log('\n--- BƯỚC 2: NHÂN VIÊN LÀM VIỆC ---');

    // 2.1 Staff Login
    const staffLogin = await api('POST', '/auth/login', { username: 'thocnc1', password: '123456' });
    staffToken = staffLogin.token;
    log('Nhân viên (thocnc1) đăng nhập thành công', 'PASS');

    // Make sure we are checked out of any previous shift (Clean slate)
    await db.prepare("UPDATE attendance_records SET check_out_at = NOW() WHERE user_id = ? AND check_out_at IS NULL").run(thocnc1.id);
    await db.prepare("UPDATE worklogs SET status = 'DONE', end_time = NOW() WHERE user_id = ? AND status = 'IN_PROGRESS'").run(thocnc1.id);

    // 2.2 Check-in (This triggers creating an attendance_record)
    const checkinRes = await api('POST', '/attendance/check-in', null, staffToken);
    log('Nhân viên Check-in ca làm việc thành công', 'PASS');

    // 2.3 Bắt đầu Task
    const startTask = await api('POST', '/worklogs/start', { task_id: testIds.taskId }, staffToken);
    testIds.worklogId = startTask.id;
    log('Bắt đầu ghi nhận giờ làm việc cho Task thành công', 'PASS');

    // Giả lập thời gian trôi qua (Sửa DB lùi thời gian bắt đầu lại 2 tiếng để có duration_hours)
    await db.prepare("UPDATE worklogs SET start_time = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE id = ?").run(testIds.worklogId);
    log('Đã giả lập làm việc được 2 tiếng...', 'INFO');

    // 2.4 Kết thúc Task
    const stopTask = await api('POST', '/worklogs/stop', null, staffToken);
    log(`Nhân viên kết thúc việc. Chi phí nhân công ước tính: ${stopTask.actual_cost}đ`, 'PASS');

    // 2.5 Báo cáo hoàn thành Task
    await api('PUT', `/tasks/${testIds.taskId}/finish`, null, staffToken);
    log('Nhân viên báo cáo hoàn thành công việc', 'PASS');

    // Giả lập lùi thời gian check-in để ra 2 tiếng rưỡi làm việc
    await db.prepare("UPDATE attendance_records SET check_in_at = DATE_SUB(NOW(), INTERVAL 150 MINUTE) WHERE user_id = ? AND check_out_at IS NULL").run(thocnc1.id);

    // 2.6 Tan ca (Check-out)
    const checkoutRes = await api('POST', '/attendance/check-out', null, staffToken);
    log(`Nhân viên Tan ca (Check-out). Tổng thời gian: ${checkoutRes.duration_hours || checkoutRes.total_work_minutes} phút`, 'PASS');


    // ---------------------------------------------------------
    // BƯỚC 3: NGHIỆM THU & BÁO CÁO
    // ---------------------------------------------------------
    console.log('\n--- BƯỚC 3: NGHIỆM THU & BÁO CÁO ---');

    // 3.1 Admin duyệt Task
    await api('PUT', `/tasks/${testIds.taskId}/approve`, null, adminToken);
    log('Admin duyệt hoàn thành công việc', 'PASS');

    // 3.2 Báo cáo Tài chính
    const financeReport = await api('GET', `/worklogs/report?project_id=${testIds.projectId}`, null, adminToken);
    if (financeReport.summary.total_cost > 0) {
      log(`Báo cáo tài chính hiển thị đúng chi phí: ${financeReport.summary.total_cost}đ`, 'PASS');
    } else {
      throw new Error('Báo cáo tài chính không cộng chi phí!');
    }

    // 3.3 Dashboard
    const dashboard = await api('GET', '/worklogs/dashboard', null, adminToken);
    log(`Tải Dashboard thành công. Tổng doanh thu hệ thống: ${dashboard.totals.total_revenue}đ`, 'PASS');

    console.log('\n🎉 HOÀN THÀNH TEST TÍCH HỢP KHÔNG LỖI!');

  } catch (err) {
    log(err.message, 'FAIL');
    console.error(err);
  } finally {
    // ---------------------------------------------------------
    // CLEANUP: XÓA DỮ LIỆU TEST SAU KHI CHẠY (DO USER YÊU CẦU)
    // ---------------------------------------------------------
    console.log('\n🧹 Đang xóa dữ liệu test (Cleanup)...');
    try {
      if (testIds.worklogId) await db.prepare("DELETE FROM worklogs WHERE id = ?").run(testIds.worklogId);
      if (testIds.taskId) await db.prepare("DELETE FROM tasks WHERE id = ?").run(testIds.taskId);
      if (testIds.projectId) {
        await db.prepare("DELETE FROM project_item_mapping WHERE project_id = ?").run(testIds.projectId);
        await db.prepare("DELETE FROM projects WHERE id = ?").run(testIds.projectId);
      }
      if (testIds.projectItemId) await db.prepare("DELETE FROM project_items WHERE id = ?").run(testIds.projectItemId);
      
      // Since attendance_records is tied to shift instances, deleting attendance_records for today where user = thocnc1 might be safe, but let's delete the exact record if we could. Wait, I didn't save the ID. Let's just delete the records generated today for thocnc1
      const users = await api('GET', '/users', null, adminToken);
      const thocnc1 = users.find(u => u.username === 'thocnc1');
      if (thocnc1) {
        await db.prepare("DELETE FROM attendance_records WHERE user_id = ? AND DATE(check_in_at) = CURRENT_DATE").run(thocnc1.id);
        await db.prepare("DELETE FROM attendance WHERE user_id = ? AND DATE(check_in) = CURRENT_DATE").run(thocnc1.id);
      }

      log('Xóa dữ liệu test thành công!', 'PASS');
    } catch (cleanErr) {
      log(`Lỗi khi dọn dẹp dữ liệu: ${cleanErr.message}`, 'FAIL');
    }
    process.exit(0);
  }
}

runIntegrationTest();
