import { NextRequest, NextResponse } from "next/server";
import { list, put, del, head } from "@vercel/blob";
import { timingSafeEqual } from "crypto";

function getSessionPrefix(req: NextRequest): string | null {
  const pin = req.headers.get("x-user-pin");
  if (!pin || pin.length < 4 || !/^\d+$/.test(pin)) return null;
  return `neuralkeys/sessions/${pin}/`;
}

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  const expected = process.env.PROGRESS_API_KEY;
  if (!key || !expected) return false;
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = getSessionPrefix(req);
  if (!prefix) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const sessionId = req.nextUrl.searchParams.get("id");

  if (sessionId) {
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }
    try {
      const blobPath = `${prefix}${sessionId}.json`;
      const metadata = await head(blobPath, { token });
      const response = await fetch(metadata.url);
      const data = await response.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  }

  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
  const result = await list({ prefix, token, cursor, limit: 100 });

  return NextResponse.json({
    sessions: result.blobs.map((b) => ({
      id: b.pathname.replace(prefix, "").replace(".json", ""),
      url: b.url,
      uploadedAt: b.uploadedAt,
    })),
    cursor: result.cursor,
    hasMore: result.hasMore,
  });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = getSessionPrefix(req);
  if (!prefix) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const sessionId = req.nextUrl.searchParams.get("id");
  if (!sessionId || !isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const blobPath = `${prefix}${sessionId}.json`;

  try {
    await head(blobPath, { token });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await del(blobPath, { token });

  // Recalculate progress summary from remaining sessions
  const pin = req.headers.get("x-user-pin")!;
  const progressPath = `neuralkeys/progress-${pin}.json`;
  try {
    const progressMeta = await head(progressPath, { token });
    const progressRes = await fetch(progressMeta.url);
    const progress = await progressRes.json();

    const remaining = await list({ prefix, token, limit: 1000 });
    let bestWpm = 0;
    let bestAccuracy = 0;
    let totalCharsTyped = 0;

    for (const blob of remaining.blobs) {
      const res = await fetch(blob.url);
      const session = await res.json();
      if (session.wpm > bestWpm) bestWpm = session.wpm;
      if (session.accuracy > bestAccuracy) bestAccuracy = session.accuracy;
      totalCharsTyped += session.charsTyped || 0;
    }

    progress.totalSessions = remaining.blobs.length;
    progress.bestWpm = bestWpm;
    progress.bestAccuracy = bestAccuracy;
    progress.totalCharsTyped = totalCharsTyped;

    await put(progressPath, JSON.stringify(progress), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
  } catch {
    // Progress recalculation is best-effort
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = getSessionPrefix(req);
  if (!prefix) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const action = req.nextUrl.searchParams.get("action");
  if (action !== "migrate") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const pin = req.headers.get("x-user-pin")!;
  const progressPath = `neuralkeys/progress-${pin}.json`;

  try {
    const progressMeta = await head(progressPath, { token });
    const progressRes = await fetch(progressMeta.url);
    const progress = await progressRes.json();

    if (!progress.allSessions || !Array.isArray(progress.allSessions) || progress.allSessions.length === 0) {
      return NextResponse.json({ migrated: 0, skipped: 0 });
    }

    let migrated = 0;
    let skipped = 0;

    for (const session of progress.allSessions) {
      const id = session.id;
      if (!id) { skipped++; continue; }

      const sessionPath = `${prefix}${id}.json`;
      try {
        await head(sessionPath, { token });
        skipped++;
      } catch {
        await put(sessionPath, JSON.stringify(session), {
          access: "public",
          addRandomSuffix: false,
          token,
        });
        migrated++;
      }
    }

    delete progress.allSessions;
    await put(progressPath, JSON.stringify(progress), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });

    return NextResponse.json({ migrated, skipped });
  } catch {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
