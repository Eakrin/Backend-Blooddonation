const db = require("../db");

const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

exports.getPosts = async (req, res) => {
  try {
    const results = await queryPromise(
      "SELECT * FROM Post ORDER BY Post_ID DESC",
      []
    );
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createPost = async (req, res) => {
  const { Toppic, Text, Location_ID, Start_time, End_time } = req.body;
  if (!Toppic || !Location_ID || !Start_time || !End_time) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    await queryPromise(
      "INSERT INTO Post (Toppic, Text, Location_ID, Start_time, End_time) VALUES (?, ?, ?, ?, ?)",
      [Toppic, Text || "", Location_ID, Start_time, End_time]
    );
    return res.status(201).json({ message: "สร้างประกาศสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { Toppic, Text, Location_ID, Start_time, End_time } = req.body;

  try {
    await queryPromise(
      "UPDATE Post SET Toppic=?, Text=?, Location_ID=?, Start_time=?, End_time=? WHERE Post_ID=?",
      [Toppic, Text || "", Location_ID, Start_time, End_time, id]
    );
    return res.json({ message: "อัปเดตสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  const { id } = req.params;
  try {
    await queryPromise("DELETE FROM Post WHERE Post_ID = ?", [id]);
    return res.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};