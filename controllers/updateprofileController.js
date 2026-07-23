const bcrypt = require("bcrypt");
const db = require("../db");

// ฟังก์ชันช่วย query แบบ Promise (เพื่อใช้ async/await ได้)
const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// API สำหรับแก้ไขโปรไฟล์ Donor
exports.updateProfile = async (req, res) => {
  try {
    const donorId = req.user.id; // ดึง id จาก token ที่ผ่าน authMiddleware
    const {
      name,
      lastname,
      email,
      phone,
      weight,
      height,
      gender,
      blood_type,
      birthday,
    } = req.body;

    if (!name || !lastname || !phone) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกข้อมูล ชื่อ นามสกุล และเบอร์โทรศัพท์" });
    }

    // ✅ ตรวจสอบอีเมลซ้ำ ก่อนบันทึก (ยกเว้นอีเมลของตัวเอง)
    if (email) {
      const existing = await queryPromise(
        "SELECT Donor_ID FROM Donor WHERE email = ? AND Donor_ID != ?",
        [email, donorId],
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    const parsedWeight = weight ? parseFloat(weight) : null;
    const parsedHeight = height ? parseFloat(height) : null;
    const formattedBirthday = birthday || null;

    // ✅ เพิ่ม email เข้าไปใน SQL UPDATE (ของเดิมไม่มี ทำให้แก้อีเมลแล้วไม่ถูกบันทึก)
    const sql = `
            UPDATE Donor
            SET name = ?, lastname = ?, email = ?, phone = ?, weight = ?, height = ?, gender = ?, blood_type = ?, birthday = ?
            WHERE Donor_ID = ?
        `;

    db.query(
      sql,
      [
        name,
        lastname,
        email,
        phone,
        parsedWeight,
        parsedHeight,
        gender || "",
        blood_type || "",
        formattedBirthday,
        donorId,
      ],
      (err, result) => {
        if (err) {
          // ✅ กันเคส unique constraint ที่ database ตีกลับมาโดยตรง (เผื่อไม่ผ่านการเช็คด้านบน)
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
          }
          return res.status(500).json({
            message: "เกิดข้อผิดพลาดจากระบบฐานข้อมูล",
            error: err.message,
          });
        }
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "ไม่พบข้อมูลผู้บริจาคในระบบ" });
        }
        return res.status(200).json({ message: "บันทึกข้อมูลสำเร็จ" });
      },
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// API สำหรับเปลี่ยนรหัสผ่าน Donor
exports.changePassword = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    const donorResult = await queryPromise(
      "SELECT password FROM Donor WHERE Donor_ID = ?",
      [donorId],
    );

    if (donorResult.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้บริจาคในระบบ" });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      donorResult[0].password,
    );

    if (!isMatch) {
      return res.status(401).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await queryPromise("UPDATE Donor SET password = ? WHERE Donor_ID = ?", [
      hashedPassword,
      donorId,
    ]);

    return res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};