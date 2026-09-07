
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';

import { router } from 'expo-router';
import { useHabits } from '@/context/HabitContext';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const {
    habits,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();
  const { user, logout } = useAuth();

  // =========================
  // STATISTICS
  // =========================

  const totalHabits = habits.length;

  const totalCompletions = habits.reduce(
    (total, habit) =>
      total + habit.completedDates.length,
    0
  );

  const currentStreak =
    habits.length === 0
      ? 0
      : Math.max(
          ...habits.map((habit) =>
            getCurrentStreak(habit)
          )
        );

  const bestStreak =
    habits.length === 0
      ? 0
      : Math.max(
          ...habits.map((habit) =>
            getBestStreak(habit)
          )
        );

  const completedToday = habits.filter(
    (habit) => habit.completed
  ).length;

  const todayProgress =
    totalHabits === 0
      ? 0
      : Math.round(
          (completedToday / totalHabits) * 100
        );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* =========================
          HEADER
      ========================= */}

      <View style={styles.header}>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Profile
        </Text>

        <View style={styles.headerSpacer} />

      </View>


      {/* =========================
          PROFILE CARD
      ========================= */}

      <View style={styles.profileCard}>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            👤
          </Text>
        </View>

        <Text style={styles.profileName}>
         {user?.name || 'Habit Builder'}
       </Text>

        <Text style={styles.profileSubtitle}>
          {user?.email || 'Building better habits every day.'}
        </Text>

        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>
            ✦ HABIT TRACKER
          </Text>
        </View>

      </View>


      {/* =========================
          TODAY'S PROGRESS
      ========================= */}

      <Text style={styles.sectionLabel}>
        TODAY
      </Text>

      <View style={styles.todayCard}>

        <View style={styles.todayTopRow}>

          <View>
            <Text style={styles.todayTitle}>
              Daily Progress
            </Text>

            <Text style={styles.todaySubtitle}>
              {completedToday} of {totalHabits} completed
            </Text>
          </View>

          <Text style={styles.todayPercentage}>
            {todayProgress}%
          </Text>

        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${todayProgress}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.todayMessage}>
          {todayProgress === 100
            ? '✨ Perfect! You completed everything today.'
            : todayProgress >= 50
            ? '🔥 Great progress. Keep going!'
            : '🌱 Start small and stay consistent.'}
        </Text>

      </View>


      {/* =========================
          STATISTICS
      ========================= */}

      <Text style={styles.sectionLabel}>
        YOUR STATISTICS
      </Text>

      <View style={styles.statsGrid}>

        {/* TOTAL HABITS */}

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>
              📋
            </Text>
          </View>

          <Text style={styles.statNumber}>
            {totalHabits}
          </Text>

          <Text style={styles.statLabel}>
            Total Habits
          </Text>
        </View>


        {/* COMPLETIONS */}

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>
              ✅
            </Text>
          </View>

          <Text style={styles.statNumber}>
            {totalCompletions}
          </Text>

          <Text style={styles.statLabel}>
            Completions
          </Text>
        </View>


        {/* CURRENT STREAK */}

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>
              🔥
            </Text>
          </View>

          <Text style={styles.statNumber}>
            {currentStreak}
          </Text>

          <Text style={styles.statLabel}>
            Current Streak
          </Text>
        </View>


        {/* BEST STREAK */}

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>
              🏆
            </Text>
          </View>

          <Text style={styles.statNumber}>
            {bestStreak}
          </Text>

          <Text style={styles.statLabel}>
            Best Streak
          </Text>
        </View>

      </View>


      {/* =========================
          QUICK ACTIONS
      ========================= */}

      <Text style={styles.sectionLabel}>
        QUICK ACTIONS
      </Text>

      <View style={styles.actionContainer}>

        {/* HISTORY */}

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionPressed,
          ]}
          onPress={() =>
            router.push('/calendar')
          }
        >

          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>
              📅
            </Text>
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Habit History
            </Text>

            <Text style={styles.actionSubtitle}>
              View your past activity
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>

        </Pressable>


        {/* ANALYTICS */}

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionPressed,
          ]}
          onPress={() =>
            router.push('/analytics')
          }
        >

          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>
              📊
            </Text>
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Analytics
            </Text>

            <Text style={styles.actionSubtitle}>
              Understand your performance
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>

        </Pressable>


        {/* ACHIEVEMENTS */}

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionPressed,
          ]}
          onPress={() =>
            router.push('/achievements')
          }
        >

          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>
              🏆
            </Text>
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Achievements
            </Text>

            <Text style={styles.actionSubtitle}>
              See your milestones
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>

        </Pressable>

      </View>

      {/* =========================
       LOGOUT
      ========================= */}

      <Pressable
      style={({ pressed }) => [
        styles.logoutButton,
       pressed && styles.actionPressed,
     ]}
     onPress={async () => {
     await logout();
     router.replace('/login');
    }}
    >
    <Text style={styles.logoutText}>
      Log Out
    </Text>
     </Pressable>


      {/* =========================
          APP INFORMATION
      ========================= */}

      <Text style={styles.sectionLabel}>
        APP
      </Text>

      <View style={styles.infoCard}>

        <View style={styles.infoRow}>

          <Text style={styles.infoTitle}>
            Habit Tracker
          </Text>

          <Text style={styles.version}>
            v1.0.0
          </Text>

        </View>

        <View style={styles.separator} />

        <Text style={styles.infoDescription}>
          Build consistency, track your progress,
          and become the best version of yourself.
        </Text>

      </View>


      {/* =========================
          FOOTER
      ========================= */}

      <View style={styles.footer}>

        <Text style={styles.footerText}>
          Made with ❤️ for better habits
        </Text>

        <Text style={styles.footerVersion}>
          Habit Tracker
        </Text>

      </View>


      <View style={styles.bottomSpace} />

    </ScrollView>
  );
}


