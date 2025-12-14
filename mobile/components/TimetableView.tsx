import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface TimetableViewProps {
  timetableData: any;
  journalData: any;
  showRemoved: boolean;
}

export default function TimetableView({
  timetableData,
  journalData,
  showRemoved,
}: TimetableViewProps) {
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const normalizeSubjectName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,\-_]/g, '')
      .trim();
  };

  const getSubjectGrades = (subjectName: string) => {
    if (!journalData || !journalData.subjects) return null;
    const normalizedTimetableName = normalizeSubjectName(subjectName);
    const subject = journalData.subjects.find((s: any) => {
      const normalizedJournalName = normalizeSubjectName(s.name);
      return (
        normalizedJournalName === normalizedTimetableName ||
        normalizedJournalName.includes(normalizedTimetableName) ||
        normalizedTimetableName.includes(normalizedJournalName)
      );
    });
    return subject;
  };

  const getDateIndexForWeekDay = (weekDay: number) => {
    if (!journalData || !journalData.dates || !journalData.months || !journalData.monthColspans)
      return null;

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + weekDay);

    const targetDay = targetDate.getDate();
    const targetMonth = targetDate.getMonth();

    const getMonthForDateIndex = (dateIndex: number) => {
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
        январь: 0,
        февраль: 1,
        март: 2,
        апрель: 3,
        май: 4,
        июнь: 5,
        июль: 6,
        август: 7,
        сентябрь: 8,
        октябрь: 9,
        ноябрь: 10,
        декабрь: 11,
      };
      const normalized = monthName.toLowerCase().trim();
      return monthNames[normalized] !== undefined ? monthNames[normalized] : null;
    };

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

  const getGradesForWeekDay = (subject: any, weekDay: number) => {
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
      if (subjectTrimmed === '' || subjectTrimmed.toLowerCase().includes('урок снят'))
        return false;
      if (p.status === 'removed' || p.status === 'cancelled') return false;
      return true;
    });

    if (dayPairs.length === 0) return null;

    const getPairTimeMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split('.').map(Number);
      return hours * 60 + minutes;
    };

    const getPairTime = (pairNumber: number, dayIndex: number): { start: string; end: string } => {
      const schedule: Record<number, Record<number, { start: string; end: string }>> = {
        0: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '12.00', end: '12.45' },
          6: { start: '12.55', end: '13.40' },
          7: { start: '14.00', end: '14.45' },
          8: { start: '14.55', end: '15.40' },
          9: { start: '16.00', end: '16.45' },
          10: { start: '16.55', end: '17.40' },
          11: { start: '17.50', end: '18.35' },
          12: { start: '18.45', end: '19.30' },
          13: { start: '19.40', end: '20.25' },
        },
        1: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '12.00', end: '12.45' },
          6: { start: '12.55', end: '13.40' },
          7: { start: '14.00', end: '14.45' },
          8: { start: '14.55', end: '15.40' },
          9: { start: '16.00', end: '16.45' },
          10: { start: '16.55', end: '17.40' },
          11: { start: '17.50', end: '18.35' },
          12: { start: '18.45', end: '19.30' },
          13: { start: '19.40', end: '20.25' },
        },
        2: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '12.00', end: '12.45' },
          6: { start: '12.55', end: '13.40' },
          7: { start: '14.00', end: '14.45' },
          8: { start: '14.55', end: '15.40' },
          9: { start: '16.00', end: '16.45' },
          10: { start: '16.55', end: '17.40' },
          11: { start: '17.50', end: '18.35' },
          12: { start: '18.45', end: '19.30' },
          13: { start: '19.40', end: '20.25' },
        },
        3: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '12.00', end: '12.45' },
          6: { start: '12.55', end: '13.40' },
          7: { start: '14.40', end: '15.25' },
          8: { start: '15.35', end: '16.20' },
          9: { start: '16.30', end: '17.15' },
          10: { start: '17.25', end: '18.10' },
          11: { start: '18.20', end: '19.05' },
          12: { start: '19.15', end: '20.00' },
          13: { start: '20.10', end: '20.55' },
        },
        4: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '12.00', end: '12.45' },
          6: { start: '12.55', end: '13.40' },
          7: { start: '14.00', end: '14.45' },
          8: { start: '14.55', end: '15.40' },
          9: { start: '16.00', end: '16.45' },
          10: { start: '16.55', end: '17.40' },
          11: { start: '17.50', end: '18.35' },
          12: { start: '18.45', end: '19.30' },
          13: { start: '19.40', end: '20.25' },
        },
        5: {
          1: { start: '8.00', end: '8.45' },
          2: { start: '8.55', end: '9.40' },
          3: { start: '9.50', end: '10.35' },
          4: { start: '10.45', end: '11.30' },
          5: { start: '11.40', end: '12.25' },
          6: { start: '12.35', end: '13.20' },
          7: { start: '13.40', end: '14.25' },
          8: { start: '14.35', end: '15.20' },
          9: { start: '15.30', end: '16.15' },
          10: { start: '16.25', end: '17.10' },
          11: { start: '17.20', end: '18.05' },
          12: { start: '18.15', end: '19.00' },
          13: { start: '19.10', end: '19.55' },
        },
      };

      return schedule[dayIndex]?.[pairNumber] || { start: '', end: '' };
    };

    // Find current pair
    for (const pair of dayPairs.sort((a: any, b: any) => a.pairNumber - b.pairNumber)) {
      const pairTime = getPairTime(pair.pairNumber, dayIndex);
      if (!pairTime.start || !pairTime.end) continue;

      const startMinutes = getPairTimeMinutes(pairTime.start);
      const endMinutes = getPairTimeMinutes(pairTime.end);

      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        return { pairNumber: pair.pairNumber, day: dayIndex };
      }
    }

    // Find next pair
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

  const currentPair = getCurrentPair();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Заголовок */}
          <View style={styles.headerRow}>
            <View style={styles.pairHeader}>
              <Text style={styles.headerText}>#</Text>
            </View>
            {dayNames.map((dayName, dayIdx) => (
              <View key={dayIdx} style={styles.dayHeader}>
                <Text style={styles.headerText}>{dayName}</Text>
                {timetableData?.dayStartTimes?.[dayIdx]?.start && (
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>
                      {timetableData.dayStartTimes[dayIdx].start} -{' '}
                      {timetableData.dayStartTimes[dayIdx].end}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Строки с парами */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((pairNum) => {
            const pairsForPair =
              timetableData.pairs?.filter((p: any) => p.pairNumber === pairNum) || [];
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
              <View key={pairNum} style={styles.row}>
                <View style={styles.pairCell}>
                  <Text style={styles.pairNumber}>{pairNum}</Text>
                </View>
                {pairsByDay.map((pairs, dayIdx) => {
                  const filteredPairs = pairs.filter((p: any) => {
                    if (showRemoved) {
                      return (
                        p.status === 'removed' ||
                        p.status === 'replaced' ||
                        p.status === 'normal' ||
                        p.status === 'cancelled'
                      );
                    }
                    return (
                      p.status === 'added' ||
                      p.status === 'replaced' ||
                      p.status === 'normal' ||
                      p.status === 'cancelled'
                    );
                  });

                  const isCurrentPair =
                    currentPair && currentPair.day === dayIdx && currentPair.pairNumber === pairNum;
                  const hasValidPair = filteredPairs.some((p: any) => {
                    if (!p.subject) return false;
                    const subjectTrimmed = p.subject.trim();
                    return subjectTrimmed !== '' && subjectTrimmed !== 'Урок снят';
                  });

                  const getStatusColor = () => {
                    if (isCurrentPair && hasValidPair) return '#FEE2E2';
                    if (filteredPairs.length === 0) return '#FFFFFF';
                    if (filteredPairs.some((p: any) => p.status === 'added')) return '#D1FAE5';
                    if (filteredPairs.some((p: any) => p.status === 'removed')) return '#FEE2E2';
                    if (filteredPairs.some((p: any) => p.status === 'replaced')) return '#FEF3C7';
                    return '#FFFFFF';
                  };

                  return (
                    <View
                      key={dayIdx}
                      style={[
                        styles.dayCell,
                        { backgroundColor: getStatusColor() },
                        isCurrentPair && hasValidPair && styles.currentPairCell,
                      ]}
                    >
                      {filteredPairs.length > 0 ? (
                        <View style={styles.pairsContainer}>
                          {filteredPairs.map((pair: any, idx: number) => {
                            const subjectGrades = getSubjectGrades(pair.subject);
                            const weekDayGrades = subjectGrades
                              ? getGradesForWeekDay(subjectGrades, dayIdx)
                              : [];

                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.pairCard,
                                  idx < filteredPairs.length - 1 && styles.pairCardBorder,
                                ]}
                              >
                                <Text style={styles.subjectText} numberOfLines={2}>
                                  {pair.subject}
                                </Text>
                                {((pair.teacher && pair.teacher.trim()) ||
                                  (pair.room && pair.room.trim())) && (
                                  <Text style={styles.teacherRoomText} numberOfLines={1}>
                                    {pair.teacher && pair.teacher.trim() ? pair.teacher : ''}
                                    {pair.teacher && pair.teacher.trim() && pair.room && pair.room.trim()
                                      ? ' • '
                                      : ''}
                                    {pair.room && pair.room.trim() ? pair.room : ''}
                                  </Text>
                                )}
                                {weekDayGrades.length > 0 && (
                                  <View style={styles.gradesContainer}>
                                    {weekDayGrades.map((grade: any, gIdx: number) => (
                                      <View key={gIdx} style={styles.gradeBadge}>
                                        <Text style={styles.gradeText}>{grade.value}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.emptyCell} />
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Легенда */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Обозначения цветов:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#D1FAE5' }]} />
            <Text style={styles.legendText}>Добавленные пары</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Текущая пара</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FEF3C7' }]} />
            <Text style={styles.legendText}>Замененные пары</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FEE2E2' }]} />
            <Text style={styles.legendText}>Снятые пары</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pairHeader: {
    width: 40,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeader: {
    width: 120,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  timeContainer: {
    marginTop: 4,
  },
  timeLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pairCell: {
    width: 40,
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayCell: {
    width: 120,
    minHeight: 60,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  currentPairCell: {
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  pairsContainer: {
    gap: 6,
  },
  pairCard: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  pairCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
    marginBottom: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  teacherRoomText: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
  },
  gradesContainer: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  gradeBadge: {
    width: 20,
    height: 20,
    backgroundColor: '#FDE047',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  emptyCell: {
    height: 32,
  },
  legend: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
});

