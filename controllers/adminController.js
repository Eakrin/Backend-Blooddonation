const bcrypt = require("bcrypt");
const db = require("../db");

const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// สร้าง Staff ใหม่
exports.createStaff = async (req, res) => {
  const { name, lastname, email, password, phone, role } = req.body;

  if (!name || !lastname || !email || !password || !role) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    // เช็คว่าอีเมลซ้ำไหม
    const existing = await queryPromise(
      "SELECT Staff_ID FROM Staff WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await queryPromise(
      "INSERT INTO Staff (name, lastname, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
      [name, lastname, email, hashedPassword, phone || "", role]
    );

    return res.status(201).json({ message: "สร้างบัญชีเจ้าหน้าที่สำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ดึงรายชื่อ Staff ทั้งหมด
exports.getStaff = async (req, res) => {
  try {
    const results = await queryPromise(
      "SELECT Staff_ID, name, lastname, email, phone, role, status FROM Staff ORDER BY Staff_ID DESC",
      []
    );
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// แก้ไขข้อมูล Staff
exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, lastname, email, phone, status } = req.body;

  try {
    await queryPromise(
      "UPDATE Staff SET name=?, lastname=?, email=?, phone=?, status=? WHERE Staff_ID=?",
      [name, lastname, email, phone || "", status, id]
    );
    return res.json({ message: "อัปเดตข้อมูลสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};