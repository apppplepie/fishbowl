import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { streamChat, generateSummary, generateConversationName, DEFAULT_SYSTEM, SUMMARY_SYSTEM } from "@/lib/chatai/deepseek";
import type { ChatMessage } from "@/lib/chatai/deepseek";
import {
  getOrCreateConversation,
  getLastMessages,
  insertMessage,
  incrementTurnCount,
  updateSummary,
  updateName,
} from "@/lib/chat/db";

export const runtime = "nodejs";

const HISTORY_ROUNDS = 10; // last 10 rounds for context
const SUMMARY_ROUNDS = 10; // last 10 rounds for summary generation

/**
 * POST /api/chat/deepseek
 * Body: { message: string, conversation_id?: number | null }
 * Requires auth. Streams back raw text. Response header X-Conversation-Id set.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "DEEPSEEK_API_KEY is not configured",
        hint: "Add DEEPSEEK_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; conversation_id?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rawMessage = typeof body.message === "string" ? body.message : "";
  const message = rawMessage.trim().slice(0, 3000);
  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const conversationIdParam =
    body.conversation_id != null ? Number(body.conversation_id) : null;

  const userId = currentUser.id;
  const conv = await getOrCreateConversation(userId, conversationIdParam);
  const conversationId = conv.id;

  const lastMessages = await getLastMessages(
    conversationId,
    HISTORY_ROUNDS * 2
  );
  const historyMessages: ChatMessage[] = lastMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const fullMessages: ChatMessage[] = [
    { role: "system", content: DEFAULT_SYSTEM },
    ...(conv.summary
      ? [{ role: "system" as const, content: `Conversation summary: ${conv.summary}` }]
      : []),
    ...historyMessages,
    { role: "user", content: message },
  ];

  const stream = await streamChat(fullMessages);

  const encoder = new TextEncoder();
  let assistantContent = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          assistantContent += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.error(err);
        return;
      } finally {
        controller.close();
      }

      try {
        await insertMessage(conversationId, "user", message);
        await insertMessage(conversationId, "assistant", assistantContent);
        const newTurnCount = await incrementTurnCount(conversationId);

        if (newTurnCount === 1) {
          try {
            const name = await generateConversationName(message, assistantContent);
            if (name) await updateName(conversationId, name);
          } catch (e) {
            console.error("Chat: generate name failed", e);
          }
        }

        if (newTurnCount % 10 === 0) {
          const summaryMessages = await getLastMessages(
            conversationId,
            SUMMARY_ROUNDS * 2
          );
          const summaryHistory: ChatMessage[] = summaryMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }));
          const summaryPrompt: ChatMessage[] = [
            { role: "system", content: SUMMARY_SYSTEM },
            ...(conv.summary
              ? [
                  {
                    role: "system" as const,
                    content: `Conversation summary: ${conv.summary}`,
                  },
                ]
              : []),
            ...summaryHistory,
          ];
          const newSummary = await generateSummary(summaryPrompt);
          if (newSummary) {
            await updateSummary(conversationId, newSummary);
          }
        }
      } catch (e) {
        console.error("Chat: save messages or summary failed", e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Conversation-Id": String(conversationId),
    },
  });
}
