require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.log(err));

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.listen(5000, () => console.log("Serveur lancé sur http://localhost:5000"));