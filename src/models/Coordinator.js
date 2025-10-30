// BACKEND/src/models/Coordinator.js
import mongoose from "mongoose";

const coordinatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    course: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "absent"
    },
    photo: {
      type: String, // URL para a foto do coordenador
      default: null
    },
    officeHours: [{
      dayOfWeek: {
        type: String, // "Segunda-feira", "Terça-feira", etc.
        required: true
      },
      startTime: {
        type: String, // "HH:MM"
        required: true
      },
      endTime: {
        type: String, // "HH:MM"
        required: true
      }
    }],
    location: {
      type: String, // Localização física do coordenador
      default: null
    }
  },
  {
    timestamps: true,
    collection: "coordinators",
    versionKey: false,
  }
);

// Índices
coordinatorSchema.index({ email: 1 }, { name: "email_unique", unique: true });
coordinatorSchema.index({ course: 1 }, { name: "course_index" });

export default mongoose.model("Coordinator", coordinatorSchema);