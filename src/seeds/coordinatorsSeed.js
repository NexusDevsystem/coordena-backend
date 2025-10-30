// BACKEND/src/seeds/coordinatorsSeed.js
import Coordinator from "../models/Coordinator.js";

const seedCoordinators = async () => {
  try {
  try {
    // Verificar se já existem coordenadores cadastrados
    const existingCoordinators = await Coordinator.countDocuments();
    if (existingCoordinators > 0) {
      console.log("✓ Coordenadores já existem, pulando seed");
      return;
    }

    const coordinators = [
      {
        name: "Dr. Carlos Silva",
        email: "carlos.silva@coordenacao.estacio.br",
        course: "Engenharia de Computação",
        status: "present",
        photo: "/assets/img/coordenadores/foto1.jpg",
        officeHours: [
          { dayOfWeek: "Segunda-feira", startTime: "09:00", endTime: "12:00" },
          { dayOfWeek: "Quarta-feira", startTime: "14:00", endTime: "17:00" },
          { dayOfWeek: "Sexta-feira", startTime: "10:00", endTime: "13:00" }
        ],
        location: "Sala 301 - Bloco A"
      },
      {
        name: "Dra. Maria Oliveira",
        email: "maria.oliveira@coordenacao.estacio.br",
        course: "Ciência da Computação",
        status: "absent",
        photo: "/assets/img/coordenadores/foto2.jpg",
        officeHours: [
          { dayOfWeek: "Terça-feira", startTime: "08:00", endTime: "11:00" },
          { dayOfWeek: "Quinta-feira", startTime: "13:00", endTime: "16:00" }
        ],
        location: "Sala 205 - Bloco B"
      },
      {
        name: "Dr. Roberto Santos",
        email: "roberto.santos@coordenacao.estacio.br",
        course: "Sistemas de Informação",
        status: "present",
        photo: "/assets/img/coordenadores/foto3.jpg",
        officeHours: [
          { dayOfWeek: "Segunda-feira", startTime: "10:00", endTime: "13:00" },
          { dayOfWeek: "Quarta-feira", startTime: "09:00", endTime: "12:00" },
          { dayOfWeek: "Sexta-feira", startTime: "14:00", endTime: "17:00" }
        ],
        location: "Sala 402 - Bloco A"
      },
      {
        name: "Dra. Ana Costa",
        email: "ana.costa@coordenacao.estacio.br",
        course: "Engenharia de Software",
        status: "present",
        photo: "/assets/img/coordenadores/foto4.jpg",
        officeHours: [
          { dayOfWeek: "Terça-feira", startTime: "11:00", endTime: "14:00" },
          { dayOfWeek: "Quinta-feira", startTime: "09:00", endTime: "12:00" }
        ],
        location: "Sala 305 - Bloco C"
      },
      {
        name: "Dr. Paulo Ferreira",
        email: "paulo.ferreira@coordenacao.estacio.br",
        course: "Redes de Computadores",
        status: "absent",
        photo: "/assets/img/coordenadores/foto5.jpg",
        officeHours: [
          { dayOfWeek: "Segunda-feira", startTime: "13:00", endTime: "16:00" },
          { dayOfWeek: "Quarta-feira", startTime: "15:00", endTime: "18:00" }
        ],
        location: "Sala 201 - Bloco A"
      },
      {
        name: "Dra. Juliana Almeida",
        email: "juliana.almeida@coordenacao.estacio.br",
        course: "Inteligência Artificial",
        status: "present",
        photo: "/assets/img/coordenadores/foto6.jpg",
        officeHours: [
          { dayOfWeek: "Terça-feira", startTime: "09:00", endTime: "12:00" },
          { dayOfWeek: "Sexta-feira", startTime: "10:00", endTime: "13:00" }
        ],
        location: "Sala 501 - Bloco B"
      }
    ];

    await Coordinator.insertMany(coordinators);
    console.log("✓ Coordenadores iniciais criados com sucesso");
  } catch (error) {
    console.error("✗ Erro ao criar coordenadores iniciais:", error);
  }
};

export default seedCoordinators;