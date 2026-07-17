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

// สร้าง Admin ใหม่
exports.createAdmin = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    const existing = await queryPromise(
      "SELECT Admin_ID FROM Admin WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await queryPromise(
      "INSERT INTO Admin (name, email, password, phone, status) VALUES (?, ?, ?, ?, 'active')",
      [name, email, hashedPassword, phone || ""]
    );

    return res.status(201).json({ message: "สร้างบัญชีแอดมินสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const results = await queryPromise(
      "SELECT Admin_ID, name, email, phone, status FROM Admin ORDER BY Admin_ID DESC",
      []
    );
    return res.json(results);
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


exports.getDashboard = async (req, res) => {
  try {
    const totalDonorsResult = await queryPromise("SELECT COUNT(*) as total FROM Donor", []);

    const todayBookingsResult = await queryPromise(
      "SELECT COUNT(*) as total FROM Booking WHERE DATE(booking_datetime) = CURDATE()", []
    );

    const cancelledTodayResult = await queryPromise(
      "SELECT COUNT(*) as total FROM Booking WHERE DATE(booking_datetime) = CURDATE() AND booking_status = 'cancelled'", []
    );

    const recentActivity = await queryPromise(
      `SELECT b.Booking_ID, b.booking_datetime, b.booking_status, d.name, d.lastname, d.Blood_Type
       FROM Booking b JOIN Donor d ON b.Donor_ID = d.Donor_ID
       ORDER BY b.booking_datetime DESC LIMIT 5`, []
    );

    const weeklyRows = await queryPromise(
      `SELECT WEEKDAY(booking_datetime) as dow, COUNT(*) as total
       FROM Booking
       WHERE booking_status = 'approved'
         AND booking_datetime >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
         AND booking_datetime < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
       GROUP BY dow`, []
    );
    const weeklyStats = [0, 0, 0, 0, 0, 0, 0];
    weeklyRows.forEach((row) => (weeklyStats[row.dow] = row.total));

    return res.json({
      totalDonors: totalDonorsResult[0].total,
      todayBookings: todayBookingsResult[0].total,
      cancelledToday: cancelledTodayResult[0].total,
      recentActivity: recentActivity.map((r) => ({
        name: `${r.name} ${r.lastname || ""}`.trim(),
        time: r.booking_datetime,
        bloodType: r.Blood_Type,
        status: r.booking_status,
      })),
      weeklyStats,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateAdminStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
  }

  try {
    await queryPromise("UPDATE Admin SET status=? WHERE Admin_ID=?", [status, id]);
    return res.json({ message: "อัปเดตสถานะสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
