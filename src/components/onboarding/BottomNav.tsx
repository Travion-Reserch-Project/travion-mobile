import { Button } from '@components/common';
import React from 'react';
import { View, ViewStyle } from 'react-native';

export const BottomNav: React.FC<{
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isNextDisabled?: boolean;
  style?: ViewStyle;
}> = ({ onBack, onNext, isFirstStep, isLastStep, isNextDisabled = false }) => {
  return (
    <View className="flex-row justify-between p-md border-t border-border-light bg-white">
      {!isFirstStep && <Button title="Back" onPress={onBack} variant="text" />}
      {isFirstStep && <View />}
      <Button title={isLastStep ? 'Finish' : 'Next'} onPress={onNext} disabled={isNextDisabled} />
    </View>
  );
};
