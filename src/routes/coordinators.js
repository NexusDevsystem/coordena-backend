// BACKEND/src/routes/coordinators.js
import express from "express";
import Coordinator from "../models/Coordinator.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();

// GET /api/coordinators - Obter todos os coordenadores
router.get("/", authenticateToken, async (req, res) => {
  try {
    const coordinators = await Coordinator.find({}).sort({ course: 1, name: 1 });
    return res.json(coordinators);
  } catch (err) {
    console.error("Erro ao buscar coordenadores:", err);
    return res.status(500).json({ error: "Erro ao buscar coordenadores" });
  }
});

// GET /api/coordinators/:id - Obter coordenador por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const coordinator = await Coordinator.findById(req.params.id);
    if (!coordinator) {
      return res.status(404).json({ error: "Coordenador não encontrado" });
    }
    return res.json(coordinator);
  } catch (err) {
    console.error("Erro ao buscar coordenador:", err);
    return res.status(500).json({ error: "Erro ao buscar coordenador" });
  }
});

// POST /api/coordinators - Criar novo coordenador (apenas admin)
router.post("/", authenticateToken, authorize("admin"), async (req, res) => {
  try {
    const { name, email, course, status, photo, officeHours, location } = req.body;

    // Verificar se já existe um coordenador com este email
    const existingCoordinator = await Coordinator.findOne({ email });
    if (existingCoordinator) {
      return res.status(400).json({ error: "Já existe um coordenador com este email" });
    }

    const newCoordinator = new Coordinator({
      name,
      email,
      course,
      status: status || "absent",
      photo,
      officeHours: officeHours || [],
      location
    });

    const savedCoordinator = await newCoordinator.save();
    return res.status(201).json(savedCoordinator);
  } catch (err) {
    console.error("Erro ao criar coordenador:", err);
    return res.status(500).json({ error: "Erro ao criar coordenador", details: err.message });
  }
});

// PATCH /api/coordinators/:id - Atualizar coordenador (apenas admin)
router.patch("/:id", authenticateToken, authorize("admin"), async (req, res) => {
  try {
    const { name, email, course, status, photo, officeHours, location } = req.body;

    const updatedCoordinator = await Coordinator.findByIdAndUpdate(
      req.params.id,
      { name, email, course, status, photo, officeHours, location },
      { new: true }
    );

    if (!updatedCoordinator) {
      return res.status(404).json({ error: "Coordenador não encontrado" });
    }

    return res.json(updatedCoordinator);
  } catch (err) {
    console.error("Erro ao atualizar coordenador:", err);
    return res.status(500).json({ error: "Erro ao atualizar coordenador", details: err.message });
  }
});

// DELETE /api/coordinators/:id - Remover coordenador (apenas admin)
router.delete("/:id", authenticateToken, authorize("admin"), async (req, res) => {
  try {
    const deletedCoordinator = await Coordinator.findByIdAndDelete(req.params.id);
    if (!deletedCoordinator) {
      return res.status(404).json({ error: "Coordenador não encontrado" });
    }
    return res.json({ message: "Coordenador removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover coordenador:", err);
    return res.status(500).json({ error: "Erro ao remover coordenador" });
  }
});

// PATCH /api/coordinators/:id/status - Atualizar status do coordenador
router.patch("/:id/status", authenticateToken, authorize("admin", "professor"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["present", "absent"].includes(status)) {
      return res.status(400).json({ error: "Status inválido. Use 'present' ou 'absent'" });
    }

    const updatedCoordinator = await Coordinator.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedCoordinator) {
      return res.status(404).json({ error: "Coordenador não encontrado" });
    }

    return res.json(updatedCoordinator);
  } catch (err) {
    console.error("Erro ao atualizar status do coordenador:", err);
    return res.status(500).json({ error: "Erro ao atualizar status do coordenador" });
  }
});

export default router;