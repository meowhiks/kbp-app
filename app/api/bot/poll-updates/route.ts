import { NextRequest, NextResponse } from "next/server";
import { deleteWebhook, getUpdates, requireBotToken } from "@/lib/telegram";
import { getOffset, setOffset } from "@/lib/botUpdates";
import { handleUpdate } from "@/lib/botHandlers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireBotToken();
    const url = new URL(request.url);
    const dropWebhook = url.searchParams.get("dropWebhook") === "1";
    if (dropWebhook) {
      await deleteWebhook();
    }

    const lastOffset = await getOffset();
    const updatesRes = await getUpdates({ offset: lastOffset + 1, limit: 50, timeout: 0 });
    const updates = updatesRes?.result || [];

    let maxUpdateId = lastOffset;
    for (const upd of updates) {
      try {
        await handleUpdate(upd);
        if (typeof upd.update_id === "number" && upd.update_id > maxUpdateId) {
          maxUpdateId = upd.update_id;
        }
      } catch (e) {
        console.error("handleUpdate error", e);
      }
    }

    if (maxUpdateId !== lastOffset) {
      await setOffset(maxUpdateId);
    }

    return NextResponse.json({ ok: true, received: updates.length, newOffset: maxUpdateId });
  } catch (error) {
    console.error("poll-updates error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

