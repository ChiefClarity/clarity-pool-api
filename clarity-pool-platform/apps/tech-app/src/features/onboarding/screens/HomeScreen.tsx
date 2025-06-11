import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';

// Mock data for scheduled onboardings
const mockOnboardings = [
  { id: '1', customerName: 'Sarah Johnson', address: '1234 Oak Street', time: '10:00 AM' },
  { id: '2', customerName: 'Mike Smith', address: '5678 Pine Road', time: '2:00 PM' },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleStartOnboarding = (customerId: string, customerName: string) => {
    navigation.navigate('OnboardingFlow', { customerId, customerName });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Onboardings</Text>
          
          {mockOnboardings.map((onboarding) => (
            <TouchableOpacity
              key={onboarding.id}
              style={styles.onboardingCard}
              onPress={() => handleStartOnboarding(onboarding.id, onboarding.customerName)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.customerName}>{onboarding.customerName}</Text>
                <Text style={styles.address}>{onboarding.address}</Text>
                <Text style={styles.time}>{onboarding.time}</Text>
              </View>
              <View style={styles.startButton}>
                <Text style={styles.startButtonText}>START</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mint,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.navy,
  },
  dateText: {
    fontSize: 16,
    color: Colors.grayBlue,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 16,
  },
  onboardingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.navy,
  },
  address: {
    fontSize: 14,
    color: Colors.grayBlue,
    marginTop: 4,
  },
  time: {
    fontSize: 14,
    color: Colors.blueGray,
    marginTop: 4,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: Colors.blueGray,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
