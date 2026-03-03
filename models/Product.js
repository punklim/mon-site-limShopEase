const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: "" },
  category: { type: String, default: "Général" },
  stock: { type: Number, default: 0 },
  description: { type: String, default: "" }
});

module.exports = mongoose.model("Product", productSchema);