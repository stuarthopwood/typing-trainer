import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "crypto";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  const expected = process.env.PROGRESS_API_KEY;
  if (!key || !expected) return false;
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: "Generate a single open-ended question or prompt for a free-typing exercise. It should be 5-10 words, conversational, and easy to write about. Examples: 'Describe your favourite meal to cook', 'What would you do with a free afternoon?'. Return ONLY the prompt text, nothing else.",
      }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : null;
    if (!text) {
      return NextResponse.json({ error: "Failed to generate topic" }, { status: 500 });
    }

    return NextResponse.json({ topic: text });
  } catch {
    return NextResponse.json({ error: "AI provider unavailable" }, { status: 500 });
  }
}
