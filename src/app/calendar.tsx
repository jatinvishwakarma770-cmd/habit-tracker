
import React, { useEffect, useMemo, useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';

import { useHabits } from '@/context/HabitContext';

export default function CalendarScreen() {
  const {
    habits,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  // =====================================================
  // SELECTED HABIT
  // =====================================================

  const [selectedHabitId, setSelectedHabitId] =
    useState<string | null>(null);

  // =====================================================
  // KEEP SELECTED HABIT VALID
  // =====================================================

  useEffect(() => {
    if (habits.length === 0) {
      setSelectedHabitId(null);
      return;
    }

    const selectedStillExists = habits.some(
      (habit) => habit.id === selectedHabitId
    );

    if (!selectedStillExists) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  // =====================================================
  // SELECTED HABIT
  // =====================================================

  const selectedHabit = useMemo(() => {
    return habits.find(
      (habit) => habit.id === selectedHabitId
    );
  }, [habits, selectedHabitId]);

  // =====================================================
  // TODAY
  // =====================================================

  const getToday = () => {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // LAST 30 DAYS
  // =====================================================

  const getLast30Days = () => {
    const days = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();

      date.setHours(12, 0, 0, 0);

      date.setDate(
        date.getDate() - i
      );

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0');

      const day = String(
        date.getDate()
      ).padStart(2, '0');

      days.push({
        date: `${year}-${month}-${day}`,

        dayNumber: day,

        dayName: date.toLocaleDateString(
          'en-US',
          {
            weekday: 'short',
          }
        ),
      });
    }

    return days;
  };

  const days = getLast30Days();

  const today = getToday();

  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (habits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>
            📅
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          No habits yet
        </Text>

        <Text style={styles.emptyText}>
          Create your first habit to start
          building your consistency history.
        </Text>
      </View>
    );
  }

  // =====================================================
  // COMPLETION DATA
  // =====================================================

  const completedDates =
    selectedHabit &&
    Array.isArray(
      selectedHabit.completedDates
    )
      ? selectedHabit.completedDates
      : [];

  const completedDays = days.filter(
    (day) =>
      completedDates.includes(day.date)
  ).length;

  const completionRate =
    Math.round(
      (completedDays / 30) * 100
    );

  const currentStreak = selectedHabit
    ? getCurrentStreak(selectedHabit)
    : 0;

  const bestStreak = selectedHabit
    ? getBestStreak(selectedHabit)
    : 0;

  // =====================================================
  // UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>

        <Text style={styles.eyebrow}>
          YOUR CONSISTENCY
        </Text>

        <Text style={styles.title}>
          Calendar
        </Text>

        <Text style={styles.subtitle}>
          See how consistently you've been
          showing up.
        </Text>

      </View>

      {/* =================================================
          HABIT SELECTOR
      ================================================= */}

      <Text style={styles.sectionLabel}>
        SELECT HABIT
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.habitSelector}
        contentContainerStyle={{
          paddingRight: 20,
        }}
      >

        {habits.map((habit) => (

          <Pressable
            key={habit.id}
            style={[
              styles.habitButton,

              selectedHabitId ===
                habit.id &&
                styles.selectedHabitButton,
            ]}
            onPress={() =>
              setSelectedHabitId(
                habit.id
              )
            }
          >

            <Text
              style={[
                styles.habitButtonText,

                selectedHabitId ===
                  habit.id &&
                  styles.selectedHabitButtonText,
              ]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>

          </Pressable>

        ))}

      </ScrollView>

      {/* =================================================
          SELECTED HABIT DATA
      ================================================= */}

      {selectedHabit && (
        <>

          {/* =================================================
              SUMMARY CARD
          ================================================= */}

          <View style={styles.summaryCard}>

            <View style={styles.summaryHeader}>

              <View>

                <Text
                  style={styles.summaryLabel}
                >
                  LAST 30 DAYS
                </Text>

                <Text
                  style={styles.habitTitle}
                >
                  {selectedHabit.name}
                </Text>

              </View>

              <View
                style={styles.percentCircle}
              >

                <Text
                  style={styles.percentText}
                >
                  {completionRate}%
                </Text>

              </View>

            </View>

            {/* PROGRESS */}

            <View
              style={styles.progressTrack}
            >

              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${completionRate}%`,
                  },
                ]}
              />

            </View>

            <Text
              style={styles.completedText}
            >
              {completedDays} of 30 days
              completed
            </Text>

          </View>

          {/* =================================================
              STATS
          ================================================= */}

          <View style={styles.statsRow}>

            <View style={styles.statCard}>

              <Text style={styles.statIcon}>
                🔥
              </Text>

              <Text
                style={styles.statNumber}
              >
                {currentStreak}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Current streak
              </Text>

            </View>

            <View style={styles.statCard}>

              <Text style={styles.statIcon}>
                🏆
              </Text>

              <Text
                style={styles.statNumber}
              >
                {bestStreak}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Best streak
              </Text>

            </View>

          </View>

          {/* =================================================
              CALENDAR
          ================================================= */}

          <View style={styles.calendarCard}>

            <View
              style={styles.calendarHeader}
            >

              <View>

                <Text
                  style={styles.calendarTitle}
                >
                  Activity
                </Text>

                <Text
                  style={styles.calendarSubtitle}
                >
                  Last 30 days
                </Text>

              </View>

              <View
                style={styles.todayBadge}
              >

                <Text
                  style={styles.todayBadgeText}
                >
                  TODAY
                </Text>

              </View>

            </View>

            {/* DAYS */}

            <View
              style={styles.daysContainer}
            >

              {days.map((day) => {

                const completed =
                  completedDates.includes(
                    day.date
                  );

                const isToday =
                  day.date === today;

                return (
                  <View
                    key={day.date}
                    style={styles.dayItem}
                  >

                    {/* DAY NAME */}

                    <Text
                      style={[
                        styles.dayName,

                        isToday &&
                          styles.todayDayName,
                      ]}
                    >
                      {day.dayName}
                    </Text>

                    {/* DAY CIRCLE */}

                    <View
                      style={[
                        styles.dayCircle,

                        completed &&
                          styles.completedDay,

                        isToday &&
                          !completed &&
                          styles.todayCircle,

                        isToday &&
                          completed &&
                          styles.todayCompletedCircle,
                      ]}
                    >

                      {completed ? (

                        <Text
                          style={
                            styles.completedCheck
                          }
                        >
                          ✓
                        </Text>

                      ) : (

                        <Text
                          style={[
                            styles.dayNumber,

                            isToday &&
                              styles.todayNumber,
                          ]}
                        >
                          {day.dayNumber}
                        </Text>

                      )}

                    </View>

                    {/* TODAY DOT */}

                    {isToday && (
                      <View
                        style={styles.todayDot}
                      />
                    )}

                  </View>
                );
              })}

            </View>

            {/* =================================================
                LEGEND
            ================================================= */}

            <View style={styles.legend}>

              <View
                style={styles.legendItem}
              >

                <View
                  style={[
                    styles.legendCircle,
                    styles.completedLegend,
                  ]}
                />

                <Text
                  style={styles.legendText}
                >
                  Completed
                </Text>

              </View>

              <View
                style={styles.legendItem}
              >

                <View
                  style={[
                    styles.legendCircle,
                    styles.emptyLegend,
                  ]}
                />

                <Text
                  style={styles.legendText}
                >
                  Not completed
                </Text>

              </View>

            </View>

          </View>

          {/* =================================================
              MOTIVATION
          ================================================= */}

          <View
            style={styles.motivationCard}
          >

            <Text
              style={styles.motivationEmoji}
            >
              ✦
            </Text>

            <View
              style={styles.motivationContent}
            >

              <Text
                style={styles.motivationTitle}
              >
                {completionRate === 100
                  ? 'Amazing consistency!'
                  : completionRate >= 70
                  ? 'You are doing great!'
                  : 'Keep showing up'}
              </Text>

              <Text
                style={styles.motivationText}
              >
                {completionRate === 100
                  ? 'You completed this habit every day in the last 30 days. Keep the streak alive! 🔥'
                  : 'Every completed day makes your consistency stronger.'}
              </Text>

            </View>

          </View>

        </>
      )}

      {/* BOTTOM SPACE */}

      <View style={styles.bottomSpace} />

    </ScrollView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  /* =================================================
     MAIN
  ================================================= */

  container: {
    flex: 1,
    backgroundColor: '#101311',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  /* =================================================
     HEADER
  ================================================= */

  header: {
    marginBottom: 28,
  },

  eyebrow: {
    color: '#69736B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 5,
  },

  title: {
    color: '#F0F3EF',
    fontSize: 34,
    fontWeight: '800',
  },

  subtitle: {
    color: '#737B74',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },

  /* =================================================
     SELECTOR
  ================================================= */

  sectionLabel: {
    color: '#69736B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 11,
  },

  habitSelector: {
    marginBottom: 20,
  },

  habitButton: {
    backgroundColor: '#171C18',
    borderWidth: 1,
    borderColor: '#292F2A',
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 13,
    marginRight: 9,
    maxWidth: 170,
  },

  selectedHabitButton: {
    backgroundColor: '#D7E2D4',
    borderColor: '#D7E2D4',
  },

  habitButtonText: {
    color: '#8A928B',
    fontSize: 13,
    fontWeight: '700',
  },

  selectedHabitButtonText: {
    color: '#172019',
  },

  /* =================================================
     SUMMARY
  ================================================= */

  summaryCard: {
    backgroundColor: '#171C18',
    borderRadius: 23,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292F2A',
    marginBottom: 12,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 7,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLabel: {
    color: '#69736B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  habitTitle: {
    color: '#E9EDE8',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  percentCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#232D25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A473C',
  },

  percentText: {
    color: '#D7E2D4',
    fontSize: 13,
    fontWeight: '800',
  },

  progressTrack: {
    height: 7,
    backgroundColor: '#292F2A',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#B7C9B5',
    borderRadius: 10,
  },

  completedText: {
    color: '#6F7871',
    fontSize: 11,
    marginTop: 9,
  },

  /* =================================================
     STATS
  ================================================= */

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#171C18',
    borderRadius: 19,
    padding: 17,
    borderWidth: 1,
    borderColor: '#292F2A',
  },

  statIcon: {
    fontSize: 18,
    marginBottom: 8,
  },

  statNumber: {
    color: '#E8ECE7',
    fontSize: 25,
    fontWeight: '800',
  },

  statLabel: {
    color: '#6F7871',
    fontSize: 10,
    marginTop: 3,
  },

  /* =================================================
     CALENDAR
  ================================================= */

  calendarCard: {
    backgroundColor: '#171C18',
    borderRadius: 23,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292F2A',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 7,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  calendarTitle: {
    color: '#E8ECE7',
    fontSize: 20,
    fontWeight: '800',
  },

  calendarSubtitle: {
    color: '#69736B',
    fontSize: 11,
    marginTop: 3,
  },

  todayBadge: {
    backgroundColor: '#232D25',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
  },

  todayBadgeText: {
    color: '#B8C8B6',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  dayItem: {
    width: '13%',
    alignItems: 'center',
    marginBottom: 16,
  },

  dayName: {
    color: '#59625B',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 7,
  },

  todayDayName: {
    color: '#C4D2C2',
  },

  dayCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#222823',
    borderWidth: 1,
    borderColor: '#303731',
    alignItems: 'center',
    justifyContent: 'center',
  },

  completedDay: {
    backgroundColor: '#9CAF99',
    borderColor: '#9CAF99',
  },

  todayCircle: {
    borderColor: '#B7C9B5',
    borderWidth: 2,
  },

  todayCompletedCircle: {
    backgroundColor: '#D7E2D4',
    borderColor: '#D7E2D4',
  },

  dayNumber: {
    color: '#8A928B',
    fontSize: 11,
    fontWeight: '700',
  },

  todayNumber: {
    color: '#D7E2D4',
  },

  completedCheck: {
    color: '#172019',
    fontSize: 15,
    fontWeight: '900',
  },

  todayDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B7C9B5',
    marginTop: 4,
  },

  /* =================================================
     LEGEND
  ================================================= */

  legend: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#292F2A',
    gap: 20,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendCircle: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },

  completedLegend: {
    backgroundColor: '#9CAF99',
  },

  emptyLegend: {
    backgroundColor: '#222823',
    borderWidth: 1,
    borderColor: '#303731',
  },

  legendText: {
    color: '#69736B',
    fontSize: 10,
  },

  /* =================================================
     MOTIVATION
  ================================================= */

  motivationCard: {
    marginTop: 12,
    backgroundColor: '#171C18',
    borderRadius: 19,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#292F2A',
  },

  motivationEmoji: {
    color: '#B7C9B5',
    fontSize: 23,
    marginRight: 12,
  },

  motivationContent: {
    flex: 1,
  },

  motivationTitle: {
    color: '#DCE2DA',
    fontSize: 13,
    fontWeight: '800',
  },

  motivationText: {
    color: '#6F7871',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  /* =================================================
     EMPTY
  ================================================= */

  emptyContainer: {
    flex: 1,
    backgroundColor: '#101311',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 85,
    height: 85,
    borderRadius: 25,
    backgroundColor: '#1D281F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#344137',
  },

  emptyEmoji: {
    fontSize: 42,
  },

  emptyTitle: {
    color: '#E8ECE7',
    fontSize: 24,
    fontWeight: '800',
  },

  emptyText: {
    color: '#6F7871',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  bottomSpace: {
    height: 50,
  },

});

