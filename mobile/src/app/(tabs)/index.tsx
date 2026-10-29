import React, { useCallback, useEffect, useState } from 'react';
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
import { useHabits, type Habit } from '@/context/HabitContext';
import { useAuth } from '@/context/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type Theme = 'light' | 'dark';

const COLORS = {
  light: {
    background: '#F5F5EC',
    surface: '#FFFFFF',
    surfaceAlt: '#EAF0E4',
    text: '#20382B',
    secondary: '#718074',
    border: '#DCE6D9',
    primary: '#315E42',
    primaryText: '#FFFFFF',
    accent: '#D8E9D2',
    track: '#E3E9DF',
    hero: '#183B29',
    hero2: '#244B36',
    heroText: '#FFFFFF',
    heroMuted: '#D0E3D2',
    success: '#397A50',
    shadow: '#20382B',
    iconBg: '#EAF1E5',
    dangerBg: '#FCEBE8',
    danger: '#B94B42',
    glow: '#B9E7A8',
    glass: 'rgba(255,255,255,0.10)',
    ring: '#A8D79B',
    line: '#C7DCC0',
  },
  dark: {
    background: '#0C1510',
    surface: '#17241B',
    surfaceAlt: '#213328',
    text: '#F0F5EF',
    secondary: '#A2B1A3',
    border: '#304638',
    primary: '#B8D7B4',
    primaryText: '#17231A',
    accent: '#304B35',
    track: '#2D392F',
    hero: '#10291C',
    hero2: '#1D4430',
    heroText: '#FFFFFF',
    heroMuted: '#D2E4D3',
    success: '#B8D7B4',
    shadow: '#000000',
    iconBg: '#29382C',
    dangerBg: '#402722',
    danger: '#FFB6A9',
    glow: '#A4E48F',
    glass: 'rgba(220,245,220,0.07)',
    ring: '#9DD88F',
    line: '#405C43',
  },
};

function getHabitSymbol(habit: Habit): string {
  const value = habit.emoji ?? habit.icon ?? habit.symbol;

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  const symbols: Record<string, string> = {
    Health: '❤️',
    Fitness: '💪',
    Study: '📚',
    Work: '💻',
    Personal: '🌱',
    Other: '⭐',
  };

  return symbols[habit.category] ?? '🌱';
}

