/**
 * Client-side service: calls /api/chat/deepseek and streams back text.
 * Uses credentials for auth. Returns stream and conversationId from response header.
 */
export interface SendMessageResult {
  stream: AsyncGenerator<string, void, unknown>;
  conversationId: string | null;
}

export class DeepSeekService {
  public async sendMessageStream(
    message: string,
    conversationId?: number | string | null
  ): Promise<SendMessageResult> {
    const res = await fetch("/api/chat/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        message,
        conversation_id:
          conversationId != null ? Number(conversationId) : null,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(res.status === 500 ? errBody || "Chat API error" : errBody);
    }

    const newConversationId = res.headers.get("X-Conversation-Id");

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    const stream = (async function* () {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.length) yield decoder.decode(value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }
    })();

    return { stream, conversationId: newConversationId };
  }

  public resetSession() {
    // Stateless per request; no server-side session to clear.
  }

  public async getConversations(): Promise<ConversationListItem[]> {
    const res = await fetch("/api/chat/conversations", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load conversations");
    const data = await res.json();
    return data.conversations ?? [];
  }

  public async getMessages(conversationId: number | string): Promise<MessageItem[]> {
    const res = await fetch(
      `/api/chat/conversations/${conversationId}/messages`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to load messages");
    const data = await res.json();
    return data.messages ?? [];
  }

  public async deleteConversation(conversationId: number | string): Promise<void> {
    const res = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
  }
}

export interface ConversationListItem {
  id: number;
  name: string | null;
  summary: string | null;
  turn_count: number;
  updated_at: string;
}

export interface MessageItem {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const deepseekService = new DeepSeekService();
