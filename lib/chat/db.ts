/**
 * Conversation and message DB helpers.
 * Tables: conversations (id, user_id, name, summary, turn_count, ...), messages (id, conversation_id, role, content, ...)
 */
import { pool, query } from "@/lib/db";

export interface ConversationRow {
  id: number;
  user_id: string;
  name: string | null;
  summary: string | null;
  turn_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: Date;
}

/** Create a new conversation. Returns the new conversation id. user_id must match users.id (VARCHAR(36)). */
export async function createConversation(userId: string): Promise<number> {
  const [result] = await pool.execute(
    "INSERT INTO conversations (user_id) VALUES (?)",
    [userId]
  ) as [import("mysql2").ResultSetHeader, unknown];
  return result.insertId;
}

/** Get conversation by id and user_id (for auth). */
export async function getConversation(
  conversationId: number,
  userId: string
): Promise<ConversationRow | null> {
  const rows = await query<ConversationRow[]>(
    "SELECT id, user_id, name, summary, turn_count, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?",
    [conversationId, userId]
  );
  const list = Array.isArray(rows) ? rows : [rows];
  return list[0] ?? null;
}

/** Get or create: if conversationId provided and valid, return it; else create new and return. */
export async function getOrCreateConversation(
  userId: string,
  conversationId: number | null
): Promise<{ id: number; turn_count: number; summary: string | null }> {
  if (conversationId != null && conversationId > 0) {
    const conv = await getConversation(conversationId, userId);
    if (conv) return { id: conv.id, turn_count: conv.turn_count, summary: conv.summary };
  }
  const id = await createConversation(userId);
  return { id, turn_count: 0, summary: null };
}

/** Last N messages (chronological). N = rounds * 2 (user+assistant). */
export async function getLastMessages(
  conversationId: number,
  limit: number
): Promise<MessageRow[]> {
  const safeLimit = Math.max(1, Math.min(Number(limit) | 0, 1000));
  const rows = await query<MessageRow[]>(
    `SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
    [conversationId]
  );
  const list = Array.isArray(rows) ? rows : [rows];
  return list.reverse();
}

export async function insertMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await query(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
    [conversationId, role, content]
  );
}

export async function incrementTurnCount(conversationId: number): Promise<number> {
  await query(
    "UPDATE conversations SET turn_count = turn_count + 1 WHERE id = ?",
    [conversationId]
  );
  const rows = await query<{ turn_count: number }[]>(
    "SELECT turn_count FROM conversations WHERE id = ?",
    [conversationId]
  );
  const list = Array.isArray(rows) ? rows : [rows];
  const row = list[0];
  return row?.turn_count ?? 0;
}

export async function updateSummary(conversationId: number, summary: string): Promise<void> {
  await query("UPDATE conversations SET summary = ? WHERE id = ?", [
    summary,
    conversationId,
  ]);
}

export async function updateName(conversationId: number, name: string): Promise<void> {
  await query("UPDATE conversations SET name = ? WHERE id = ?", [
    name.slice(0, 255),
    conversationId,
  ]);
}

/** Delete conversation and all its messages. Only if owned by userId. */
export async function deleteConversation(
  conversationId: number,
  userId: string
): Promise<boolean> {
  const conv = await getConversation(conversationId, userId);
  if (!conv) return false;
  await query("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);
  await query("DELETE FROM conversations WHERE id = ? AND user_id = ?", [
    conversationId,
    userId,
  ]);
  return true;
}

/** List conversations for user (for sidebar). Only returns rows where user_id = ?. */
export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const rows = await query<ConversationRow[]>(
    "SELECT id, user_id, name, summary, turn_count, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
    [userId]
  );
  return Array.isArray(rows) ? rows : [rows];
}
