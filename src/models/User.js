// BACKEND/src/models/User.js
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Matrícula obrigatória e única
    matricula: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    // Username único — por padrão usa a própria matrícula
    username: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      required: true,
      default: function defaultUsername() {
        return this.matricula;
      },
    },

    // Email opcional (sparse + unique). Validado apenas se vier.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      validate: {
        validator(v) {
          if (!v) return true;
          return emailRegex.test(v);
        },
        message: "Email inválido.",
      },
    },

    password: { type: String, required: true },

    // Papéis do sistema
    role: {
      type: String,
      enum: ["admin", "professor"],
      default: "professor",
      index: true,
    },

    // Estado de aprovação/login
    status: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
    versionKey: false,
  }
);

// Índices (reforço)
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ matricula: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

// Normalizações simples antes de salvar
UserSchema.pre("save", function normalize(next) {
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.username) this.username = this.username.trim();
  if (this.matricula) this.matricula = this.matricula.trim();
  next();
});

// Esconde password no JSON retornado pelo Express
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model("User", UserSchema);
export default User;
