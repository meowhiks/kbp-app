import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';

interface JournalTableProps {
  journalData: any;
}

export default function JournalTable({ journalData }: JournalTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const dates = journalData.dates || [];
  const months = journalData.months || [];
  const monthColspans = journalData.monthColspans || [];

  let monthStartPositions: number[] = [];
  let currentPos = 0;
  monthColspans.forEach((colspan: number) => {
    monthStartPositions.push(currentPos);
    currentPos += colspan;
  });

  const getTooltipText = (grades: any[], date: string) => {
    if (grades.length === 0) return '';
    const types = grades.map((g: any) => g.type && g.type.trim() ? g.type : null).filter(Boolean);
    if (types.length > 0) {
      const uniqueTypes = [...new Set(types)];
      return `${date} - ${uniqueTypes.join(', ')}`;
    }
    return date;
  };

  const getLayoutStyle = (gradesCount: number): any => {
    if (gradesCount === 0) return {};
    if (gradesCount === 1) {
      return {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      };
    } else if (gradesCount === 2) {
      return {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      };
    } else if (gradesCount === 3) {
      return {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      };
    } else {
      return {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tableWrapper}>
        <View style={styles.fixedColumn}>
          <View style={styles.fixedHeader}>
            <View style={styles.subjectHeader}>
              <Text style={styles.subjectHeaderText}>Предмет</Text>
            </View>
          </View>
          <View style={styles.fixedHeaderSpacer} />
          {journalData.subjects.map((subject: any) => {
            const isHovered = hoveredRow === subject.id;
            return (
              <Pressable
                key={subject.id}
                style={[styles.fixedSubjectCell, isHovered && styles.subjectCellHovered]}
                onPressIn={() => setHoveredRow(subject.id)}
                onPressOut={() => setHoveredRow(null)}
              >
                <Text style={styles.subjectText}>{subject.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Прокручиваемая часть */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator
          ref={horizontalScrollRef}
          style={styles.scrollablePart}
        >
          <View>
            <View style={styles.monthHeader}>
              {monthStartPositions.map((startPos, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.monthCell,
                    { width: monthColspans[idx] * 32 },
                  ]}
                >
                  <Text style={styles.monthText}>{months[idx]}</Text>
                </View>
              ))}
              <View style={styles.averageHeader}>
                <Text style={styles.averageHeaderText}>Ср.зн</Text>
              </View>
            </View>

            <View style={styles.dateHeader}>
              {dates.map((date: string, idx: number) => (
                <View key={idx} style={styles.dateCell}>
                  <Text style={styles.dateText}>{date}</Text>
                </View>
              ))}
              <View style={styles.averageHeader} />
            </View>

            {journalData.subjects.map((subject: any) => {
              const isHovered = hoveredRow === subject.id;
              return (
                <Pressable
                  key={subject.id}
                  style={[styles.row, isHovered && styles.rowHovered]}
                  onPressIn={() => setHoveredRow(subject.id)}
                  onPressOut={() => setHoveredRow(null)}
                >
                  {dates.map((date: string, dateIdx: number) => {
                    const grades = subject.gradesMatrix?.[dateIdx] || [];
                    const gradesCount = grades.length;

                    return (
                      <Pressable
                        key={dateIdx}
                        style={[styles.gradeCell, isHovered && styles.gradeCellHovered]}
                        onPress={() => {
                          if (grades.length > 0) {
                            const tooltip = getTooltipText(grades, date);
                            if (tooltip) {
                              Alert.alert('Оценки', tooltip);
                            }
                          }
                        }}
                        disabled={grades.length === 0}
                      >
                        {grades.length > 0 ? (
                          <View style={getLayoutStyle(gradesCount)}>
                            {grades.slice(0, 4).map((grade: any, gradeIdx: number) => (
                              <View key={gradeIdx} style={styles.gradeBadge}>
                                <Text style={styles.gradeText}>{grade.value}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  <View style={[styles.averageCell, isHovered && styles.averageCellHovered]}>
                    <Text style={styles.averageText}>{subject.average}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tableWrapper: {
    flexDirection: 'row',
  },
  fixedColumn: {
    width: 128,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  fixedHeader: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fixedHeaderSpacer: {
    height: 24,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subjectHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  subjectHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  fixedSubjectCell: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'center',
    minHeight: 32,
  },
  scrollablePart: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  monthCell: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
  },
  averageHeader: {
    width: 48,
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  averageHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  dateHeader: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateCell: {
    width: 32,
    minWidth: 24,
    maxWidth: 32,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowHovered: {
    backgroundColor: '#EFF6FF',
  },
  subjectCellHovered: {
    backgroundColor: '#EFF6FF',
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  gradeCell: {
    width: 32,
    minWidth: 24,
    maxWidth: 32,
    minHeight: 32,
    maxHeight: 32,
    padding: 1,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FEFCE8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradeCellHovered: {
    backgroundColor: '#EFF6FF',
  },
  gradeBadge: {
    width: 12,
    height: 12,
    backgroundColor: 'transparent',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 8,
  },
  averageCell: {
    width: 48,
    minWidth: 48,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  averageCellHovered: {
    backgroundColor: '#EFF6FF',
  },
  averageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
});

