// BACKEND/src/models/User.js
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Matrícula obrigatória
    // (não use unique aqui; o índice único é criado abaixo com filtro parcial)
    matricula: {
      type: String,
      required: true,
      trim: true,
      set: (v) => {
        const s = (v ?? "").toString().trim();
        return s || undefined; // evita "", null => não indexa no parcial
      },
    },

    // Username único — padrão: a própria matrícula
    username: {
      type: String,
      required: true,
      trim: true,
      default: function () {
        return this.matricula;
      },
      set: (v) => {
        const s = (v ?? "").toString().trim();
        return s || undefined;
      },
    },

    // Email opcional (único se existir)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator(v) {
          if (!v) return true;
          return emailRegex.test(v);
        },
        message: "Email inválido.",
      },
      set: (v) => {
        const s = (v ?? "").toString().trim().toLowerCase();
        return s || undefined; // não indexa vazio
      },
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "professor"],
      default: "professor",
      index: true,
    },

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

/**
 * ÍNDICES
 * - matricula: único apenas quando existe e é string (evita duplicidade de null/“”)
 * - username: único (é obrigatório)
 * - email: único apenas quando existe e é string
 */
UserSchema.index(
  { matricula: 1 },
  {
    name: "matricula_unique_partial",
    unique: true,
    partialFilterExpression: { matricula: { $exists: true, $type: "string" } },
    background: true,
  }
);

UserSchema.index(
  { username: 1 },
  {
    name: "username_unique",
    unique: true,
    background: true,
  }
);

UserSchema.index(
  { email: 1 },
  {
    name: "email_unique_partial",
    unique: true,
    partialFilterExpression: { email: { $exists: true, $type: "string" } },
    background: true,
  }
);

// Normalizações finais
UserSchema.pre("save", function (next) {
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.username) this.username = this.username.trim();
  if (this.matricula) this.matricula = this.matricula.trim();
  next();
});

// Esconde password no JSON
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

export default mongoose.model("User", UserSchema);
