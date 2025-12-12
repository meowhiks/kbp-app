import { NextRequest, NextResponse } from "next/server";
import { createLinkRecord } from "@/lib/botStorage";

const BOT_USERNAME = "kbp_journal_bot";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_name, group_id, birth_day, cookies } = body || {};

    if (!student_name || !group_id || !birth_day || !cookies) {
      return NextResponse.json(
        { success: false, error: "student_name, group_id, birth_day, cookies are required" },
        { status: 400 }
      );
    }

    const record = await createLinkRecord({
      studentName: student_name,
      groupId: group_id,
      birthDay: birth_day,
      cookies,
    });

    const startParam = record.token;
    const link = `https://t.me/${BOT_USERNAME}?start=${startParam}`;

    return NextResponse.json({
      success: true,
      link,
      token: startParam,
    });
  } catch (error) {
    console.error("bot/link error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

