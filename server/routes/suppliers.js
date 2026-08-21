import { Router } from "express";
import { getDb } from "../utils/initDb.js";

const router = Router();

// GET /api/suppliers
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;
    let query = "SELECT * FROM suppliers WHERE 1=1";
    const params = [];
    if (search) {
      query += " AND (name LIKE ? OR tin_no LIKE ? OR contact LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const suppliers = db.prepare(query + " ORDER BY name ASC").all(...params);
    res.json({ count: suppliers.length, suppliers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const { name, tin_no, contact, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = db.prepare(
      "INSERT INTO suppliers (name, tin_no, contact, address, notes) VALUES (?, ?, ?, ?, ?)"
    ).run(name, tin_no || null, contact || null, address || null, notes || null);
    res.status(201).json(db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", (req, res) => {
  try {
    const db = getDb();
    const { name, tin_no, contact, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    db.prepare(
      "UPDATE suppliers SET name = ?, tin_no = ?, contact = ?, address = ?, notes = ? WHERE id = ?"
    ).run(name, tin_no || null, contact || null, address || null, notes || null, req.params.id);
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM suppliers WHERE id = ?").run(req.params.id);
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
