import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { HabitProvider } from "@/context/HabitContext";

function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentScreen = segments[0];

    const isAuthScreen =
      currentScreen === "login" ||
      currentScreen === "register";

    console.log("================================");
    console.log("AUTH NAVIGATION");
    console.log("User:", user);
    console.log("Loading:", loading);
    console.log("Screen:", currentScreen);
    console.log("================================");

    // User is NOT logged in
    if (!user && !isAuthScreen) {
      console.log("➡️ Not logged in → Login");

      router.replace("/login");
      return;
    }

    // User IS logged in
    if (user && isAuthScreen) {
      console.log("➡️ Logged in → Home");

      router.replace("/(tabs)");
      return;
    }
  }, [user, loading, segments]);

  // Wait for AsyncStorage
  if (loading) {
    return null;
  }

  return (
    <Stack>
      {/* AUTH */}

      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />

      {/* MAIN APP */}

      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      {/* HABITS */}

      <Stack.Screen
        name="add-habit"
        options={{
          title: "Add Habit",
        }}
      />

      <Stack.Screen
        name="edit-habit"
        options={{
          title: "Edit Habit",
        }}
      />

      {/* OTHER SCREENS */}

      <Stack.Screen
        name="calendar"
        options={{
          title: "Calendar",
        }}
      />

      <Stack.Screen
        name="analytics"
        options={{
          title: "Analytics",
        }}
      />

      <Stack.Screen
        name="achievements"
        options={{
          title: "Achievements",
        }}
      />

      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />

      <Stack.Screen
        name="archived-habits"
        options={{
          title: "Archived Habits",
        }}
      />

      <Stack.Screen
        name="ai-chat"
        options={{
          title: "AI Habit Coach",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <HabitProvider>
        <RootNavigation />
      </HabitProvider>
    </AuthProvider>
  );
}