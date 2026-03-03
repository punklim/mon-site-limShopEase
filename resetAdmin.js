import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connecté à MongoDB Atlas");

    // Schéma et modèle pour les utilisateurs/admin
    const userSchema = new mongoose.Schema({ username: String, password: String });
    const User = mongoose.model("User", userSchema);

    // Créer l'admin
    await User.create({ username: "admin", password: "1234" });
    console.log("Admin créé, base et collection générées !");
    process.exit(0);
  })
  .catch(err => console.error(err));