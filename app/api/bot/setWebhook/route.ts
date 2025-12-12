import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Управление вебхуком отключено, используется polling
export async function POST() {
  return NextResponse.json({ ok: false, error: "Webhook disabled, use polling" }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Webhook disabled, use polling" }, { status: 410 });
}

