import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// ----------------------------------------------------
// POST /api/auth/login
// - aceita login por e-mail (padrão)
// - se quiser permitir username também, manda no body
// ----------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }

    let user = null;

    // Prioriza username se veio
    if (username) {
      user = await User.findOne({ username: username.toString().trim() });
    }

    // Se não achou por username (ou não veio), tenta por e-mail
    if (!user && email) {
      user = await User.findOne({ email: email.toString().trim().toLowerCase() });
    }

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Senha inválida." });
    }

    // (Opcional) bloquear login enquanto pendente
    // if (user.status === "pending") {
    //   return res.status(403).json({ error: "Conta pendente de aprovação." });
    // }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username,
        email: user.email || null,
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email || null,
        role: user.role,
        status: user.status || "active",
      },
    });
  } catch (err) {
    console.error("Erro no /login:", err);
    return res.status(500).json({ error: "Erro no login." });
  }
});

// ----------------------------------------------------
// POST /api/auth/register
// - aceita { name, matricula, password, email? }
// - cria usuário como 'user' e 'pending' (para aprovação)
// - impede duplicidade por email ou matrícula
// ----------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    let { name, matricula, password, email } = req.body || {};

    name = (name || "").trim();
    matricula = (matricula || "").trim();
    email = (email || "").trim().toLowerCase();
    password = password || "";

    if (!name || !matricula || !password) {
      return res.status(400).json({ error: "Preencha nome, matrícula e senha." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }

    // Checagens de duplicidade (email opcional)
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(409).json({ error: "E-mail já cadastrado." });
      }
    }

    const matriculaExists = await User.findOne({ matricula });
    if (matriculaExists) {
      return res.status(409).json({ error: "Matrícula já cadastrada." });
    }

    // username = matricula (pode ajustar conforme seu modelo)
    const username = matricula;

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      matricula,
      username,
      password: hash,
      role: "user",
      status: "pending", // pendente até o admin aprovar
    });

    return res.status(201).json({
      ok: true,
      message: "Cadastro enviado para aprovação.",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email || null,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Erro no /register:", err);
    return res.status(500).json({ error: "Erro ao registrar usuário." });
  }
});

export default router;
