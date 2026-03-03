const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  total: { type: Number, default: 0 },
  status: { type: String, default: "en attente" },

  // Informations de livraison
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