import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Webhook отключен, используется polling через /api/bot/poll-updates
export async function POST(_request: NextRequest) {
  return NextResponse.json({ ok: false, error: "Webhook disabled, use polling" }, { status: 410 });
}

