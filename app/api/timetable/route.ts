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
    } catch (error) {
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
      return cachedHtml;
    }
    
    if (cachedSize !== newSize) {
    } else {
    }
    
    try {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cacheFilePath, newHtml, "utf-8");
    } catch (fileError) {
      console.error("Error saving cached timetable:", fileError);
    }
    
    return newHtml;
  } catch (error) {
    console.error(`Error fetching timetable for group ${groupId}:`, error);
    throw error;
  }
}

function getPairTime(pairNumber: number, dayIndex: number): { start: string; end: string } {
  const schedule: Record<number, Record<number, { start: string; end: string }>> = {
    0: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '12.00', end: '12.45' }, 6: { start: '12.55', end: '13.40' }, 
      7: { start: '14.00', end: '14.45' }, 8: { start: '14.55', end: '15.40' }, 9: { start: '16.00', end: '16.45' }, 
      10: { start: '16.55', end: '17.40' }, 11: { start: '17.50', end: '18.35' }, 12: { start: '18.45', end: '19.30' }, 
      13: { start: '19.40', end: '20.25' }
    },
    1: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '12.00', end: '12.45' }, 6: { start: '12.55', end: '13.40' }, 
      7: { start: '14.00', end: '14.45' }, 8: { start: '14.55', end: '15.40' }, 9: { start: '16.00', end: '16.45' }, 
      10: { start: '16.55', end: '17.40' }, 11: { start: '17.50', end: '18.35' }, 12: { start: '18.45', end: '19.30' }, 
      13: { start: '19.40', end: '20.25' }
    },
    2: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '12.00', end: '12.45' }, 6: { start: '12.55', end: '13.40' }, 
      7: { start: '14.00', end: '14.45' }, 8: { start: '14.55', end: '15.40' }, 9: { start: '16.00', end: '16.45' }, 
      10: { start: '16.55', end: '17.40' }, 11: { start: '17.50', end: '18.35' }, 12: { start: '18.45', end: '19.30' }, 
      13: { start: '19.40', end: '20.25' }
    },
    3: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '12.00', end: '12.45' }, 6: { start: '12.55', end: '13.40' }, 
      7: { start: '14.40', end: '15.25' }, 8: { start: '15.35', end: '16.20' }, 9: { start: '16.30', end: '17.15' }, 
      10: { start: '17.25', end: '18.10' }, 11: { start: '18.20', end: '19.05' }, 12: { start: '19.15', end: '20.00' }, 
      13: { start: '20.10', end: '20.55' }
    },
    4: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '12.00', end: '12.45' }, 6: { start: '12.55', end: '13.40' }, 
      7: { start: '14.00', end: '14.45' }, 8: { start: '14.55', end: '15.40' }, 9: { start: '16.00', end: '16.45' }, 
      10: { start: '16.55', end: '17.40' }, 11: { start: '17.50', end: '18.35' }, 12: { start: '18.45', end: '19.30' }, 
      13: { start: '19.40', end: '20.25' }
    },
    5: { 
      1: { start: '8.00', end: '8.45' }, 2: { start: '8.55', end: '9.40' }, 3: { start: '9.50', end: '10.35' }, 
      4: { start: '10.45', end: '11.30' }, 5: { start: '11.40', end: '12.25' }, 6: { start: '12.35', end: '13.20' }, 
      7: { start: '13.40', end: '14.25' }, 8: { start: '14.35', end: '15.20' }, 9: { start: '15.30', end: '16.15' }, 
      10: { start: '16.25', end: '17.10' }, 11: { start: '17.20', end: '18.05' }, 12: { start: '18.15', end: '19.00' }, 
      13: { start: '19.10', end: '19.55' }
    },
  };
  
  return schedule[dayIndex]?.[pairNumber] || { start: '', end: '' };
}

