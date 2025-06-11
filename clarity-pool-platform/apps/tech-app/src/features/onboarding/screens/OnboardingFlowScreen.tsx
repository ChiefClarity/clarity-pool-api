import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../../constants/colors';

// Import components
import { ProgressHeader } from '../components/ProgressHeader';
import { StepContainer } from '../components/StepContainer';

// Import step screens
import { QuickStartStep } from '../steps/QuickStartStep';
import { SmartCaptureStep } from '../steps/SmartCaptureStep';
import { WaterAnalysisStep } from '../steps/WaterAnalysisStep';

const ONBOARDING_STEPS = [
  { id: 'quick-start', name: 'Quick Start', component: QuickStartStep },
  { id: 'smart-capture', name: 'Smart Capture', component: SmartCaptureStep },
  { id: 'water-analysis', name: 'Water Analysis', component: WaterAnalysisStep },
];

export const OnboardingFlowScreen: React.FC = () => {
  const route = useRoute();
  const { customerId, customerName } = route.params as any;
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionData, setSessionData] = useState({
    customerId,
    customerName,
    data: {},
  });

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateSessionData = (data: any) => {
    setSessionData({
      ...sessionData,
      data: {
        ...sessionData.data,
        ...data,
      },
    });
  };

  const CurrentStepComponent = ONBOARDING_STEPS[currentStep].component;

  return (
    <View style={styles.container}>
      <ProgressHeader
        steps={ONBOARDING_STEPS}
        currentStep={currentStep}
        onStepPress={(idx) => {
          if (idx < currentStep) setCurrentStep(idx);
        }}
      />
      
      <StepContainer>
        <CurrentStepComponent
          session={sessionData}
          onUpdate={updateSessionData}
          onNext={handleNext}
          onBack={handleBack}
        />
      </StepContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
});
