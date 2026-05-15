import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

const BLOB_PATH = "typing-trainer/progress.json";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  return key === process.env.PROGRESS_API_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metadata = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN! });
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

  const body = await req.json();

  await put(BLOB_PATH, JSON.stringify(body), {
    access: "public",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });

  return NextResponse.json({ ok: true });
}