function QuickNavCard({
  icon,
  title,
  subtitle,
  styles,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${subtitle}`}
    >
      <View style={styles.navTopRow}>
        <View style={styles.navIconContainer}>
          <Text style={styles.navIcon}>{icon}</Text>
        </View>
        <Text style={styles.navArrow}>↗</Text>
      </View>

      <Text style={styles.navTitle}>{title}</Text>
      <Text style={styles.navSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { token } = useAuth();

  const {
    habits,
    toggleHabit,
    deleteHabit,
    archiveHabit,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  const [theme, setTheme] = useState<Theme>('light');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const c = COLORS[theme];
  const styles = createStyles(theme);

  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedHabits = habits.filter((habit) => habit.archived);

  const completedCount = activeHabits.filter(
    (habit) => habit.completed
  ).length;

  const totalHabits = activeHabits.length;
  const remainingCount = totalHabits - completedCount;

  const progress =
    totalHabits === 0
      ? 0
      : Math.round((completedCount / totalHabits) * 100);

  const downloadTrainingDataset = async () => {
    if (!token) {
      Alert.alert(
        'Login required',
        'Please log in again before exporting your dataset.'
      );
      return;
    }

    setExportLoading(true);

    try {
      const response = await fetch(
        'https://habit-tracker-n3gw.onrender.com/api/ml/export-training-dataset',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        let message = `Dataset export failed (${response.status}).`;

        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch {
          // Keep the fallback error.
        }

        if (response.status === 401) {
          message = 'Your session expired. Please log in again.';
        }

        if (response.status === 404) {
          message =
            'Dataset export route was not found on the deployed server.';
        }

        throw new Error(message);
      }

      const csv = await response.text();

      if (!csv.trim()) {
        throw new Error('The server returned an empty dataset.');
      }

      const directory = FileSystem.cacheDirectory;

      if (!directory) {
        throw new Error('A writable file directory is unavailable.');
      }

      const fileUri = `${directory}habit_training_dataset.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save or share habit training dataset',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert(
          'Dataset exported',
          `CSV saved temporarily at:\n${fileUri}`
        );
      }
    } catch (error: unknown) {
      Alert.alert(
        'Export failed',
        error instanceof Error
          ? error.message
          : 'Could not export the training dataset.'
      );
    } finally {
      setExportLoading(false);
    }
  };

  const getAIRecommendation = useCallback(async () => {
    if (habits.length === 0) {
      setAiRecommendation(
        'Start with one small ritual. Give yourself room to grow, and let consistency do the rest. 🌱'
      );
      return;
    }

    if (!token) {
      setAiRecommendation(
        'Focus on one small action at a time. Consistency matters more than perfection. 🌱'
      );
      return;
    }

    setAiLoading(true);

    try {
      const response = await fetch(
        'https://habit-tracker-n3gw.onrender.com/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
        throw new Error(data?.message || 'AI request failed');
      }

      setAiRecommendation(
        data.reply || 'Keep taking small steps toward your goals. 🌱'
      );
    } catch (error) {
      console.log('AI RECOMMENDATION ERROR:', error);
      setAiRecommendation(
        'Take one small action today. Consistency beats perfection. 🌱'
      );
    } finally {
      setAiLoading(false);
    }
  }, [habits, token]);

  useEffect(() => {
    void getAIRecommendation();
  }, [getAIRecommendation]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete habit',
      `Are you sure you want to permanently delete "${name}" and its history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await deleteHabit(id);
              Alert.alert('Deleted', `"${name}" has been deleted.`);
            } catch (error: unknown) {
              Alert.alert(
                'Delete failed',
                error instanceof Error
                  ? error.message
                  : 'Could not delete this habit.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const confirmArchive = (id: string, name: string) => {
    Alert.alert(
      'Archive habit',
      `Move "${name}" to your archived habits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              setArchivingId(id);
              await archiveHabit(id, true);
            } catch (error: unknown) {
              Alert.alert(
                'Archive failed',
                error instanceof Error
                  ? error.message
                  : 'Could not archive this habit.'
              );
            } finally {
              setArchivingId(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleHabit = async (id: string) => {
    try {
      await toggleHabit(id);
    } catch (error: unknown) {
      Alert.alert(
        'Could not update habit',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>✳</Text>
            </View>
            <Text style={styles.brandName}>GROW / INTELLIGENCE</Text>
          </View>

          <Text style={styles.eyebrow}>YOUR PERSONAL ECOSYSTEM</Text>
          <Text style={styles.title}>
            My Habits<Text style={styles.titleAccent}>.</Text>
          </Text>
          <Text style={styles.headerSubtitle}>
            Become a little more you, every day.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              setTheme((current) =>
                current === 'light' ? 'dark' : 'light'
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <Text style={styles.headerButtonText}>
              {theme === 'light' ? '☾' : '☀'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.profileButtonText}>◉</Text>
          </Pressable>
        </View>
      </View>

      {/* AI GROWTH CORE */}

      <View style={styles.hero}>
        <View style={styles.heroOrbOuter} />
        <View style={styles.heroOrbMiddle} />
        <View style={styles.heroOrbInner} />

        <View style={styles.heroTopLine}>
          <View style={styles.liveIndicator} />
          <Text style={styles.heroStatus}>DAILY GROWTH CORE</Text>
          <View style={styles.heroStatusPill}>
            <Text style={styles.heroStatusPillText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.heroMain}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroGreeting}>TODAY'S POTENTIAL</Text>

            <Text style={styles.heroTitle}>
              {progress === 100 && totalHabits > 0
                ? 'Beautifully done.'
                : progress >= 50
                  ? 'You are in bloom.'
                  : 'Growth starts here.'}
            </Text>

            <Text style={styles.heroDescription}>
              {remainingCount === 0 && totalHabits > 0
                ? 'You showed up for every ritual today.'
                : 'Every completed habit is a promise kept to yourself.'}
            </Text>
          </View>

          <View style={styles.progressShell}>
            <View style={styles.progressRing}>
              <View style={styles.progressRingCore}>
                <Text style={styles.progressNumber}>{progress}</Text>
                <Text style={styles.progressPercent}>PERCENT</Text>
              </View>
            </View>
            <View style={styles.ringSpark}>
              <Text style={styles.ringSparkText}>✦</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>COMPLETED</Text>
            <View style={styles.heroStatValueRow}>
              <Text style={styles.heroStatValue}>{completedCount}</Text>
              <Text style={styles.heroStatUnit}> / {totalHabits}</Text>
            </View>
          </View>

          <View style={styles.heroStatSeparator} />

          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>TO NURTURE</Text>
            <View style={styles.heroStatValueRow}>
              <Text style={styles.heroStatValue}>{remainingCount}</Text>
              <Text style={styles.heroStatLeaf}> ❧</Text>
            </View>
          </View>

          <View style={styles.heroStatSeparator} />

          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>PROGRESS</Text>
            <View style={styles.heroStatValueRow}>
              <Text style={styles.heroStatValue}>{progress}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroProgressTrack}>
          <View
            style={[
              styles.heroProgressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterLeaf}>✧</Text>
          <Text style={styles.heroFooterText}>
            SMALL STEPS. LASTING CHANGE.
          </Text>
        </View>
      </View>

      {/* QUICK ACCESS */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>YOUR WORLD</Text>
          <Text style={styles.sectionTitle}>Explore your growth</Text>
          <Text style={styles.sectionSubtitle}>
            Everything you need, in one place.
          </Text>
        </View>
        <View style={styles.sectionDecoration}>
          <Text style={styles.sectionDecorationText}>❧</Text>
        </View>
      </View>

      <View style={styles.quickNav}>
        <QuickNavCard
          styles={styles}
          icon="◷"
          title="History"
          subtitle="Daily journey"
          onPress={() => router.push('/calendar')}
        />
        <QuickNavCard
          styles={styles}
          icon="⌁"
          title="Analytics"
          subtitle="Growth patterns"
          onPress={() => router.push('/analytics')}
        />
        <QuickNavCard
          styles={styles}
          icon="✧"
          title="Achievements"
          subtitle="Milestones earned"
          onPress={() => router.push('/achievements')}
        />
        <QuickNavCard
          styles={styles}
          icon="◉"
          title="AI Coach"
          subtitle="Personal guidance"
          onPress={() => router.push('/ai-chat')}
        />
        <QuickNavCard
          styles={styles}
          icon="⌘"
          title="Daily Analysis"
          subtitle="Model insights"
          onPress={() => router.push('/daily-analysis')}
        />
        <QuickNavCard
          styles={styles}
          icon="▤"
          title="Archived"
          subtitle={`${archivedHabits.length} saved`}
          onPress={() => router.push('/archived-habits')}
        />
      </View>

      {/* AI COACH */}

      <View style={styles.aiCard}>
        <View style={styles.aiGlow} />

        <View style={styles.aiHeader}>
          <View style={styles.aiOrb}>
            <View style={styles.aiOrbCore}>
              <Text style={styles.aiOrbIcon}>✦</Text>
            </View>
          </View>

          <View style={styles.aiHeadingText}>
            <Text style={styles.sectionEyebrow}>INTELLIGENT WELLNESS</Text>
            <Text style={styles.aiTitle}>Your AI companion</Text>
            <View style={styles.aiOnlineRow}>
              <View style={styles.aiOnlineDot} />
              <Text style={styles.aiOnlineText}>HERE FOR YOUR GROWTH</Text>
            </View>
          </View>
        </View>

        <View style={styles.aiMessage}>
          <Text style={styles.aiQuoteMark}>“</Text>
          {aiLoading ? (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={styles.aiRecommendation}>
                Reflecting on your progress...
              </Text>
            </View>
          ) : (
            <Text style={styles.aiRecommendation}>
              {aiRecommendation ||
                'One mindful action today can create a better tomorrow.'}
            </Text>
          )}
          <Text style={styles.aiMessageFooter}>A THOUGHT FOR TODAY</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.aiButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/ai-chat')}
        >
          <Text style={styles.aiButtonText}>Open AI companion</Text>
          <Text style={styles.aiButtonArrow}>↗</Text>
        </Pressable>
      </View>

      {/* ML DATASET EXPORT */}

      <View style={styles.datasetCard}>
        <View style={styles.datasetHeader}>
          <View style={styles.datasetIconBox}>
            <Text style={styles.datasetIcon}>⌘</Text>
          </View>
          <View style={styles.datasetHeadingText}>
            <Text style={styles.sectionEyebrow}>MACHINE INTELLIGENCE</Text>
            <Text style={styles.datasetTitle}>Training dataset</Text>
          </View>
          <View style={styles.datasetTag}>
            <Text style={styles.datasetTagText}>CSV</Text>
          </View>
        </View>

        <Text style={styles.datasetDescription}>
          Export historical habit outcomes for your Decision Tree and
          Logistic Regression experiments, evaluation, and project viva.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.datasetButton,
            pressed && styles.pressed,
            exportLoading && styles.disabledButton,
          ]}
          onPress={downloadTrainingDataset}
          disabled={exportLoading}
        >
          {exportLoading ? (
            <ActivityIndicator size="small" color={c.primaryText} />
          ) : (
            <>
              <Text style={styles.datasetButtonText}>
                Export training data
              </Text>
              <Text style={styles.datasetButtonArrow}>↓</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* HABIT LIST */}

      <View style={styles.habitsHeader}>
        <View style={styles.habitsHeadingText}>
          <Text style={styles.sectionEyebrow}>YOUR DAILY RITUALS</Text>
          <Text style={styles.sectionTitle}>Habit garden</Text>
          <Text style={styles.sectionSubtitle}>
            Tend to what matters, one day at a time.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/add-habit')}
          accessibilityRole="button"
          accessibilityLabel="Add a habit"
        >
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {totalHabits === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyOrb}>
            <Text style={styles.emptyEmoji}>🌱</Text>
          </View>

          <Text style={styles.emptyTitle}>Plant your first seed</Text>
          <Text style={styles.emptyDescription}>
            Every lasting change starts small. Create your first habit
            and begin building a life that feels more like you.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.aiButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/add-habit')}
          >
            <Text style={styles.aiButtonText}>＋ Create first habit</Text>
            <Text style={styles.aiButtonArrow}>↗</Text>
          </Pressable>
        </View>
      ) : (
        activeHabits.map((habit) => {
          const currentStreak = getCurrentStreak(habit);
          const bestStreak = getBestStreak(habit);
          const isDeleting = deletingId === habit.id;
          const isArchiving = archivingId === habit.id;
          const isProcessing = isDeleting || isArchiving;

          return (
            <View
              key={habit.id}
              style={[
                styles.habitCard,
                habit.completed && styles.habitCardDone,
                isProcessing && styles.processingCard,
              ]}
            >
              <Pressable
                style={styles.habitContent}
                onPress={() => void handleToggleHabit(habit.id)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`${habit.completed ? 'Mark incomplete' : 'Complete'} ${habit.name}`}
              >
                <View
                  style={[
                    styles.habitIconBox,
                    habit.completed && styles.habitIconBoxDone,
                  ]}
                >
                  <Text style={styles.habitIcon}>
                    {getHabitSymbol(habit)}
                  </Text>
                  <View
                    style={[
                      styles.habitIconDot,
                      habit.completed && styles.habitIconDotDone,
                    ]}
                  />
                </View>

                <View style={styles.habitInfo}>
                  <Text
                    style={[
                      styles.habitName,
                      habit.completed && styles.completedHabitName,
                    ]}
                    numberOfLines={2}
                  >
                    {habit.name}
                  </Text>

                  {!!habit.description && (
                    <Text
                      style={styles.habitDescription}
                      numberOfLines={1}
                    >
                      {habit.description}
                    </Text>
                  )}

                  <View style={styles.streakRow}>
                    <Text style={styles.streakIcon}>✦</Text>
                    <Text style={styles.streakText}>
                      {currentStreak} day streak
                    </Text>
                    <View style={styles.streakDot} />
                    <Text style={styles.bestStreakText}>
                      Best {bestStreak}
                    </Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.completionButton,
                  habit.completed && styles.completionButtonDone,
                ]}
                onPress={() => void handleToggleHabit(habit.id)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`${habit.completed ? 'Mark incomplete' : 'Complete'} ${habit.name}`}
              >
                <Text
                  style={[
                    styles.completionText,
                    habit.completed && styles.completionTextDone,
                  ]}
                >
                  {habit.completed ? '✓' : ''}
                </Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: '/edit-habit',
                    params: { id: habit.id },
                  })
                }
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${habit.name}`}
              >
                <Text style={styles.actionIcon}>✎</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => confirmArchive(habit.id, habit.name)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`Archive ${habit.name}`}
              >
                {isArchiving ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Text style={styles.actionIcon}>□</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => confirmDelete(habit.id, habit.name)}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${habit.name}`}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Text style={styles.actionIcon}>⌫</Text>
                )}
              </Pressable>
            </View>
          );
        })
      )}

      {/* FOOTER */}

      <View style={styles.footer}>
        <Text style={styles.footerDecoration}>✧</Text>
        <Text style={styles.footerText}>
          ROOTED IN ROUTINE. POWERED BY POSSIBILITY.
        </Text>
        <Text style={styles.footerDecoration}>✧</Text>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  const c = COLORS[theme];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    contentContainer: {
      paddingHorizontal: 19,
      paddingTop: 54,
      paddingBottom: 22,
    },
    pressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },

    /* Header */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    headerText: {
      flex: 1,
      paddingRight: 8,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    brandMark: {
      width: 25,
      height: 25,
      borderRadius: 9,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    brandMarkText: {
      color: c.success,
      fontSize: 17,
      fontWeight: '900',
    },
    brandName: {
      color: c.secondary,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.7,
    },
    eyebrow: {
      color: c.success,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.4,
      marginBottom: 6,
    },
    title: {
      color: c.text,
      fontSize: 31,
      fontWeight: '900',
      letterSpacing: -1.1,
    },
    titleAccent: {
      color: c.success,
    },
    headerSubtitle: {
      color: c.secondary,
      fontSize: 10,
      marginTop: 5,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      color: c.text,
      fontSize: 22,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileButtonText: {
      color: c.success,
      fontSize: 24,
      fontWeight: '800',
    },

    /* Futuristic hero */

    hero: {
      backgroundColor: c.hero,
      borderRadius: 27,
      padding: 18,
      marginBottom: 29,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme === 'light' ? '#365C43' : '#3B6346',
      elevation: 8,
      shadowColor: c.glow,
      shadowOpacity: theme === 'light' ? 0.13 : 0.17,
      shadowRadius: 17,
      shadowOffset: { width: 0, height: 5 },
    },
    heroOrbOuter: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 95,
      borderWidth: 1,
      borderColor: 'rgba(185,231,168,0.16)',
      right: -63,
      top: -48,
    },
    heroOrbMiddle: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 1,
      borderColor: 'rgba(185,231,168,0.20)',
      right: -37,
      top: -23,
    },
    heroOrbInner: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(185,231,168,0.05)',
      borderWidth: 1,
      borderColor: 'rgba(185,231,168,0.16)',
      right: -12,
      top: 1,
    },
    heroTopLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
    },
    liveIndicator: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.glow,
      marginRight: 7,
    },
    heroStatus: {
      color: c.heroMuted,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.5,
      flex: 1,
    },
    heroStatusPill: {
      backgroundColor: 'rgba(185,231,168,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(185,231,168,0.28)',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
    },
    heroStatusPillText: {
      color: c.glow,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 1,
    },
    heroMain: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroCopy: {
      flex: 1,
      paddingRight: 7,
    },
    heroGreeting: {
      color: c.glow,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    heroTitle: {
      color: c.heroText,
      fontSize: 23,
      fontWeight: '900',
      lineHeight: 28,
      letterSpacing: -0.7,
      marginTop: 8,
    },
    heroDescription: {
      color: c.heroMuted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 8,
      maxWidth: 205,
    },
    progressShell: {
      width: 94,
      height: 94,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 3,
    },
    progressRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 2,
      borderColor: c.ring,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 5,
      backgroundColor: 'rgba(185,231,168,0.07)',
    },
    progressRingCore: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.hero2,
      borderWidth: 1,
      borderColor: 'rgba(185,231,168,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressNumber: {
      color: c.heroText,
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: -1,
    },
    progressPercent: {
      color: c.heroMuted,
      fontSize: 6,
      fontWeight: '900',
      letterSpacing: 0.8,
      marginTop: 2,
    },
    ringSpark: {
      position: 'absolute',
      right: -1,
      top: 0,
      width: 23,
      height: 23,
      borderRadius: 9,
      backgroundColor: c.glow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringSparkText: {
      color: c.hero,
      fontSize: 13,
      fontWeight: '900',
    },
    heroDivider: {
      height: 1,
      backgroundColor: 'rgba(220,240,220,0.17)',
      marginTop: 22,
      marginBottom: 16,
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroStatItem: {
      flex: 1,
    },
    heroStatLabel: {
      color: c.heroMuted,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.7,
      marginBottom: 6,
    },
    heroStatValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroStatValue: {
      color: c.heroText,
      fontSize: 20,
      fontWeight: '900',
    },
    heroStatUnit: {
      color: c.heroMuted,
      fontSize: 10,
    },
    heroStatLeaf: {
      color: c.glow,
      fontSize: 14,
    },
    heroStatSeparator: {
      width: 1,
      height: 31,
      backgroundColor: 'rgba(220,240,220,0.17)',
      marginHorizontal: 10,
    },
    heroProgressTrack: {
      height: 5,
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: 'rgba(220,240,220,0.15)',
      marginTop: 18,
    },
    heroProgressFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: c.glow,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
      gap: 7,
    },
    heroFooterLeaf: {
      color: c.glow,
      fontSize: 13,
    },
    heroFooterText: {
      color: c.heroMuted,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 1.1,
    },

    /* Section headers */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    sectionEyebrow: {
      color: c.success,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.35,
      marginBottom: 6,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    sectionSubtitle: {
      color: c.secondary,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 5,
    },
    sectionDecoration: {
      width: 43,
      height: 43,
      borderRadius: 15,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    sectionDecorationText: {
      color: c.success,
      fontSize: 29,
    },

    /* Glass-inspired navigation */

    quickNav: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 26,
    },
    navCard: {
      width: '48.2%',
      minHeight: 126,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      padding: 13,
      marginBottom: 11,
      elevation: 3,
      shadowColor: c.shadow,
      shadowOpacity: theme === 'light' ? 0.045 : 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    navTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIcon: {
      color: c.success,
      fontSize: 25,
      fontWeight: '600',
    },
    navArrow: {
      color: c.success,
      fontSize: 14,
      fontWeight: '900',
    },
    navTitle: {
      color: c.text,
      fontSize: 12,
      fontWeight: '900',
    },
    navSubtitle: {
      color: c.secondary,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 5,
    },

    /* AI companion */

    aiCard: {
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: c.shadow,
      shadowOpacity: theme === 'light' ? 0.045 : 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    aiGlow: {
      position: 'absolute',
      top: -65,
      right: -55,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: c.surfaceAlt,
      opacity: 0.6,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    aiOrb: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    aiOrbCore: {
      width: 37,
      height: 37,
      borderRadius: 19,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiOrbIcon: {
      color: c.primaryText,
      fontSize: 22,
      fontWeight: '900',
    },
    aiHeadingText: {
      flex: 1,
    },
    aiTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '900',
    },
    aiOnlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    aiOnlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.success,
      marginRight: 6,
    },
    aiOnlineText: {
      color: c.secondary,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.7,
    },
    aiMessage: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 14,
    },
    aiQuoteMark: {
      color: c.success,
      fontSize: 27,
      lineHeight: 28,
      fontWeight: '900',
    },
    aiLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    aiRecommendation: {
      color: c.text,
      fontSize: 11,
      lineHeight: 19,
      flexShrink: 1,
      marginTop: 1,
    },
    aiMessageFooter: {
      color: c.success,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 1.1,
      marginTop: 12,
    },
    aiButton: {
      minHeight: 45,
      borderRadius: 14,
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiButtonText: {
      color: c.primaryText,
      fontSize: 11,
      fontWeight: '900',
    },
    aiButtonArrow: {
      color: c.primaryText,
      fontSize: 17,
      marginLeft: 10,
    },

    /* ML export */

    datasetCard: {
      backgroundColor: c.surface,
      borderRadius: 22,
      padding: 16,
      marginBottom: 29,
      borderWidth: 1,
      borderColor: c.border,
    },
    datasetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    datasetIconBox: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    datasetIcon: {
      color: c.success,
      fontSize: 26,
      fontWeight: '600',
    },
    datasetHeadingText: {
      flex: 1,
    },
    datasetTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '900',
    },
    datasetTag: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    datasetTagText: {
      color: c.success,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },
    datasetDescription: {
      color: c.secondary,
      fontSize: 10,
      lineHeight: 17,
      marginTop: 13,
      marginBottom: 14,
    },
    datasetButton: {
      minHeight: 43,
      borderRadius: 13,
      backgroundColor: c.hero2,
      paddingVertical: 11,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    datasetButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    datasetButtonArrow: {
      color: '#D0E3D2',
      fontSize: 18,
      marginLeft: 10,
    },
    disabledButton: {
      opacity: 0.6,
    },

    /* Habit garden */

    habitsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    habitsHeadingText: {
      flex: 1,
    },
    addButton: {
      width: 45,
      height: 45,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
      elevation: 3,
      shadowColor: c.glow,
      shadowOpacity: 0.12,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 2 },
    },
    addButtonText: {
      color: c.primaryText,
      fontSize: 26,
      fontWeight: '500',
      marginTop: -2,
    },
    habitCard: {
      backgroundColor: c.surface,
      borderRadius: 19,
      padding: 10,
      marginBottom: 11,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      elevation: 2,
      shadowColor: c.shadow,
      shadowOpacity: theme === 'light' ? 0.04 : 0.12,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 2 },
    },
    habitCardDone: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.line,
    },
    processingCard: {
      opacity: 0.55,
    },
    habitContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },
    habitIconBox: {
      width: 43,
      height: 43,
      borderRadius: 15,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },
    habitIconBoxDone: {
      backgroundColor: c.accent,
      borderColor: c.success,
    },
    habitIcon: {
      fontSize: 21,
    },
    habitIconDot: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      right: 4,
      bottom: 4,
      backgroundColor: c.secondary,
    },
    habitIconDotDone: {
      backgroundColor: c.success,
    },
    habitInfo: {
      flex: 1,
      minWidth: 0,
    },
    habitName: {
      color: c.text,
      fontSize: 12,
      fontWeight: '900',
    },
    completedHabitName: {
      color: c.success,
    },
    habitDescription: {
      color: c.secondary,
      fontSize: 9,
      marginTop: 4,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 7,
    },
    streakIcon: {
      color: c.success,
      fontSize: 9,
      marginRight: 4,
    },
    streakText: {
      color: c.success,
      fontSize: 8,
      fontWeight: '900',
    },
    streakDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.secondary,
      marginHorizontal: 6,
    },
    bestStreakText: {
      color: c.secondary,
      fontSize: 8,
    },
    completionButton: {
      width: 26,
      height: 26,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    completionButtonDone: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    completionText: {
      color: c.text,
      fontSize: 15,
      fontWeight: '900',
    },
    completionTextDone: {
      color: c.primaryText,
    },
    actionButton: {
      width: 27,
      height: 32,
      borderRadius: 9,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    actionIcon: {
      color: c.text,
      fontSize: 16,
      fontWeight: '600',
    },

    /* Empty state */

    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: 23,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyOrb: {
      width: 76,
      height: 76,
      borderRadius: 27,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyEmoji: {
      fontSize: 37,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 9,
    },
    emptyDescription: {
      color: c.secondary,
      fontSize: 11,
      lineHeight: 19,
      textAlign: 'center',
      marginBottom: 18,
    },

    /* Footer */

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 7,
    },
    footerDecoration: {
      color: c.success,
      fontSize: 13,
    },
    footerText: {
      color: c.secondary,
      fontSize: 7,
      fontWeight: '900',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    bottomSpace: {
      height: 55,
    },
  });
}