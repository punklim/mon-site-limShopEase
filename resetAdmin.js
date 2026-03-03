require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connecté");

  await User.deleteMany({ email: "admin@admin.com" });
  console.log("🗑 Ancien admin supprimé");

  const hashed = await bcrypt.hash("admin123", 10);
  const admin = await User.create({
    name: "Admin",
    email: "admin@admin.com",
    password: hashed,
    isAdmin: true
  });

  const check = await bcrypt.compare("admin123", admin.password);
  console.log("👤 Admin créé :", admin.email);
  console.log("🔑 Mot de passe : admin123");
  console.log("✅ Vérification :", check ? "OK" : "ERREUR");
  console.log("-----------------------------------");
  console.log("👉 Redémarrez le serveur : node server.js");
  console.log("👉 Connectez-vous sur   : localhost:5000/admin.html");

  process.exit();
}

resetAdmin();