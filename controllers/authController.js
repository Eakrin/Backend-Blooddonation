const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
// ✅ ใช้ modular API ของ firebase-admin (เวอร์ชันใหม่แนะนำแบบนี้ แทนการเรียกผ่าน
// namespace object เดิม เช่น admin.apps / admin.initializeApp ที่บางเวอร์ชันมีปัญหา)
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const db = require("../db");

const JWT_SECRET = "your_secret_key";

// ✅ ใหม่: เริ่มต้น Firebase Admin SDK สำหรับตรวจสอบ idToken ที่ frontend ส่งมา
// ต้องดาวน์โหลดไฟล์ serviceAccountKey.json จาก Firebase Console
// (Project settings > Service accounts > Generate new private key)
// แล้ววางไว้ที่ root ของโปรเจกต์ backend (ห้าม push ขึ้น git เด็ดขาด ให้เพิ่มใน .gitignore)
const serviceAccount = require("../serviceAccountKey.json");
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

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

      // ✅ ใหม่: บัญชีที่สมัครผ่าน Google จะมีรหัสผ่านแบบสุ่มที่ผู้ใช้ไม่รู้
      // ให้บอกตรงๆ ว่าต้อง login ผ่าน Google เท่านั้น แทนที่จะขึ้น "รหัสผ่านไม่ถูกต้อง" ให้งง
      if (user.has_password === 0) {
        return res.status(401).json({
          message: "บัญชีนี้สมัครสมาชิกผ่าน Google กรุณาเข้าสู่ระบบด้วยปุ่ม \"Continue with Google\" เท่านั้น",
        });
      }

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
      const adminUser = adminResult[0];

      // ใช้ .trim() ป้องกันกรณีใน database แอบมีเคาะเว้นวรรคท้ายข้อความ
      const storedPassword = adminUser.password ? adminUser.password.trim() : "";
      const isMatch = await bcrypt.compare(password, storedPassword);

      if (!isMatch)
        return res.status(401).json({ message: "Password ไม่ถูกต้อง" });

      const token = jwt.sign(
        { id: adminUser.Admin_ID, email: adminUser.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: "1d" },
      );

      return res.json({
        message: "Login Success",
        token,
        role: "admin",
        user: {
          id: adminUser.Admin_ID,
          name: adminUser.name || "",
          email: adminUser.email || "",
          phone: adminUser.phone || "",
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

  // ✅ ใหม่: ถ้ามีการอัปโหลดรูปโปรไฟล์มาด้วย (ผ่าน multer + Cloudinary)
  // req.file.path จะเป็น URL รูปที่อยู่บน Cloudinary แล้ว (ไม่ใช่ path ในเครื่อง)
  const profileUrl = req.file ? req.file.path : null;

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
                INSERT INTO Donor (name, lastname, email, password, phone, blood_type, birthday, gender, weight, height, profile)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            profileUrl,
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
      "INSERT INTO Admin (name, email, password, phone) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, phone || ""]
    );

    return res.status(201).json({ message: "สร้างบัญชีแอดมินสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ─── 3. GOOGLE LOGIN / REGISTER (✅ ใหม่) ──────────────────────────────────
// รับ idToken จาก Firebase (frontend เป็นคนขอ Google popup แล้วส่ง idToken มาให้)
// ตรวจสอบความถูกต้องกับ Firebase แล้ว login เข้าระบบ ถ้ายังไม่มีบัญชีจะสร้างให้อัตโนมัติ
// หมายเหตุ: ใช้สำหรับบัญชี "ผู้บริจาค" เท่านั้น ไม่รองรับ staff/admin
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "ไม่พบ idToken" });
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const { email, name, picture } = decoded;

    if (!email) {
      return res
        .status(400)
        .json({ message: "ไม่พบอีเมลจากบัญชี Google นี้" });
    }

    let donorResult = await queryPromise(
      "SELECT * FROM Donor WHERE email = ?",
      [email],
    );
    let user;

    if (donorResult.length > 0) {
      user = donorResult[0];
    } else {
      // ยังไม่มีบัญชี -> สร้างบัญชีผู้บริจาคใหม่อัตโนมัติ
      // ตั้งรหัสผ่านแบบสุ่ม (ไม่ได้ใช้จริง เพราะ login ผ่าน Google ไม่ต้องใช้รหัสผ่านนี้)
      const randomPassword = crypto.randomBytes(20).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const nameParts = (name || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const insertResult = await queryPromise(
        `INSERT INTO Donor (name, lastname, email, password, phone, blood_type, birthday, gender, weight, height, profile, has_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          firstName,
          lastName,
          email,
          hashedPassword,
          "",
          "",
          null,
          "",
          null,
          null,
          picture || null,
          0, // ✅ ยังไม่เคยตั้งรหัสผ่านของตัวเอง (สมัครผ่าน Google)
        ],
      );

      donorResult = await queryPromise(
        "SELECT * FROM Donor WHERE Donor_ID = ?",
        [insertResult.insertId],
      );
      user = donorResult[0];
    }

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
  } catch (err) {
    return res
      .status(401)
      .json({ message: "ยืนยันตัวตนกับ Google ไม่สำเร็จ", error: err.message });
  }
};