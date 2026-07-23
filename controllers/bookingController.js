const db = require("../db");

exports.createBooking = (req, res) => {
  const donor_id = req.user.id;
  const { booking_datetime } = req.body;

  if (!booking_datetime)
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });

  // ✅ 1. เช็คผลประเมินสุขภาพล่าสุดที่ยังไม่ผูกกับ booking ไหน
  db.query(
    `SELECT * FROM Health_Assessment
     WHERE Donor_ID = ? AND Booking_ID IS NULL
     ORDER BY assessment_date DESC LIMIT 1`,
    [donor_id],
    (err, assessmentResult) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });

      if (assessmentResult.length === 0) {
        return res.status(400).json({ message: "กรุณาทำแบบประเมินสุขภาพก่อนทำการจอง" });
      }

      if (assessmentResult[0].result_status === 'fail') {
        return res.status(400).json({ message: "คุณไม่ผ่านการประเมินสุขภาพเบื้องต้น ไม่สามารถจองคิวบริจาคโลหิตได้" });
      }

      // ✅ เปลี่ยนแนวทาง: ไม่บล็อกกรณี 'pending' (เหลือง) อีกต่อไป เพราะรวมจุดตรวจสอบ
      // ไว้ที่เดียวแล้วคือหน้า "รายชื่อผู้จอง" — เจ้าหน้าที่จะเห็นผลประเมินสุขภาพ
      // (รวมถึงเคสเหลือง) ประกอบตอนอนุมัติ/ปฏิเสธคิวที่นั่นแทน ไม่ต้องอนุมัติ 2 รอบ

      // ✅ 2. เช็คโควตาจาก Time_Slot
      db.query(
        `SELECT t.max_quota, COUNT(b.Booking_ID) as booked
         FROM Time_Slot t
         JOIN DONATION_Day d ON t.DonationD_ID = d.DonationD_ID
         LEFT JOIN Booking b ON DATE(b.booking_datetime) = d.Donation_date
           AND TIME(b.booking_datetime) = t.Start_time
           AND b.booking_status != 'cancelled'
         WHERE d.Donation_date = DATE(?)
           AND t.Start_time = TIME(?)
         GROUP BY t.Slot_ID`,
        [booking_datetime, booking_datetime],
        (err, slotResult) => {
          if (err) return res.status(500).json({ message: "Server error", error: err.message });

          if (slotResult.length > 0) {
            const { max_quota, booked } = slotResult[0];
            if (booked >= max_quota) {
              return res.status(400).json({ message: `ขออภัย ช่วงเวลานี้เต็มแล้ว (${booked}/${max_quota} ที่นั่ง)` });
            }
          }

          // ✅ 3. เช็คจองซ้ำ
          db.query(
            `SELECT * FROM Booking
             WHERE Donor_ID = ?
             AND booking_datetime = ?
             AND booking_status != 'cancelled'`,
            [donor_id, booking_datetime],
            (err, existing) => {
              if (err) return res.status(500).json({ message: "Server error", error: err.message });

              if (existing.length > 0) {
                return res.status(409).json({ message: "คุณได้จองคิวในช่วงเวลานี้แล้ว" });
              }

              // ✅ 4. สร้าง booking
              // ตั้งเป็น 'pending' ตามเดิม เจ้าหน้าที่ต้องอนุมัติทุกคิวที่หน้า "รายชื่อผู้จอง"
              // (ระบบเช็คโควตาห้ามจองเกินอัตโนมัติแล้วในขั้นตอนที่ 2 ด้านบน แยกกันคนละเรื่องกับการอนุมัติ)
              db.query(
                `INSERT INTO Booking (Donor_ID, booking_datetime, booking_status) VALUES (?, ?, 'pending')`,
                [donor_id, booking_datetime],
                (err, result) => {
                  if (err) return res.status(500).json({ message: "Server error", error: err.message });

                  const booking_id = result.insertId;

                  // ✅ 5. ผูก Health_Assessment เข้ากับ booking นี้
                  db.query(
                    `UPDATE Health_Assessment
                     SET Booking_ID = ?
                     WHERE Donor_ID = ?
                     AND Booking_ID IS NULL
                     ORDER BY assessment_date DESC
                     LIMIT 1`,
                    [booking_id, donor_id],
                    (err2) => {
                      if (err2) console.error('อัปเดต Health_Assessment ไม่สำเร็จ', err2);
                    }
                  );

                  res.status(201).json({ message: "จองคิวสำเร็จ", booking_id });
                }
              );
            }
          );
        }
      );
    }
  );
};

exports.getBooking = (req, res) => {
  const donor_id = req.user.id;
  db.query(
    `SELECT * FROM Booking WHERE Donor_ID = ? ORDER BY booking_datetime DESC`,
    [donor_id],
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      res.json(results);
    },
  );
};

exports.cancelBooking = (req, res) => {
  const { booking_id } = req.params;
  const donor_id = req.user.id;

  db.query(
    `UPDATE Booking SET booking_status = 'cancelled' WHERE Booking_ID = ? AND Donor_ID = ?`,
    [booking_id, donor_id],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "ไม่พบการจอง หรือไม่มีสิทธิ์" });
      res.json({ message: "ยกเลิกสำเร็จ" });
    },
  );
};

// ✅ เพิ่ม JOIN กับ Health_Assessment เพื่อให้เจ้าหน้าที่เห็นผลคัดกรองสุขภาพ
// (pass/pending/fail) ของแต่ละคิว ประกอบการอนุมัติ/ปฏิเสธในหน้าเดียว
exports.getAllBookings = (req, res) => {
  db.query(
    `SELECT b.*, d.name, d.lastname, d.phone, d.blood_type,
            ha.result_status AS assessment_status
     FROM Booking b
     JOIN Donor d ON b.Donor_ID = d.Donor_ID
     LEFT JOIN Health_Assessment ha ON ha.Booking_ID = b.Booking_ID
     ORDER BY b.booking_datetime DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });
      res.json(results);
    }
  );
};

exports.updateStatus = (req, res) => {
  const booking_id = parseInt(req.params.booking_id);
  const { booking_status } = req.body;

  console.log('updateStatus called:', booking_id, booking_status);

  db.query(
    `UPDATE Booking SET booking_status = ? WHERE Booking_ID = ?`,
    [booking_status, booking_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error", error: err.message });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "ไม่พบรายการจองนี้" });
      }

      console.log('affectedRows:', result.affectedRows);
      res.json({ message: "อัปเดตสำเร็จ" });
    }
  );
};