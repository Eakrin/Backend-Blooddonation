const db = require('../db');
// ─── BOOKING ──────────────────────────────────────────────────
exports.createBooking = (req,res)=>{
    const donor_id = req.user.id;
    const { booking_datetime } = req.body;

    if (!booking_datetime) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

    db.query(`INSERT INTO Booking (Donor_ID, booking_datetime, booking_status) VALUES (?, ?, 'pending')`,
        [donor_id, booking_datetime], (err, result) => {
            if (err) return res.status(500).json({ message: 'Server error', error: err.message });
            res.status(201).json({ message: 'จองคิวสำเร็จ', booking_id: result.insertId });
        });
};

exports.getBooking = (req,res)=>{
    const donor_id = req.user.id;
    db.query(`SELECT * FROM Booking WHERE Donor_ID = ? ORDER BY booking_datetime DESC`, [donor_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });
        res.json(results);
    });
};

exports.cancelBooking = (req,res)=>{
    const { booking_id } = req.params;
    const donor_id = req.user.id;

    db.query(`UPDATE Booking SET booking_status = 'cancelled' WHERE Booking_ID = ? AND Donor_ID = ?`,
        [booking_id, donor_id], (err, result) => {
            if (err) return res.status(500).json({ message: 'Server error', error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบการจอง หรือไม่มีสิทธิ์' });
            res.json({ message: 'ยกเลิกสำเร็จ' });
        });
};