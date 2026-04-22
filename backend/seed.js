require('dotenv').config();
const { initDB } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🏗️  Starting Industry-Specific Seeding (Mold & Steel Industry)...');
  const db = await initDB();
  
  try {
    const hash = await bcrypt.hash('123456', 10);

    // Xóa dữ liệu cũ để tránh trùng lặp khi test
    console.log('🧹 Cleaning old data...');
    await db.prepare('SET FOREIGN_KEY_CHECKS=0').run();
    await db.prepare('TRUNCATE TABLE worklogs').run();
    await db.prepare('TRUNCATE TABLE tasks').run();
    await db.prepare('TRUNCATE TABLE project_item_mapping').run();
    await db.prepare('TRUNCATE TABLE project_items').run();
    await db.prepare('TRUNCATE TABLE projects').run();
    await db.prepare('TRUNCATE TABLE users').run();
    await db.prepare('SET FOREIGN_KEY_CHECKS=1').run();

    // 1. Tạo Người dùng (Nhân sự xưởng)
    console.log('👤 Creating specialized staff...');
    const users = [
      ['u_admin', 'admin', hash, 'Nguyễn Văn Quản Đốc', 'ADMIN', 'FULLTIME', 250000, 500000],
      ['u_acc', 'ktoan', hash, 'Trần Thị Kế Toán', 'ACCOUNTANT', 'FULLTIME', 150000, 250000],
      ['u_cnc1', 'thocnc1', hash, 'Lê Văn CNC (Bậc 5/7)', 'STAFF', 'FULLTIME', 120000, 220000],
      ['u_cnc2', 'thocnc2', hash, 'Hoàng Văn Tiện', 'STAFF', 'FULLTIME', 110000, 200000],
      ['u_nguoi1', 'thonguoi', hash, 'Phạm Văn Nguội (Lắp ráp)', 'STAFF', 'FULLTIME', 100000, 180000],
    ];
    for (const u of users) {
      await db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, contract_type, standard_rate, billing_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(...u);
    }

    // 2. Tạo Danh mục Công đoạn (Project Items)
    console.log('⚙️ Creating mold production stages...');
    const items = [
      ['i_design', 'Thiết kế 3D & CAM', 'Thiết kế kỹ thuật và lập trình đường chạy dao CNC'],
      ['i_cnc_rough', 'Gia công phay thô CNC', 'Phay phá khối thép phôi'],
      ['i_edm', 'Gia công xung điện EDM/Cắt dây', 'Gia công các chi tiết hốc sâu và khe hẹp'],
      ['i_heat', 'Nhiệt luyện thép', 'Tôi chân không để đạt độ cứng HRC 52-55'],
      ['i_polish', 'Mài bóng & Đánh bóng', 'Xử lý bề mặt lòng khuôn đạt độ bóng gương'],
      ['i_assembly', 'Lắp ráp & Căn chỉnh', 'Lắp vỏ khuôn, hệ thống đẩy và thử kín'],
    ];
    for (const i of items) {
      await db.prepare(`INSERT INTO project_items (id, name, description) VALUES (?, ?, ?)`).run(...i);
    }

    // 3. Tạo Dự án (Đơn hàng khuôn)
    console.log('📁 Creating active mold projects...');
    const projects = [
      ['p_001', 'Khuôn đúc vỏ động cơ xe máy (SKD61)', 'SITE', 'ACTIVE'],
      ['p_002', 'Khuôn dập chậu rửa Inox (D2)', 'WORKSHOP', 'ACTIVE'],
      ['p_003', 'Sửa chữa bộ khuôn đúc nắp máy (Dự án khẩn)', 'WORKSHOP', 'ACTIVE'],
    ];
    for (const p of projects) {
      await db.prepare(`INSERT INTO projects (id, project_name, location_type, status) VALUES (?, ?, ?, ?)`).run(...p);
    }

    // 4. Mapping Công đoạn vào Dự án
    console.log('🔗 Mapping stages to projects...');
    const mappings = [
      ['p_001', 'i_design'], ['p_001', 'i_cnc_rough'], ['p_001', 'i_heat'], ['p_001', 'i_polish'],
      ['p_002', 'i_design'], ['p_002', 'i_cnc_rough'], ['p_002', 'i_assembly'],
      ['p_003', 'i_edm'], ['p_003', 'i_assembly'],
    ];
    for (const m of mappings) {
      await db.prepare(`INSERT INTO project_item_mapping (project_id, item_id) VALUES (?, ?)`).run(...m);
    }

    // 5. Tạo một vài Task mẫu
    console.log('📝 Assigning sample tasks...');
    await db.prepare(`INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, status) VALUES (?, ?, ?, ?, ?, ?)`).run('t_1', 'p_001', 'i_cnc_rough', 'u_cnc1', 'Phay thô lòng khuôn A (Mặt Cavity)', 'DOING');
    await db.prepare(`INSERT INTO tasks (id, project_id, project_item_id, assigned_to, title, status) VALUES (?, ?, ?, ?, ?, ?)`).run('t_2', 'p_001', 'i_design', 'u_admin', 'Thiết kế hệ thống kênh dẫn nhựa', 'DONE');

    console.log('✅ All specialized mold data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
