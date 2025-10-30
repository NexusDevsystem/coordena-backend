// BACKEND/src/index.js (versão final ajustada)
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// → Importe o connectDB
import connectDB from "./config/db.js";

// → NOVO: importe o router de Push Subscriptions
import pushSubscriptionsRouter from "./routes/pushSubscriptions.js";
import coordinatorRoutes from "./routes/coordinators.js";

import Reservation from "./models/reservation.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/adminRoutes.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import authorize from "./middleware/authorize.js"; // middleware de roles
import User from "./models/User.js"; // Modelo de usuário (Mongoose)
import seedCoordinators from "./seeds/coordinatorsSeed.js"; // Importar seed de coordenadores

dotenv.config();

const app = express();
app.options("*", cors());
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim();

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// ----------------------------------------
// Função seedAdmin(): garante admin com email e username corretos
// ----------------------------------------
/**
 * Garante que exista um usuário admin consistente.
 * - Usa upsert atômico (não duplica).
 * - Não sobrescreve a senha de quem já existe.
 * - Normaliza name/email/username/matricula/role/status.
 */
export default async function seedAdmin() {
  // Defaults (podem ser sobrescritos por .env)
  const NAME = (process.env.ADMIN_NAME || "Administrador Coordena").trim();
  const EMAIL = (process.env.ADMIN_EMAIL || "admin@admin.estacio.br")
    .trim()
    .toLowerCase();
  const USERNAME = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const MATRICULA = (process.env.ADMIN_MATRICULA || "ADMIN-0001").trim(); // não pode ser vazio
  const RAW_PASS = (process.env.ADMIN_PASSWORD || "admin").toString(); // troque em prod!

  // Helpers de segurança
  const isEmpty = (v) => !v || !String(v).trim();
  if (isEmpty(EMAIL)) throw new Error("ADMIN_EMAIL inválido/vazio.");
  if (isEmpty(USERNAME)) throw new Error("ADMIN_USERNAME inválido/vazio.");
  if (isEmpty(MATRICULA)) throw new Error("ADMIN_MATRICULA inválido/vazio.");
  if (isEmpty(RAW_PASS)) throw new Error("ADMIN_PASSWORD inválido/vazio.");

  try {
    // Hash só se precisarmos inserir
    const hashed = await bcrypt.hash(RAW_PASS, 10);

    // Filtro: pega um admin existente OU um usuário com os identificadores do admin
    const filter = {
      $or: [
        { role: "admin" },
        { email: EMAIL },
        { username: USERNAME },
        { matricula: MATRICULA },
      ],
    };

    // Atualização:
    // - $set normaliza campos essenciais
    // - $setOnInsert define password SOMENTE quando for inserção (não troca senha de existentes)
    const update = {
      $set: {
        name: NAME,
        email: EMAIL,
        username: USERNAME,
        matricula: MATRICULA,
        role: "admin",
        status: "active",
      },
      $setOnInsert: {
        password: hashed,
      },
    };

    // Opções: upsert atômico, retorna o doc final
    const options = { upsert: true, new: true };

    const admin = await User.findOneAndUpdate(filter, update, options).select(
      "_id email username role status"
    );

    if (admin) {
      // Se foi um upsert novo, o log acima já é suficiente; se foi só normalização, também.
      console.log("✅ Admin garantido/normalizado:", {
        id: admin._id.toString(),
        email: admin.email,
        username: admin.username,
        role: admin.role,
        status: admin.status,
      });
    } else {
      // Situação improvável (findOneAndUpdate sempre retorna doc com new:true)
      console.log("ℹ️  Nenhuma mudança no admin.");
    }
  } catch (err) {
    // Trata colisões de índice para sinalizar claramente o que houve
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "campo único";
      console.error(
        `❌ Conflito de unicidade ao criar/normalizar admin (${field}). Verifique duplicatas.`
      );
    }
    console.error("❌ Erro ao tentar criar/normalizar o admin:", err);
  }
}

// ----------------------------------------
// CORS dinâmico
// - aceita FRONTEND_URLS (separadas por vírgula) ou localhost sem origem
// ----------------------------------------
const FRONTEND_URLS = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((u) => u.trim())
  .filter((u) => u);

