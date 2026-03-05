const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { authenticateJWT } = require("../middleware/authMiddleware");
const { upload, cloudinary } = require("../config/cloudinary");

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

// POST ajouter un produit (admin uniquement)
router.post("/", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const { name, price, category, stock, description } = req.body;
    const image = req.file ? req.file.path : "";
    const product = await Product.create({
      name,
      price:       parseFloat(price),
      image,
      category:    category || "Général",
      stock:       parseInt(stock) || 0,
      description: description || ""
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur création produit: " + err.message });
  }
});

// PUT modifier un produit (admin uniquement)
router.put("/:id", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const { name, price, category, stock, description } = req.body;

    const updateData = {
      name,
      price:       parseFloat(price),
      category:    category || "Général",
      stock:       parseInt(stock) || 0,
      description: description || ""
    };

    if (req.file) {
      // Supprimer l'ancienne image sur Cloudinary SEULEMENT si c'est une URL Cloudinary
      try {
        const old = await Product.findById(req.params.id);
        if (old && old.image && old.image.includes("cloudinary.com")) {
          const parts = old.image.split("/");
          const publicId = "shopease-products/" + parts[parts.length - 1].split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        console.log("Impossible de supprimer ancienne image:", e.message);
        // On continue quand même
      }
      updateData.image = req.file.path;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: "Produit non trouvé" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Erreur modification produit: " + err.message });
  }
});

// DELETE supprimer un produit (admin uniquement)
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const product = await Product.findById(req.params.id);
    // Supprimer l'image sur Cloudinary SEULEMENT si c'est une URL Cloudinary
    if (product && product.image && product.image.includes("cloudinary.com")) {
      try {
        const parts = product.image.split("/");
        const publicId = "shopease-products/" + parts[parts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.log("Impossible de supprimer image Cloudinary:", e.message);
      }
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression produit: " + err.message });
  }
});

module.exports = router;