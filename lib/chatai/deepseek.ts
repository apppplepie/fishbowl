import OpenAI from "openai";

export const DEFAULT_SYSTEM = "你扮演一只会说话的魔法乌鸦";

export const SUMMARY_SYSTEM = `根据总结和对话记录，生成一段更新后的简洁总结，着重关注用户提出的重要设定和先后顺序。
要求：只输出总结正文，不要任何解释、前缀或引号。总结不超过 5000 字。`;

export const NAME_SYSTEM = `根据用户的第一条消息和助手的回复，生成一条极短的对话标题。
要求：只用中文或英文，10 字以内。`;

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
 * Caller must pass full messages including system (e.g. [system, ...history, user]).
 */
export async function streamChat(
  messages: ChatMessage[]
): Promise<AsyncGenerator<string, void, unknown>> {
  const openai = getClient();
  const stream = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages,
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

/**
 * Non-streaming completion for summary generation. Returns only the summary text.
 */
export async function generateSummary(messages: ChatMessage[]): Promise<string> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages,
    stream: false,
  });
  const content = completion.choices[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

/**
 * Generate a short conversation name (≤10 chars) from first exchange.
 */
export async function generateConversationName(
  firstUserMessage: string,
  firstAssistantContent: string
): Promise<string> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: NAME_SYSTEM },
      { role: "user", content: `用户说：${firstUserMessage.slice(0, 200)}\n\n助手回复：${firstAssistantContent.slice(0, 200)}` },
    ],
    stream: false,
  });
  const content = completion.choices[0]?.message?.content;
  const raw = typeof content === "string" ? content.trim() : "";
  return raw.slice(0, 10);
}