app.use(
  cors({
    origin: (origin, callback) => {
      // sem origin (curl, postman, etc.) OU localhost → liberado
      if (!origin || origin.includes("localhost")) {
        console.log(
          "✔️  CORS allow (no-origin or localhost):",
          origin || "no-origin"
        );
        return callback(null, true);
      }
      // origem está na lista?
      if (FRONTEND_URLS.includes(origin)) {
        console.log("✔️  CORS allow:", origin);
        return callback(null, true);
      }
      // bloqueia
      console.warn("⛔  CORS blocked:", origin);
      callback(new Error(`Bloqueado por CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.options("*", cors()); // Pre-flight
app.use(express.json());

// ----------------------------------------
// Rotas de autenticação (login, register, etc.)
// ----------------------------------------
app.use("/api/auth", authRoutes);



// ----------------------------------------
// Rotas do painel ADM (ex.: listar pendentes, aprovar, rejeitar) e Push
// ----------------------------------------
app.use("/api/admin", adminRoutes);
app.use("/api/push", pushSubscriptionsRouter);
app.use("/api/coordinators", coordinatorRoutes);

// ----------------------------------------
// CRUD de RESERVATIONS (agora unificado no mesmo model “Reservation”)
// ----------------------------------------

// GET → retorna todas as reservas aprovadas
app.get("/api/reservations", authenticateToken, async (_req, res) => {
  try {
    const approved = await Reservation.find({ status: "approved" }) // só “approved”
      .sort({ date: 1, start: 1 });
    return res.json(approved);
  } catch (err) {
    console.error("Erro ao buscar reservas aprovadas:", err);
    return res.status(500).json({ error: "Erro ao buscar reservas" });
  }
});

// → NOVA ROTA: GET → retorna todos os agendamentos (independentemente de status) do usuário logado
app.get("/api/reservations/me", authenticateToken, async (req, res) => {
  try {
    // Filtra pelo campo “responsible” igual ao nome armazenado em req.user.name
    const myReservations = await Reservation.find({
      responsible: req.user.name,
    }).sort({ date: 1, start: 1 });
    return res.json(myReservations);
  } catch (err) {
    console.error("Erro ao buscar meus agendamentos:", err);
    return res.status(500).json({ error: "Erro ao buscar meus agendamentos" });
  }
});

// POST → cria uma nova reserva (sempre com status: 'pending')
app.post(
  "/api/reservations",
  authenticateToken,
  authorize("professor", "admin"),
  async (req, res) => {
    try {
      const {
        date,
        start,
        end,
        resource,
        sala = "",
        type,
        // remover “responsible” vindo do body
        department,
        description = "",
        time,
        title,
      } = req.body;

      const newReservation = new Reservation({
        user: req.user.id, // ← ID do usuário do token
        date,
        start,
        end,
        resource,
        sala,
        type,
        responsible: req.user.name, // ← sempre “responsible” do token
        department,
        status: "pending", // ← sempre “pending”
        description,
        time,
        title,
      });

      const saved = await newReservation.save();
      return res.status(201).json(saved);
    } catch (err) {
      console.error("Erro ao criar reserva:", err);
      return res
        .status(400)
        .json({ error: "Erro ao criar reserva", details: err.message });
    }
  }
);

// PATCH → atualiza própria reserva (qualquer usuário autenticado, apenas suas reservas)
app.patch(
  "/api/reservations/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      
      if (!reservation) {
        return res.status(404).json({ error: "Reserva não encontrada" });
      }

      // Verifica se é o dono da reserva ou admin/professor
      const isOwner = reservation.responsible === req.user.name;
      const isAdminOrProfessor = ['admin', 'professor'].includes(req.user.role);

      if (!isOwner && !isAdminOrProfessor) {
        return res.status(403).json({ 
          error: "Você só pode atualizar suas próprias reservas" 
        });
      }

      // Usuários comuns não podem mudar o status
      if (!isAdminOrProfessor && req.body.status) {
        delete req.body.status;
      }

      const updated = await Reservation.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      
      return res.json(updated);
    } catch (err) {
      console.error("Erro ao atualizar reserva:", err);
      return res
        .status(400)
        .json({ error: "Erro ao atualizar reserva", details: err.message });
    }
  }
);

// PUT → atualiza (apenas professor/admin pode mudar qualquer campo, inclusive status)
app.put(
  "/api/reservations/:id",
  authenticateToken,
  authorize("professor", "admin"),
  async (req, res) => {
    try {
      const updated = await Reservation.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated)
        return res.status(404).json({ error: "Reserva não encontrada" });
      return res.json(updated);
    } catch (err) {
      console.error("Erro ao atualizar reserva:", err);
      return res
        .status(400)
        .json({ error: "Erro ao atualizar reserva", details: err.message });
    }
  }
);

// DELETE → exclui reserva (qualquer usuário pode deletar suas próprias reservas)
app.delete(
  "/api/reservations/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      
      if (!reservation) {
        return res.status(404).json({ error: "Reserva não encontrada" });
      }

      // Verifica se é o dono da reserva ou admin/professor
      const isOwner = reservation.responsible === req.user.name;
      const isAdminOrProfessor = ['admin', 'professor'].includes(req.user.role);

      if (!isOwner && !isAdminOrProfessor) {
        return res.status(403).json({ 
          error: "Você só pode deletar suas próprias reservas" 
        });
      }

      const deleted = await Reservation.findByIdAndDelete(req.params.id);
      return res.json({ message: "Reserva removida com sucesso" });
    } catch (err) {
      console.error("Erro ao deletar reserva:", err);
      return res
        .status(500)
        .json({ error: "Erro ao deletar reserva", details: err.message });
    }
  }
);

// ----------------------------------------
// Horários fixos (rota protegida opcionalmente)
// ----------------------------------------
const fixedSchedules = [
  {
    lab: "Lab B401",
    dayOfWeek: 1,
    startTime: "08:20",
    endTime: "11:50",
    turno: "Manhã",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "17:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 1,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 2,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 2,
    startTime: "13:00",
    endTime: "17:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 3,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "17:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 3,
    startTime: "19:00",
    endTime: "22:30",
    turno: "Noite",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 4,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 5,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B401",
    dayOfWeek: 5,
    startTime: "19:00",
    endTime: "22:30",
    turno: "Noite",
  },

  {
    lab: "Lab B402",
    dayOfWeek: 1,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 1,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 2,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 3,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 4,
    startTime: "08:20",
    endTime: "10:10",
    turno: "Manhã",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 4,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 4,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 5,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B402",
    dayOfWeek: 5,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },

  {
    lab: "Lab B403",
    dayOfWeek: 2,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B403",
    dayOfWeek: 2,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B403",
    dayOfWeek: 4,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },

  {
    lab: "Lab B404",
    dayOfWeek: 1,
    startTime: "08:20",
    endTime: "11:00",
    turno: "Manhã",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 1,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 2,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 3,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 4,
    startTime: "08:20",
    endTime: "10:10",
    turno: "Manhã",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 4,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 4,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 5,
    startTime: "13:00",
    endTime: "18:00",
    turno: "Tarde",
  },
  {
    lab: "Lab B404",
    dayOfWeek: 5,
    startTime: "19:00",
    endTime: "21:40",
    turno: "Noite",
  },

  {
    lab: "Lab B405",
    dayOfWeek: 1,
    startTime: "19:00",
    endTime: "22:30",
    turno: "Noite",
  },
  {
    lab: "Lab B405",
    dayOfWeek: 5,
    startTime: "19:00",
    endTime: "22:30",
    turno: "Noite",
  },
];

app.get("/api/fixedSchedules", authenticateToken, async (_req, res) => {
  return res.json(fixedSchedules);
});

// ----------------------------------------
// Healthcheck (rota raiz)
// ----------------------------------------
app.get("/", (_req, res) => {
  res.send(`🟢 API Coordena+ rodando na porta ${PORT}`);
});

// ----------------------------------------
// Bootstrap: conecta no Mongo, sincroniza índices, faz seed e inicia o servidor
// ----------------------------------------
(async () => {
  try {
    // Usa o connectDB centralizado
    await connectDB();

    // Sincroniza índices (ajuda quando alterou unique/sparse no schema)
    await User.syncIndexes().catch((e) => {
      console.warn(
        "⚠️  Falha ao sincronizar índices de User (seguindo):",
        e?.message
      );
    });

    // Garante admin
    await seedAdmin();

    // Inicializa coordenadores
    try {
      await seedCoordinators();
    } catch (error) {
      console.warn("⚠️  Aviso: Não foi possível inicializar os coordenadores:", error.message);
    }

    // Sobe o servidor só depois da conexão + seed
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ouvindo na porta ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Falha no bootstrap do servidor:", err);
    process.exit(1);
  }
})();

// Trate rejeições não tratadas para logar e não “morrer silenciosamente”
process.on("unhandledRejection", (reason) => {
  console.error("🚨 UnhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("🚨 UncaughtException:", err);
});
