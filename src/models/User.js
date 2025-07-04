// backend/src/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    // Matrícula
    registration: {
      type: String,
      required: true,
      unique: true
    },

    // E-mail institucional
    institutionalEmail: {
      type: String,
      required: true,
      unique: true
    },

    // E-mail pessoal (para notificações)
    personalEmail: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ['student', 'professor', 'admin'],
      default: 'student'
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar senha no login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Cria e exporta o modelo como default
const User = mongoose.model('User', userSchema);
export default User;
