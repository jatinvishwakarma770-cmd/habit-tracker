
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';

import { useHabits } from '@/context/HabitContext';

export default function AchievementsScreen() {
  const {
    habits,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  // Total completed habits
  const totalCompletions = habits.reduce(
  (total, habit) =>
    total + habit.completedDates.length,
  0
);

  // Best streak among all habits
  const bestOverallStreak =
    habits.length === 0
      ? 0
      : Math.max(
          ...habits.map((habit) =>
            getBestStreak(habit)
          )
        );

  // Current streak among all habits
  const currentOverallStreak =
    habits.length === 0
      ? 0
      : Math.max(
          ...habits.map((habit) =>
            getCurrentStreak(habit)
          )
        );

  const achievements = [
    {
      id: 1,
      emoji: '🌱',
      title: 'First Step',
      description: 'Create your first habit',
      unlocked: habits.length >= 1,
      progress: habits.length >= 1 ? 1 : 0,
      target: 1,
    },

    {
      id: 2,
      emoji: '🔥',
      title: 'Getting Started',
      description: 'Reach a 3-day streak',
      unlocked: bestOverallStreak >= 3,
      progress: Math.min(bestOverallStreak, 3),
      target: 3,
    },

    {
      id: 3,
      emoji: '⚡',
      title: 'On Fire',
      description: 'Reach a 7-day streak',
      unlocked: bestOverallStreak >= 7,
      progress: Math.min(bestOverallStreak, 7),
      target: 7,
    },

    {
      id: 4,
      emoji: '💪',
      title: 'Habit Builder',
      description: 'Create 5 habits',
      unlocked: habits.length >= 5,
      progress: Math.min(habits.length, 5),
      target: 5,
    },

    {
      id: 5,
      emoji: '⭐',
      title: 'Consistency',
      description: 'Complete 10 habits',
      unlocked: totalCompletions >= 10,
      progress: Math.min(totalCompletions, 10),
      target: 10,
    },

    {
      id: 6,
      emoji: '🏆',
      title: 'High Achiever',
      description: 'Complete 50 habits',
      unlocked: totalCompletions >= 50,
      progress: Math.min(totalCompletions, 50),
      target: 50,
    },

    {
      id: 7,
      emoji: '💎',
      title: 'Unstoppable',
      description: 'Reach a 30-day streak',
      unlocked: bestOverallStreak >= 30,
      progress: Math.min(bestOverallStreak, 30),
      target: 30,
    },

    {
      id: 8,
      emoji: '👑',
      title: 'Legend',
      description: 'Reach a 100-day streak',
      unlocked: bestOverallStreak >= 100,
      progress: Math.min(bestOverallStreak, 100),
      target: 100,
    },
  ];

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  const achievementProgress = Math.round(
    (unlockedCount / achievements.length) * 100
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.smallText}>
            YOUR JOURNEY
          </Text>

          <Text style={styles.title}>
            Achievements
          </Text>

          <Text style={styles.subtitle}>
            Every small win matters.
          </Text>
        </View>

        <View style={styles.trophyCircle}>
          <Text style={styles.trophy}>
            🏆
          </Text>
        </View>
      </View>

      {/* SUMMARY CARD */}

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>
            ACHIEVEMENTS UNLOCKED
          </Text>

          <Text style={styles.summaryNumber}>
            {unlockedCount}
            <Text style={styles.summaryTotal}>
              {' '}
              / {achievements.length}
            </Text>
          </Text>

          <Text style={styles.summaryDescription}>
            {achievementProgress}% of your milestones
            completed
          </Text>
        </View>

        <View style={styles.summaryCircle}>
          <Text style={styles.summaryCircleNumber}>
            {achievementProgress}%
          </Text>
        </View>
      </View>

      {/* CURRENT STREAK */}

      <View style={styles.statsRow}>
        <View style={styles.smallStatCard}>
          <Text style={styles.statEmoji}>
            🔥
          </Text>

          <Text style={styles.statNumber}>
            {currentOverallStreak}
          </Text>

          <Text style={styles.statLabel}>
            Current streak
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statEmoji}>
            🏅
          </Text>

          <Text style={styles.statNumber}>
            {bestOverallStreak}
          </Text>

          <Text style={styles.statLabel}>
            Best streak
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statEmoji}>
            ✓
          </Text>

          <Text style={styles.statNumber}>
            {totalCompletions}
          </Text>

          <Text style={styles.statLabel}>
            Completions
          </Text>
        </View>
      </View>

      {/* SECTION */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Milestones
          </Text>

          <Text style={styles.sectionSubtitle}>
            Keep going and unlock them all.
          </Text>
        </View>
      </View>

      {/* ACHIEVEMENTS */}

      {achievements.map((achievement) => {
        const percentage = Math.round(
          (achievement.progress /
            achievement.target) *
            100
        );

        return (
          <View
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.unlocked &&
                styles.unlockedCard,
            ]}
          >
            {/* ICON */}

            <View
              style={[
                styles.achievementIcon,
                !achievement.unlocked &&
                  styles.lockedIcon,
              ]}
            >
              <Text
                style={[
                  styles.achievementEmoji,
                  !achievement.unlocked &&
                    styles.lockedEmoji,
                ]}
              >
                {achievement.emoji}
              </Text>
            </View>

            {/* CONTENT */}

            <View style={styles.achievementContent}>
              <View style={styles.achievementTitleRow}>
                <Text
                  style={[
                    styles.achievementTitle,
                    !achievement.unlocked &&
                      styles.lockedTitle,
                  ]}
                >
                  {achievement.title}
                </Text>

                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>
                      ✓ UNLOCKED
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>

              {/* Progress */}

              {!achievement.unlocked && (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.progressText}>
                    {achievement.progress} /{' '}
                    {achievement.target}
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101311',
    paddingHorizontal: 20,
    paddingTop: 58,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  smallText: {
    color: '#697169',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  title: {
    color: '#F0F3EF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 3,
  },

  subtitle: {
    color: '#737B74',
    fontSize: 13,
    marginTop: 5,
  },

  trophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#202820',
    borderWidth: 1,
    borderColor: '#354036',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trophy: {
    fontSize: 25,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: '#19221C',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2B352D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 7,

    marginBottom: 15,
  },

  summaryLabel: {
    color: '#788178',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  summaryNumber: {
    color: '#EFF3EE',
    fontSize: 42,
    fontWeight: '800',
    marginTop: 4,
  },

  summaryTotal: {
    color: '#687269',
    fontSize: 20,
  },

  summaryDescription: {
    color: '#737D75',
    fontSize: 11,
    marginTop: 1,
  },

  summaryCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#8EA78F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCircleNumber: {
    color: '#DDE8DC',
    fontSize: 16,
    fontWeight: '800',
  },

  /* STATS */

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  smallStatCard: {
    width: '31.5%',
    backgroundColor: '#171C18',
    borderRadius: 17,
    paddingVertical: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282E29',
  },

  statEmoji: {
    fontSize: 18,
    marginBottom: 5,
  },

  statNumber: {
    color: '#E7EBE6',
    fontSize: 19,
    fontWeight: '800',
  },

  statLabel: {
    color: '#707870',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },

  /* SECTION */

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    color: '#E9ECE8',
    fontSize: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#6D756E',
    fontSize: 12,
    marginTop: 3,
  },

  /* ACHIEVEMENT */

  achievementCard: {
    backgroundColor: '#171C18',
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#282E29',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  unlockedCard: {
    backgroundColor: '#19231C',
    borderColor: '#344238',
  },

  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#263127',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedIcon: {
    backgroundColor: '#202421',
  },

  achievementEmoji: {
    fontSize: 25,
  },

  lockedEmoji: {
    opacity: 0.35,
  },

  /* CONTENT */

  achievementContent: {
    flex: 1,
    marginLeft: 13,
  },

  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  achievementTitle: {
    color: '#E7EBE6',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },

  lockedTitle: {
    color: '#777E78',
  },

  achievementDescription: {
    color: '#737B74',
    fontSize: 11,
    marginTop: 4,
  },

  unlockedBadge: {
    backgroundColor: '#26362A',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    marginLeft: 5,
  },

  unlockedText: {
    color: '#A8C0A8',
    fontSize: 7,
    fontWeight: '800',
  },

  /* PROGRESS */

  progressTrack: {
    height: 5,
    backgroundColor: '#292E2A',
    borderRadius: 3,
    marginTop: 9,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#7D967E',
    borderRadius: 3,
  },

  progressText: {
    color: '#646C65',
    fontSize: 9,
    marginTop: 4,
  },

  bottomSpace: {
    height: 60,
  },
});

