import { NextRequest, NextResponse } from "next/server";
import { createLinkRecord } from "@/lib/botStorage";
import { addCorsHeaders, handleOptionsRequest } from "@/lib/cors";

const BOT_USERNAME = "kbp_journal_bot";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined;
  return handleOptionsRequest(origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined;
  try {
    const body = await request.json();
    const { student_name, group_id, birth_day, cookies } = body || {};

    if (!student_name || !group_id || !birth_day || !cookies) {
      const response = NextResponse.json(
        { success: false, error: "student_name, group_id, birth_day, cookies are required" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    const record = await createLinkRecord({
      studentName: student_name,
      groupId: group_id,
      birthDay: birth_day,
      cookies,
    });

    const startParam = record.token;
    const link = `https://t.me/${BOT_USERNAME}?start=${startParam}`;

    const response = NextResponse.json({
      success: true,
      link,
      token: startParam,
    });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error("bot/link error:", error);
    const response = NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

