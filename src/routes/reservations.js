// backend/src/routes/reservas.js
import express from 'express'
import {
  getAll, createReserva, updateReserva, deleteReserva
} from '../controllers/reservaController.js'
import { protect, authorizeProfessor } from '../middleware/auth.js'

const router = express.Router()

router
  .route('/')
  .get(protect, getAll)
  .post(protect, authorizeProfessor, createReserva)

router
  .route('/:id')
  .put(protect, authorizeProfessor, updateReserva)
  .delete(protect, authorizeProfessor, deleteReserva)

export default router
