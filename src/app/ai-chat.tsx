import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useHabits } from '@/context/HabitContext';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

export default function AIChatScreen() {
  const {
    habits,
    getCurrentStreak,
    getBestStreak,
  } = useHabits();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text:
        "Hi! I'm your AI Habit Coach 🤖\n\n" +
        "I can analyze your habits, streaks, and today's progress.\n\n" +
        "Try asking:\n" +
        "• How am I doing today?\n" +
        "• Which habit should I focus on?\n" +
        "• What's my best streak?\n" +
        "• Give me some motivation.",
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmedMessage,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput('');
    setLoading(true);

    setTimeout(() => {
      const totalHabits = habits.length;

      const completedHabits = habits.filter(
        (habit) => habit.completed
      ).length;

      const progress =
        totalHabits === 0
          ? 0
          : Math.round(
              (completedHabits / totalHabits) * 100
            );

      const question =
        trimmedMessage.toLowerCase();

      let reply = '';

      // ==========================================
      // NO HABITS
      // ==========================================

      if (totalHabits === 0) {
        reply =
          "You don't have any habits yet 🌱\n\n" +
          "Start with one simple habit. " +
          "The goal isn't to change everything at once — " +
          "it's to become consistent with one small action.";
      }

      // ==========================================
      // TODAY / PROGRESS
      // ==========================================

      else if (
        question.includes('today') ||
        question.includes('progress') ||
        question.includes('doing')
      ) {
        reply =
          `Today's progress is ${progress}%.\n\n` +
          `You've completed ${completedHabits} ` +
          `out of ${totalHabits} habits today. `;

        if (progress === 100) {
          reply +=
            "🔥 Perfect day! You completed every habit. " +
            "Keep this momentum going.";
        } else if (progress >= 70) {
          reply +=
            "💪 You're doing really well. " +
            "Finish the remaining habits if you can.";
        } else if (progress >= 40) {
          reply +=
            "🌱 You're making progress. " +
            "Focus on completing just one more habit.";
        } else {
          reply +=
            "Don't worry about the percentage. " +
            "Pick the easiest unfinished habit and complete it now.";
        }
      }

      // ==========================================
      // MOTIVATION
      // ==========================================

      else if (
        question.includes('motivat') ||
        question.includes('lazy') ||
        question.includes('give up') ||
        question.includes('inspire')
      ) {
        reply =
          "Remember: motivation comes and goes, " +
          "but consistency can become a system. 🔥\n\n" +
          `You've already completed ${completedHabits} ` +
          `of ${totalHabits} habits today.\n\n` +
          "Don't aim for a perfect day. " +
          "Just take the next small step.";
      }

      // ==========================================
      // STREAK
      // ==========================================

      else if (
        question.includes('streak') ||
        question.includes('longest')
      ) {
        const streakData = habits.map((habit) => ({
          name: habit.name,
          current: getCurrentStreak(habit),
          best: getBestStreak(habit),
        }));

        const bestHabit =
          [...streakData].sort(
            (a, b) => b.best - a.best
          )[0];

        const currentHabit =
          [...streakData].sort(
            (a, b) => b.current - a.current
          )[0];

        reply =
          "🔥 Your streak summary:\n\n";

        streakData.forEach((habit) => {
          reply +=
            `${habit.name}: ` +
            `${habit.current} day current streak, ` +
            `${habit.best} day best streak.\n`;
        });

        if (bestHabit) {
          reply +=
            `\n🏆 Your best streak belongs to ` +
            `"${bestHabit.name}" with ` +
            `${bestHabit.best} days.`;
        }

        if (
          currentHabit &&
          currentHabit.current > 0
        ) {
          reply +=
            `\n\n🔥 "${currentHabit.name}" ` +
            `currently has your strongest active streak ` +
            `at ${currentHabit.current} days.`;
        }
      }

      // ==========================================
      // WHICH HABIT TO FOCUS ON
      // ==========================================

      else if (
        question.includes('focus') ||
        question.includes('which habit') ||
        question.includes('what habit') ||
        question.includes('priority')
      ) {
        const unfinished = habits.filter(
          (habit) => !habit.completed
        );

        if (unfinished.length === 0) {
          reply =
            "🏆 You've already completed every habit today!\n\n" +
            "There is nothing left to complete. " +
            "Enjoy the win and come back tomorrow.";
        } else {
          const priority =
            [...unfinished].sort(
              (a, b) =>
                getCurrentStreak(a) -
                getCurrentStreak(b)
            )[0];

          reply =
            `I'd focus on "${priority.name}" next. 🎯\n\n` +
            `It's still incomplete today and currently has ` +
            `${getCurrentStreak(priority)} day active streak.\n\n` +
            "Complete it now to protect your consistency.";
        }
      }

      // ==========================================
      // HABIT START
      // ==========================================

      else if (
        question.includes('start') ||
        question.includes('new habit')
      ) {
        reply =
          "Start extremely small. 🌱\n\n" +
          "For example:\n" +
          "• Read 2 pages\n" +
          "• Walk for 10 minutes\n" +
          "• Drink one glass of water\n" +
          "• Study for 15 minutes\n\n" +
          "Make the habit easy enough that you can " +
          "do it even on your worst day.";
      }

      // ==========================================
      // FAIL / MISS
      // ==========================================

      else if (
        question.includes('fail') ||
        question.includes('miss') ||
        question.includes('broken')
      ) {
        reply =
          "Missing one day doesn't erase your progress. 💪\n\n" +
          "The most important rule is:\n\n" +
          "One missed day is an event. " +
          "Two missed days can become a pattern.\n\n" +
          "Return tomorrow and start again.";
      }

      // ==========================================
      // EXERCISE
      // ==========================================

      else if (
        question.includes('exercise') ||
        question.includes('workout') ||
        question.includes('gym')
      ) {
        reply =
          "Keep exercise simple at first. 🏃\n\n" +
          "Try 10–20 minutes of walking, stretching, " +
          "bodyweight exercises, or another activity you enjoy.\n\n" +
          "Your first goal should be consistency, not intensity.";
      }

      // ==========================================
      // SLEEP
      // ==========================================

      else if (
        question.includes('sleep') ||
        question.includes('bed')
      ) {
        reply =
          "For a better sleep routine 😴:\n\n" +
          "• Keep a consistent bedtime\n" +
          "• Reduce screen time before bed\n" +
          "• Create a relaxing night routine\n" +
          "• Avoid making your routine too complicated\n\n" +
          "A consistent routine is more important than perfection.";
      }

      // ==========================================
      // HABIT ANALYSIS
      // ==========================================

      else if (
        question.includes('analy') ||
        question.includes('report') ||
        question.includes('summary')
      ) {
        reply =
          `📊 Your habit summary:\n\n` +
          `Total habits: ${totalHabits}\n` +
          `Completed today: ${completedHabits}\n` +
          `Today's progress: ${progress}%\n\n`;

        habits.forEach((habit) => {
          reply +=
            `${habit.completed ? '✅' : '⬜'} ` +
            `${habit.name}\n` +
            `   Current streak: ${getCurrentStreak(habit)} days\n` +
            `   Best streak: ${getBestStreak(habit)} days\n\n`;
        });
      }

      // ==========================================
      // DEFAULT
      // ==========================================

      else {
        reply =
          `I can see that you currently have ` +
          `${totalHabits} habit${
            totalHabits === 1 ? '' : 's'
          }.\n\n` +
          `Today you've completed ` +
          `${completedHabits}/${totalHabits} ` +
          `(${progress}%).\n\n` +
          "Try asking me:\n" +
          "• How am I doing today?\n" +
          "• What's my streak?\n" +
          "• Which habit should I focus on?\n" +
          "• Give me motivation.\n" +
          "• Analyze my habits.";
      }

      const aiMessage: Message = {
        id: `${Date.now()}-ai`,
        sender: 'ai',
        text: reply,
      };

      setMessages((current) => [
        ...current,
        aiMessage,
      ]);

      setLoading(false);
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            PERSONAL COACH
          </Text>

          <Text style={styles.title}>
            AI Habit Coach
          </Text>

          <Text style={styles.subtitle}>
            Your personal consistency assistant
          </Text>
        </View>

        <View style={styles.aiIcon}>
          <Text style={styles.aiIconText}>
            🤖
          </Text>
        </View>
      </View>

      {/* CHAT */}

      <ScrollView
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser =
            message.sender === 'user';

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isUser &&
                  styles.userMessageRow,
              ]}
            >
              {!isUser && (
                <View style={styles.smallBot}>
                  <Text>🤖</Text>
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser &&
                      styles.userMessageText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.messageRow}>
            <View style={styles.smallBot}>
              <Text>🤖</Text>
            </View>

            <View style={styles.aiBubble}>
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#B7C9B5"
                />

                <Text style={styles.loadingText}>
                  Thinking...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INPUT */}

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask your habit coach..."
          placeholderTextColor="#687169"
          style={styles.input}
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={sendMessage}
        />

        <Pressable
          onPress={sendMessage}
          disabled={
            !input.trim() || loading
          }
          style={[
            styles.sendButton,
            (!input.trim() || loading) &&
              styles.disabledButton,
          ]}
        >
          <Text style={styles.sendText}>
            ↑
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101311',
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#202620',
  },

  eyebrow: {
    color: '#69736B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  title: {
    color: '#F0F3EF',
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    color: '#737B74',
    fontSize: 12,
    marginTop: 4,
  },

  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1D281F',
    borderWidth: 1,
    borderColor: '#344137',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiIconText: {
    fontSize: 24,
  },

  chat: {
    flex: 1,
  },

  chatContent: {
    padding: 18,
    paddingBottom: 25,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  smallBot: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#1D281F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 17,
  },

  aiBubble: {
    backgroundColor: '#171C18',
    borderWidth: 1,
    borderColor: '#292F2A',
    borderBottomLeftRadius: 5,
  },

  userBubble: {
    backgroundColor: '#B7C9B5',
    borderBottomRightRadius: 5,
  },

  messageText: {
    color: '#DCE2DA',
    fontSize: 13,
    lineHeight: 20,
  },

  userMessageText: {
    color: '#172019',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    color: '#737B74',
    fontSize: 12,
    marginLeft: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#202620',
    backgroundColor: '#101311',
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    backgroundColor: '#171C18',
    borderWidth: 1,
    borderColor: '#292F2A',
    borderRadius: 16,
    color: '#E8ECE7',
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 13,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#B7C9B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  disabledButton: {
    backgroundColor: '#29302B',
  },

  sendText: {
    color: '#172019',
    fontSize: 25,
    fontWeight: '800',
    marginTop: -3,
  },
});