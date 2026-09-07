
import React, { useEffect, useState } from 'react';

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

export default function HomeScreen() {
  const {
    habits,
    toggleHabit,
    deleteHabit,
    archiveHabit,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  // =====================================================
  // AI RECOMMENDATION
  // =====================================================

  const [aiRecommendation, setAiRecommendation] =
    useState('');

  const [aiLoading, setAiLoading] =
    useState(false);

  // =====================================================
  // DELETE LOADING
  // =====================================================

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // =====================================================
  // ARCHIVE LOADING
  // =====================================================

  const [archivingId, setArchivingId] =
    useState<string | null>(null);

  // =====================================================
  // AI RECOMMENDATION
  // =====================================================

  const getAIRecommendation = async () => {
    if (habits.length === 0) {
      setAiRecommendation(
        'Start with one small habit today. Small actions create lasting consistency. 🌱'
      );
      return;
    }

    setAiLoading(true);

    try {
      const response = await fetch(
        'http://192.168.1.5:5000/api/ai/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            message:
              'Give me one short personalized recommendation for today based on my current habit progress. Focus on the most useful action I should take today.',

            habits,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'AI request failed'
        );
      }

      setAiRecommendation(
        data.reply ||
          'Keep taking small steps toward your goals. 🌱'
      );
    } catch (error) {
      console.log(
        'AI RECOMMENDATION ERROR:',
        error
      );

      setAiRecommendation(
        'Keep focusing on one small action at a time. Consistency beats perfection. 🌱'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // =====================================================
  // REFRESH AI
  // =====================================================

  useEffect(() => {
    getAIRecommendation();
  }, [habits]);

  // =====================================================
  // DELETE CONFIRMATION
  // =====================================================

  const confirmDelete = (
    id: string,
    name: string
  ) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${name}"?\n\nThis will permanently remove the habit and its history.`,
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
                `"${name}" has been deleted.`
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
  // ARCHIVE CONFIRMATION
  // =====================================================

  const confirmArchive = (
    id: string,
    name: string,
    archived: boolean
  ) => {
    Alert.alert(
      archived
        ? 'Archive Habit'
        : 'Restore Habit',

      archived
        ? `Move "${name}" to archived habits?`
        : `Restore "${name}" to your active habits?`,

      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: archived
            ? 'Archive'
            : 'Restore',

          onPress: async () => {
            try {
              setArchivingId(id);

              await archiveHabit(
                id,
                archived
              );
            } finally {
              setArchivingId(null);
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // TODAY'S PROGRESS
  // =====================================================

  const activeHabits =
    habits.filter(
      (habit) => !habit.archived
    );

  const archivedHabits =
    habits.filter(
      (habit) => habit.archived
    );

  const completedCount =
    activeHabits.filter(
      (habit) => habit.completed
    ).length;

  const progress =
    activeHabits.length === 0
      ? 0
      : Math.round(
          (completedCount /
            activeHabits.length) *
            100
        );

  // =====================================================
  // UI
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

        <View>

          <Text style={styles.greeting}>
            Good morning 👋
          </Text>

          <Text style={styles.title}>
            My Habits
          </Text>

          <Text style={styles.headerSubtitle}>
            Build consistency. Become better.
          </Text>

        </View>

        <Pressable
          style={({ pressed }) => [
            styles.profileButton,

            pressed &&
              styles.profileButtonPressed,
          ]}
          onPress={() =>
            router.push('/profile')
          }
        >

          <Text style={styles.profileIcon}>
            👤
          </Text>

        </Pressable>

      </View>


      {/* =================================================
          PROGRESS
      ================================================= */}

      <View style={styles.statsCard}>

        <View style={styles.progressHeader}>

          <View>

            <Text style={styles.statsLabel}>
              TODAY'S PROGRESS
            </Text>

            <Text style={styles.progress}>
              {progress}%
            </Text>

          </View>

          <View style={styles.progressCircle}>

            <Text
              style={
                styles.progressCircleText
              }
            >
              {completedCount}/
              {activeHabits.length}
            </Text>

          </View>

        </View>


        <Text style={styles.statsText}>
          {completedCount} of{' '}
          {activeHabits.length} habits completed
        </Text>


        <View
          style={
            styles.progressBackground
          }
        >

          <View
            style={[
              styles.progressFill,

              {
                width: `${progress}%`,
              },
            ]}
          />

        </View>


        <Text style={styles.motivationText}>

          {progress === 100
            ? '✨ Perfect day! Keep it going.'

            : progress >= 50
            ? '🔥 You are doing great. Keep going!'

            : '🌱 Small steps create big changes.'}

        </Text>

      </View>


      {/* =================================================
          QUICK ACCESS
      ================================================= */}

      <Text style={styles.sectionLabel}>
        QUICK ACCESS
      </Text>


      <View style={styles.quickNav}>

        {/* HISTORY */}

        <Pressable
          style={({ pressed }) => [
            styles.navCard,

            pressed &&
              styles.navCardPressed,
          ]}
          onPress={() =>
            router.push('/calendar')
          }
        >

          <View
            style={
              styles.navIconContainer
            }
          >

            <Text style={styles.navIcon}>
              📅
            </Text>

          </View>

          <Text style={styles.navTitle}>
            History
          </Text>

          <Text style={styles.navSubtitle}>
            Track habits
          </Text>

        </Pressable>


        {/* ANALYTICS */}

        <Pressable
          style={({ pressed }) => [
            styles.navCard,

            pressed &&
              styles.navCardPressed,
          ]}
          onPress={() =>
            router.push('/analytics')
          }
        >

          <View
            style={
              styles.navIconContainer
            }
          >

            <Text style={styles.navIcon}>
              📊
            </Text>

          </View>

          <Text style={styles.navTitle}>
            Analytics
          </Text>

          <Text style={styles.navSubtitle}>
            View progress
          </Text>

        </Pressable>


        {/* ACHIEVEMENTS */}

        <Pressable
          style={({ pressed }) => [
            styles.navCard,

            pressed &&
              styles.navCardPressed,
          ]}
          onPress={() =>
            router.push('/achievements')
          }
        >

          <View
            style={
              styles.navIconContainer
            }
          >

            <Text style={styles.navIcon}>
              🏆
            </Text>

          </View>

          <Text style={styles.navTitle}>
            Awards
          </Text>

          <Text style={styles.navSubtitle}>
            Milestones
          </Text>

        </Pressable>


        {/* AI COACH */}

        <Pressable
          style={({ pressed }) => [
            styles.navCard,

            pressed &&
              styles.navCardPressed,
          ]}
          onPress={() =>
            router.push('/ai-chat')
          }
        >

          <View
            style={
              styles.navIconContainer
            }
          >

            <Text style={styles.navIcon}>
              🤖
            </Text>

          </View>

          <Text style={styles.navTitle}>
            AI Coach
          </Text>

          <Text style={styles.navSubtitle}>
            Get guidance
          </Text>

        </Pressable>


        {/* =================================================
            ARCHIVED HABITS
        ================================================= */}

        <Pressable
          style={({ pressed }) => [
            styles.navCard,

            pressed &&
              styles.navCardPressed,
          ]}
          onPress={() =>
            router.push('/archived-habits')
          }
        >

          <View
            style={
              styles.navIconContainer
            }
          >

            <Text style={styles.navIcon}>
              📦
            </Text>

          </View>

          <Text style={styles.navTitle}>
            Archived
          </Text>

          <Text style={styles.navSubtitle}>
            {archivedHabits.length > 0
              ? `${archivedHabits.length} old habit${
                  archivedHabits.length === 1
                    ? ''
                    : 's'
                }`
              : 'Manage old habits'}
          </Text>

        </Pressable>

      </View>


      {/* =================================================
          AI CARD
      ================================================= */}

      <View style={styles.aiCard}>

        <View
          style={styles.aiCardHeader}
        >

          <View
            style={
              styles.aiIconContainer
            }
          >

            <Text style={styles.aiIcon}>
              🤖
            </Text>

          </View>


          <View
            style={styles.aiHeaderText}
          >

            <Text style={styles.aiLabel}>
              AI HABIT COACH
            </Text>

            <Text style={styles.aiTitle}>
              Today's Recommendation
            </Text>

          </View>

        </View>


        {aiLoading ? (

          <View style={styles.aiLoading}>

            <ActivityIndicator
              size="small"
              color="#B7C9B5"
            />

            <Text
              style={
                styles.aiLoadingText
              }
            >
              Analyzing your habits...
            </Text>

          </View>

        ) : (

          <Text
            style={
              styles.aiRecommendation
            }
          >
            {aiRecommendation}
          </Text>

        )}


        <Pressable
          style={({ pressed }) => [
            styles.aiChatButton,

            pressed &&
              styles.aiChatButtonPressed,
          ]}
          onPress={() =>
            router.push('/ai-chat')
          }
        >

          <Text
            style={
              styles.aiChatButtonText
            }
          >
            Ask AI Coach →
          </Text>

        </Pressable>

      </View>


      {/* =================================================
          HABITS HEADER
      ================================================= */}

      <View
        style={styles.habitsHeader}
      >

        <View>

          <Text
            style={styles.sectionTitle}
          >
            Today's Habits
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Stay consistent every day.
          </Text>

        </View>


        <Pressable
          style={({ pressed }) => [
            styles.smallAddButton,

            pressed &&
              styles.smallAddButtonPressed,
          ]}
          onPress={() =>
            router.push('/add-habit')
          }
        >

          <Text
            style={styles.smallAddText}
          >
            +
          </Text>

        </Pressable>

      </View>


      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {activeHabits.length === 0 ? (

        <View style={styles.emptyCard}>

          <View
            style={
              styles.emptyIconContainer
            }
          >

            <Text style={styles.emptyEmoji}>
              🌱
            </Text>

          </View>


          <Text
            style={styles.emptyTitle}
          >
            No active habits
          </Text>


          <Text
            style={styles.emptyText}
          >
            Start building better habits today.
          </Text>


          <Pressable
            style={({ pressed }) => [
              styles.addButton,

              pressed &&
                styles.addButtonPressed,
            ]}
            onPress={() =>
              router.push('/add-habit')
            }
          >

            <Text
              style={
                styles.addButtonText
              }
            >
              + Add Your First Habit
            </Text>

          </Pressable>

        </View>

      ) : (

        activeHabits.map((habit) => {

          const currentStreak =
            getCurrentStreak(habit);

          const bestStreak =
            getBestStreak(habit);

          const isDeleting =
            deletingId === habit.id;

          const isArchiving =
            archivingId === habit.id;


          return (

            <View
              key={habit.id}
              style={[
                styles.habitCard,

                habit.completed &&
                  styles.completedHabitCard,

                (isDeleting ||
                  isArchiving) &&
                  styles.processingCard,
              ]}
            >

              {/* HABIT */}

              <Pressable
                style={styles.habitContent}
                onPress={() =>
                  toggleHabit(habit.id)
                }
                disabled={
                  isDeleting ||
                  isArchiving
                }
              >

                <View
                  style={
                    styles.habitIconContainer
                  }
                >

                  <Text
                    style={
                      styles.habitIcon
                    }
                  >
                    {habit.completed
                      ? '✓'
                      : '○'}
                  </Text>

                </View>


                <View
                  style={styles.habitInfo}
                >

                  <Text
                    style={[
                      styles.habitName,

                      habit.completed &&
                        styles.completedHabitName,
                    ]}
                  >
                    {habit.name}
                  </Text>


                  <View
                    style={
                      styles.streakRow
                    }
                  >

                    <Text
                      style={
                        styles.streakText
                      }
                    >
                      🔥 {currentStreak}{' '}
                      {currentStreak === 1
                        ? 'day'
                        : 'days'}
                    </Text>


                    <Text
                      style={
                        styles.streakDivider
                      }
                    >
                      •
                    </Text>


                    <Text
                      style={
                        styles.bestStreakText
                      }
                    >
                      🏆 Best {bestStreak}
                    </Text>

                  </View>

                </View>

              </Pressable>


              {/* EDIT */}

              <Pressable
                style={
                  styles.actionButton
                }
                onPress={() =>
                  router.push({
                    pathname:
                      '/edit-habit',

                    params: {
                      id: habit.id,
                    },
                  })
                }
                disabled={
                  isDeleting ||
                  isArchiving
                }
              >

                <Text
                  style={
                    styles.actionIcon
                  }
                >
                  ✏️
                </Text>

              </Pressable>


              {/* ARCHIVE */}

              <Pressable
                style={
                  styles.actionButton
                }
                onPress={() =>
                  confirmArchive(
                    habit.id,
                    habit.name,
                    true
                  )
                }
                disabled={
                  isDeleting ||
                  isArchiving
                }
              >

                {isArchiving ? (

                  <ActivityIndicator
                    size="small"
                    color="#B7C9B5"
                  />

                ) : (

                  <Text
                    style={
                      styles.actionIcon
                    }
                  >
                    📦
                  </Text>

                )}

              </Pressable>


              {/* DELETE */}

              <Pressable
                style={
                  styles.actionButton
                }
                onPress={() =>
                  confirmDelete(
                    habit.id,
                    habit.name
                  )
                }
                disabled={
                  isDeleting ||
                  isArchiving
                }
              >

                {isDeleting ? (

                  <ActivityIndicator
                    size="small"
                    color="#B7C9B5"
                  />

                ) : (

                  <Text
                    style={
                      styles.actionIcon
                    }
                  >
                    🗑️
                  </Text>

                )}

              </Pressable>

            </View>

          );

        })

      )}


      {/* =================================================
          BOTTOM SPACE
      ================================================= */}

      <View
        style={styles.bottomSpace}
      />

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


  /* ===================================================
     HEADER
  =================================================== */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  greeting: {
    color: '#737B74',
    fontSize: 13,
    marginBottom: 4,
  },

  title: {
    color: '#F0F3EF',
    fontSize: 32,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#59615B',
    fontSize: 10,
    marginTop: 5,
  },

  profileButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C251F',
    borderWidth: 1,
    borderColor: '#354036',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 7,
  },

  profileButtonPressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  profileIcon: {
    fontSize: 23,
  },


  /* ===================================================
     PROGRESS CARD
  =================================================== */

  statsCard: {
    backgroundColor: '#19221C',
    borderRadius: 24,
    padding: 23,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2E392F',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statsLabel: {
    color: '#788178',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  progress: {
    color: '#EEF2ED',
    fontSize: 44,
    fontWeight: '800',
    marginTop: 5,
  },

  progressCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#526153',
    backgroundColor: '#202A22',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCircleText: {
    color: '#C7D4C5',
    fontSize: 12,
    fontWeight: '800',
  },

  statsText: {
    color: '#707971',
    fontSize: 11,
    marginTop: 2,
  },

  progressBackground: {
    height: 7,
    backgroundColor: '#2A302B',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 17,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#9CAF9A',
    borderRadius: 5,
  },

  motivationText: {
    color: '#778278',
    fontSize: 10,
    marginTop: 12,
  },


  /* ===================================================
     QUICK ACCESS
  =================================================== */

  sectionLabel: {
    color: '#59615B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 11,
  },

  quickNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 29,
  },

  navCard: {
    width: '48%',
    backgroundColor: '#171C18',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292F2A',
    marginBottom: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },

  navCardPressed: {
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  navIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  navIcon: {
    fontSize: 19,
  },

  navTitle: {
    color: '#E7EBE6',
    fontSize: 11,
    fontWeight: '800',
  },

  navSubtitle: {
    color: '#626B64',
    fontSize: 8,
    marginTop: 3,
    textAlign: 'center',
  },


  /* ===================================================
     AI CARD
  =================================================== */

  aiCard: {
    backgroundColor: '#19221C',
    borderRadius: 22,
    padding: 18,
    marginBottom: 29,
    borderWidth: 1,
    borderColor: '#354238',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  aiIconContainer: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  aiIcon: {
    fontSize: 22,
  },

  aiHeaderText: {
    flex: 1,
  },

  aiLabel: {
    color: '#8EA78F',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  aiTitle: {
    color: '#E8ECE7',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
  },

  aiRecommendation: {
    color: '#C9D2C8',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 15,
  },

  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 45,
    marginBottom: 15,
  },

  aiLoadingText: {
    color: '#737B74',
    fontSize: 11,
    marginLeft: 9,
  },

  aiChatButton: {
    backgroundColor: '#B7C9B5',
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiChatButtonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  aiChatButtonText: {
    color: '#172019',
    fontSize: 12,
    fontWeight: '800',
  },


  /* ===================================================
     HABITS HEADER
  =================================================== */

  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 3,
  },

  smallAddButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCE6DA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallAddButtonPressed: {
    transform: [
      {
        scale: 0.92,
      },
    ],
  },

  smallAddText: {
    color: '#172019',
    fontSize: 24,
    fontWeight: '500',
    marginTop: -2,
  },


  /* ===================================================
     HABIT CARD
  =================================================== */

  habitCard: {
    backgroundColor: '#171C18',
    borderRadius: 19,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292F2A',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },

  completedHabitCard: {
    backgroundColor: '#19231C',
    borderColor: '#354238',
  },

  processingCard: {
    opacity: 0.55,
  },

  habitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  habitIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  habitIcon: {
    color: '#A9BBA6',
    fontSize: 23,
    fontWeight: '700',
  },

  habitInfo: {
    flex: 1,
  },

  habitName: {
    color: '#E7EBE6',
    fontSize: 16,
    fontWeight: '700',
  },

  completedHabitName: {
    color: '#A9B6A8',
  },

  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  streakText: {
    color: '#8EA78F',
    fontSize: 10,
    fontWeight: '700',
  },

  streakDivider: {
    color: '#454D47',
    fontSize: 10,
    marginHorizontal: 6,
  },

  bestStreakText: {
    color: '#626B64',
    fontSize: 10,
  },


  /* ===================================================
     ACTION BUTTONS
  =================================================== */

  actionButton: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: '#222A23',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  actionIcon: {
    fontSize: 15,
  },


  /* ===================================================
     EMPTY STATE
  =================================================== */

  emptyCard: {
    backgroundColor: '#171C18',
    borderRadius: 21,
    paddingVertical: 32,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292F2A',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },

  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#202921',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyEmoji: {
    fontSize: 35,
  },

  emptyTitle: {
    color: '#E7EBE6',
    fontSize: 20,
    fontWeight: '800',
  },

  emptyText: {
    color: '#707870',
    fontSize: 12,
    marginTop: 7,
    marginBottom: 20,
    textAlign: 'center',
  },

  addButton: {
    backgroundColor: '#DCE6DA',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 13,
  },

  addButtonPressed: {
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  addButtonText: {
    color: '#172019',
    fontSize: 13,
    fontWeight: '800',
  },


  /* ===================================================
     BOTTOM SPACE
  =================================================== */

  bottomSpace: {
    height: 70,
  },

});

