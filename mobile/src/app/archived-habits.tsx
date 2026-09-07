import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { useHabits } from '@/context/HabitContext';

export default function ArchivedHabitsScreen() {
  const {
    habits,
    archiveHabit,
    deleteHabit,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  // =====================================================
  // LOADING STATES
  // =====================================================

  const [restoringId, setRestoringId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // =====================================================
  // ARCHIVED HABITS
  // =====================================================

  const archivedHabits = useMemo(() => {
    return habits.filter(
      (habit) => habit.archived
    );
  }, [habits]);

  // =====================================================
  // RESTORE HABIT
  // =====================================================

  const confirmRestore = (
    id: string,
    name: string
  ) => {
    Alert.alert(
      'Restore Habit',
      `Restore "${name}" to your active habits?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Restore',
          onPress: async () => {
            try {
              setRestoringId(id);

              await archiveHabit(
                id,
                false
              );
            } finally {
              setRestoringId(null);
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // DELETE HABIT
  // =====================================================

  const confirmDelete = (
    id: string,
    name: string
  ) => {
    Alert.alert(
      'Delete Archived Habit',
      `Are you sure you want to permanently delete "${name}"?\n\nThis will also remove its complete history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              setDeletingId(id);

              await deleteHabit(id);

              Alert.alert(
                'Deleted',
                `"${name}" has been permanently deleted.`
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (archivedHabits.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Archived Habits
            </Text>

            <Text style={styles.headerSubtitle}>
              Habits you've put aside
            </Text>
          </View>
        </View>

        {/* =================================================
            EMPTY CARD
        ================================================= */}

        <View style={styles.emptyCard}>
          <View
            style={styles.emptyIconContainer}
          >
            <Text style={styles.emptyIcon}>
              📦
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            No archived habits
          </Text>

          <Text style={styles.emptyText}>
            Habits you archive will appear here.
            {'\n'}
            You can restore them anytime.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.backHomeButton,
              pressed &&
                styles.backHomeButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeButtonText}>
              ← Back to My Habits
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed &&
              styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Archived Habits
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your old habits
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {archivedHabits.length}
          </Text>
        </View>
      </View>

      {/* =================================================
          INFO CARD
      ================================================= */}

      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Text style={styles.infoIcon}>
            💡
          </Text>
        </View>

        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            Your habits are safe
          </Text>

          <Text style={styles.infoText}>
            Archived habits are hidden from your
            daily list, but their history and
            progress are preserved.
          </Text>
        </View>
      </View>

      {/* =================================================
          SECTION HEADER
      ================================================= */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Archived
          </Text>

          <Text style={styles.sectionSubtitle}>
            Restore or permanently delete habits
          </Text>
        </View>
      </View>

      {/* =================================================
          HABITS
      ================================================= */}

      {archivedHabits.map((habit) => {
        const currentStreak =
          getCurrentStreak(habit);

        const bestStreak =
          getBestStreak(habit);

        const isRestoring =
          restoringId === habit.id;

        const isDeleting =
          deletingId === habit.id;

        const isProcessing =
          isRestoring ||
          isDeleting;

        return (
          <View
            key={habit.id}
            style={[
              styles.habitCard,
              isProcessing &&
                styles.processingCard,
            ]}
          >
            {/* =================================================
                TOP
            ================================================= */}

            <View style={styles.habitTop}>
              <View
                style={styles.habitIconContainer}
              >
                <Text style={styles.habitIcon}>
                  📦
                </Text>
              </View>

              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>
                  {habit.name}
                </Text>

                {habit.description ? (
                  <Text
                    style={styles.habitDescription}
                    numberOfLines={2}
                  >
                    {habit.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* =================================================
                DETAILS
            ================================================= */}

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  CATEGORY
                </Text>

                <Text style={styles.detailValue}>
                  {habit.category}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  FREQUENCY
                </Text>

                <Text style={styles.detailValue}>
                  {habit.frequency}
                </Text>
              </View>
            </View>

            {/* =================================================
                STATS
            ================================================= */}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statIcon}>
                  🔥
                </Text>

                <View>
                  <Text style={styles.statValue}>
                    {currentStreak}
                  </Text>

                  <Text style={styles.statLabel}>
                    Current streak
                  </Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statIcon}>
                  🏆
                </Text>

                <View>
                  <Text style={styles.statValue}>
                    {bestStreak}
                  </Text>

                  <Text style={styles.statLabel}>
                    Best streak
                  </Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statIcon}>
                  ✓
                </Text>

                <View>
                  <Text style={styles.statValue}>
                    {habit.completedDates.length}
                  </Text>

                  <Text style={styles.statLabel}>
                    Completed
                  </Text>
                </View>
              </View>
            </View>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <View style={styles.actionsRow}>
              {/* RESTORE */}

              <Pressable
                style={({ pressed }) => [
                  styles.restoreButton,
                  pressed &&
                    styles.restoreButtonPressed,
                ]}
                onPress={() =>
                  confirmRestore(
                    habit.id,
                    habit.name
                  )
                }
                disabled={isProcessing}
              >
                {isRestoring ? (
                  <ActivityIndicator
                    size="small"
                    color="#172019"
                  />
                ) : (
                  <Text
                    style={styles.restoreButtonText}
                  >
                    ↩ Restore
                  </Text>
                )}
              </Pressable>

              {/* DELETE */}

              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed &&
                    styles.deleteButtonPressed,
                ]}
                onPress={() =>
                  confirmDelete(
                    habit.id,
                    habit.name
                  )
                }
                disabled={isProcessing}
              >
                {isDeleting ? (
                  <ActivityIndicator
                    size="small"
                    color="#C98282"
                  />
                ) : (
                  <Text
                    style={styles.deleteButtonText}
                  >
                    🗑 Delete
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* =================================================
          FOOTER
      ================================================= */}

      <View style={styles.footerCard}>
        <Text style={styles.footerIcon}>
          🌱
        </Text>

        <Text style={styles.footerText}>
          Archived doesn't mean forgotten.
          {'\n'}
          Your progress is always preserved.
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
  container: {
    flex: 1,
    backgroundColor: '#101311',
    paddingHorizontal: 20,
    paddingTop: 58,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1C251F',
    borderWidth: 1,
    borderColor: '#354036',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  backButtonPressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  backIcon: {
    color: '#DCE6DA',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: '#F0F3EF',
    fontSize: 25,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#626B64',
    fontSize: 10,
    marginTop: 4,
  },

  countBadge: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#222A23',
    borderWidth: 1,
    borderColor: '#354238',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    color: '#B7C9B5',
    fontSize: 13,
    fontWeight: '800',
  },

  // ===================================================
  // INFO
  // ===================================================

  infoCard: {
    backgroundColor: '#19221C',
    borderRadius: 20,
    padding: 17,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#354238',
    flexDirection: 'row',
  },

  infoIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoIcon: {
    fontSize: 20,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: '#E7EBE6',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },

  infoText: {
    color: '#737B74',
    fontSize: 10,
    lineHeight: 16,
  },

  // ===================================================
  // SECTION
  // ===================================================

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#E8ECE7',
    fontSize: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#626B64',
    fontSize: 10,
    marginTop: 4,
  },

  // ===================================================
  // HABIT CARD
  // ===================================================

  habitCard: {
    backgroundColor: '#171C18',
    borderRadius: 21,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#292F2A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.28,
    shadowRadius: 11,
    elevation: 5,
  },

  processingCard: {
    opacity: 0.55,
  },

  habitTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  habitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  habitIcon: {
    fontSize: 22,
  },

  habitInfo: {
    flex: 1,
  },

  habitName: {
    color: '#E7EBE6',
    fontSize: 17,
    fontWeight: '800',
  },

  habitDescription: {
    color: '#626B64',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  // ===================================================
  // DETAILS
  // ===================================================

  detailsRow: {
    flexDirection: 'row',
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#292F2A',
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color: '#59615B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },

  detailValue: {
    color: '#AAB5AA',
    fontSize: 11,
    fontWeight: '700',
  },

  // ===================================================
  // STATS
  // ===================================================

  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 7,
  },

  statBox: {
    flex: 1,
    minHeight: 58,
    backgroundColor: '#202720',
    borderRadius: 13,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    fontSize: 15,
    marginRight: 7,
  },

  statValue: {
    color: '#DDE5DC',
    fontSize: 14,
    fontWeight: '800',
  },

  statLabel: {
    color: '#626B64',
    fontSize: 7,
    marginTop: 2,
  },

  // ===================================================
  // ACTIONS
  // ===================================================

  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 9,
  },

  restoreButton: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#B7C9B5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  restoreButtonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  restoreButtonText: {
    color: '#172019',
    fontSize: 11,
    fontWeight: '800',
  },

  deleteButton: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#211918',
    borderWidth: 1,
    borderColor: '#4A2F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  deleteButtonText: {
    color: '#C98282',
    fontSize: 11,
    fontWeight: '800',
  },

  // ===================================================
  // EMPTY STATE
  // ===================================================

  emptyCard: {
    backgroundColor: '#171C18',
    borderRadius: 22,
    paddingVertical: 42,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292F2A',
    marginTop: 15,
  },

  emptyIconContainer: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#202921',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    color: '#E7EBE6',
    fontSize: 20,
    fontWeight: '800',
  },

  emptyText: {
    color: '#707870',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 22,
    textAlign: 'center',
  },

  backHomeButton: {
    backgroundColor: '#DCE6DA',
    paddingVertical: 13,
    paddingHorizontal: 23,
    borderRadius: 13,
  },

  backHomeButtonPressed: {
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  backHomeButtonText: {
    color: '#172019',
    fontSize: 12,
    fontWeight: '800',
  },

  // ===================================================
  // FOOTER
  // ===================================================

  footerCard: {
    backgroundColor: '#171C18',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292F2A',
    padding: 18,
    marginTop: 8,
    alignItems: 'center',
  },

  footerIcon: {
    fontSize: 22,
    marginBottom: 8,
  },

  footerText: {
    color: '#626B64',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },

  bottomSpace: {
    height: 80,
  },
});