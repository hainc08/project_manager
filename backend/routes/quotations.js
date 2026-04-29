const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');

// Middleware to get DB
const getDB = (req) => req.app.get('db');

// --- CUSTOMERS ---

// GET /api/customers
router.get('/customers', async (req, res) => {
  try {
    const db = getDB(req);
    const search = req.query.search || '';
    const sql = `
      SELECT * FROM customers 
      WHERE company_name LIKE ? OR contact_name LIKE ? 
      LIMIT 50
    `;
    const customers = await db.prepare(sql).all(`%${search}%`, `%${search}%`);
    res.json(customers);
  } catch (err) {
    logger.error('API', `Failed to fetch customers: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/customers
router.post('/customers', async (req, res) => {
  try {
    const db = getDB(req);
    const { company_name, contact_name, phone, email, address, tax_code, source, note } = req.body;
    const id = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO customers (id, company_name, contact_name, phone, email, address, tax_code, source, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      company_name, 
      contact_name || null, 
      phone || null, 
      email || null, 
      address || null, 
      tax_code || null, 
      source || 'other', 
      note || null
    );
    
    const newCustomer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.status(201).json(newCustomer);
  } catch (err) {
    logger.error('API', `Failed to create customer: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// --- QUOTATIONS ---

// GET /api/quotations
router.get('/quotations', async (req, res) => {
  try {
    const db = getDB(req);
    const { status, search } = req.query;
    
    let sql = `
      SELECT q.*, c.company_name as customer_name 
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status && status !== 'all') {
      sql += ` AND q.status = ?`;
      params.push(status);
    }
    
    if (search) {
      sql += ` AND (q.quote_number LIKE ? OR q.project_name LIKE ? OR c.company_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY q.created_at DESC`;
    
    const quotations = await db.prepare(sql).all(...params);
    res.json(quotations);
  } catch (err) {
    logger.error('API', `Failed to fetch quotations: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/quotations/:id
router.get('/quotations/:id', async (req, res) => {
  try {
    const db = getDB(req);
    const quote = await db.prepare(`
      SELECT q.*, c.company_name, c.contact_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.tax_code
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
    `).get(req.params.id);
    
    if (!quote) return res.status(404).json({ error: 'Không tìm thấy báo giá' });
    
    const items = await db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY group_order, item_order').all(req.params.id);
    
    res.json({ ...quote, items });
  } catch (err) {
    logger.error('API', `Failed to fetch quotation detail: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/quotations
router.post('/quotations', async (req, res) => {
  try {
    const db = getDB(req);
    const id = crypto.randomUUID();
    const { customer_id, project_name, quantity_desc, subtotal, discount_percent, discount_amount, vat_percent, vat_amount, total_amount, payment_terms, delivery_days, valid_until, note, items } = req.body;
    
    // Generate quote number: BG-YYMM-XXX
    const now = new Date();
    const yearMonth = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countResult = await db.prepare("SELECT COUNT(*) as count FROM quotations WHERE quote_number LIKE ?").get(`BG-${yearMonth}-%`);
    const seq = (countResult?.count || 0) + 1;
    const quote_number = `BG-${yearMonth}-${String(seq).padStart(3, '0')}`;
    
    await db.prepare(`
      INSERT INTO quotations (
        id, quote_number, customer_id, project_name, quantity_desc, 
        subtotal, discount_percent, discount_amount, vat_percent, vat_amount, total_amount,
        payment_terms, delivery_days, valid_until, note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      quote_number, 
      customer_id, 
      project_name, 
      quantity_desc || null,
      subtotal || 0, 
      discount_percent || 0, 
      discount_amount || 0, 
      vat_percent || 10, 
      vat_amount || 0, 
      total_amount || 0,
      payment_terms || '50_50', 
      delivery_days || 30, 
      valid_until || null, 
      note || null, 
      'DRAFT'
    );
    
    // Insert items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.prepare(`
          INSERT INTO quotation_items (
            id, quotation_id, group_name, group_order, item_order, description, item_type, quantity, unit, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(), 
          id, 
          item.group_name || null, 
          item.group_order || 0, 
          item.item_order || 0, 
          item.description, 
          item.item_type, 
          item.quantity || 1, 
          item.unit || null, 
          item.unit_price || 0, 
          item.total_price || 0
        );
      }
    }
    
    res.status(201).json({ id, quote_number });
  } catch (err) {
    logger.error('API', `Failed to create quotation: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/quotations/:id
router.put('/quotations/:id', async (req, res) => {
  try {
    const db = getDB(req);
    const { customer_id, project_name, quantity_desc, subtotal, discount_percent, discount_amount, vat_percent, vat_amount, total_amount, payment_terms, delivery_days, valid_until, note, items, status } = req.body;
    
    await db.prepare(`
      UPDATE quotations SET 
        customer_id = ?, project_name = ?, quantity_desc = ?, 
        subtotal = ?, discount_percent = ?, discount_amount = ?, vat_percent = ?, vat_amount = ?, total_amount = ?,
        payment_terms = ?, delivery_days = ?, valid_until = ?, note = ?, status = ?
      WHERE id = ?
    `).run(
      customer_id, 
      project_name, 
      quantity_desc || null,
      subtotal || 0, 
      discount_percent || 0, 
      discount_amount || 0, 
      vat_percent || 10, 
      vat_amount || 0, 
      total_amount || 0,
      payment_terms || '50_50', 
      delivery_days || 30, 
      valid_until || null, 
      note || null, 
      status || 'DRAFT',
      req.params.id
    );
    
    // Simple way: delete and re-insert items (not most efficient but works for small quotes)
    await db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id);
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.prepare(`
          INSERT INTO quotation_items (
            id, quotation_id, group_name, group_order, item_order, description, item_type, quantity, unit, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(), 
          req.params.id, 
          item.group_name || null, 
          item.group_order || 0, 
          item.item_order || 0, 
          item.description, 
          item.item_type, 
          item.quantity || 1, 
          item.unit || null, 
          item.unit_price || 0, 
          item.total_price || 0
        );
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    logger.error('API', `Failed to update quotation: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PATCH /api/quotations/:id/status
router.patch('/quotations/:id/status', async (req, res) => {
  try {
    const db = getDB(req);
    const { status } = req.body;
    await db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('API', `Failed to update status: ${err.message}`);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
