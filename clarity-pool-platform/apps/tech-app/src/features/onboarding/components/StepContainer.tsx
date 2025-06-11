import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

interface StepContainerProps {
  children: React.ReactNode;
}

export const StepContainer: React.FC<StepContainerProps> = ({ children }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
});
