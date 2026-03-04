require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB connecté");
    console.log("📌 Base utilisée :", mongoose.connection.db.databaseName);

    console.log("🗑 Suppression de tous les users...");
    await User.deleteMany({});

    const hashed = await bcrypt.hash("admin123", 10);

    const admin = await User.create({
      name: "Admin",
      email: "admin@admin.com",
      password: hashed,
      isAdmin: true
    });

    console.log("👤 Admin créé :", admin.email);

    const users = await User.find({});
    console.log("📊 Users actuels :", users);

    process.exit();
  } catch (err) {
    console.error("❌ ERREUR :", err);
    process.exit(1);
  }
}

resetAdmin();