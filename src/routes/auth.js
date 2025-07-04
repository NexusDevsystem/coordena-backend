// backend/src/routes/auth.js

import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/register → delega ao controller
router.post('/register', registerUser);

// POST /api/auth/login → delega ao controller
router.post('/login', loginUser);

export default router;
