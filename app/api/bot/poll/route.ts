import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBoundUsers, updateSnapshots } from "@/lib/botStorage";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

interface TimetablePair {
  day: number;
  pairNumber: number;
  subject?: string;
  status?: string;
  teacher?: string;
  room?: string;
}

function hashObject(obj: any) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

function dayName(dayIndex: number) {
  const names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return names[dayIndex] ?? `День ${dayIndex}`;
}

function flattenGrades(data: any) {
  const map = new Map<string, string[]>();
  if (!data?.subjects) return map;
  for (const subject of data.subjects) {
    const gradesMatrix = subject.gradesMatrix || {};
    Object.keys(gradesMatrix).forEach((idx) => {
      const key = `${subject.name}|${idx}`;
      const values = gradesMatrix[idx].map((g: any) => g.value);
      map.set(key, values);
    });
  }
  return map;
}

function diffJournal(oldData: any, newData: any) {
  const changes: string[] = [];
  const oldMap = flattenGrades(oldData);
  const newMap = flattenGrades(newData);
  newMap.forEach((values, key) => {
    const [subjectName, dateIndex] = key.split("|");
    const prevValues = oldMap.get(key) || [];
    const newlyAdded = values.filter((v) => !prevValues.includes(v));
    if (newlyAdded.length > 0) {
      const dateLabel = newData?.dates?.[Number(dateIndex)] || "";
      changes.push(
        `${subjectName}${dateLabel ? ` (${dateLabel})` : ""}: новые оценки — ${newlyAdded.join(", ")}`
      );
    }
  });
  return changes;
}

function mapPairs(pairs: TimetablePair[]) {
  const map = new Map<string, TimetablePair>();
  if (!Array.isArray(pairs)) return map;
  pairs.forEach((p) => {
    const key = `${p.day}-${p.pairNumber}`;
    map.set(key, p);
  });
  return map;
}

function diffTimetable(oldPairs: TimetablePair[] = [], newPairs: TimetablePair[] = []) {
  const changes: string[] = [];
  const oldMap = mapPairs(oldPairs);
  const newMap = mapPairs(newPairs);

  newMap.forEach((pair, key) => {
    const prev = oldMap.get(key);
    if (!prev) {
      changes.push(
        `${dayName(pair.day)}, пара ${pair.pairNumber}: добавлено "${pair.subject || "Без названия"}" (${pair.status || "status?"})`
      );
      return;
    }

    const prevStr = JSON.stringify([prev.subject, prev.status, prev.teacher, prev.room]);
    const nextStr = JSON.stringify([pair.subject, pair.status, pair.teacher, pair.room]);
    if (prevStr !== nextStr) {
      changes.push(
        `${dayName(pair.day)}, пара ${pair.pairNumber}: было "${prev.subject || "-"}" (${prev.status || "-"}) → стало "${
          pair.subject || "-"
        }" (${pair.status || "-"})`
      );
    }
  });

  oldMap.forEach((pair, key) => {
    if (!newMap.has(key)) {
      changes.push(
        `${dayName(pair.day)}, пара ${pair.pairNumber}: удалено "${pair.subject || "Без названия"}" (${pair.status || "-"})`
      );
    }
  });

  return changes;
}

async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, json: null, raw: text };
  }
}

async function fetchJournal(baseUrl: string, cookies: string) {
  return fetchJson(`${baseUrl}/api/journal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookies }),
    cache: "no-store",
  });
}

async function fetchTimetable(baseUrl: string, groupId: string) {
  return fetchJson(`${baseUrl}/api/timetable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId }),
    cache: "no-store",
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = process.env.APP_BASE_URL || `${url.protocol}//${url.host}`;
  const delayMs = Math.min(Number(url.searchParams.get("delayMs") || 1500), 5000);

  const users = await getBoundUsers();
  const results: Array<{ token: string; ok: boolean; detail?: string }> = [];

  for (const user of users) {
    try {
      const [journalRes, timetableRes] = await Promise.all([
        fetchJournal(baseUrl, user.cookies),
        fetchTimetable(baseUrl, user.groupId),
      ]);

      const journalData = journalRes?.json?.data;
      const timetableData = timetableRes?.json?.data;

      const newJournalHash = journalData ? hashObject(journalData) : user.lastJournalHash;
      const newTimetableHash = timetableData ? hashObject(timetableData?.pairs || []) : user.lastTimetableHash;

      const journalChanges =
        journalData && user.journalSnapshot ? diffJournal(user.journalSnapshot, journalData) : [];
      const timetableChanges =
        timetableData && user.timetableSnapshot ? diffTimetable(user.timetableSnapshot?.pairs, timetableData?.pairs) : [];

      const hasJournalChange = journalData && (!user.lastJournalHash || newJournalHash !== user.lastJournalHash);
      const hasTimetableChange = timetableData && (!user.lastTimetableHash || newTimetableHash !== user.lastTimetableHash);

      if (hasJournalChange || hasTimetableChange) {
        const parts: string[] = [];
        if (journalChanges.length > 0) {
          parts.push("📘 Журнал:\n" + journalChanges.slice(0, 10).join("\n"));
          if (journalChanges.length > 10) {
            parts.push(`… еще ${journalChanges.length - 10} изменений`);
          }
        }
        if (timetableChanges.length > 0) {
          parts.push("📅 Расписание:\n" + timetableChanges.slice(0, 10).join("\n"));
          if (timetableChanges.length > 10) {
            parts.push(`… еще ${timetableChanges.length - 10} изменений`);
          }
        }

        if (parts.length > 0) {
          const text = `Обновления для ${user.studentName} (${user.groupId}):\n\n${parts.join("\n\n")}`;
          await sendTelegramMessage(user.telegramUserId as number, text);
        }

        await updateSnapshots(user.token, {
          journalHash: newJournalHash,
          timetableHash: newTimetableHash,
          journalSnapshot: journalData || user.journalSnapshot,
          timetableSnapshot: timetableData || user.timetableSnapshot,
        });
      }

      results.push({ token: user.token, ok: true });
    } catch (error) {
      console.error("poll error for user", user.token, error);
      results.push({ token: user.token, ok: false, detail: error instanceof Error ? error.message : "error" });
    }

    await sleep(delayMs);
  }

  return NextResponse.json({ ok: true, processed: users.length, results });
}

