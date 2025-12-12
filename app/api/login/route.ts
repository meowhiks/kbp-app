import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

async function getSCode(): Promise<{ sCode: string; cookies: string }> {
  try {
    // Форма загружается динамически через templates/login_parent.php
    // Добавляем timestamp для предотвращения кеширования и получения свежего S_Code
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
    
    // Получаем cookies из ответа
    const setCookieHeader = response.headers.get("set-cookie");
    const cookies = setCookieHeader || "";
    
    // Сохраняем HTML в файл для анализа
    try {
      const filePath = join(process.cwd(), "ej-page.html");
      await writeFile(filePath, html, "utf-8");
    } catch (fileError) {
      console.error("Error saving HTML file:", fileError);
    }

    // Парсим S_Code из формы
    // Ищем input с id="S_Code" - точное совпадение с реальной структурой
    const patterns = [
      // <input type="hidden" id="S_Code" value="...">
      /<input[^>]*id\s*=\s*["']S_Code["'][^>]*value\s*=\s*["']([^"']+)["']/i,
      // <input ... value="..." id="S_Code">
      /<input[^>]*value\s*=\s*["']([^"']+)["'][^>]*id\s*=\s*["']S_Code["']/i,
      // Более простой вариант - ищем id="S_Code" и затем value
      /id\s*=\s*["']S_Code["'][^>]*value\s*=\s*["']([a-f0-9]{32})["']/i,
      // Ищем просто value после S_Code
      /S_Code["'][^>]*value\s*=\s*["']([a-f0-9]{32})["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length === 32) {
        return { sCode: match[1], cookies };
      }
    }

    // Если не нашли, выводим ошибку с фрагментом HTML
    const sCodeIndex = html.indexOf('S_Code');
    if (sCodeIndex !== -1) {
      const snippet = html.substring(Math.max(0, sCodeIndex - 50), Math.min(html.length, sCodeIndex + 150));
      // Попробуем извлечь вручную из фрагмента
      const manualMatch = snippet.match(/value\s*=\s*["']([a-f0-9]{32})["']/i);
      if (manualMatch && manualMatch[1]) {
        return { sCode: manualMatch[1], cookies };
      }
    } else {
      console.error("S_Code not found in HTML. HTML length:", html.length);
    }
    
    throw new Error("S_Code value not found in HTML");
  } catch (error) {
    console.error("Error fetching S_Code:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_name, group_id, birth_day } = body;

    // Получаем S_Code с главной страницы и cookies
    const { sCode, cookies } = await getSCode();

    // Формируем данные для отправки на ajax.php
    // Порядок как в оригинальной форме: S_Code первым
    const formData = new URLSearchParams();
    formData.append("action", "login_parent");
    formData.append("S_Code", sCode);
    formData.append("student_name", student_name);
    formData.append("group_id", group_id);
    formData.append("birth_day", birth_day);
    
    // Отправляем данные на ajax.php
    const formDataString = formData.toString();
    
    // Формируем заголовки с cookies, если они есть
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://ej.kbp.by/",
      "Origin": "https://ej.kbp.by",
      "X-Requested-With": "XMLHttpRequest",
    };
    
    if (cookies) {
      headers["Cookie"] = cookies;
    }
    
    const ajaxResponse = await fetch("https://ej.kbp.by/ajax.php", {
      method: "POST",
      headers,
      body: formDataString,
    });

    const result = await ajaxResponse.text();

    // Получаем cookies из ответа ajax.php (особенно PHPSESSID)
    // Cookies могут приходить в разных форматах
    const setCookieHeaders = ajaxResponse.headers.get("set-cookie");
    let sessionCookies = cookies || "";
    
    if (setCookieHeaders) {
      // Обрабатываем set-cookie заголовки
      // Они могут быть массивом или строкой
      let cookieArray: string[] = [];
      
      if (Array.isArray(setCookieHeaders)) {
        cookieArray = setCookieHeaders;
      } else {
        // Разделяем по запятой, но учитываем что значения могут содержать запятые
        cookieArray = setCookieHeaders.split(/,(?=\s*\w+=)/);
      }
      
      // Извлекаем только имя=значение из каждого cookie
      const cookiePairs = cookieArray.map(cookie => {
        const match = cookie.match(/^([^=]+)=([^;]+)/);
        return match ? `${match[1]}=${match[2]}` : null;
      }).filter(Boolean) as string[];
      
      if (cookiePairs.length > 0) {
        sessionCookies = cookiePairs.join("; ");
        sessionCookies = cookiePairs.join("; ");
      }
    }
    
    // Если cookies не пришли, используем те что были отправлены
    if (!sessionCookies && cookies) {
      sessionCookies = cookies;
    }

    // Проверяем, содержит ли ответ "good"
    const isSuccess = result.toLowerCase().includes("good");

    return NextResponse.json({
      success: isSuccess,
      data: result,
      cookies: sessionCookies,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

