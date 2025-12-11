import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";

interface Group {
  id: string;
  name: string;
}

async function fetchMainTimetablePage(): Promise<string> {
  try {
    const url = "https://kbp.by/rasp/timetable/view_beta_kbp/";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });
    
    const html = await response.text();
    
    try {
      const filePath = join(process.cwd(), "timetable-main.html");
      await writeFile(filePath, html, "utf-8");
      console.log("Main timetable HTML saved to:", filePath);
    } catch (fileError) {
      console.error("Error saving main timetable HTML:", fileError);
    }
    
    return html;
  } catch (error) {
    console.error("Error fetching main timetable page:", error);
    throw error;
  }
}

function parseGroupsFromTimetable(html: string): Record<string, string> {
  const groupMap: Record<string, string> = {};
  
  const linkMatches = html.matchAll(/<a[^>]*href="[^"]*\?page=stable&amp;cat=group&amp;id=(\d+)"[^>]*>([^<]+)<\/a>/g);
  
  for (const match of linkMatches) {
    const timetableId = match[1];
    const groupName = match[2].trim();
    if (timetableId && groupName) {
      groupMap[groupName] = timetableId;
    }
  }
  
  console.log(`Found ${Object.keys(groupMap).length} groups in timetable`);
  return groupMap;
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
    
    console.log(`Found ${groups.length} groups from login page`);
    return groups;
  } catch (error) {
    console.error("Error fetching groups from login page:", error);
    return [];
  }
}

