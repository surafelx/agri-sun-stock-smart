import { Router } from "express";
import { getDb } from "../utils/initDb.js";

const router = Router();

// GET /api/categories
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;
    let query = "SELECT * FROM categories WHERE 1=1";
    const params = [];
    if (search) { query += " AND name LIKE ?"; params.push(`%${search}%`); }
    const categories = db.prepare(query + " ORDER BY name ASC").all(...params);
    res.json({ count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:id
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = db.prepare("INSERT INTO categories (name, description) VALUES (?, ?)").run(name, description || null);
    res.status(201).json(db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Category name already exists" });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put("/:id", (req, res) => {
  try {
    const db = getDb();
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    db.prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?").run(name, description || null, req.params.id);
    const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;