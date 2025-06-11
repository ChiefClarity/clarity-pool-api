import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from './src/constants/colors';

// Import screens
import { HomeScreen } from './src/features/onboarding/screens/HomeScreen';
import { OnboardingFlowScreen } from './src/features/onboarding/screens/OnboardingFlowScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.navy,
            },
            headerTintColor: Colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Clarity Tech' }}
          />
          <Stack.Screen 
            name="OnboardingFlow" 
            component={OnboardingFlowScreen}
            options={{ title: 'New Onboarding' }}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
