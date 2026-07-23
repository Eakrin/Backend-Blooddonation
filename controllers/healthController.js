const db = require("../db");

exports.create = (req, res) => {
  const donor_id = req.user.id;
  const { result_status, assessment_date } = req.body;

  db.query(
    `INSERT INTO Health_Assessment (Donor_ID, assessment_date, result_status) VALUES (?, ?, ?)`,
    [donor_id, assessment_date, result_status],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });
      res.status(201).json({ message: "บันทึกสำเร็จ", assessment_id: result.insertId });
    }
  );
};

exports.getByDonor = (req, res) => {
  const donor_id = req.user.id;
  db.query(
    `SELECT * FROM Health_Assessment WHERE Donor_ID = ? ORDER BY assessment_date DESC LIMIT 1`,
    [donor_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });
      res.json(results[0] || null);
    }
  );
};

// ✅ ใหม่: ให้เจ้าหน้าที่ดึงรายการที่รอตรวจสอบ (result_status = 'pending')
// หมายเหตุ: ค่าต้องตรงกับ ENUM จริงของคอลัมน์ result_status คือ enum('pass','fail','pending')
exports.getPendingReview = (req, res) => {
  // เฉพาะ staff/admin เท่านั้นที่เรียกได้
  if (req.user.role !== "staff" && req.user.role !== "admin") {
    return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  }

  db.query(
    `SELECT ha.assessment_ID, ha.Donor_ID, ha.assessment_date, ha.result_status,
            d.name, d.lastname, d.email, d.phone, d.blood_type
     FROM Health_Assessment ha
     JOIN Donor d ON ha.Donor_ID = d.Donor_ID
     WHERE ha.result_status = 'pending'
     ORDER BY ha.assessment_date ASC`,
    [],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });
      res.json(results);
    }
  );
};

// ✅ ใหม่: ให้เจ้าหน้าที่อนุมัติ/ไม่อนุมัติผลการประเมินที่รอตรวจสอบ
exports.updateStatus = (req, res) => {
  if (req.user.role !== "staff" && req.user.role !== "admin") {
    return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  }

  const { id } = req.params;
  const { result_status } = req.body; // ต้องเป็น 'pass' หรือ 'fail' เท่านั้น

  if (!["pass", "fail"].includes(result_status)) {
    return res
      .status(400)
      .json({ message: "result_status ต้องเป็น 'pass' หรือ 'fail' เท่านั้น" });
  }

  db.query(
    `UPDATE Health_Assessment SET result_status = ? WHERE assessment_ID = ?`,
    [result_status, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบรายการแบบประเมินนี้" });
      }
      res.json({ message: "อัปเดตผลการประเมินสำเร็จ" });
    }
  );
};