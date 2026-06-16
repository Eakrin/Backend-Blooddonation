const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const healthRoutes = require("./routes/healthRoutes");
const updateprofileRoutes = require("./routes/updateprofileRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/update-profile", updateprofileRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
