import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';

export const SmartCaptureStep: React.FC<any> = ({ onNext, onBack }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Capture</Text>
      <Text style={styles.subtitle}>Camera functionality coming next!</Text>
      
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grayBlue,
    marginBottom: 40,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: Colors.blueGray,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  backButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.blueGray,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: Colors.blueGray,
    fontSize: 16,
    fontWeight: '600',
  },
});
