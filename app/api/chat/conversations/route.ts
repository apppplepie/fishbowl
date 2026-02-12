import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/chat/db";

/**
 * GET /api/chat/conversations
 * Returns list of conversations for the current user (id, name, summary, turn_count, updated_at).
 */
export async function GET(req: NextRequest) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await listConversations(currentUser.id);
    return NextResponse.json({
      conversations: list.map((c) => ({
        id: c.id,
        name: c.name,
        summary: c.summary,
        turn_count: c.turn_count,
        updated_at: c.updated_at,
      })),
    });
  } catch (e) {
    console.error("List conversations failed", e);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}
