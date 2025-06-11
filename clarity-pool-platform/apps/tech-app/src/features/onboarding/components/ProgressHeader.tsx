import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';

interface Step {
  id: string;
  name: string;
}

interface ProgressHeaderProps {
  steps: Step[];
  currentStep: number;
  onStepPress: (index: number) => void;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  steps,
  currentStep,
  onStepPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={styles.stepContainer}
            onPress={() => onStepPress(index)}
            disabled={index > currentStep}
          >
            <View
              style={[
                styles.stepCircle,
                index === currentStep && styles.activeCircle,
                index < currentStep && styles.completedCircle,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  (index === currentStep || index < currentStep) && styles.activeText,
                ]}
              >
                {index < currentStep ? '✓' : index + 1}
              </Text>
            </View>
            <Text style={[styles.stepName, index === currentStep && styles.activeStepName]}>
              {step.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.progressLine}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / (steps.length - 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mint,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeCircle: {
    backgroundColor: Colors.blueGray,
  },
  completedCircle: {
    backgroundColor: Colors.success,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.grayBlue,
  },
  activeText: {
    color: Colors.white,
  },
  stepName: {
    fontSize: 12,
    color: Colors.grayBlue,
  },
  activeStepName: {
    color: Colors.navy,
    fontWeight: '600',
  },
  progressLine: {
    height: 4,
    backgroundColor: Colors.lightBlue,
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.blueGray,
    borderRadius: 2,
  },
});
