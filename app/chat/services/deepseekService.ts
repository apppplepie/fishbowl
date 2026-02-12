/**
 * Client-side service: calls /api/chat/deepseek and streams back text.
 * Same interface as the previous Gemini service for drop-in replacement.
 */
export class DeepSeekService {
  public async sendMessageStream(
    message: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const res = await fetch("/api/chat/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(res.status === 500 ? errBody || "Chat API error" : errBody);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    return (async function* () {
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
  }

  public resetSession() {
    // Stateless per request; no server-side session to clear.
  }
}

export const deepseekService = new DeepSeekService();
