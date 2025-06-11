import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';

export const WaterAnalysisStep: React.FC<any> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Water Analysis</Text>
      <Text style={styles.subtitle}>Coming soon!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grayBlue,
    marginTop: 8,
  },
});
