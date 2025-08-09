// BACKEND/src/models/User.js
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Matrícula obrigatória (índice único é criado abaixo com filtro parcial)
    matricula: {
      type: String,
      required: true,
      trim: true,
      set: (v) => {
        const s = (v ?? "").toString().trim();
        return s || undefined; // evita "", null => não indexa no parcial
      },
    },

    // Username único — garantido por hook (não usar default que acessa this)
    username: {
      type: String,
      required: true,
      trim: true,
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
 * Índices
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

// Hook para garantir username a partir da matrícula quando não for informado
UserSchema.pre("validate", function (next) {
  if (!this.username && this.matricula) {
    this.username = this.matricula;
  }
  next();
});

// Normalizações finais antes de salvar
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
