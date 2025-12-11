"use client";

import React, { useEffect, useState } from "react";

interface Subject {
  id: string;
  name: string;
  gradesMatrix: Record<number, Array<{ value: string; type: string }>>;
  average: string;
}

export default function DashboardPage() {
  const [journalData, setJournalData] = useState<any>(null);
  const [timetableData, setTimetableData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  useEffect(() => {
    // Функция для автоматического входа
    const performAutoLogin = async () => {
      const loginDataStr = localStorage.getItem("ej_login_data");
      if (!loginDataStr) {
        setError("Данные для входа не найдены. Пожалуйста, войдите снова.");
        setLoading(false);
        return;
      }

      try {
        const loginData = JSON.parse(loginDataStr);
        console.log("Performing auto-login...");

        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        const result = await response.json();

        if (result.success && result.cookies) {
          localStorage.setItem("ej_cookies", result.cookies);
          // После успешного входа загружаем журнал
          await fetchJournal(result.cookies);
        } else {
          setError("Ошибка автоматического входа. Пожалуйста, войдите снова.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Auto-login error:", err);
        setError("Ошибка автоматического входа. Пожалуйста, войдите снова.");
        setLoading(false);
      }
    };

    // Функция для загрузки расписания
    const fetchTimetable = async (groupId: string) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const timetableResponse = await fetch("/api/timetable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId: groupId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!timetableResponse.ok) {
          throw new Error(`HTTP error! status: ${timetableResponse.status}`);
        }

        const timetableResult = await timetableResponse.json();

        if (timetableResult.success) {
          console.log("Timetable data received:", timetableResult.data);
          localStorage.setItem("timetable_data", JSON.stringify(timetableResult.data));
          setTimetableData(timetableResult.data);
        } else {
          console.error("Error fetching timetable:", timetableResult.error);
        }
      } catch (timetableError: any) {
        if (timetableError.name === 'AbortError') {
          console.error("Timetable fetch timeout after 30 seconds");
        } else {
          console.error("Error fetching timetable:", timetableError);
        }
      }
    };

    // Функция для загрузки журнала
    const fetchJournal = async (cookies: string) => {
      try {
        const journalResponse = await fetch("/api/journal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cookies: cookies,
          }),
        });

        const journalResult = await journalResponse.json();

        if (journalResult.success) {
          // Сохраняем данные журнала
          localStorage.setItem("journal_data", JSON.stringify(journalResult.data));
          setJournalData(journalResult.data);
          setError("");
          setLoading(false);
          
          // Загружаем расписание асинхронно (не блокируем отображение журнала)
          const savedGroupId = localStorage.getItem("ej_group_id");
          if (savedGroupId) {
            fetchTimetable(savedGroupId).catch((timetableErr) => {
              console.error("Error loading timetable:", timetableErr);
            });
          }
        } else {
          // Если журнал недоступен, пробуем перезайти
          console.log("Journal not available, attempting auto-login...");
          await performAutoLogin();
        }
      } catch (journalError) {
        console.error("Error fetching journal:", journalError);
        // При ошибке пробуем перезайти
        await performAutoLogin();
      }
    };

    const loadJournal = async () => {
      // Проверяем, есть ли сохраненное расписание
      const savedTimetable = localStorage.getItem("timetable_data");
      if (savedTimetable) {
        try {
          setTimetableData(JSON.parse(savedTimetable));
        } catch (e) {
          console.error("Error parsing saved timetable:", e);
        }
      }
      
      // Сначала проверяем, есть ли сохраненные cookies
      const savedCookies = localStorage.getItem("ej_cookies");
      
      if (savedCookies) {
        // Пробуем загрузить журнал с сохраненными cookies
        await fetchJournal(savedCookies);
      } else {
        // Если cookies нет, пробуем автоматический вход
        await performAutoLogin();
      }
    };

    loadJournal();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Загрузка журнала...</div>
          {error && (
            <div className="text-sm text-gray-400 mt-2">{error}</div>
          )}
        </div>
      </div>
    );
  }

  if (error && !journalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">
            Ошибка загрузки
          </h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => {
              localStorage.removeItem("ej_login_data");
              localStorage.removeItem("ej_cookies");
              localStorage.removeItem("journal_data");
              window.location.href = "/";
            }}
            className="bg-[#3390ec] hover:bg-[#2d7fd6] text-white font-medium py-2 px-4 rounded-xl transition-colors"
          >
            Войти заново
          </button>
        </div>
      </div>
    );
  }

  if (!journalData || !journalData.subjects || journalData.subjects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">
            Данные журнала не найдены
          </h1>
          <p className="text-gray-500 mb-4">
            Пожалуйста, войдите снова для получения данных
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("ej_login_data");
              localStorage.removeItem("ej_cookies");
              localStorage.removeItem("journal_data");
              window.location.href = "/";
            }}
            className="bg-[#3390ec] hover:bg-[#2d7fd6] text-white font-medium py-2 px-4 rounded-xl transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  const dates = journalData.dates || [];
  const months = journalData.months || [];
  const monthColspans = journalData.monthColspans || [];

  // Вычисляем позиции месяцев
  let monthStartPositions: number[] = [];
  let currentPos = 0;
  monthColspans.forEach((colspan: number) => {
    monthStartPositions.push(currentPos);
    currentPos += colspan;
  });

  const normalizeSubjectName = (name: string) => {
    return name.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,\-_]/g, '')
      .trim();
  };

  const getSubjectGrades = (subjectName: string) => {
    if (!journalData || !journalData.subjects) return null;
    const normalizedTimetableName = normalizeSubjectName(subjectName);
    const subject = journalData.subjects.find((s: Subject) => {
      const normalizedJournalName = normalizeSubjectName(s.name);
      return normalizedJournalName === normalizedTimetableName ||
        normalizedJournalName.includes(normalizedTimetableName) ||
        normalizedTimetableName.includes(normalizedJournalName);
    });
    return subject;
  };

  const getMonthForDateIndex = (dateIndex: number) => {
    if (!journalData || !journalData.monthColspans || !journalData.months) return null;
    
    let currentPos = 0;
    for (let i = 0; i < journalData.monthColspans.length; i++) {
      const colspan = journalData.monthColspans[i];
      if (dateIndex >= currentPos && dateIndex < currentPos + colspan) {
        return {
          monthIndex: i,
          monthName: journalData.months[i],
        };
      }
      currentPos += colspan;
    }
    return null;
  };

  const parseMonthName = (monthName: string): number | null => {
    const monthNames: Record<string, number> = {
      'январь': 0, 'февраль': 1, 'март': 2, 'апрель': 3,
      'май': 4, 'июнь': 5, 'июль': 6, 'август': 7,
      'сентябрь': 8, 'октябрь': 9, 'ноябрь': 10, 'декабрь': 11,
    };
    const normalized = monthName.toLowerCase().trim();
    return monthNames[normalized] !== undefined ? monthNames[normalized] : null;
  };

  const getDateIndexForWeekDay = (weekDay: number) => {
    if (!journalData || !journalData.dates || !journalData.months || !journalData.monthColspans) return null;
    
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + weekDay);
    
    const targetDay = targetDate.getDate();
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    for (let dateIndex = 0; dateIndex < journalData.dates.length; dateIndex++) {
      const dateStr = journalData.dates[dateIndex];
      const dateDay = parseInt(dateStr);
      
      if (dateDay === targetDay) {
        const monthInfo = getMonthForDateIndex(dateIndex);
        if (monthInfo) {
          const journalMonth = parseMonthName(monthInfo.monthName);
          if (journalMonth !== null && journalMonth === targetMonth) {
            return dateIndex;
          }
        }
      }
    }
    
    return null;
  };

  const getGradesForWeekDay = (subject: Subject | null, weekDay: number) => {
    if (!subject || !subject.gradesMatrix) return [];
    const dateIdx = getDateIndexForWeekDay(weekDay);
    if (dateIdx === null) return [];
    return subject.gradesMatrix[dateIdx] || [];
  };

  const getCurrentPair = () => {
    if (!timetableData || !timetableData.pairs) return null;
    
    const now = new Date();
    const currentDay = now.getDay();
    const dayIndex = currentDay === 0 ? 6 : currentDay - 1;
    
    if (dayIndex >= 6) return null;
    
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;
    
    const dayPairs = timetableData.pairs.filter((p: any) => {
      if (p.day !== dayIndex) return false;
      if (!p.subject) return false;
      const subjectTrimmed = p.subject.trim();
      if (subjectTrimmed === '') return false;
      if (subjectTrimmed.toLowerCase().includes('урок снят')) return false;
      if (subjectTrimmed === 'Урок снят') return false;
      if (p.status === 'removed') return false;
      if (p.status === 'cancelled') return false;
      return p.status === 'added' || p.status === 'normal' || p.status === 'replaced' || !p.status;
    });
    
    if (dayPairs.length === 0) return null;
    
    const getPairTimeMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split('.').map(Number);
      return hours * 60 + minutes;
    };
    
    for (const pair of dayPairs.sort((a: any, b: any) => a.pairNumber - b.pairNumber)) {
      const pairTime = getPairTime(pair.pairNumber, dayIndex);
      if (!pairTime.start || !pairTime.end) continue;
      
      const startMinutes = getPairTimeMinutes(pairTime.start);
      const endMinutes = getPairTimeMinutes(pairTime.end);
      
      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        return { pairNumber: pair.pairNumber, day: dayIndex };
      }
    }
    
    for (const pair of dayPairs.sort((a: any, b: any) => a.pairNumber - b.pairNumber)) {
      const pairTime = getPairTime(pair.pairNumber, dayIndex);
      if (!pairTime.start) continue;
      
      const startMinutes = getPairTimeMinutes(pairTime.start);
      
      if (currentTime < startMinutes) {
        return { pairNumber: pair.pairNumber, day: dayIndex };
      }
    }
    
    return null;
  };

  const getPairTime = (pairNumber: number, dayIndex: number): { start: string; end: string } => {
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
  };

  const currentPair = getCurrentPair();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-3 px-1">
          Электронный журнал
        </h1>

        <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm bg-white">
          <table className="border-collapse text-xs" cellSpacing="0" cellPadding="0" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '128px', minWidth: '128px' }} />
              {dates.map((_date: string, idx: number) => (
                <col key={idx} style={{ width: '32px', minWidth: '24px', maxWidth: '32px' }} />
              ))}
              <col style={{ width: '48px', minWidth: '48px' }} />
            </colgroup>
            {/* Заголовок с месяцами */}
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="border-r border-gray-200 px-2 py-1.5 text-left font-semibold text-[11px] sticky left-0 z-10 bg-gray-50">
                  Предмет
                </th>
                {monthStartPositions.map((startPos, idx) => (
                  <th
                    key={idx}
                    colSpan={monthColspans[idx]}
                    className="border-r border-gray-200 px-1 py-1.5 text-center font-semibold text-[10px] bg-gray-100/50"
                  >
                    {months[idx]}
                  </th>
                ))}
                <th className="border-l-2 border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px] bg-gray-50">
                  Ср.зн
                </th>
              </tr>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <td className="border-r border-gray-200 sticky left-0 z-10 bg-gray-50/50"></td>
                {dates.map((date: string, idx: number) => (
                  <td
                    key={idx}
                    className="border-r border-gray-200 px-0.5 py-0.5 text-center text-[9px] text-gray-600 font-medium"
                  >
                    {date}
                  </td>
                ))}
                <td className="border-l-2 border-gray-300"></td>
              </tr>
            </thead>
            <tbody>
              {journalData.subjects.map((subject: Subject) => (
                <tr
                  key={subject.id}
                  className="border-b border-gray-300 hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer group"
                >
                  <td className="border-r border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 transition-colors">
                    {subject.name}
                  </td>
                  {dates.map((date: string, dateIdx: number) => {
                    const grades = subject.gradesMatrix?.[dateIdx] || [];
                    const gradesCount = grades.length;
                    
                    const getTooltipText = () => {
                      if (grades.length === 0) return '';
                      const types = grades.map(g => g.type && g.type.trim() ? g.type : null).filter(Boolean);
                      if (types.length > 0) {
                        const uniqueTypes = [...new Set(types)];
                        return `${date} - ${uniqueTypes.join(', ')}`;
                      }
                      return date;
                    };
                    
                    const getLayoutStyle = (): React.CSSProperties => {
                      if (gradesCount === 0) return {};
                      if (gradesCount === 1) {
                        return {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                        };
                      } else if (gradesCount === 2) {
                        return {
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '1px',
                          height: '100%',
                        };
                      } else if (gradesCount === 3) {
                        return {
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gridTemplateRows: '1fr 1fr',
                          gap: '1px',
                          height: '100%',
                          padding: '1px',
                        };
                      } else {
                        return {
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gridTemplateRows: '1fr 1fr',
                          gap: '1px',
                          height: '100%',
                          padding: '1px',
                        };
                      }
                    };
                    
                      return (
                        <td
                          key={dateIdx}
                          className="border-r border-gray-300 text-center align-middle cursor-help group-hover:bg-blue-50/30 transition-colors"
                          style={{ 
                            minWidth: '24px',
                            minHeight: '24px',
                            maxWidth: '32px',
                            maxHeight: '32px',
                            width: '32px',
                            height: '32px',
                            padding: '2px',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            backgroundColor: '#fefce8',
                          }}
                          title={grades.length > 0 ? getTooltipText() : undefined}
                        >
                        {grades.length > 0 ? (
                          <div style={getLayoutStyle()}>
                            {grades.slice(0, 4).map((grade, gradeIdx) => {
                              if (gradesCount === 3 && gradeIdx === 2) {
                                return (
                                  <span
                                    key={gradeIdx}
                                    className="inline-flex items-center justify-center text-[9px] font-medium text-gray-900 leading-none"
                                    style={{
                                      gridColumn: '1 / 3',
                                    }}
                                  >
                                    {grade.value}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  key={gradeIdx}
                                  className="inline-flex items-center justify-center text-[9px] font-medium text-gray-900 leading-none"
                                >
                                  {grade.value}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                        <td className="border-l-2 border-gray-300 px-1.5 py-1 text-center font-bold text-[11px] bg-gray-50 text-gray-900 group-hover:bg-blue-50/30 transition-colors">
                          {subject.average}
                        </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {timetableData && timetableData.pairs && timetableData.pairs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-lg font-medium text-gray-900">
                Расписание: {timetableData.groupName || 'Группа'}
              </h2>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRemoved}
                  onChange={(e) => setShowRemoved(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="hidden sm:inline">Показать снятые пары</span>
                <span className="sm:hidden">Снятые</span>
              </label>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto overflow-y-hidden -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full border-collapse text-sm" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-10 bg-gray-100">#</th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Пн</div>
                        {timetableData?.dayStartTimes?.[0]?.start && (
                            <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[0].start} - {timetableData.dayStartTimes[0].end}</div>
                          </div>
                        )}
                      </th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Вт</div>
                        {timetableData?.dayStartTimes?.[1]?.start && (
                          <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[1].start} - {timetableData.dayStartTimes[1].end}</div>
                          </div>
                        )}
                      </th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Ср</div>
                        {timetableData?.dayStartTimes?.[2]?.start && (
                          <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[2].start} - {timetableData.dayStartTimes[2].end}</div>
                          </div>
                        )}
                      </th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Чт</div>
                        {timetableData?.dayStartTimes?.[3]?.start && (
                          <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[3].start} - {timetableData.dayStartTimes[3].end}</div>
                          </div>
                        )}
                      </th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Пт</div>
                        {timetableData?.dayStartTimes?.[4]?.start && (
                          <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[4].start} - {timetableData.dayStartTimes[4].end}</div>
                          </div>
                        )}
                      </th>
                      <th className="px-2 py-2 text-center font-semibold text-xs w-[calc((100%-40px)/6)]">
                        <div>Сб</div>
                        {timetableData?.dayStartTimes?.[5]?.start && (
                          <div className="text-[9px] font-normal text-gray-600 mt-0.5">
                            <div className="text-gray-500">Начало - Конец:</div>
                            <div>{timetableData.dayStartTimes[5].start} - {timetableData.dayStartTimes[5].end}</div>
                          </div>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((pairNum) => {
                      const pairsForPair = timetableData.pairs?.filter((p: any) => p.pairNumber === pairNum) || [];
                      const pairsByDay: any[][] = [[], [], [], [], [], []];
                      
                      pairsForPair.forEach((pair: any) => {
                        if (pair.day >= 0 && pair.day < 6) {
                          pairsByDay[pair.day].push(pair);
                        }
                      });
                      
                      if (pairsForPair.length === 0 && pairNum > 7) {
                        return null;
                      }
                      
                      return (
                        <tr key={pairNum} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-xs bg-gray-50/50 text-gray-600">
                            {pairNum}
                          </td>
                          {pairsByDay.map((pairs, dayIdx) => {
                            const filteredPairs = pairs.filter((p: any) => {
                              if (showRemoved) {
                                return p.status === 'removed' || p.status === 'replaced' || p.status === 'normal' || p.status === 'cancelled';
                              }
                              return p.status === 'added' || p.status === 'replaced' || p.status === 'normal' || p.status === 'cancelled';
                            });
                            
                            const isCurrentPair = currentPair && currentPair.day === dayIdx && currentPair.pairNumber === pairNum;
                            const hasValidPair = filteredPairs.some((p: any) => {
                              if (!p.subject) return false;
                              const subjectTrimmed = p.subject.trim();
                              return subjectTrimmed !== '' && subjectTrimmed !== 'Урок снят';
                            });
                            
                            const getStatusColor = () => {
                              if (isCurrentPair && hasValidPair) return 'bg-red-100 border-red-300';
                              if (filteredPairs.length === 0) return '';
                              if (filteredPairs.some((p: any) => p.status === 'added')) return 'bg-green-50 border-green-200';
                              if (filteredPairs.some((p: any) => p.status === 'removed')) return 'bg-red-50 border-red-200';
                              if (filteredPairs.some((p: any) => p.status === 'replaced')) return 'bg-yellow-50 border-yellow-200';
                              return '';
                            };
                            
                            return (
                              <td
                                key={dayIdx}
                                className={`border-r border-gray-200 px-2 py-2 align-top ${getStatusColor()}`}
                                style={{ minHeight: '60px' }}
                              >
                                {filteredPairs.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {filteredPairs.map((pair: any, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className={`text-xs rounded px-2 py-1.5 ${idx < pairs.length - 1 ? 'mb-1.5 border-b border-gray-200/50' : ''} ${
                                          pair.status === 'added' ? 'bg-green-100/50' :
                                          pair.status === 'removed' ? 'bg-red-100/50' :
                                          pair.status === 'replaced' ? 'bg-yellow-100/50' :
                                          'bg-white/50'
                                        }`}
                                      >
                                        <div className="font-semibold text-gray-900 leading-tight mb-1 truncate text-sm" title={pair.subject}>
                                          {pair.subject}
                                        </div>
                                        {((pair.teacher && pair.teacher.trim()) || (pair.room && pair.room.trim())) && (
                                          <div className="text-[9px] text-gray-600 leading-tight mb-0.5 flex items-center gap-1.5 truncate">
                                            {pair.teacher && pair.teacher.trim() && (
                                              <span className="truncate" title={pair.teacher}>
                                                {pair.teacher}
                                              </span>
                                            )}
                                            {pair.teacher && pair.teacher.trim() && pair.room && pair.room.trim() && (
                                              <span className="text-gray-400">•</span>
                                            )}
                                            {pair.room && pair.room.trim() && (
                                              <span className="text-gray-500 font-medium whitespace-nowrap">
                                                {pair.room}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {(() => {
                                          const subjectGrades = getSubjectGrades(pair.subject);
                                          if (subjectGrades) {
                                            const weekDayGrades = getGradesForWeekDay(subjectGrades, dayIdx);
                                            return (
                                              <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                                                {weekDayGrades.length > 0 && (
                                                  <div className="flex items-center gap-0.5">
                                                    {weekDayGrades.map((grade, gIdx) => (
                                                      <span 
                                                        key={gIdx}
                                                        className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-gray-900 bg-yellow-300 rounded shadow-sm"
                                                        title={grade.type || 'Оценка'}
                                                      >
                                                        {grade.value}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-8"></div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 px-1">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Обозначения цветов:</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100/50 border border-green-200 rounded"></div>
                    <span className="text-gray-700">Добавленные пары</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                    <span className="text-gray-700">Текущая пара</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100/50 border border-yellow-200 rounded"></div>
                    <span className="text-gray-700">Замененные пары</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                    <span className="text-gray-700">Снятые пары</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

