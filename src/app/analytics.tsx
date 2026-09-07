
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHabits } from '@/context/HabitContext';

type DayData = {
  date: string;
  label: string;
  completed: number;
  total: number;
  percentage: number;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getLastNDays = (numberOfDays: number): string[] => {
  const dates: string[] = [];

  for (let i = numberOfDays - 1; i >= 0; i--) {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);

    dates.push(formatDate(date));
  }

  return dates;
};

export default function AnalyticsScreen() {
  const {
    habits,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  /*
   * --------------------------------------------------
   * BASIC STATISTICS
   * --------------------------------------------------
   */

  const totalHabits = habits.length;

  const totalCompletedDays = habits.reduce(
    (total, habit) =>
      total + habit.completedDates.length,
    0
  );

  const today = formatDate(new Date());

  const completedToday = habits.filter((habit) =>
    habit.completedDates.includes(today)
  ).length;

  /*
   * --------------------------------------------------
   * OVERALL COMPLETION
   * --------------------------------------------------
   */

  const last30Days = useMemo(
    () => getLastNDays(30),
    []
  );

  const possibleCompletions =
    totalHabits * 30;

  const actualCompletions = habits.reduce(
    (total, habit) => {
      return (
        total +
        last30Days.filter((date) =>
          habit.completedDates.includes(date)
        ).length
      );
    },
    0
  );

  const overallPercentage =
    possibleCompletions > 0
      ? Math.round(
          (actualCompletions /
            possibleCompletions) *
            100
        )
      : 0;

  /*
   * --------------------------------------------------
   * TOTAL CURRENT / BEST STREAK
   * --------------------------------------------------
   */

  const currentStreaks = habits.map((habit) =>
    getCurrentStreak(habit)
  );

  const bestStreaks = habits.map((habit) =>
    getBestStreak(habit)
  );

  const currentStreak =
    currentStreaks.length > 0
      ? Math.max(...currentStreaks)
      : 0;

  const bestStreak =
    bestStreaks.length > 0
      ? Math.max(...bestStreaks)
      : 0;

  /*
   * --------------------------------------------------
   * MOST CONSISTENT HABIT
   * --------------------------------------------------
   */

  const mostConsistentHabit = useMemo(() => {
    if (habits.length === 0) {
      return null;
    }

    let bestHabit = habits[0];
    let bestCount =
      habits[0].completedDates.length;

    habits.forEach((habit) => {
      if (
        habit.completedDates.length >
        bestCount
      ) {
        bestHabit = habit;
        bestCount =
          habit.completedDates.length;
      }
    });

    return {
      habit: bestHabit,
      count: bestCount,
    };
  }, [habits]);

  /*
   * --------------------------------------------------
   * LAST 7 DAYS
   * --------------------------------------------------
   */

  const weeklyData: DayData[] = useMemo(() => {
    const dates = getLastNDays(7);

    return dates.map((date) => {
      const completed = habits.filter(
        (habit) =>
          habit.completedDates.includes(date)
      ).length;

      const total = habits.length;

      const percentage =
        total > 0
          ? Math.round(
              (completed / total) * 100
            )
          : 0;

      const dateObject = new Date(
        `${date}T12:00:00`
      );

      const label =
        dateObject.toLocaleDateString(
          'en-US',
          {
            weekday: 'short',
          }
        );

      return {
        date,
        label,
        completed,
        total,
        percentage,
      };
    });
  }, [habits]);

  /*
   * --------------------------------------------------
   * LAST 30 DAYS
   * --------------------------------------------------
   */

  const monthlyCompletedDays =
    habits.reduce((total, habit) => {
      return (
        total +
        last30Days.filter((date) =>
          habit.completedDates.includes(date)
        ).length
      );
    }, 0);

  /*
   * --------------------------------------------------
   * EMPTY STATE
   * --------------------------------------------------
   */

  if (habits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>
            📊
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          No analytics yet
        </Text>

        <Text style={styles.emptyText}>
          Create your first habit and start
          completing it to see your progress here.
        </Text>
      </View>
    );
  }

  /*
   * --------------------------------------------------
   * UI
   * --------------------------------------------------
   */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          YOUR PROGRESS
        </Text>

        <Text style={styles.title}>
          Analytics
        </Text>

        <Text style={styles.subtitle}>
          Understand your consistency and keep
          improving.
        </Text>
      </View>

      {/* OVERALL CARD */}

      <View style={styles.overallCard}>
        <View style={styles.overallHeader}>
          <View>
            <Text style={styles.cardEyebrow}>
              LAST 30 DAYS
            </Text>

            <Text style={styles.overallTitle}>
              Overall consistency
            </Text>
          </View>

          <View style={styles.percentCircle}>
            <Text style={styles.percentText}>
              {overallPercentage}%
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${overallPercentage}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {monthlyCompletedDays} completed
          habit-days this month
        </Text>
      </View>

      {/* STAT CARDS */}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>
            🔥
          </Text>

          <Text style={styles.statNumber}>
            {currentStreak}
          </Text>

          <Text style={styles.statLabel}>
            Current streak
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>
            🏆
          </Text>

          <Text style={styles.statNumber}>
            {bestStreak}
          </Text>

          <Text style={styles.statLabel}>
            Best streak
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>
            ✅
          </Text>

          <Text style={styles.statNumber}>
            {completedToday}
          </Text>

          <Text style={styles.statLabel}>
            Completed today
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>
            🎯
          </Text>

          <Text style={styles.statNumber}>
            {totalHabits}
          </Text>

          <Text style={styles.statLabel}>
            Active habits
          </Text>
        </View>
      </View>

      {/* WEEKLY ACTIVITY */}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              Weekly activity
            </Text>

            <Text style={styles.cardSubtitle}>
              Your last 7 days
            </Text>
          </View>

          <Text style={styles.cardIcon}>
            📈
          </Text>
        </View>

        <View style={styles.chart}>
          {weeklyData.map((day) => {
            const isToday =
              day.date === today;

            return (
              <View
                key={day.date}
                style={styles.chartItem}
              >
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height:
                          day.percentage === 0
                            ? 5
                            : Math.max(
                                8,
                                day.percentage *
                                  0.9
                              ),
                      },
                    ]}
                  />

                  {day.percentage > 0 && (
                    <Text
                      style={
                        styles.barPercentage
                      }
                    >
                      {day.percentage}%
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.chartLabel,
                    isToday &&
                      styles.todayChartLabel,
                  ]}
                >
                  {day.label}
                </Text>

                {isToday && (
                  <View
                    style={styles.todayDot}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* HABIT BREAKDOWN */}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              Habit breakdown
            </Text>

            <Text style={styles.cardSubtitle}>
              Your individual performance
            </Text>
          </View>
        </View>

        {habits.map((habit) => {
          const completed =
            last30Days.filter((date) =>
              habit.completedDates.includes(date)
            ).length;

          const percentage = Math.round(
            (completed / 30) * 100
          );

          const habitCurrentStreak =
            getCurrentStreak(habit);

          const habitBestStreak =
            getBestStreak(habit);

          return (
            <View
              key={habit.id}
              style={styles.habitRow}
            >
              <View style={styles.habitTop}>
                <Text
                  style={styles.habitName}
                  numberOfLines={1}
                >
                  {habit.name}
                </Text>

                <Text
                  style={styles.habitPercentage}
                >
                  {percentage}%
                </Text>
              </View>

              <View
                style={styles.habitProgressTrack}
              >
                <View
                  style={[
                    styles.habitProgressFill,
                    {
                      width: `${percentage}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={styles.habitStats}
              >
                <Text
                  style={styles.habitStatText}
                >
                  {completed}/30 days
                </Text>

                <Text
                  style={styles.habitStatText}
                >
                  🔥 {habitCurrentStreak}
                </Text>

                <Text
                  style={styles.habitStatText}
                >
                  🏆 {habitBestStreak}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* MOST CONSISTENT */}

      {mostConsistentHabit && (
        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <Text style={styles.highlightEmoji}>
              🥇
            </Text>
          </View>

          <View style={styles.highlightContent}>
            <Text style={styles.highlightEyebrow}>
              MOST CONSISTENT
            </Text>

            <Text style={styles.highlightTitle}>
              {mostConsistentHabit.habit.name}
            </Text>

            <Text style={styles.highlightText}>
              Completed{' '}
              {mostConsistentHabit.count}{' '}
              total days. Keep building the streak!
            </Text>
          </View>
        </View>
      )}

      {/* MOTIVATION */}

      <View style={styles.motivationCard}>
        <Text style={styles.motivationEmoji}>
          ✦
        </Text>

        <View style={styles.motivationContent}>
          <Text style={styles.motivationTitle}>
            Progress beats perfection
          </Text>

          <Text style={styles.motivationText}>
            Missing one day doesn't erase your
            progress. Show up again tomorrow.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101311',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  /* HEADER */

  header: {
    marginBottom: 25,
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
    lineHeight: 19,
    marginTop: 6,
  },

  /* OVERALL */

  overallCard: {
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
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 7,
  },

  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardEyebrow: {
    color: '#69736B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  overallTitle: {
    color: '#E9EDE8',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  percentCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#232D25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A473C',
  },

  percentText: {
    color: '#D7E2D4',
    fontSize: 14,
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

  progressText: {
    color: '#6F7871',
    fontSize: 11,
    marginTop: 9,
  },

  /* STATS */

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

  /* GENERAL CARD */

  card: {
    backgroundColor: '#171C18',
    borderRadius: 23,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292F2A',
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  cardTitle: {
    color: '#E8ECE7',
    fontSize: 19,
    fontWeight: '800',
  },

  cardSubtitle: {
    color: '#69736B',
    fontSize: 11,
    marginTop: 3,
  },

  cardIcon: {
    fontSize: 21,
  },

  /* WEEKLY CHART */

  chart: {
    height: 180,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  chartItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },

  barArea: {
    height: 135,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bar: {
    width: 18,
    maxHeight: 120,
    minHeight: 5,
    backgroundColor: '#9CAF99',
    borderRadius: 8,
  },

  barPercentage: {
    color: '#B7C9B5',
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 5,
  },

  chartLabel: {
    color: '#59625B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 10,
  },

  todayChartLabel: {
    color: '#D7E2D4',
  },

  todayDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B7C9B5',
    marginTop: 4,
  },

  /* HABIT BREAKDOWN */

  habitRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#292F2A',
  },

  habitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  habitName: {
    color: '#DCE2DA',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },

  habitPercentage: {
    color: '#B7C9B5',
    fontSize: 12,
    fontWeight: '800',
  },

  habitProgressTrack: {
    height: 6,
    backgroundColor: '#292F2A',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 9,
  },

  habitProgressFill: {
    height: '100%',
    backgroundColor: '#8FA58D',
    borderRadius: 10,
  },

  habitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  habitStatText: {
    color: '#69736B',
    fontSize: 9,
  },

  /* HIGHLIGHT */

  highlightCard: {
    backgroundColor: '#1D281F',
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#344137',
    marginBottom: 12,
  },

  highlightIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#273329',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  highlightEmoji: {
    fontSize: 24,
  },

  highlightContent: {
    flex: 1,
  },

  highlightEyebrow: {
    color: '#7E8E80',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  highlightTitle: {
    color: '#E5EAE3',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },

  highlightText: {
    color: '#738076',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },

  /* MOTIVATION */

  motivationCard: {
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

  /* EMPTY */

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

