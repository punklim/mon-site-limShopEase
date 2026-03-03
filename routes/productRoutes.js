const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { authenticateJWT } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Config Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Seules les images sont acceptées"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET tous les produits
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération produits" });
  }
});

// GET un produit par ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération produit" });
  }
});

// POST ajouter un produit avec image (admin uniquement)
router.post("/", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const { name, price, category, stock, description } = req.body;
    const image = req.file ? "/uploads/" + req.file.filename : "";
    const product = await Product.create({
      name,
      price: parseFloat(price),
      image,
      category: category || "Général",
      stock: parseInt(stock) || 0,
      description: description || ""
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur création produit: " + err.message });
  }
});

// PUT modifier un produit avec image (admin uniquement)
router.put("/:id", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const { name, price, category, stock, description } = req.body;
    const updateData = {
      name,
      price: parseFloat(price),
      category: category || "Général",
      stock: parseInt(stock) || 0,
      description: description || ""
    };
    if (req.file) {
      updateData.image = "/uploads/" + req.file.filename;
      const old = await Product.findById(req.params.id);
      if (old && old.image) {
        const oldPath = path.join(__dirname, "../public", old.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur modification produit" });
  }
});

// DELETE supprimer un produit (admin uniquement)
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const product = await Product.findById(req.params.id);
    if (product && product.image) {
      const imgPath = path.join(__dirname, "../public", product.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression produit" });
  }
});

module.exports = router;