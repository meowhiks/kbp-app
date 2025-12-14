import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  LOGIN_DATA: 'ej_login_data',
  COOKIES: 'ej_cookies',
  GROUP_ID: 'ej_group_id',
  JOURNAL_DATA: 'journal_data',
  TIMETABLE_DATA: 'timetable_data',
  GROUPS: 'groups_cache',
  GROUPS_TIMESTAMP: 'groups_cache_timestamp',
};

export const storage = {
  async setLoginData(data: { student_name: string; group_id: string; birth_day: string }) {
    await AsyncStorage.setItem(KEYS.LOGIN_DATA, JSON.stringify(data));
  },

  async getLoginData(): Promise<{ student_name: string; group_id: string; birth_day: string } | null> {
    const data = await AsyncStorage.getItem(KEYS.LOGIN_DATA);
    return data ? JSON.parse(data) : null;
  },

  async setCookies(cookies: string) {
    await AsyncStorage.setItem(KEYS.COOKIES, cookies);
  },

  async getCookies(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.COOKIES);
  },

  async setGroupId(groupId: string) {
    await AsyncStorage.setItem(KEYS.GROUP_ID, groupId);
  },

  async getGroupId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.GROUP_ID);
  },

  async setJournalData(data: any) {
    await AsyncStorage.setItem(KEYS.JOURNAL_DATA, JSON.stringify(data));
  },

  async getJournalData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.JOURNAL_DATA);
    return data ? JSON.parse(data) : null;
  },

  async setTimetableData(data: any) {
    await AsyncStorage.setItem(KEYS.TIMETABLE_DATA, JSON.stringify(data));
  },

  async getTimetableData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.TIMETABLE_DATA);
    return data ? JSON.parse(data) : null;
  },

  async setGroups(groups: any[]) {
    await AsyncStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
    await AsyncStorage.setItem(KEYS.GROUPS_TIMESTAMP, Date.now().toString());
  },

  async getGroups(): Promise<any[] | null> {
    const data = await AsyncStorage.getItem(KEYS.GROUPS);
    return data ? JSON.parse(data) : null;
  },

  async getGroupsTimestamp(): Promise<number | null> {
    const timestamp = await AsyncStorage.getItem(KEYS.GROUPS_TIMESTAMP);
    return timestamp ? parseInt(timestamp, 10) : null;
  },

  async clearAll() {
    await AsyncStorage.multiRemove([
      KEYS.LOGIN_DATA,
      KEYS.COOKIES,
      KEYS.GROUP_ID,
      KEYS.JOURNAL_DATA,
      KEYS.TIMETABLE_DATA,
      KEYS.GROUPS,
      KEYS.GROUPS_TIMESTAMP,
    ]);
  },
};

