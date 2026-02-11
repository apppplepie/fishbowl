import OpenAI from "openai";

const DEFAULT_SYSTEM =
  "你是人";

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });
}

/**
 * Stream chat completion from DeepSeek. Yields content deltas.
 * Use from server only (API route / Server Action) so DEEPSEEK_API_KEY is not exposed.
 */
export async function streamChat(
  messages: ChatMessage[]
): Promise<AsyncGenerator<string, void, unknown>> {
  const openai = getClient();
  const stream = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: DEFAULT_SYSTEM },
      ...messages,
    ],
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (typeof content === "string" && content.length > 0) {
        yield content;
      }
    }
  })();
}
