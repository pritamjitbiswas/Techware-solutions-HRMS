import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LeaveScreen } from "../screens/LeaveScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Attendance: "📅",
  Leave: "🌴",
  Profile: "👤",
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[label] ?? "•"}</Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: "800" as const },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Punch" }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: "My Attendance" }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ title: "Leave" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isHydrating, mustChangePassword } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : mustChangePassword ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
