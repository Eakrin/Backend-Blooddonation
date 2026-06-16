const db = require('../db');
// ─── HEALTH ASSESSMENT ────────────────────────────────────────
exports.createAssessment = (req, res) => {
    const donor_id = req.user.id;
    const { assessment_date, result_status } = req.body;

    if (!assessment_date || !result_status) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

    db.query(`INSERT INTO Health_Assessment (Donor_ID, assessment_date, result_status) VALUES (?, ?, ?)`,
        [donor_id, assessment_date, result_status], (err, result) => {
            if (err) return res.status(500).json({ message: 'Server error', error: err.message });
            res.status(201).json({ message: 'บันทึกผลตรวจสุขภาพสำเร็จ', assessment_id: result.insertId });
        });
};