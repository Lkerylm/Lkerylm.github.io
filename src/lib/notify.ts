import { db } from "./db";

export function notify(userId: number, type: string, title: string, link?: string) {
  try {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, link) VALUES (?, ?, ?, ?)`
    ).run(userId, type, title, link || "");
  } catch (e) {
    console.error("notify error:", e);
  }
}