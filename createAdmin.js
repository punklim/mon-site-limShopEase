require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connecté");
  await User.deleteOne({ email: "admin@admin.com" });
  const hashed = await bcrypt.hash("admin123", 10);
  const admin = await User.create({
    name: "Admin",
    email: "admin@admin.com",
    password: hashed,
    isAdmin: true
  });
  const check = await bcrypt.compare("admin123", admin.password);
  console.log("✅ Admin recréé !");
  console.log("🔍 Vérification :", check ? "✅ OK" : "❌ ERREUR");
  process.exit();
}

resetAdmin();