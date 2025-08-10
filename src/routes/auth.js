// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function isProfessorEmail(email = "") {
  return String(email).toLowerCase().endsWith("@professor.estacio.br");
}

// LOGIN: bloqueia pendente
router.post("/login", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!password || (!email && !username)) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }

    let user = null;
    if (username) user = await User.findOne({ username: String(username).trim() });
    if (!user && email) user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user) return res.status(401).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Senha inválida." });

    // 🔒 Bloqueia enquanto pendente
    if (user.status !== "active") {
      return res.status(403).json({ error: "Sua conta está pendente. Aguarde até 24h para aprovação." });
    }

    // Garante role “professor” para e-mail professor.estacio.br (caso tenha sido ajustado depois)
    if (user.email && isProfessorEmail(user.email) && user.role !== "admin" && user.role !== "professor") {
      user.role = "professor";
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username, email: user.email || null },
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
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Erro no /login:", err);
    return res.status(500).json({ error: "Erro no login." });
  }
});

// REGISTER: cria pendente; define role=professor para e-mails @professor.estacio.br
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

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(409).json({ error: "E-mail já cadastrado." });
    }

    const matriculaExists = await User.findOne({ matricula });
    if (matriculaExists) return res.status(409).json({ error: "Matrícula já cadastrada." });

    const username = matricula;
    const hash = await bcrypt.hash(password, 10);

    const role = isProfessorEmail(email) ? "professor" : "professor"; // default fica professor
    const user = await User.create({
      name,
      email: email || undefined,
      matricula,
      username,
      password: hash,
      role,                 // “professor” (ou mude aqui se quiser tratar aluno depois)
      status: "pending",    // pendente até o admin aprovar
    });

    return res.status(201).json({
      ok: true,
      message: "Solicitação enviada. Aguarde até 24h para aprovação do administrador.",
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

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

export default router;
