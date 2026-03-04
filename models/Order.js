const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ✅ Produits stockés comme objets (compatibles Stripe + ancien système)
  products: [
    {
      product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name:     { type: String },
      price:    { type: Number },
      quantity: { type: Number, default: 1 },
      image:    { type: String }
    }
  ],

  // ✅ totalAmount pour Stripe, total pour l'ancien système
  totalAmount:   { type: Number, default: 0 },
  total:         { type: Number, default: 0 },

  // ✅ Statut paiement Stripe : pending | paid | failed
  status: { type: String, default: "pending" },

  // ✅ Statut livraison géré par l'admin
  deliveryStatus: {
    type: String,
    default: "en attente",
    enum: ["en attente", "confirmée", "expédiée", "livrée", "annulée"]
  },

  // ✅ Infos Stripe
  paymentMethod: { type: String, default: "card" },
  paymentId:     { type: String }, // ID Stripe payment_intent

  // ✅ Informations de livraison
  delivery: {
    name:       { type: String },
    email:      { type: String },
    phone:      { type: String },
    address:    { type: String },
    postalCode: { type: String },
    city:       { type: String },
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);