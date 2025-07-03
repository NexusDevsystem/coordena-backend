// backend/src/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST,
  port:     +process.env.SMTP_PORT,
  secure:   process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendUserNotification(user, type, reason = '') {
  const to = user.personalEmail || user.institutionalEmail;
  const subjects = {
    approved:  'Bem-vindo ao Coordena+!',
    rejected:  'Cadastro rejeitado no Coordena+'
  };
  const bodies = {
    approved:  `Olá, ${user.name}!\n\nSeu cadastro foi aprovado.\n\n— Coordena+`,
    rejected:  `Olá, ${user.name}!\n\nSeu cadastro foi rejeitado.\nMotivo: ${reason}\n\n— Coordena+`
  };
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: subjects[type],
    text:    bodies[type]
  });
}

export async function sendReservationNotification(reservation, user, type, reason = '') {
  const to = user.personalEmail || user.institutionalEmail;
  const subjects = {
    approved:  `Reserva aprovada em ${reservation.date}`,
    rejected:  `Reserva rejeitada em ${reservation.date}`
  };
  const bodies = {
    approved:  `Olá, ${user.name}!\n\nSua reserva para ${reservation.resource} em ${reservation.date} às ${reservation.start} foi aprovada.\n\n— Coordena+`,
    rejected:  `Olá, ${user.name}!\n\nSua reserva para ${reservation.resource} em ${reservation.date} às ${reservation.start} foi rejeitada.\nMotivo: ${reason}\n\n— Coordena+`
  };
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: subjects[type],
    text:    bodies[type]
  });
}
