import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { timingSafeEqual } from "crypto";

function getBlobPath(req: NextRequest): string | null {
  const pin = req.headers.get("x-user-pin");
  if (!pin || pin.length < 4) return null;
  return `neuralkeys/progress-${pin}.json`;
}

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  const expected = process.env.PROGRESS_API_KEY;
  if (!key || !expected) return false;
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB

function validateProgressData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.totalSessions !== "number") return false;
  if (typeof d.totalCharsTyped !== "number") return false;
  if (typeof d.bestWpm !== "number") return false;
  if (typeof d.bestAccuracy !== "number") return false;
  if (!Array.isArray(d.recentSessions)) return false;
  return true;
}

async function loadExistingBlob(blobPath: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const metadata = await head(blobPath, { token });
    const response = await fetch(metadata.url);
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobPath = getBlobPath(req);
  if (!blobPath) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  try {
    const metadata = await head(blobPath, { token });
    const response = await fetch(metadata.url);
    const data = await response.json();

    const full = req.nextUrl.searchParams.get("full");
    if (full !== "true" && data.allSessions) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { allSessions: _, ...withoutHistory } = data;
      return NextResponse.json(withoutHistory);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobPath = getBlobPath(req);
  if (!blobPath) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await req.json();
  if (!validateProgressData(body)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 422 });
  }

  const { newSession, ...progressData } = body as Record<string, unknown> & { newSession?: unknown };

  // If a new session was provided, append it to allSessions in the Blob
  let allSessions: unknown[] = [];
  if (newSession && typeof newSession === "object") {
    const existing = await loadExistingBlob(blobPath, token);
    if (existing?.allSessions && Array.isArray(existing.allSessions)) {
      allSessions = existing.allSessions;
    }
    allSessions.push(newSession);
  } else {
    const existing = await loadExistingBlob(blobPath, token);
    if (existing?.allSessions && Array.isArray(existing.allSessions)) {
      allSessions = existing.allSessions;
    }
  }

  const dataToStore = { ...progressData, allSessions };

  await put(blobPath, JSON.stringify(dataToStore), {
    access: "public",
    addRandomSuffix: false,
    token,
  });

  return NextResponse.json({ ok: true });
}
