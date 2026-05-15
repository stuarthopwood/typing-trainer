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

const MAX_BODY_SIZE = 100 * 1024; // 100KB

function validateProgressData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.totalSessions !== "number") return false;
  if (typeof d.totalCharsTyped !== "number") return false;
  if (typeof d.bestWpm !== "number") return false;
  if (typeof d.bestAccuracy !== "number") return false;
  if (!Array.isArray(d.recentSessions)) return false;
  if (d.recentSessions.length > 50) return false;
  return true;
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

  await put(blobPath, JSON.stringify(body), {
    access: "public",
    addRandomSuffix: false,
    token,
  });

  return NextResponse.json({ ok: true });
}