async function fetchTimetablePage(groupId: string, journalGroupId: string): Promise<string> {
  try {
    const cacheDir = join(process.cwd(), "timetable-cached");
    const cacheFilePath = join(cacheDir, `timetable-${journalGroupId}.html`);
    
    let cachedHtml: string | null = null;
    let cachedSize = 0;
    
    try {
      await mkdir(cacheDir, { recursive: true });
      const cachedContent = await readFile(cacheFilePath, "utf-8");
      cachedHtml = cachedContent;
      cachedSize = cachedContent.length;
      console.log(`Found cached timetable for group ${journalGroupId}, size: ${cachedSize} bytes`);
    } catch (error) {
      console.log(`No cached timetable found for group ${journalGroupId}`);
    }
    
    const url = `https://kbp.by/rasp/timetable/view_beta_kbp/?page=stable&cat=group&id=${groupId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });
    
    const newHtml = await response.text();
    const newSize = newHtml.length;
    
    if (cachedHtml && cachedSize === newSize) {
      console.log(`Timetable for group ${journalGroupId} unchanged (${newSize} bytes), using cache`);
      return cachedHtml;
    }
    
    if (cachedSize !== newSize) {
      console.log(`Timetable for group ${journalGroupId} changed: ${cachedSize} -> ${newSize} bytes, updating cache`);
    } else {
      console.log(`Saving new timetable for group ${journalGroupId} (${newSize} bytes)`);
    }
    
    try {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cacheFilePath, newHtml, "utf-8");
      console.log(`Timetable cached for group ${journalGroupId}:`, cacheFilePath);
    } catch (fileError) {
      console.error("Error saving cached timetable:", fileError);
    }
    
    return newHtml;
  } catch (error) {
    console.error(`Error fetching timetable for group ${groupId}:`, error);
    throw error;
  }
}

function parseTimetable(html: string, groupId: string, groupName: string): any {
  const data: any = {
    groupId,
    groupName,
    pairs: [],
  };

  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  const tableMatches = Array.from(html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi));
  let tableContent = '';
  
  for (const match of tableMatches) {
    const content = match[1];
    if (content.includes('pair-number') && content.includes('day=')) {
      tableContent = content;
      break;
    }
  }
  
  if (!tableContent) {
    console.log("Timetable table not found in HTML");
    console.log("HTML length:", html.length);
    return data;
  }
  
  const rowMatches = Array.from(tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g));
  console.log(`Found ${rowMatches.length} table rows`);
  
  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    
    const pairNumberMatch = rowContent.match(/<td[^>]*class="[^"]*number[^"]*"[^>]*>(\d+)<\/td>/);
    if (!pairNumberMatch) continue;
    
    const pairNumber = parseInt(pairNumberMatch[1]);
    
    const dayCells = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g));
    
    if (dayCells.length < 8) continue;
    
    for (let cellIndex = 1; cellIndex < dayCells.length - 1; cellIndex++) {
      const cellContent = dayCells[cellIndex][1];
      
      let dayIndex: number | null = null;
      
      const dayCommentMatch = cellContent.match(/<!--[^>]*day="(\d+)"[^>]*-->/);
      if (dayCommentMatch) {
        const dayFromComment = parseInt(dayCommentMatch[1]);
        if (dayFromComment >= 1 && dayFromComment <= 6) {
          dayIndex = dayFromComment - 1;
        }
      }
      
      if (dayIndex === null) {
        dayIndex = cellIndex - 1;
        if (dayIndex < 0 || dayIndex > 5) continue;
      }
      
      if (cellContent.includes('empty-pair') && !cellContent.includes('pair')) {
        continue;
      }
      
      let pairStartIndex = 0;
      const maxIterations = 100;
      let iterations = 0;
      
      while (pairStartIndex < cellContent.length && iterations < maxIterations) {
        iterations++;
        const pairStartMatch = cellContent.substring(pairStartIndex).match(/<div[^>]*class="([^"]*)"[^>]*>/i);
        if (!pairStartMatch) break;
        
        const pairStartPos = pairStartIndex + (pairStartMatch.index || 0);
        const pairClasses = pairStartMatch[1] || '';
        const pairTagStart = pairStartPos + pairStartMatch[0].length;
        
        if (!pairClasses || !pairClasses.includes('pair')) {
          pairStartIndex = pairTagStart + 1;
          if (pairStartIndex >= cellContent.length) break;
          continue;
        }
        
        let depth = 1;
        let pos = pairTagStart;
        let pairEndPos = -1;
        const maxDepthIterations = 1000;
        let depthIterations = 0;
        
        while (pos < cellContent.length && depth > 0 && depthIterations < maxDepthIterations) {
          depthIterations++;
          const nextDivOpen = cellContent.indexOf('<div', pos);
          const nextDivClose = cellContent.indexOf('</div>', pos);
          
          if (nextDivClose === -1) break;
          
          if (nextDivOpen !== -1 && nextDivOpen < nextDivClose) {
            depth++;
            pos = nextDivOpen + 4;
          } else {
            depth--;
            if (depth === 0) {
              pairEndPos = nextDivClose;
              break;
            }
            pos = nextDivClose + 6;
          }
        }
        
        if (pairEndPos === -1) {
          pairStartIndex = pairTagStart + 1;
          if (pairStartIndex >= cellContent.length) break;
          continue;
        }
        
        const pairContent = cellContent.substring(pairTagStart, pairEndPos);
        
        if (!pairContent || pairContent.trim().length === 0) {
          pairStartIndex = pairEndPos + 6;
          if (pairStartIndex >= cellContent.length) break;
          continue;
        }
      
        const pairData: any = {
          pairNumber,
          day: dayIndex,
          dayName: weekDays[dayIndex],
          subject: '',
          teacher: '',
          room: '',
          status: 'normal',
        };

        const subjectMatch = pairContent.match(/<div[^>]*class="[^"]*subject[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
        if (subjectMatch) {
          pairData.subject = subjectMatch[1].trim();
        }

        const leftColumnMatch = pairContent.match(/<div[^>]*class="[^"]*left-column[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (leftColumnMatch) {
          const leftColumnContent = leftColumnMatch[1];
          const teacherDivMatches = leftColumnContent.matchAll(/<div[^>]*class="[^"]*teacher[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
          const teachers: string[] = [];
          for (const teacherDivMatch of teacherDivMatches) {
            const teacherDivContent = teacherDivMatch[1];
            const teacherLinkMatches = teacherDivContent.matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
            for (const teacherLinkMatch of teacherLinkMatches) {
              const teacher = teacherLinkMatch[1].trim();
              if (teacher && teacher.length > 0 && teacher !== '&nbsp;' && teacher !== '') {
                teachers.push(teacher);
              }
            }
          }
          pairData.teacher = teachers.filter(t => t && t.length > 0).join(', ');
        }

        const rightColumnMatch = pairContent.match(/<div[^>]*class="[^"]*right-column[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (rightColumnMatch) {
          const rightColumnContent = rightColumnMatch[1];
          const placeDivMatch = rightColumnContent.match(/<div[^>]*class="[^"]*place[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (placeDivMatch) {
            const placeDivContent = placeDivMatch[1];
            const placeLinkMatches = placeDivContent.matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
            for (const placeLinkMatch of placeLinkMatches) {
              const room = placeLinkMatch[1].trim();
              if (room && room.length > 0 && room !== '&nbsp;' && room !== '') {
                pairData.room = room;
                break;
              }
            }
          }
        }
        
        if (pairData.subject && (!pairData.teacher || !pairData.room)) {
          console.log(`Pair ${pairData.pairNumber} day ${pairData.day}: subject="${pairData.subject}", teacher="${pairData.teacher}", room="${pairData.room}"`);
        }

        if (pairClasses.includes('added')) {
          pairData.status = 'added';
        } else if (pairClasses.includes('replaced')) {
          pairData.status = 'replaced';
        } else if (pairClasses.includes('removed')) {
          pairData.status = 'removed';
        } else if (pairClasses.includes('cancelled')) {
          pairData.status = 'cancelled';
        }
        
        if (pairData.subject) {
          data.pairs.push(pairData);
        }
        
        pairStartIndex = pairEndPos + 6;
        
        if (pairStartIndex >= cellContent.length) {
          break;
        }
      }
    }
  }
  
  console.log(`Parsed ${data.pairs.length} pairs for group ${groupName}`);
  const pairsByPairNumber: Record<number, number> = {};
  data.pairs.forEach((p: any) => {
    pairsByPairNumber[p.pairNumber] = (pairsByPairNumber[p.pairNumber] || 0) + 1;
  });
  console.log(`Pairs by number:`, pairsByPairNumber);
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Group ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching timetable for group ID: ${groupId}`);

    const groups = await getGroupsFromLoginPage();
    const userGroup = groups.find(g => g.id === groupId);

    if (!userGroup) {
      return NextResponse.json({
        success: false,
        error: `Group with ID ${groupId} not found`,
      });
    }

    console.log(`Found group: ${userGroup.name}`);

    const mainPageHtml = await fetchMainTimetablePage();
    const timetableGroupMap = parseGroupsFromTimetable(mainPageHtml);
    
    const timetableId = timetableGroupMap[userGroup.name];
    
    if (!timetableId) {
      console.error(`Group ${userGroup.name} not found in timetable. Available groups:`, Object.keys(timetableGroupMap));
      return NextResponse.json({
        success: false,
        error: `Group ${userGroup.name} not found in timetable`,
      });
    }

    console.log(`Mapping: ${userGroup.name} (journal ID: ${userGroup.id}) -> timetable ID: ${timetableId}`);
    
    const html = await fetchTimetablePage(timetableId, userGroup.id);
    console.log(`Timetable HTML fetched, length: ${html.length}`);

    const timetableData = parseTimetable(html, timetableId, userGroup.name);
    console.log(`Timetable parsed successfully, ${timetableData.pairs.length} pairs found`);

    return NextResponse.json({
      success: true,
      data: timetableData,
      group: {
        journalId: userGroup.id,
        timetableId: timetableId,
        name: userGroup.name,
      },
    });
  } catch (error) {
    console.error("Timetable fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