function parseTimetable(html: string, groupId: string, groupName: string): any {
  const data: any = {
    groupId,
    groupName,
    pairs: [],
    dayStartTimes: [{ start: '', end: '' }, { start: '', end: '' }, { start: '', end: '' }, { start: '', end: '' }, { start: '', end: '' }, { start: '', end: '' }],
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
    return data;
  }
  
  const rowMatches = Array.from(tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g));
  
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

        const leftColumnStartMatch = pairContent.match(/<div[^>]*class="[^"]*left-column[^"]*"[^>]*>/i);
        if (leftColumnStartMatch) {
          const leftColumnStartPos = leftColumnStartMatch.index || 0;
          const leftColumnTagStart = leftColumnStartPos + leftColumnStartMatch[0].length;
          
          let depth = 1;
          let pos = leftColumnTagStart;
          let leftColumnEndPos = -1;
          const maxDepthIterations = 100;
          let depthIterations = 0;
          
          while (pos < pairContent.length && depth > 0 && depthIterations < maxDepthIterations) {
            depthIterations++;
            const nextDivOpen = pairContent.indexOf('<div', pos);
            const nextDivClose = pairContent.indexOf('</div>', pos);
            
            if (nextDivClose === -1) break;
            
            if (nextDivOpen !== -1 && nextDivOpen < nextDivClose) {
              depth++;
              pos = nextDivOpen + 4;
            } else {
              depth--;
              if (depth === 0) {
                leftColumnEndPos = nextDivClose;
                break;
              }
              pos = nextDivClose + 6;
            }
          }
          
          if (leftColumnEndPos !== -1) {
            const leftColumnContent = pairContent.substring(leftColumnTagStart, leftColumnEndPos);
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
        }

        const rightColumnStartMatch = pairContent.match(/<div[^>]*class="[^"]*right-column[^"]*"[^>]*>/i);
        if (rightColumnStartMatch) {
          const rightColumnStartPos = rightColumnStartMatch.index || 0;
          const rightColumnTagStart = rightColumnStartPos + rightColumnStartMatch[0].length;
          
          let depth = 1;
          let pos = rightColumnTagStart;
          let rightColumnEndPos = -1;
          const maxDepthIterations = 100;
          let depthIterations = 0;
          
          while (pos < pairContent.length && depth > 0 && depthIterations < maxDepthIterations) {
            depthIterations++;
            const nextDivOpen = pairContent.indexOf('<div', pos);
            const nextDivClose = pairContent.indexOf('</div>', pos);
            
            if (nextDivClose === -1) break;
            
            if (nextDivOpen !== -1 && nextDivOpen < nextDivClose) {
              depth++;
              pos = nextDivOpen + 4;
            } else {
              depth--;
              if (depth === 0) {
                rightColumnEndPos = nextDivClose;
                break;
              }
              pos = nextDivClose + 6;
            }
          }
          
          if (rightColumnEndPos !== -1) {
            const rightColumnContent = pairContent.substring(rightColumnTagStart, rightColumnEndPos);
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
        }
        
        if (pairData.subject && (!pairData.teacher || !pairData.room)) {
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
  
  
  for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
    const dayPairs = data.pairs.filter((p: any) => {
      if (p.day !== dayIndex) return false;
      if (!p.subject) return false;
      const subjectTrimmed = p.subject.trim();
      if (subjectTrimmed === '' || subjectTrimmed === 'Урок снят') return false;
      if (p.status === 'removed') return false;
      if (p.status === 'cancelled') return false;
      return p.status === 'added' || p.status === 'normal' || p.status === 'replaced' || !p.status;
    });
    if (dayPairs.length > 0) {
      const firstPair = dayPairs.reduce((min: any, p: any) => p.pairNumber < min.pairNumber ? p : min, dayPairs[0]);
      const lastPair = dayPairs.reduce((max: any, p: any) => p.pairNumber > max.pairNumber ? p : max, dayPairs[0]);
      const firstTime = getPairTime(firstPair.pairNumber, dayIndex);
      const lastTime = getPairTime(lastPair.pairNumber, dayIndex);
      data.dayStartTimes[dayIndex] = {
        start: firstTime.start,
        end: lastTime.end
      };
    }
  }
  
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


    const groups = await getGroupsFromLoginPage();
    const userGroup = groups.find(g => g.id === groupId);

    if (!userGroup) {
      return NextResponse.json({
        success: false,
        error: `Group with ID ${groupId} not found`,
      });
    }


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

    
    const html = await fetchTimetablePage(timetableId, userGroup.id);

    const timetableData = parseTimetable(html, timetableId, userGroup.name);

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

