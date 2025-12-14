import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders, handleOptionsRequest } from "@/lib/cors";

interface Group {
  id: string;
  name: string;
}

async function getGroupsFromLoginPage(): Promise<Group[]> {
  try {
    const timestamp = Date.now();
    const response = await fetch(`https://ej.kbp.by/templates/login_parent.php?_=${timestamp}`, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://ej.kbp.by/",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });
    const html = await response.text();
    
    const groups: Group[] = [];
    const optionMatches = html.matchAll(/<option\s+value="(\d+)"[^>]*>([^<]+)<\/option>/g);
    
    for (const match of optionMatches) {
      const id = match[1];
      const name = match[2].trim();
      if (id && name) {
        groups.push({ id, name });
      }
    }
    
    return groups;
  } catch (error) {
    console.error("Error fetching groups from login page:", error);
    return [];
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined;
  return handleOptionsRequest(origin);
}

export async function GET(request: NextRequest) {
  try {
    const groups = await getGroupsFromLoginPage();
    const origin = request.headers.get("origin") || undefined;
    const response = NextResponse.json({
      success: true,
      groups: groups,
    });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error("Error fetching groups:", error);
    const origin = request.headers.get("origin") || undefined;
    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        groups: [],
      },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

