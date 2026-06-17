const db = require("../db");

const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// ดึงสถานที่ทั้งหมด
exports.getLocations = async (req, res) => {
  try {
    const results = await queryPromise(
      "SELECT * FROM Location ORDER BY Location_ID DESC",
      []
    );
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// สร้างสถานที่ใหม่
exports.createLocation = async (req, res) => {
  const { name, address, phone, email, type } = req.body;
  if (!name) return res.status(400).json({ message: "กรุณาระบุชื่อสถานที่" });

  try {
    await queryPromise(
      "INSERT INTO Location (name, address, phone, email, type) VALUES (?, ?, ?, ?, ?)",
      [name, address || "", phone || "", email || "", type || ""]
    );
    return res.status(201).json({ message: "สร้างสถานที่สำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// แก้ไขสถานที่
exports.updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, type } = req.body;

  try {
    await queryPromise(
      "UPDATE Location SET name=?, address=?, phone=?, email=?, type=? WHERE Location_ID=?",
      [name, address || "", phone || "", email || "", type || "", id]
    );
    return res.json({ message: "อัปเดตสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ลบสถานที่ ✅ ลบจริงแทน inactive
exports.deleteLocation = async (req, res) => {
  const { id } = req.params;
  try {
    await queryPromise(
      "DELETE FROM Location WHERE Location_ID = ?",
      [id]
    );
    return res.json({ message: "ลบสถานที่สำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};