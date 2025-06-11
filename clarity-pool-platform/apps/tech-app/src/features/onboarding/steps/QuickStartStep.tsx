import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';

interface QuickStartStepProps {
  session: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export const QuickStartStep: React.FC<QuickStartStepProps> = ({
  session,
  onNext,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Smart Onboarding</Text>
        <Text style={styles.subtitle}>
          Let's get {session.customerName}'s pool set up in under 20 minutes!
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Customer Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{session.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Customer ID:</Text>
          <Text style={styles.value}>#{session.customerId}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>Start Smart Capture →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.navy,
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightBlue,
  },
  infoCard: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mint,
  },
  label: {
    fontSize: 14,
    color: Colors.grayBlue,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.navy,
  },
  button: {
    backgroundColor: Colors.blueGray,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
