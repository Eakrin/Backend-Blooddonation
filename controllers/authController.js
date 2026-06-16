const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = "your_secret_key";

// ฟังก์ชันช่วยจัดการดึงข้อมูลจาก Database ให้รองรับ Async/Await
const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// ─── 1. LOGIN (ระบบตรวจสอบแยกตารางเป็นระเบียบ ไม่ซ้อนกันให้งง) ──────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "กรุณากรอก Email และ Password" });
  }

  try {
    // สเต็ปที่ 1: ตรวจสอบที่ตาราง Donor ก่อน
    const donorResult = await queryPromise(
      "SELECT * FROM Donor WHERE email = ?",
      [email],
    );
    if (donorResult.length > 0) {
      const user = donorResult[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ message: "Password ไม่ถูกต้อง" });

      const token = jwt.sign(
        { id: user.Donor_ID, email: user.email, role: "donor" },
        JWT_SECRET,
        { expiresIn: "1d" },
      );

      let formattedBirthday = "";
      if (user.birthday) {
        const d = new Date(user.birthday);
        formattedBirthday = !isNaN(d.getTime())
          ? d.toISOString().split("T")[0]
          : "";
      }

      return res.json({
        message: "Login Success",
        token,
        role: "donor",
        user: {
          id: user.Donor_ID,
          name: user.name || "",
          lastname: user.lastname || "",
          email: user.email || "",
          phone: user.phone || "",
          gender: user.gender || "",
          blood_type: user.blood_type || "",
          birthday: formattedBirthday,
          weight:
            user.weight !== null && user.weight !== undefined
              ? Number(user.weight)
              : "",
          height:
            user.height !== null && user.height !== undefined
              ? Number(user.height)
              : "",
          profile: user.profile || null,
        },
      });
    }

    // สเต็ปที่ 2: ถ้าไม่เจอใน Donor ให้มาตรวจที่ตาราง Staff ต่อ
    const staffResult = await queryPromise(
      "SELECT * FROM Staff WHERE email = ?",
      [email],
    );
    if (staffResult.length > 0) {
      const staff = staffResult[0];

      if (staff.status !== "active") {
        return res.status(403).json({ message: "บัญชีนี้ถูกระงับการใช้งาน" });
      }

      const isMatch = await bcrypt.compare(password, staff.password);
      if (!isMatch)
        return res.status(401).json({ message: "Password ไม่ถูกต้อง" });

      const token = jwt.sign(
        { id: staff.Staff_ID, email: staff.email, role: "staff" },
        JWT_SECRET,
        { expiresIn: "1d" },
      );

      return res.json({
        message: "Login Success",
        token,
        role: "staff",
        user: {
          id: staff.Staff_ID,
          name: staff.name || "",
          lastname: staff.lastname || "",
          email: staff.email || "",
          phone: staff.phone || "",
          role: staff.role || "staff",
          status: staff.status || "active",
        },
      });
    }

    // สเต็ปที่ 3: ถ้ายังไม่เจออีก ให้มาตรวจที่ตาราง Admin เป็นตารางสุดท้าย (🎯 แก้บั๊กจุดนี้ให้แล้ว)
    const adminResult = await queryPromise(
      "SELECT * FROM Admin WHERE email = ?",
      [email],
    );
    if (adminResult.length > 0) {
      const admin = adminResult[0];

      // ใช้ .trim() ป้องกันกรณีใน database แอบมีเคาะเว้นวรรคท้ายข้อความ
      const storedPassword = admin.password ? admin.password.trim() : "";
      const isMatch = await bcrypt.compare(password, storedPassword);

      // 🎯 เพิ่ม 4 บรรทัดนี้ลงไปเพื่อส่องดูค่าใน Terminal หลังบ้านครับ
      console.log("=== 🔍 ADMIN LOGIN DEBUG ===");
      console.log("1. รหัสผ่านที่พิมพ์มาจากหน้าเว็บ (Plain):", password);
      console.log("2. รหัสผ่านที่ดึงมาจาก MySQL (Hash):", storedPassword);
      console.log("3. ผลลัพธ์การจับคู่ของ Bcrypt (isMatch):", isMatch);
      console.log("=============================");

      if (!isMatch)
        return res.status(401).json({ message: "Password ไม่ถูกต้อง" });

      const token = jwt.sign(
        { id: admin.Admin_ID, email: admin.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: "1d" },
      );

      return res.json({
        message: "Login Success",
        token,
        role: "admin",
        user: {
          id: admin.Admin_ID,
          name: admin.name || "",
          email: admin.email || "",
          phone: admin.phone || "",
        },
      });
    }

    // ถ้าค้นหาครบทุกตารางแล้วยังไม่เจออีเมลนี้เลย
    return res.status(401).json({ message: "ไม่พบ Email นี้ในระบบ" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ─── 2. REGISTER (คงโค้ดเดิมของคุณไว้ 100%) ────────────────────────────────
exports.register = async (req, res) => {
  const {
    name,
    lastname,
    email,
    password,
    phone,
    blood_type,
    birthday,
    gender,
  } = req.body;
  const weight = req.body.weight ? parseFloat(req.body.weight) : null;
  const height = req.body.height ? parseFloat(req.body.height) : null;

  if (!name || !lastname || !email || !password || !phone) {
    return res
      .status(400)
      .json({ message: "กรุณากรอกข้อมูลส่วนตัวพื้นฐานให้ครบถ้วน" });
  }

  try {
    db.query(
      "SELECT Donor_ID FROM Donor WHERE email = ?",
      [email],
      async (err, results) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Server error", error: err.message });
        if (results.length > 0)
          return res.status(409).json({ message: "Email นี้ถูกใช้งานแล้ว" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
                INSERT INTO Donor (name, lastname, email, password, phone, blood_type, birthday, gender, weight, height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

        db.query(
          sql,
          [
            name,
            lastname,
            email,
            hashedPassword,
            phone,
            blood_type || "",
            birthday || null,
            gender || "",
            weight,
            height,
          ],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Server error", error: err.message });
            res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
          },
        );
      },
    );
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
