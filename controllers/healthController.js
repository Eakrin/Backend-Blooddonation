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