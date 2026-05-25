const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db');

const app = express();

const JWT_SECRET = 'your_secret_key';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend Running...');
});

// ─── LOGIN ───────────────────────────────────────────
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'กรุณากรอก Email และ Password' });
    }

const sql = 'SELECT * FROM Donor WHERE email = ?';

    db.query(sql, [email], async (err, result) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });

        if (result.length === 0) {
            return res.status(401).json({ message: 'ไม่พบ Email นี้ในระบบ' });
        }

        const user = result[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password ไม่ถูกต้อง' });
        }

        const token = jwt.sign(
    { id: user.Donor_ID, email: user.email },
    JWT_SECRET,
    { expiresIn: '1d' }
);

res.json({
    message: 'Login Success',
    token,
    user: {
        id: user.Donor_ID,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        blood_type: user.blood_type
    }
});
    });
});

// ─── REGISTER ────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { name, lastname, email, password, phone, blood_type, birthday, gender } = req.body;
    const weight = parseFloat(req.body.weight);
    const height = parseFloat(req.body.height);

    if (!name || !lastname || !email || !password || !phone || !blood_type || !birthday || !gender || !weight || !height) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    try {
        const checkSql = 'SELECT Donor_ID FROM Donor WHERE email = ?';
        db.query(checkSql, [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error', error: err.message });

            if (results.length > 0) {
                return res.status(409).json({ message: 'Email นี้ถูกใช้งานแล้ว' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const sql = `
                INSERT INTO Donor (name, lastname, email, password, phone, blood_type, birthday, gender, weight, height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(sql, [name, lastname, email, hashedPassword, phone, blood_type, birthday, gender, weight, height], (err) => {
                if (err) return res.status(500).json({ message: 'Server error', error: err.message });

                res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
            });
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ─── BOOKING ────────────────────────────────────────
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'ไม่มี token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'token ไม่ถูกต้อง' });
    }
}
// สร้างการจอง
app.post('/booking', auth, (req, res) => {
    const donor_id = req.user.id;
    const { booking_datetime } = req.body;

    if (!booking_datetime) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const sql = `
        INSERT INTO Booking (Donor_ID, booking_datetime, booking_status)
        VALUES (?, ?, 'pending')
    `;

    db.query(sql, [donor_id, booking_datetime], (err, result) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });

        res.status(201).json({
            message: 'จองคิวสำเร็จ',
            booking_id: result.insertId
        });
    });
});

// ดูการจองของ Donor
app.get('/booking', auth, (req, res) => {
    const donor_id = req.user.id;

    const sql = `
        SELECT * FROM Booking 
        WHERE Donor_ID = ? 
        ORDER BY booking_datetime DESC
    `;

    db.query(sql, [donor_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });

        res.json(results);
    });
});

// ยกเลิกการจอง
app.put('/booking/cancel/:booking_id', auth, (req, res) => {
    const { booking_id } = req.params;
    const donor_id = req.user.id;

    const sql = `
        UPDATE Booking 
        SET booking_status = 'cancelled'
        WHERE Booking_ID = ? AND Donor_ID = ?
    `;

    db.query(sql, [booking_id, donor_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Server error', error: err.message });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบการจอง หรือไม่มีสิทธิ์' });
        }

        res.json({ message: 'ยกเลิกสำเร็จ' });
    });
});

// ─── Health Assessment ────────────────────────────────────────
app.post('/health-assessment', auth, (req, res) => {
    const donor_id = req.user.id;
    const { assessment_date, result_status } = req.body;

    if (!assessment_date || !result_status) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const sql = `
        INSERT INTO Health_Assessment 
        (Donor_ID, assessment_date, result_status)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [donor_id, assessment_date, result_status], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: 'Server error',
                error: err.message
            });
        }

        res.status(201).json({
            message: 'บันทึกผลตรวจสุขภาพสำเร็จ',
            assessment_id: result.insertId
        });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});