import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    let user;
    // Se username for 'admin', busca pelo username
    if (username === "admin") {
      user = await User.findOne({ username: "admin" });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    // Gera o token com os campos corretos
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username, // Inclua username
        // email: user.email, // Só inclua se existir
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Erro no /login:", err);
    return res.status(500).json({ error: "Erro no login." });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  // lógica para registrar novo usuário
});

export default router;
