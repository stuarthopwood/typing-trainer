import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

function getBlobPath(req: NextRequest): string | null {
  const pin = req.headers.get("x-user-pin");
  if (!pin || pin.length < 4) return null;
  return `neuralkeys/progress-${pin}.json`;
}

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  return key === process.env.PROGRESS_API_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobPath = getBlobPath(req);
  if (!blobPath) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  try {
    const metadata = await head(blobPath, { token: process.env.BLOB_READ_WRITE_TOKEN! });
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

  const body = await req.json();

  await put(blobPath, JSON.stringify(body), {
    access: "public",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });

  return NextResponse.json({ ok: true });
}
