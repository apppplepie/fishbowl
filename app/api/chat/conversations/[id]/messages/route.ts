import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversation, getLastMessages } from "@/lib/chat/db";

/**
 * GET /api/chat/conversations/[id]/messages
 * Returns messages for the conversation (chronological). Optional ?limit=50.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isFinite(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const conv = await getConversation(conversationId, currentUser.id);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const limit = Math.min(
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 100),
    500
  );

  try {
    const messages = await getLastMessages(conversationId, limit);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
    });
  } catch (e) {
    console.error("Get messages failed", e);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
