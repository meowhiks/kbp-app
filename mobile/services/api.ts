import { storage } from '../utils/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const FALLBACK_API_URL = 'https://kbp-app.vercel.app';

async function fetchWithFallback(
  primaryUrl: string,
  fallbackUrl: string,
  options: RequestInit
): Promise<Response> {
  try {
    console.log(`[fetchWithFallback] Trying primary URL: ${primaryUrl}`);
    const response = await fetch(primaryUrl, options);
    
    if (response.ok) {
      console.log(`[fetchWithFallback] Primary URL succeeded: ${primaryUrl}`);
      return response;
    }
    
    console.log(`[fetchWithFallback] Primary URL failed with status ${response.status}, trying fallback`);
    throw new Error(`Primary request failed with status ${response.status}`);
  } catch (error) {
    console.log(`[fetchWithFallback] Primary URL error, trying fallback: ${fallbackUrl}`, error);
    try {
      const fallbackResponse = await fetch(fallbackUrl, options);
      console.log(`[fetchWithFallback] Fallback URL succeeded: ${fallbackUrl}`);
      return fallbackResponse;
    } catch (fallbackError) {
      console.error(`[fetchWithFallback] Both URLs failed. Primary: ${primaryUrl}, Fallback: ${fallbackUrl}`, fallbackError);
      throw fallbackError;
    }
  }
}

export interface Group {
  id: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  cookies?: string;
  error?: string;
}

export interface JournalResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface TimetableResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface BotLinkResponse {
  success: boolean;
  link?: string;
  token?: string;
  error?: string;
}


function parseGroupsFromHTML(html: string): Group[] {
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
}

export const api = {
  async getGroups(useCache: boolean = true): Promise<Group[]> {
    
    if (useCache) {
      const cachedGroups = await storage.getGroups();
      const cacheTimestamp = await storage.getGroupsTimestamp();
      
      if (cachedGroups && cacheTimestamp) {
        const cacheAge = Date.now() - cacheTimestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge < maxAge && cachedGroups.length > 0) {
          return cachedGroups;
        }
      }
    }

    try {
      const directUrl = `https://ej.kbp.by/templates/login_parent.php`;
      console.log(`[api.getGroups] Trying direct request to: ${directUrl}`);
      
      const directResponse = await fetch(directUrl, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      
      if (directResponse.ok) {
        const html = await directResponse.text();
        const groups = parseGroupsFromHTML(html);
        
        if (groups.length > 0) {
          console.log(`[api.getGroups] Successfully loaded ${groups.length} groups directly from ej.kbp.by`);
          await storage.setGroups(groups);
          return groups;
        }
      }
      
      throw new Error('Direct request failed or returned empty results');
    } catch (directError) {
      console.log(`[api.getGroups] Direct request failed, trying fallback: ${FALLBACK_API_URL}/api/groups`, directError);
      
      try {
        const response = await fetch(`${FALLBACK_API_URL}/api/groups`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log(`[api.getGroups] Fallback response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[api.getGroups] Fallback response data:', {
          success: result.success,
          groupsCount: result.groups?.length || 0,
          hasGroups: !!result.groups,
          isArray: Array.isArray(result.groups),
        });
        
        if (result.success && result.groups && Array.isArray(result.groups) && result.groups.length > 0) {
          console.log(`[api.getGroups] Successfully loaded ${result.groups.length} groups from fallback`);
          await storage.setGroups(result.groups);
          return result.groups;
        }
        
        console.warn('[api.getGroups] Fallback returned empty or invalid groups');
      } catch (fallbackError) {
        console.error('[api.getGroups] Fallback also failed:', fallbackError);
      }
      
      if (useCache) {
        const cachedGroups = await storage.getGroups();
        if (cachedGroups && cachedGroups.length > 0) {
          console.log('[api.getGroups] Using cached groups due to all requests failing');
          return cachedGroups;
        }
      }
      
      return [];
    }
  },

  async login(studentName: string, groupId: string, birthDay: string): Promise<LoginResponse> {
    const response = await fetchWithFallback(
      `${API_BASE_URL}/api/login`,
      `${FALLBACK_API_URL}/api/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: studentName,
          group_id: groupId,
          birth_day: birthDay,
        }),
      }
    );
    return response.json();
  },

  async getJournal(cookies: string): Promise<JournalResponse> {
    const response = await fetchWithFallback(
      `${API_BASE_URL}/api/journal`,
      `${FALLBACK_API_URL}/api/journal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookies }),
      }
    );
    return response.json();
  },

  async getTimetable(groupId: string, signal?: AbortSignal): Promise<TimetableResponse> {
    const response = await fetchWithFallback(
      `${API_BASE_URL}/api/timetable`,
      `${FALLBACK_API_URL}/api/timetable`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
        signal,
      }
    );
    return response.json();
  },

  async getBotLink(
    studentName: string,
    groupId: string,
    birthDay: string,
    cookies: string
  ): Promise<BotLinkResponse> {
    const response = await fetchWithFallback(
      `${API_BASE_URL}/api/bot/link`,
      `${FALLBACK_API_URL}/api/bot/link`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: studentName,
          group_id: groupId,
          birth_day: birthDay,
          cookies,
        }),
      }
    );
    return response.json();
  },
};

