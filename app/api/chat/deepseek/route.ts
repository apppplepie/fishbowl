import { NextRequest, NextResponse } from "next/server";
import { streamChat } from "@/lib/chatai/deepseek";

export const runtime = "nodejs";

/**
 * POST /api/chat/deepseek
 * Body: { message: string }
 * Streams back raw text chunks (UTF-8).
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

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = await streamChat([{ role: "user", content: message }]);

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
