const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const { authenticateJWT } = require("../middleware/authMiddleware");

// GET tous les utilisateurs (admin uniquement)
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET profil de l'utilisateur connecté
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    const orders = await Order.find({ user: req.user.id }).populate("products").sort({ createdAt: -1 });
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
    res.json({ user, stats: { totalOrders: orders.length, totalSpent, lastOrder: orders[0] || null } });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT modifier nom et email
router.put("/me", authenticateJWT, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true }).select("-password");
    res.json({ message: "Profil mis à jour !", user });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour profil" });
  }
});

// PUT changer le mot de passe
router.put("/me/password", authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Mot de passe modifié avec succès !" });
  } catch (err) {
    res.status(500).json({ message: "Erreur changement mot de passe" });
  }
});

module.exports = router;