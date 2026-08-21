import { Router } from "express";
import { getDb } from "../utils/initDb.js";

const router = Router();

// GET /api/sales - List all sales
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { from_date, to_date, status } = req.query;
    let query = "SELECT * FROM sales WHERE 1=1";
    const params = [];
    if (from_date) { query += " AND sale_date >= ?"; params.push(from_date); }
    if (to_date)   { query += " AND sale_date <= ?"; params.push(to_date); }
    if (status)    { query += " AND payment_status = ?"; params.push(status); }
    const sales = db.prepare(query + " ORDER BY sale_date DESC").all(...params);
    res.json({ count: sales.length, sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/:id - Single sale with items
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(req.params.id);
    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales - Create sale
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const { invoice_number, customer_name, customer_phone, subtotal, discount, tax, total_amount, payment_status, payment_method, notes, items } = req.body;
    if (!items?.length) return res.status(400).json({ error: "items array is required" });

    const result = db.prepare(`
      INSERT INTO sales (invoice_number, customer_name, customer_phone, subtotal, discount, tax, total_amount, payment_status, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoice_number || `INV-${Date.now()}`,
      customer_name || "Walk-in Customer",
      customer_phone || null,
      subtotal || 0,
      discount || 0,
      tax || 0,
      total_amount || 0,
      payment_status || "pending",
      payment_method || "cash",
      notes || null
    );

    const sale_id = result.lastInsertRowid;
    let subtotalCalc = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const unit_price = parseFloat(item.unit_price) || 0;
      const item_total = qty * unit_price;
      subtotalCalc += item_total;

      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(sale_id, item.product_id, qty, unit_price, item_total);

      // Decrease stock and record movement
      db.prepare("UPDATE products SET current_stock = current_stock - ? WHERE id = ?").run(qty, item.product_id);
      db.prepare(`INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, reference_type, notes)
        VALUES (?, 'sale', ?, ?, 'sale', ?)`).run(item.product_id, qty, sale_id, notes || null);
    }

    const taxAmt = ((subtotalCalc - (discount || 0)) * (tax || 0)) / 100;
    const finalTotal = subtotalCalc - (discount || 0) + taxAmt;
    db.prepare("UPDATE sales SET subtotal = ?, total_amount = ? WHERE id = ?").run(subtotalCalc, finalTotal, sale_id);

    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(sale_id);
    const fullItems = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(sale_id);
    res.status(201).json({ ...sale, items: fullItems });
  } catch (err) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Invoice number already exists" });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sales/:id - Update sale
router.put("/:id", (req, res) => {
  try {
    const db = getDb();
    const { customer_name, customer_phone, payment_status, payment_method, notes } = req.body;
    db.prepare(`
      UPDATE sales SET
        customer_name = COALESCE(?, customer_name),
        customer_phone = COALESCE(?, customer_phone),
        payment_status = COALESCE(?, payment_status),
        payment_method = COALESCE(?, payment_method),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(customer_name, customer_phone, payment_status, payment_method, notes, req.params.id);
    res.json(db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sales/:id - Delete sale (restore stock)
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Restore stock for each item
    const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(req.params.id);
    for (const item of items) {
      db.prepare("UPDATE products SET current_stock = current_stock + ? WHERE id = ?").run(item.quantity, item.product_id);
    }

    // Delete sale items then sale
    db.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(req.params.id);
    db.prepare("DELETE FROM sales WHERE id = ?").run(req.params.id);
    res.json({ message: "Sale deleted and stock restored" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sales/:id/status - Update payment status
router.put("/:id/status", (req, res) => {
  try {
    const db = getDb();
    const { payment_status } = req.body;
    if (!payment_status) return res.status(400).json({ error: "payment_status is required" });
    db.prepare("UPDATE sales SET payment_status = ? WHERE id = ?").run(payment_status, req.params.id);
    res.json(db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;