import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteConversation } from "@/lib/chat/db";

/**
 * DELETE /api/chat/conversations/[id]
 * Deletes the conversation and all its messages. Only allowed for the owner (user_id).
 */
export async function DELETE(
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
    return NextResponse.json(
      { error: "Invalid conversation id" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteConversation(conversationId, currentUser.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete conversation failed", e);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
