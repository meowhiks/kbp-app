import { NextRequest, NextResponse } from "next/server";
import { requireBotToken } from "@/lib/telegram";
import { handleUpdate } from "@/lib/botHandlers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireBotToken();
    const update = await request.json();

    console.log("[bot] webhook update received, bot enabled");
    await handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("bot/webhook error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Internal error" }, { status: 500 });
  }
}