/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  /* =========================
     MAIN
  ========================= */

  container: {
    flex: 1,
    backgroundColor: '#101311',
    paddingHorizontal: 20,
    paddingTop: 52,
  },


  /* =========================
     HEADER
  ========================= */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,

    borderRadius: 13,

    backgroundColor: '#1B211C',

    borderWidth: 1,
    borderColor: '#2D352E',

    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    color: '#DCE3DA',
    fontSize: 32,
    fontWeight: '300',

    marginTop: -3,
  },

  headerTitle: {
    color: '#EEF2ED',
    fontSize: 21,
    fontWeight: '800',
  },

  headerSpacer: {
    width: 42,
  },


  /* =========================
     PROFILE CARD
  ========================= */

  profileCard: {
    backgroundColor: '#19221C',

    borderRadius: 25,

    paddingVertical: 27,
    paddingHorizontal: 20,

    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#2E392F',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.4,
    shadowRadius: 17,

    elevation: 8,

    marginBottom: 28,
  },

  avatar: {
    width: 82,
    height: 82,

    borderRadius: 41,

    backgroundColor: '#263127',

    borderWidth: 1,
    borderColor: '#405044',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 13,
  },

  avatarText: {
    fontSize: 36,
  },

  profileName: {
    color: '#EEF2ED',
    fontSize: 22,
    fontWeight: '800',
  },

  profileSubtitle: {
    color: '#727B74',
    fontSize: 11,

    marginTop: 5,

    textAlign: 'center',
  },

  memberBadge: {
    backgroundColor: '#263229',

    borderRadius: 9,

    paddingHorizontal: 10,
    paddingVertical: 6,

    marginTop: 13,

    borderWidth: 1,
    borderColor: '#354238',
  },

  memberBadgeText: {
    color: '#A9BBA7',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },


  /* =========================
     SECTION LABEL
  ========================= */

  sectionLabel: {
    color: '#59615B',

    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 1.5,

    marginBottom: 11,
  },


  /* =========================
     TODAY
  ========================= */

  todayCard: {
    backgroundColor: '#171C18',

    borderRadius: 20,

    padding: 19,

    borderWidth: 1,
    borderColor: '#292F2A',

    marginBottom: 27,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,

    elevation: 4,
  },

  todayTopRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  todayTitle: {
    color: '#E7EBE6',

    fontSize: 16,

    fontWeight: '800',
  },

  todaySubtitle: {
    color: '#697169',

    fontSize: 10,

    marginTop: 4,
  },

  todayPercentage: {
    color: '#AFC0AC',

    fontSize: 24,

    fontWeight: '800',
  },

  progressTrack: {
    height: 7,

    backgroundColor: '#292F2A',

    borderRadius: 5,

    overflow: 'hidden',

    marginTop: 16,
  },

  progressFill: {
    height: '100%',

    backgroundColor: '#9CAF9A',

    borderRadius: 5,
  },

  todayMessage: {
    color: '#687169',

    fontSize: 10,

    marginTop: 11,
  },


  /* =========================
     STATISTICS
  ========================= */

  statsGrid: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent: 'space-between',

    marginBottom: 28,
  },

  statCard: {
    width: '48%',

    backgroundColor: '#171C18',

    borderRadius: 18,

    padding: 16,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#292F2A',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 9,

    elevation: 3,
  },

  statIconContainer: {
    width: 36,
    height: 36,

    borderRadius: 11,

    backgroundColor: '#222A23',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 9,
  },

  statIcon: {
    fontSize: 18,
  },

  statNumber: {
    color: '#E7EBE6',

    fontSize: 25,

    fontWeight: '800',
  },

  statLabel: {
    color: '#697169',

    fontSize: 10,

    marginTop: 3,
  },


  /* =========================
     ACTIONS
  ========================= */

  actionContainer: {
    marginBottom: 28,
  },

  actionCard: {
    backgroundColor: '#171C18',

    borderRadius: 17,

    padding: 13,

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#292F2A',

    marginBottom: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,

    elevation: 3,
  },

  actionPressed: {
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  actionIconContainer: {
    width: 43,
    height: 43,

    borderRadius: 13,

    backgroundColor: '#222A23',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,
  },

  actionIcon: {
    fontSize: 20,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    color: '#E7EBE6',

    fontSize: 14,

    fontWeight: '800',
  },

  actionSubtitle: {
    color: '#687169',

    fontSize: 10,

    marginTop: 3,
  },

  arrow: {
    color: '#707A72',

    fontSize: 28,

    fontWeight: '300',

    marginRight: 4,
  },


  /* =========================
     APP INFO
  ========================= */

  infoCard: {
    backgroundColor: '#171C18',

    borderRadius: 18,

    padding: 17,

    borderWidth: 1,
    borderColor: '#292F2A',

    marginBottom: 25,
  },

  infoRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  infoTitle: {
    color: '#DCE2DC',

    fontSize: 13,

    fontWeight: '800',
  },

  version: {
    color: '#697169',

    fontSize: 9,

    fontWeight: '600',
  },

  separator: {
    height: 1,

    backgroundColor: '#292F2A',

    marginVertical: 13,
  },

  infoDescription: {
    color: '#697169',

    fontSize: 10,

    lineHeight: 16,
  },


  /* =========================
     FOOTER
  ========================= */

  footer: {
    alignItems: 'center',

    marginTop: 4,
  },

  footerText: {
    color: '#4F5751',

    fontSize: 10,
  },

  footerVersion: {
    color: '#3F4741',

    fontSize: 9,

    marginTop: 4,
  },

  bottomSpace: {
    height: 60,
  },

  logoutButton: {
  backgroundColor: '#211918',

  borderRadius: 17,

  paddingVertical: 15,

  alignItems: 'center',

  borderWidth: 1,
  borderColor: '#49302D',

  marginBottom: 28,
},

logoutText: {
  color: '#D98F86',

  fontSize: 13,

  fontWeight: '800',
},

});

