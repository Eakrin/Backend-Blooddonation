const db = require("../db");

// API สำหรับแก้ไขโปรไฟล์ Donor
exports.updateProfile = (req, res) => {
  try {
    const donorId = req.user.id; // ดึง id จาก token ที่ผ่าน authMiddleware
    const {
      name,
      lastname,
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

    const parsedWeight = weight ? parseFloat(weight) : null;
    const parsedHeight = height ? parseFloat(height) : null;
    const formattedBirthday = birthday || null;

    const sql = `
            UPDATE Donor 
            SET name = ?, lastname = ?, phone = ?, weight = ?, height = ?, gender = ?, blood_type = ?, birthday = ?
            WHERE Donor_ID = ?
        `;

    db.query(
      sql,
      [
        name,
        lastname,
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
