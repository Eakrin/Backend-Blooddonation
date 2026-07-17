const db = require("../db");

const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// ดึงข้อมูลทั้งหมด (JOIN DONATION_Day + Time_Slot)
exports.getAll = async (req, res) => {
  try {
    const results = await queryPromise(
      `SELECT d.DonationD_ID, 
              DATE_FORMAT(d.Donation_date, '%Y-%m-%d') as Donation_date,
              d.Status, d.Location_ID,
              l.name as location_name,
              t.Slot_ID, t.Start_time, t.End_time, t.max_quota,
              COUNT(b.Booking_ID) as booked
       FROM DONATION_Day d
       LEFT JOIN Location l ON d.Location_ID = l.Location_ID
       LEFT JOIN Time_Slot t ON d.DonationD_ID = t.DonationD_ID
       LEFT JOIN Booking b ON DATE(b.booking_datetime) = DATE_FORMAT(d.Donation_date, '%Y-%m-%d')
         AND TIME(b.booking_datetime) = t.Start_time
         AND b.booking_status != 'cancelled'
       GROUP BY d.DonationD_ID, d.Donation_date, d.Status, d.Location_ID,
                l.name, t.Slot_ID, t.Start_time, t.End_time, t.max_quota
       ORDER BY d.Donation_date DESC, t.Start_time ASC`,
      []
    );
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.create = async (req, res) => {
    
  const { Donation_date, Location_ID, Start_time, End_time, max_quota } = req.body;

  if (!Donation_date || !Location_ID || !Start_time || !End_time || !max_quota) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    const dayResult = await queryPromise(
      "INSERT INTO DONATION_Day (Donation_date, Location_ID, Status) VALUES (?, ?, 'active')",
      [Donation_date, Location_ID]
    );

    const donationDayId = dayResult.insertId;

    await queryPromise(
      "INSERT INTO Time_Slot (DonationD_ID, Start_time, End_time, max_quota) VALUES (?, ?, ?, ?)",
      [donationDayId, Start_time, End_time, max_quota]
    );

    return res.status(201).json({ message: "สร้างรายการสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Donation_date, Location_ID, Start_time, End_time, max_quota } = req.body;

  try {
    await queryPromise(
      "UPDATE Time_Slot SET Start_time=?, End_time=?, max_quota=? WHERE Slot_ID=?",
      [Start_time, End_time, max_quota, id]
    );

    await queryPromise(
      `UPDATE DONATION_Day d 
       JOIN Time_Slot t ON d.DonationD_ID = t.DonationD_ID 
       SET d.Donation_date=?, d.Location_ID=? 
       WHERE t.Slot_ID=?`,
      [Donation_date, Location_ID, id]
    );

    return res.json({ message: "อัปเดตสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ลบ Time_Slot และ DONATION_Day (ถ้าไม่มี slot เหลือ)
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    // หา DonationD_ID ก่อน
    const slot = await queryPromise(
      "SELECT DonationD_ID FROM Time_Slot WHERE Slot_ID=?",
      [id]
    );

    if (slot.length === 0) return res.status(404).json({ message: "ไม่พบรายการ" });

    const donationDayId = slot[0].DonationD_ID;

    // ลบ Time_Slot
    await queryPromise("DELETE FROM Time_Slot WHERE Slot_ID=?", [id]);

    // เช็คว่า DONATION_Day มี slot เหลือไหม
    const remaining = await queryPromise(
      "SELECT COUNT(*) as count FROM Time_Slot WHERE DonationD_ID=?",
      [donationDayId]
    );

    if (remaining[0].count === 0) {
      await queryPromise("DELETE FROM DONATION_Day WHERE DonationD_ID=?", [donationDayId]);
    }

    return res.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};