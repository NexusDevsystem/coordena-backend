import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, payload);
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY;
}
