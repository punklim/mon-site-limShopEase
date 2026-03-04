const express  = require("express");
const router   = express.Router();
const Order    = require("../models/Order");
const Product  = require("../models/Product");
const { authenticateJWT } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────
// POST / — Créer une commande + diminuer le stock
// (utilisé pour les commandes sans Stripe, conservé tel quel)
// ─────────────────────────────────────────────────────────────
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { products, delivery } = req.body;

    const orderProducts = await Product.find({ _id: { $in: products } });

    for (const product of orderProducts) {
      if (product.stock !== undefined && product.stock <= 0) {
        return res.status(400).json({
          message: `Le produit "${product.name}" est en rupture de stock`
        });
      }
    }

    const total = orderProducts.reduce((sum, p) => sum + p.price, 0);

    const order = await Order.create({
      user:     userId,
      products: orderProducts.map(p => p._id),
      total,
      status:   "confirmée",
      delivery
    });

    for (const product of orderProducts) {
      if (product.stock !== undefined && product.stock > 0) {
        await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 } });
      }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création de la commande" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /admin/all — Toutes les commandes pour le dashboard admin
// ⚠️ DOIT être déclaré AVANT GET /:id pour éviter les conflits
// ─────────────────────────────────────────────────────────────
router.get("/admin/all", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });

    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name image category")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération commandes admin" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET / — Commandes (admin = toutes, user = les siennes)
// ─────────────────────────────────────────────────────────────
router.get("/", authenticateJWT, async (req, res) => {
  try {
    let orders;
    if (req.user.isAdmin) {
      orders = await Order.find()
        .populate("user", "name email")
        .populate("products.product", "name image price")
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ user: req.user.id })
        .populate("products.product", "name image price")
        .sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des commandes" });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /:id/status — Mettre à jour le statut de livraison
// Utilisé par le dashboard admin (select dans le tableau)
// ─────────────────────────────────────────────────────────────
router.patch("/:id/status", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });

    const { status, deliveryStatus } = req.body;
    const updateFields = {};
    if (status)         updateFields.status         = status;
    if (deliveryStatus) updateFields.deliveryStatus = deliveryStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour statut" });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /:id/status — Ancienne route (conservée pour compatibilité)
// Gère aussi la remise en stock si annulée
// ─────────────────────────────────────────────────────────────
router.put("/:id/status", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("products.product").populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    // Si commande annulée → remettre le stock
    if (status === "annulée") {
      for (const item of order.products) {
        const productId = item.product?._id || item.product;
        if (productId) {
          await Product.findByIdAndUpdate(productId, { $inc: { stock: 1 } });
        }
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour statut" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /:id — Supprimer une commande (admin uniquement)
// ─────────────────────────────────────────────────────────────
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Commande supprimée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression commande" });
  }
});

module.exports = router;