const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { authenticateJWT } = require("../middleware/authMiddleware");

// POST créer une commande + diminuer le stock
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { products, delivery } = req.body; // ← ajout de delivery

    // Récupérer les produits
    const orderProducts = await Product.find({ _id: { $in: products } });

    // Vérifier le stock pour chaque produit
    for (const product of orderProducts) {
      if (product.stock !== undefined && product.stock <= 0) {
        return res.status(400).json({
          message: `Le produit "${product.name}" est en rupture de stock`
        });
      }
    }

    // Calculer le total
    const total = orderProducts.reduce((sum, p) => sum + p.price, 0);

    // Créer la commande avec les infos de livraison
    const order = await Order.create({
      user: userId,
      products: orderProducts.map(p => p._id),
      total,
      status: "confirmée",
      delivery // ← sauvegarde des infos de livraison
    });

    // Diminuer le stock de chaque produit commandé
    for (const product of orderProducts) {
      if (product.stock !== undefined && product.stock > 0) {
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -1 }
        });
      }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création de la commande" });
  }
});

// GET commandes (admin = toutes, user = les siennes)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    let orders;
    if (req.user.isAdmin) {
      orders = await Order.find()
        .populate("products")
        .populate("user", "name email")
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ user: req.user.id })
        .populate("products")
        .sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des commandes" });
  }
});

// PUT mettre à jour le statut (admin uniquement)
router.put("/:id/status", authenticateJWT, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Accès refusé" });
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("products").populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    // Si commande annulée → remettre le stock
    if (status === "annulée") {
      for (const product of order.products) {
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: 1 }
        });
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour statut" });
  }
});

// DELETE supprimer une commande (admin uniquement)
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