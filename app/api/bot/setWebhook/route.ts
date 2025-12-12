import { NextRequest, NextResponse } from "next/server";
import { getWebhookInfo, setWebhook } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function resolveBaseUrl(req: NextRequest) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = resolveBaseUrl(request);
    const webhookUrl = `${baseUrl}/api/bot/webhook`;

    const setResult = await setWebhook(webhookUrl);
    const info = await getWebhookInfo();

    return NextResponse.json({
      ok: true,
      webhookUrl,
      setResult,
      info,
    });
  } catch (error) {
    console.error("setWebhook route error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const info = await getWebhookInfo();
    return NextResponse.json({ ok: true, info });
  } catch (error) {
    console.error("getWebhook route error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

