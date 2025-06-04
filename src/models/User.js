// backend/src/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
      select: false // não retorna por padrão
    },
    role: {
      type: String,
      enum: ['student', 'professor', 'admin'],
      default: 'student'
    },
    /**
     * Em vez de "approved: Boolean", usamos agora um campo ENUM:
     * status ∈ { 'pending', 'approved', 'rejected' }
     * O default é "pending", pois todo cadastro novo deve aguardar aprovação.
     */
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    // Para que o Mongoose adicione timestamps automáticos:
    // createdAt e updatedAt serão gerenciados automaticamente.
    timestamps: true
  }
);

// Antes de salvar (pre-save), se a senha foi alterada, faz o hash
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método auxiliar para comparar senha em login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
