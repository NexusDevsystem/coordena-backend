// BACKEND/src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Admin loga por username. Outros podem até não ter username.
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // permite vários docs sem username
      index: true
    },

    // Email obrigatório para não-admin
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // permite doc sem email (caso admin)
      validate: {
        validator(v) {
          if (!v) return true; // ok se vazio (p/ admin)
          // validação simples de email
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email inválido.'
      },
      required: function requiredEmail() {
        return this.role !== 'admin';
      }
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true
    },

    approved: { type: Boolean, default: false }
  },
  { timestamps: true, collection: 'users' }
);

// Índices auxiliares
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', UserSchema);
export default User;
