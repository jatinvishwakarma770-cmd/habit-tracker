
import { useState } from "react";

import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";

import { router } from "expo-router";

import DateTimePicker from "@react-native-community/datetimepicker";

import { useHabits } from "@/context/HabitContext";

import {
  scheduleHabitReminder,
} from "@/utils/notifications";

// =====================================================
// TYPES
// =====================================================

type Category =
  | "Health"
  | "Fitness"
  | "Study"
  | "Work"
  | "Personal"
  | "Other";

type Frequency =
  | "Daily"
  | "Weekdays"
  | "Weekends"
  | "Custom";

// =====================================================
// SCREEN
// =====================================================

export default function AddHabitScreen() {
  // ===================================================
  // HABIT NAME
  // ===================================================

  const [habitName, setHabitName] = useState("");

  // ===================================================
  // DESCRIPTION
  // ===================================================

  const [description, setDescription] = useState("");

  // ===================================================
  // CATEGORY
  // ===================================================

  const [category, setCategory] =
    useState<Category>("Personal");

  const categories: Category[] = [
    "Health",
    "Fitness",
    "Study",
    "Work",
    "Personal",
    "Other",
  ];

  // ===================================================
  // FREQUENCY
  // ===================================================

  const [frequency, setFrequency] =
    useState<Frequency>("Daily");

  const frequencies: Frequency[] = [
    "Daily",
    "Weekdays",
    "Weekends",
    "Custom",
  ];

  // ===================================================
  // CUSTOM DAYS
  // ===================================================

  const [customDays, setCustomDays] =
    useState<string[]>([]);

  const days = [
    {
      short: "Mon",
      value: "Monday",
    },
    {
      short: "Tue",
      value: "Tuesday",
    },
    {
      short: "Wed",
      value: "Wednesday",
    },
    {
      short: "Thu",
      value: "Thursday",
    },
    {
      short: "Fri",
      value: "Friday",
    },
    {
      short: "Sat",
      value: "Saturday",
    },
    {
      short: "Sun",
      value: "Sunday",
    },
  ];

  // ===================================================
  // REMINDER
  // ===================================================

  const [reminderEnabled, setReminderEnabled] =
    useState(false);

  const [reminderTime, setReminderTime] =
    useState(new Date());

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  // ===================================================
  // SAVING
  // ===================================================

  const [saving, setSaving] = useState(false);

  // ===================================================
  // CONTEXT
  // ===================================================

  const { addHabit } = useHabits();

  // ===================================================
  // FORMAT DISPLAY TIME
  // ===================================================

  const formatTime = (date: Date) => {
    let hours = date.getHours();

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    const period =
      hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${period}`;
  };

  // ===================================================
  // FORMAT DATABASE TIME
  // ===================================================

  const formatTimeForDatabase = (
    date: Date
  ) => {
    const hours = String(
      date.getHours()
    ).padStart(2, "0");

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  // ===================================================
  // TOGGLE CUSTOM DAY
  // ===================================================

  const toggleCustomDay = (
    day: string
  ) => {
    setCustomDays((currentDays) => {
      if (currentDays.includes(day)) {
        return currentDays.filter(
          (currentDay) =>
            currentDay !== day
        );
      }

      return [
        ...currentDays,
        day,
      ];
    });
  };

  // ===================================================
  // SAVE HABIT
  // ===================================================

  const saveHabit = async () => {
    const name = habitName.trim();

    // =================================================
    // VALIDATE NAME
    // =================================================

    if (!name) {
      Alert.alert(
        "Missing habit",
        "Please enter a habit name."
      );

      return;
    }

    // =================================================
    // VALIDATE CUSTOM DAYS
    // =================================================

    if (
      frequency === "Custom" &&
      customDays.length === 0
    ) {
      Alert.alert(
        "Select days",
        "Please select at least one day for your custom habit."
      );

      return;
    }

    try {
      setSaving(true);

      // ===============================================
      // REMINDER TIME
      // ===============================================

      const reminderTimeValue =
        reminderEnabled
          ? formatTimeForDatabase(
              reminderTime
            )
          : null;

      // ===============================================
      // CUSTOM DAYS
      // ===============================================

      const selectedCustomDays =
        frequency === "Custom"
          ? customDays
          : [];

      // ===============================================
      // HABIT DATA
      // ===============================================

      const habitData = {
        name,

        description:
          description.trim(),

        category,

        frequency,

        customDays:
          selectedCustomDays,

        reminderTime:
          reminderTimeValue,
      };

      console.log(
        "================================"
      );

      console.log(
        "CREATING HABIT"
      );

      console.log(
        "HABIT DATA:",
        habitData
      );

      console.log(
        "================================"
      );

      // ===============================================
      // CREATE HABIT
      // ===============================================

      const createdHabit =
        await addHabit(
          habitData
        );

      console.log(
        "CREATED HABIT:",
        createdHabit
      );

      // ===============================================
      // SCHEDULE PHONE NOTIFICATION
      // ===============================================

      if (
        reminderEnabled &&
        reminderTimeValue
      ) {
        console.log(
          "SCHEDULING PHONE REMINDER:",
          reminderTimeValue
        );

        const notificationId =
          await scheduleHabitReminder(
            createdHabit.id,
            createdHabit.name,
            reminderTimeValue
          );

        console.log(
          "NOTIFICATION ID:",
          notificationId
        );

        if (!notificationId) {
          console.log(
            "Notification could not be scheduled."
          );
        }
      }

      // ===============================================
      // SUCCESS MESSAGE
      // ===============================================

      let message =
        `"${name}" has been added successfully.`;

      // ===============================================
      // FREQUENCY MESSAGE
      // ===============================================

      if (frequency === "Daily") {
        message +=
          "\n\nFrequency: Every day.";
      }

      else if (
        frequency === "Weekdays"
      ) {
        message +=
          "\n\nFrequency: Monday to Friday.";
      }

      else if (
        frequency === "Weekends"
      ) {
        message +=
          "\n\nFrequency: Saturday and Sunday.";
      }

      else if (
        frequency === "Custom"
      ) {
        message +=
          `\n\nDays: ${customDays.join(
            ", "
          )}.`;
      }

      // ===============================================
      // REMINDER MESSAGE
      // ===============================================

      if (
        reminderEnabled &&
        reminderTimeValue
      ) {
        message +=
          `\n\n🔔 Phone reminder: ${formatTime(
            reminderTime
          )} every day.`;
      }

      // ===============================================
      // SUCCESS ALERT
      // ===============================================

      Alert.alert(
        "Habit Created 🎉",
        message,
        [
          {
            text: "OK",
            onPress: () =>
              router.back(),
          },
        ]
      );

    } catch (error) {
      console.error(
        "SAVE HABIT ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to create habit. Please try again."
      );

    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // TIME PICKER
  // ===================================================

  const handleTimeChange = (
    event: any,
    selectedDate?: Date
  ) => {
    setShowTimePicker(false);

    if (selectedDate) {
      setReminderTime(
        selectedDate
      );
    }
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <KeyboardAvoidingView
      style={
        styles.keyboardContainer
      }
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.smallText}>
            BUILD YOUR ROUTINE
          </Text>

          <Text style={styles.title}>
            Create Habit
          </Text>

          <Text style={styles.subtitle}>
            Start small. Stay consistent.
          </Text>
        </View>

        {/* ICON */}

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>
            ✦
          </Text>
        </View>

        {/* FORM CARD */}

        <View style={styles.formCard}>

          {/* HABIT NAME */}

          <Text style={styles.label}>
            HABIT NAME
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Drink 2L water"
            placeholderTextColor="#666D67"
            value={habitName}
            onChangeText={
              setHabitName
            }
            autoFocus
            maxLength={50}
            returnKeyType="next"
          />

          <Text style={styles.helperText}>
            Choose something simple that you can
            repeat consistently.
          </Text>

          {/* DESCRIPTION */}

          <Text style={styles.label}>
            DESCRIPTION
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            placeholder="Why do you want to build this habit?"
            placeholderTextColor="#666D67"
            value={description}
            onChangeText={
              setDescription
            }
            multiline
            maxLength={200}
            textAlignVertical="top"
          />

          <Text style={styles.characterText}>
            {description.length}/200
          </Text>

          {/* CATEGORY */}

          <View style={styles.section}>
            <Text style={styles.label}>
              CATEGORY
            </Text>

            <View style={styles.optionsGrid}>
              {categories.map(
                (item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.categoryButton,

                      category === item &&
                        styles.categoryButtonSelected,
                    ]}
                    onPress={() =>
                      setCategory(item)
                    }
                  >
                    <Text
                      style={[
                        styles.categoryText,

                        category === item &&
                          styles.categoryTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          {/* FREQUENCY */}

          <View style={styles.section}>
            <Text style={styles.label}>
              FREQUENCY
            </Text>

            <View
              style={
                styles.frequencyContainer
              }
            >
              {frequencies.map(
                (item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.frequencyButton,

                      frequency === item &&
                        styles.frequencyButtonSelected,
                    ]}
                    onPress={() => {
                      setFrequency(
                        item
                      );

                      if (
                        item !==
                        "Custom"
                      ) {
                        setCustomDays(
                          []
                        );
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.frequencyText,

                        frequency === item &&
                          styles.frequencyTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          {/* CUSTOM DAYS */}

          {frequency ===
            "Custom" && (
            <View
              style={
                styles.customDaysSection
              }
            >
              <Text style={styles.label}>
                SELECT DAYS
              </Text>

              <View
                style={
                  styles.daysContainer
                }
              >
                {days.map(
                  (day) => {
                    const selected =
                      customDays.includes(
                        day.value
                      );

                    return (
                      <Pressable
                        key={
                          day.value
                        }
                        style={[
                          styles.dayButton,

                          selected &&
                            styles.dayButtonSelected,
                        ]}
                        onPress={() =>
                          toggleCustomDay(
                            day.value
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.dayText,

                            selected &&
                              styles.dayTextSelected,
                          ]}
                        >
                          {
                            day.short
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {customDays.length >
                0 && (
                <Text
                  style={
                    styles.selectedDaysText
                  }
                >
                  Selected:{" "}
                  {customDays.join(
                    ", "
                  )}
                </Text>
              )}
            </View>
          )}

          {/* REMINDER */}

          <View
            style={
              styles.reminderSection
            }
          >
            <View
              style={
                styles.reminderHeader
              }
            >
              <View
                style={
                  styles.reminderLeft
                }
              >
                <View
                  style={
                    styles.reminderIconContainer
                  }
                >
                  <Text
                    style={
                      styles.reminderIcon
                    }
                  >
                    🔔
                  </Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.reminderTitle
                    }
                  >
                    Daily Reminder
                  </Text>

                  <Text
                    style={
                      styles.reminderSubtitle
                    }
                  >
                    Get notified every day
                  </Text>
                </View>
              </View>

              <Switch
                value={
                  reminderEnabled
                }
                onValueChange={
                  setReminderEnabled
                }
                trackColor={{
                  false: "#303731",
                  true: "#71856F",
                }}
                thumbColor={
                  reminderEnabled
                    ? "#D7E2D4"
                    : "#858D86"
                }
              />
            </View>

            {/* TIME */}

            {reminderEnabled && (
              <View
                style={
                  styles.timeSection
                }
              >
                <Text
                  style={
                    styles.timeLabel
                  }
                >
                  REMINDER TIME
                </Text>

                <Pressable
                  style={({
                    pressed,
                  }) => [
                    styles.timeButton,

                    pressed &&
                      styles.timeButtonPressed,
                  ]}
                  onPress={() =>
                    setShowTimePicker(
                      true
                    )
                  }
                >
                  <Text
                    style={
                      styles.clockIcon
                    }
                  >
                    ⏰
                  </Text>

                  <Text
                    style={
                      styles.timeText
                    }
                  >
                    {formatTime(
                      reminderTime
                    )}
                  </Text>

                  <Text
                    style={
                      styles.changeText
                    }
                  >
                    Change
                  </Text>
                </Pressable>

                {showTimePicker && (
                  <DateTimePicker
                    value={
                      reminderTime
                    }
                    mode="time"
                    is24Hour={false}
                    display={
                      Platform.OS ===
                      "ios"
                        ? "spinner"
                        : "default"
                    }
                    onChange={
                      handleTimeChange
                    }
                  />
                )}

                <Text
                  style={
                    styles.reminderInfo
                  }
                >
                  🔔 Your phone will notify you
                  at this time every day.
                </Text>
              </View>
            )}
          </View>

          {/* SAVE BUTTON */}

          <Pressable
            style={({
              pressed,
            }) => [
              styles.saveButton,

              pressed &&
                styles.buttonPressed,

              saving &&
                styles.disabledButton,
            ]}
            onPress={
              saveHabit
            }
            disabled={saving}
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              {saving
                ? "Creating..."
                : "Create Habit"}
            </Text>

            {!saving && (
              <Text
                style={
                  styles.arrow
                }
              >
                →
              </Text>
            )}
          </Pressable>

          {/* CANCEL */}

          <Pressable
            style={
              styles.cancelButton
            }
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </Pressable>
        </View>

        {/* TIP 1 */}

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>
            💡
          </Text>

          <View
            style={
              styles.tipContent
            }
          >
            <Text
              style={
                styles.tipTitle
              }
            >
              Make it achievable
            </Text>

            <Text
              style={
                styles.tipText
              }
            >
              Instead of "Exercise for 2
              hours", try "Walk for 20
              minutes".
            </Text>
          </View>
        </View>

        {/* TIP 2 */}

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>
            🎯
          </Text>

          <View
            style={
              styles.tipContent
            }
          >
            <Text
              style={
                styles.tipTitle
              }
            >
              Choose a clear schedule
            </Text>

            <Text
              style={
                styles.tipText
              }
            >
              Select a frequency that fits
              naturally into your daily
              routine.
            </Text>
          </View>
        </View>

        {/* TIP 3 */}

        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>
            🔔
          </Text>

          <View
            style={
              styles.tipContent
            }
          >
            <Text
              style={
                styles.tipTitle
              }
            >
              Use reminders wisely
            </Text>

            <Text
              style={
                styles.tipText
              }
            >
              Pick a time when you normally
              have enough time to complete
              your habit.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#101311",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
  },

  // HEADER

  header: {
    marginBottom: 25,
  },

  smallText: {
    color: "#697169",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  title: {
    color: "#F0F3EF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },

  subtitle: {
    color: "#737B74",
    fontSize: 13,
    marginTop: 5,
  },

  // ICON

  iconContainer: {
    width: 78,
    height: 78,
    borderRadius: 23,
    backgroundColor: "#1D281F",
    borderWidth: 1,
    borderColor: "#344137",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },

  icon: {
    color: "#B3C6B2",
    fontSize: 35,
    fontWeight: "700",
  },

  // FORM

  formCard: {
    backgroundColor: "#171C18",
    borderRadius: 23,
    padding: 20,
    borderWidth: 1,
    borderColor: "#282E29",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 7,
  },

  label: {
    color: "#858D86",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#E8ECE7",
    fontSize: 16,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: 14,
  },

  characterText: {
    color: "#59615B",
    fontSize: 9,
    textAlign: "right",
    marginTop: 5,
  },

  helperText: {
    color: "#686F69",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
    marginBottom: 22,
  },

  // GENERAL SECTION

  section: {
    marginTop: 21,
  },

  // CATEGORY

  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
  },

  categoryButtonSelected: {
    backgroundColor: "#2A362C",
    borderColor: "#71856F",
  },

  categoryText: {
    color: "#7B847C",
    fontSize: 11,
    fontWeight: "700",
  },

  categoryTextSelected: {
    color: "#D7E2D4",
  },

  // FREQUENCY

  frequencyContainer: {
    gap: 8,
  },

  frequencyButton: {
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },

  frequencyButtonSelected: {
    backgroundColor: "#2A362C",
    borderColor: "#71856F",
  },

  frequencyText: {
    color: "#7B847C",
    fontSize: 12,
    fontWeight: "700",
  },

  frequencyTextSelected: {
    color: "#D7E2D4",
  },

  // CUSTOM DAYS

  customDaysSection: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
    borderRadius: 16,
  },

  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dayButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#1B211C",
    borderWidth: 1,
    borderColor: "#303731",
    alignItems: "center",
    justifyContent: "center",
  },

  dayButtonSelected: {
    backgroundColor: "#71856F",
    borderColor: "#9CAF99",
  },

  dayText: {
    color: "#7B847C",
    fontSize: 9,
    fontWeight: "800",
  },

  dayTextSelected: {
    color: "#101511",
  },

  selectedDaysText: {
    color: "#788279",
    fontSize: 10,
    marginTop: 12,
    lineHeight: 15,
  },

  // REMINDER

  reminderSection: {
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
    marginBottom: 20,
  },

  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  reminderIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#222A23",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  reminderIcon: {
    fontSize: 19,
  },

  reminderTitle: {
    color: "#E5EAE4",
    fontSize: 13,
    fontWeight: "800",
  },

  reminderSubtitle: {
    color: "#687169",
    fontSize: 10,
    marginTop: 3,
  },

  // TIME

  timeSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#292F2A",
  },

  timeLabel: {
    color: "#69736B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  timeButton: {
    height: 52,
    backgroundColor: "#1C251F",
    borderWidth: 1,
    borderColor: "#354238",
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  timeButtonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  clockIcon: {
    fontSize: 19,
    marginRight: 10,
  },

  timeText: {
    color: "#DCE5D9",
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
  },

  changeText: {
    color: "#9CAF99",
    fontSize: 11,
    fontWeight: "700",
  },

  reminderInfo: {
    color: "#687169",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 9,
  },

  // SAVE

  saveButton: {
    backgroundColor: "#D7E2D4",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  saveButtonText: {
    color: "#172019",
    fontSize: 15,
    fontWeight: "800",
  },

  arrow: {
    color: "#172019",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
  },

  // CANCEL

  cancelButton: {
    alignItems: "center",
    paddingVertical: 15,
  },

  cancelButtonText: {
    color: "#777F78",
    fontSize: 14,
    fontWeight: "600",
  },

  // TIPS

  tipCard: {
    backgroundColor: "#171C18",
    borderRadius: 18,
    padding: 16,
    marginTop: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#282E29",
  },

  tipIcon: {
    fontSize: 21,
    marginRight: 12,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    color: "#DCE2DA",
    fontSize: 13,
    fontWeight: "800",
  },

  tipText: {
    color: "#737B74",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  bottomSpace: {
    height: 60,
  },
});

