
import { useEffect, useState } from "react";

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

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useHabits,
} from "@/context/HabitContext";


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
// CONSTANTS
// =====================================================

const categories: Category[] = [
  "Health",
  "Fitness",
  "Study",
  "Work",
  "Personal",
  "Other",
];

const frequencies: Frequency[] = [
  "Daily",
  "Weekdays",
  "Weekends",
  "Custom",
];

const days = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];


// =====================================================
// SCREEN
// =====================================================

export default function EditHabitScreen() {

  // ===================================================
  // PARAMS
  // ===================================================

  const {
    id,
  } = useLocalSearchParams<{
    id: string;
  }>();


  // ===================================================
  // HABITS
  // ===================================================

  const {
    habits,
    updateHabitDetails,
    archiveHabit,
  } = useHabits();


  const habit =
    habits.find(
      item =>
        item.id === id
    );


  // ===================================================
  // STATE
  // ===================================================

  const [
    habitName,
    setHabitName,
  ] = useState("");


  const [
    description,
    setDescription,
  ] = useState("");


  const [
    category,
    setCategory,
  ] = useState<Category>("Personal");


  const [
    frequency,
    setFrequency,
  ] = useState<Frequency>("Daily");


  const [
    customDays,
    setCustomDays,
  ] = useState<string[]>([]);


  const [
    reminderEnabled,
    setReminderEnabled,
  ] = useState(false);


  const [
    reminderTime,
    setReminderTime,
  ] = useState(
    new Date()
  );


  const [
    showTimePicker,
    setShowTimePicker,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  // ===================================================
  // LOAD HABIT DATA
  // ===================================================

  useEffect(() => {

    if (!habit) {
      return;
    }


    setHabitName(
      habit.name
    );


    setDescription(
      habit.description || ""
    );


    setCategory(
      habit.category || "Personal"
    );


    setFrequency(
      habit.frequency || "Daily"
    );


    setCustomDays(
      habit.customDays || []
    );


    if (habit.reminderTime) {

      setReminderEnabled(true);


      const [
        hours,
        minutes,
      ] =
        habit.reminderTime
          .split(":")
          .map(Number);


      const date =
        new Date();


      date.setHours(
        hours,
        minutes,
        0,
        0
      );


      setReminderTime(
        date
      );

    } else {

      setReminderEnabled(false);

    }

  }, [habit?.id]);


  // ===================================================
  // FORMAT TIME
  // ===================================================

  const formatTime = (
    date: Date
  ) => {

    let hours =
      date.getHours();


    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0");


    const period =
      hours >= 12
        ? "PM"
        : "AM";


    hours =
      hours % 12 || 12;


    return `${hours}:${minutes} ${period}`;
  };


  // ===================================================
  // DATABASE TIME
  // ===================================================

  const formatTimeForDatabase = (
    date: Date
  ) => {

    const hours =
      String(
        date.getHours()
      ).padStart(2, "0");


    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0");


    return `${hours}:${minutes}`;
  };


  // ===================================================
  // TOGGLE CUSTOM DAY
  // ===================================================

  const toggleDay = (
    day: string
  ) => {

    setCustomDays(
      currentDays => {

        if (
          currentDays.includes(day)
        ) {

          return currentDays.filter(
            item =>
              item !== day
          );

        }


        return [
          ...currentDays,
          day,
        ];
      }
    );
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
  // SAVE
  // ===================================================

  const saveChanges =
    async () => {

      const trimmedName =
        habitName.trim();


      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (!trimmedName) {

        Alert.alert(
          "Missing habit",
          "Please enter a habit name."
        );

        return;
      }


      if (
        frequency === "Custom" &&
        customDays.length === 0
      ) {

        Alert.alert(
          "Select days",
          "Please select at least one day."
        );

        return;
      }


      if (!id) {

        Alert.alert(
          "Error",
          "Habit ID is missing."
        );

        return;
      }


      try {

        setSaving(true);


        const reminderTimeValue =
          reminderEnabled
            ? formatTimeForDatabase(
                reminderTime
              )
            : null;


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        await updateHabitDetails(
          id,
          {
            name:
              trimmedName,

            description:
              description.trim(),

            category,

            frequency,

            customDays:
              frequency === "Custom"
                ? customDays
                : [],

            reminderTime:
              reminderTimeValue,
          }
        );


        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        Alert.alert(
          "Updated ✨",
          "Your habit has been updated successfully.",
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
          "SAVE EDIT ERROR:",
          error
        );


        Alert.alert(
          "Error",
          "Unable to update habit. Please try again."
        );

      } finally {

        setSaving(false);

      }
    };


  // ===================================================
  // ARCHIVE
  // ===================================================

  const handleArchive =
    () => {

      if (!id) {
        return;
      }


      const action =
        habit?.archived
          ? "unarchive"
          : "archive";


      Alert.alert(
        habit?.archived
          ? "Unarchive Habit"
          : "Archive Habit",

        habit?.archived
          ? "Do you want to restore this habit?"
          : "Do you want to archive this habit?",

        [
          {
            text: "Cancel",
            style: "cancel",
          },

          {
            text:
              habit?.archived
                ? "Unarchive"
                : "Archive",

            onPress:
              async () => {

                try {

                  await archiveHabit(
                    id,
                    !habit?.archived
                  );


                  Alert.alert(
                    "Success",
                    habit?.archived
                      ? "Habit restored."
                      : "Habit archived.",

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
                    "ARCHIVE ERROR:",
                    error
                  );

                  Alert.alert(
                    "Error",
                    `Unable to ${action} habit.`
                  );

                }

              },
          },
        ]
      );
    };


  // ===================================================
  // HABIT NOT FOUND
  // ===================================================

  if (!habit) {

    return (

      <View
        style={
          styles.errorContainer
        }
      >

        <Text
          style={
            styles.errorTitle
          }
        >
          Habit not found
        </Text>


        <Text
          style={
            styles.errorSubtitle
          }
        >
          This habit may have been deleted.
        </Text>


        <Pressable
          style={
            styles.errorButton
          }

          onPress={() =>
            router.back()
          }
        >

          <Text
            style={
              styles.errorButtonText
            }
          >
            Go Back
          </Text>

        </Pressable>

      </View>
    );
  }


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
        style={
          styles.container
        }

        contentContainerStyle={
          styles.content
        }

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <View
          style={
            styles.header
          }
        >

          <Text
            style={
              styles.smallText
            }
          >
            UPDATE YOUR ROUTINE
          </Text>


          <Text
            style={
              styles.title
            }
          >
            Edit Habit
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Make your routine work better for you.
          </Text>

        </View>


        {/* =========================================
            FORM
        ========================================= */}

        <View
          style={
            styles.formCard
          }
        >

          {/* =======================================
              NAME
          ======================================= */}

          <Text
            style={
              styles.label
            }
          >
            HABIT NAME
          </Text>


          <TextInput
            style={
              styles.input
            }

            value={
              habitName
            }

            onChangeText={
              setHabitName
            }

            placeholder="e.g. Drink 2L water"

            placeholderTextColor="#666D67"

            maxLength={50}

            editable={
              !saving
            }
          />


          {/* =======================================
              DESCRIPTION
          ======================================= */}

          <Text
            style={[
              styles.label,
              styles.sectionLabel,
            ]}
          >
            DESCRIPTION
          </Text>


          <TextInput
            style={[
              styles.input,
              styles.descriptionInput,
            ]}

            value={
              description
            }

            onChangeText={
              setDescription
            }

            placeholder="Why is this habit important to you?"

            placeholderTextColor="#666D67"

            multiline

            numberOfLines={4}

            maxLength={200}

            textAlignVertical="top"

            editable={
              !saving
            }
          />


          {/* =======================================
              CATEGORY
          ======================================= */}

          <Text
            style={[
              styles.label,
              styles.sectionLabel,
            ]}
          >
            CATEGORY
          </Text>


          <View
            style={
              styles.optionsContainer
            }
          >

            {categories.map(
              item => (

                <Pressable
                  key={item}

                  style={[
                    styles.optionButton,

                    category === item &&
                      styles.optionButtonActive,
                  ]}

                  onPress={() =>
                    setCategory(item)
                  }

                  disabled={
                    saving
                  }
                >

                  <Text
                    style={[
                      styles.optionText,

                      category === item &&
                        styles.optionTextActive,
                    ]}
                  >
                    {item}
                  </Text>

                </Pressable>

              )
            )}

          </View>


          {/* =======================================
              FREQUENCY
          ======================================= */}

          <Text
            style={[
              styles.label,
              styles.sectionLabel,
            ]}
          >
            FREQUENCY
          </Text>


          <View
            style={
              styles.optionsContainer
            }
          >

            {frequencies.map(
              item => (

                <Pressable
                  key={item}

                  style={[
                    styles.optionButton,

                    frequency === item &&
                      styles.optionButtonActive,
                  ]}

                  onPress={() => {

                    setFrequency(item);


                    if (
                      item !== "Custom"
                    ) {

                      setCustomDays([]);

                    }

                  }}

                  disabled={
                    saving
                  }
                >

                  <Text
                    style={[
                      styles.optionText,

                      frequency === item &&
                        styles.optionTextActive,
                    ]}
                  >
                    {item}
                  </Text>

                </Pressable>

              )
            )}

          </View>


          {/* =======================================
              CUSTOM DAYS
          ======================================= */}

          {frequency === "Custom" && (

            <View
              style={
                styles.customDaysSection
              }
            >

              <Text
                style={
                  styles.dayLabel
                }
              >
                SELECT DAYS
              </Text>


              <View
                style={
                  styles.daysContainer
                }
              >

                {days.map(
                  day => (

                    <Pressable
                      key={day}

                      style={[
                        styles.dayButton,

                        customDays.includes(day) &&
                          styles.dayButtonActive,
                      ]}

                      onPress={() =>
                        toggleDay(day)
                      }

                      disabled={
                        saving
                      }
                    >

                      <Text
                        style={[
                          styles.dayText,

                          customDays.includes(day) &&
                            styles.dayTextActive,
                        ]}
                      >
                        {day}
                      </Text>

                    </Pressable>

                  )
                )}

              </View>

            </View>
          )}


          {/* =======================================
              REMINDER
          ======================================= */}

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

                disabled={
                  saving
                }
              />

            </View>


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
                  style={({ pressed }) => [
                    styles.timeButton,

                    pressed &&
                      styles.timeButtonPressed,
                  ]}

                  onPress={() =>
                    setShowTimePicker(true)
                  }

                  disabled={
                    saving
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
                      Platform.OS === "ios"
                        ? "spinner"
                        : "default"
                    }

                    onChange={
                      handleTimeChange
                    }
                  />

                )}

              </View>

            )}

          </View>


          {/* =======================================
              SAVE
          ======================================= */}

          <Pressable
            style={({ pressed }) => [

              styles.saveButton,

              pressed &&
                styles.buttonPressed,

              saving &&
                styles.disabledButton,

            ]}

            onPress={
              saveChanges
            }

            disabled={
              saving
            }
          >

            <Text
              style={
                styles.saveButtonText
              }
            >

              {saving
                ? "Saving..."
                : "Save Changes"}

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


          {/* =======================================
              CANCEL
          ======================================= */}

          <Pressable
            style={
              styles.cancelButton
            }

            onPress={() =>
              router.back()
            }

            disabled={
              saving
            }
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


        {/* =========================================
            ARCHIVE
        ========================================= */}

        <Pressable
          style={
            styles.archiveButton
          }

          onPress={
            handleArchive
          }

          disabled={
            saving
          }
        >

          <Text
            style={
              styles.archiveIcon
            }
          >
            📦
          </Text>


          <View
            style={
              styles.archiveContent
            }
          >

            <Text
              style={
                styles.archiveTitle
              }
            >

              {habit.archived
                ? "Unarchive Habit"
                : "Archive Habit"}

            </Text>


            <Text
              style={
                styles.archiveSubtitle
              }
            >

              {habit.archived
                ? "Bring this habit back to your active routine."
                : "Hide this habit from your active routine."}

            </Text>

          </View>

        </Pressable>


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


  // ===============================================
  // HEADER
  // ===============================================

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


  // ===============================================
  // FORM
  // ===============================================

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


  sectionLabel: {
    marginTop: 22,
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
    minHeight: 100,
    paddingTop: 15,
  },


  // ===============================================
  // OPTIONS
  // ===============================================

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },


  optionButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#101411",
    borderWidth: 1,
    borderColor: "#303731",
  },


  optionButtonActive: {
    backgroundColor: "#2A362C",
    borderColor: "#71856F",
  },


  optionText: {
    color: "#7E877F",
    fontSize: 11,
    fontWeight: "700",
  },


  optionTextActive: {
    color: "#D7E2D4",
  },


  // ===============================================
  // CUSTOM DAYS
  // ===============================================

  customDaysSection: {
    marginTop: 15,
    padding: 14,
    backgroundColor: "#101411",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#303731",
  },


  dayLabel: {
    color: "#69736B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },


  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },


  dayButton: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#1B211D",
    borderWidth: 1,
    borderColor: "#303731",
    alignItems: "center",
    justifyContent: "center",
  },


  dayButtonActive: {
    backgroundColor: "#71856F",
    borderColor: "#9CAF99",
  },


  dayText: {
    color: "#747D76",
    fontSize: 9,
    fontWeight: "800",
  },


  dayTextActive: {
    color: "#101411",
  },


  // ===============================================
  // REMINDER
  // ===============================================

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


  // ===============================================
  // SAVE
  // ===============================================

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


  // ===============================================
  // CANCEL
  // ===============================================

  cancelButton: {
    alignItems: "center",
    paddingVertical: 15,
  },


  cancelButtonText: {
    color: "#777F78",
    fontSize: 14,
    fontWeight: "600",
  },


  // ===============================================
  // ARCHIVE
  // ===============================================

  archiveButton: {
    marginTop: 15,
    backgroundColor: "#171C18",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A302D",
  },


  archiveIcon: {
    fontSize: 22,
    marginRight: 12,
  },


  archiveContent: {
    flex: 1,
  },


  archiveTitle: {
    color: "#D8B5AA",
    fontSize: 13,
    fontWeight: "800",
  },


  archiveSubtitle: {
    color: "#746B68",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },


  // ===============================================
  // ERROR
  // ===============================================

  errorContainer: {
    flex: 1,
    backgroundColor: "#101311",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },


  errorTitle: {
    color: "#F0F3EF",
    fontSize: 24,
    fontWeight: "800",
  },


  errorSubtitle: {
    color: "#737B74",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },


  errorButton: {
    marginTop: 25,
    backgroundColor: "#D7E2D4",
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 13,
  },


  errorButtonText: {
    color: "#172019",
    fontSize: 14,
    fontWeight: "800",
  },


  bottomSpace: {
    height: 60,
  },

});

