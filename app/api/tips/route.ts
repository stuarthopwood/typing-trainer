import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/ratelimit";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  const expected = process.env.PROGRESS_API_KEY;
  if (!key || !expected) return false;
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pin = req.headers.get("x-user-pin") || "anonymous";
  const { allowed } = checkRateLimit(pin);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
    return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.tip && parsed.explanation) {
        return NextResponse.json({ tip: parsed.tip, explanation: parsed.explanation });
      }
      return NextResponse.json({ tip: parsed.tip || cleaned });
    } catch {
      return NextResponse.json({ tip: cleaned });
    }
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
