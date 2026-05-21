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

  let body: { words?: string[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { words, context } = body;
  if (!words || !Array.isArray(words) || words.length === 0 || words.length > 5) {
    return NextResponse.json({ error: "words must be an array of 1-5 strings" }, { status: 422 });
  }

  try {
    const client = new Anthropic();
    const prompt = `Check these words for spelling errors in the given context. Context: "${context || words.join(" ")}"\nWords to check: ${words.map((w, i) => `${i}:"${w}"`).join(", ")}\n\nReturn ONLY a valid JSON array. For each word, include an object: {"word":"original","correct":true/false,"suggestion":"corrected_word_or_null","index":N}\nIf all words are correct, return objects with correct:true. No markdown, no explanation.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }, { signal: controller.signal });

    clearTimeout(timeout);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";

    try {
      const results = JSON.parse(text);
      if (!Array.isArray(results)) {
        return NextResponse.json({ results: words.map((w, i) => ({ word: w, correct: true, suggestion: null, index: i })) });
      }
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json({ results: words.map((w, i) => ({ word: w, correct: true, suggestion: null, index: i })) });
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "AI provider unavailable" }, { status: 500 });
  }
}
