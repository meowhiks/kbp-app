import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookies } = body;

    if (!cookies) {
      return NextResponse.json(
        { success: false, error: "Cookies are required" },
        { status: 400 }
      );
    }

    const journalResponse = await fetch("https://ej.kbp.by/templates/parent_journal.php", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "ru,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
        "Referer": "https://ej.kbp.by/parent_journal.php",
        "Cookie": cookies,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    const html = await journalResponse.text();
    
    const isJournalAvailable = 
      html.includes('pupilName') || 
      html.includes('dateOfMonth') || 
      html.includes('mark mar row');
    
    if (!isJournalAvailable) {
      return NextResponse.json({
        success: false,
        error: "Journal not available. Session may have expired.",
      });
    }
    
    try {
      const filePath = join(process.cwd(), "journal.html");
      await writeFile(filePath, html, "utf-8");
    } catch (fileError) {
      console.error("Error saving journal HTML:", fileError);
    }

    const parsedData = parseJournalData(html);

    if (!parsedData.subjects || parsedData.subjects.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No journal data found",
      });
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error("Journal fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function parseJournalData(html: string): any {
  const data: any = {
    subjects: [],
    months: [],
    dates: [],
    monthColspans: [],
  };

  const monthRowMatch = html.match(/<tr[^>]*id="months"[^>]*>([\s\S]*?)<\/tr>/);
  if (monthRowMatch) {
    const monthMatches = monthRowMatch[1].matchAll(/<td[^>]*colspan="(\d+)"[^>]*>[\s\S]*?<div[^>]*title="([^"]+)"[^>]*class="nameMonth"[^>]*>([^<]+)<\/div>/g);
    for (const match of monthMatches) {
      const colspan = parseInt(match[1]);
      const monthName = match[3].trim();
      data.months.push(monthName);
      data.monthColspans.push(colspan);
    }
  }

  const dateRowMatch = html.match(/<tr[^>]*id="dateOfMonth"[^>]*>([\s\S]*?)<\/tr>/);
  if (dateRowMatch) {
    const dateMatches = dateRowMatch[1].matchAll(/<td[^>]*><div>(\d+)<\/div><\/td>/g);
    const dates: string[] = [];
    for (const match of dateMatches) {
      dates.push(match[1]);
    }
    data.dates = dates;
  }

  // Парсим все названия предметов (из левой таблицы)
  const subjectNames: Record<string, string> = {};
  const subjectRowMatches = html.matchAll(/<tr[^>]*class="row(\d+)"[^>]*>[\s\S]*?<div[^>]*class="pupilName"[^>]*>([\s\S]*?)<\/div>/g);
  
  for (const match of subjectRowMatches) {
    const subjectId = match[1];
    let nameContent = match[2];
    
    // Убираем HTML теги и извлекаем текст
    nameContent = nameContent
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1') // Извлекаем текст из ссылок
      .replace(/<span[^>]*>[\s\S]*?<\/span>/gi, '') // Убираем span с danger
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    if (nameContent) {
      subjectNames[subjectId] = nameContent;
    }
  }

  // Парсим оценки для каждого предмета (из правой таблицы)
  // Создаем матрицу: subjectId -> [оценки по позициям дат]
  const gradeRowMatches = html.matchAll(/<tr[^>]*class="mark mar row(\d+)"[^>]*>([\s\S]*?)<\/tr>/g);
  
  for (const rowMatch of gradeRowMatches) {
    const subjectId = rowMatch[1];
    const rowContent = rowMatch[2];
    
    const subjectName = subjectNames[subjectId] || `Предмет ${subjectId}`;

    // Матрица оценок: индекс даты -> массив оценок
    const gradesMatrix: Record<number, Array<{ value: string; type: string }>> = {};
    
    // Извлекаем все td ячейки в строке в правильном порядке
    const tdMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g));
    
    for (let cellIndex = 0; cellIndex < tdMatches.length; cellIndex++) {
      const cellContent = tdMatches[cellIndex][1];
      
      if (cellContent.includes('border-left: 3px solid #CCC')) {
        break;
      }
      
      const divMatch = cellContent.match(/<div[^>]*data-count-mark="(\d+)"[^>]*>([\s\S]*?)<\/div>/);
      
      if (divMatch) {
        const markCount = parseInt(divMatch[1]);
        const fullDivTag = divMatch[0];
        const divTagMatch = fullDivTag.match(/<div[^>]*>/);
        const divTag = divTagMatch ? divTagMatch[0] : '';
        const titleMatch = divTag.match(/title\s*=\s*["']([^"']*)["']/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const divContent = divMatch[2];
        
        if (markCount > 0 && cellIndex < data.dates.length) {
          const markSpans = Array.from(divContent.matchAll(/<span[^>]*class="mar"[^>]*>([^<]+)<\/span>/g));
          const cellGrades: Array<{ value: string; type: string }> = [];
          
          for (const spanMatch of markSpans) {
            const gradeValue = spanMatch[1].trim();
            if (gradeValue) {
              cellGrades.push({
                value: gradeValue,
                type: title,
              });
            }
          }
          
          if (cellGrades.length > 0) {
            gradesMatrix[cellIndex] = cellGrades;
            if (title) {
            }
          }
        }
      }
    }

    const averageMatch = rowContent.match(/<td[^>]*style="border-left: 3px solid #CCC;"[^>]*><div>([^<]+)<\/div><\/td>/);
    const average = averageMatch ? averageMatch[1].trim() : null;

    const gradesCount = Object.keys(gradesMatrix).length;

    data.subjects.push({
      id: subjectId,
      name: subjectName,
      gradesMatrix: gradesMatrix, // Матрица: индекс даты -> оценки
      average: average || '-',
    });
  }

  return data;
}

