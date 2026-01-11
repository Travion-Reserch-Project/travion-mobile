import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, TextInput, Alert, Image } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { MainStackParamList } from '@navigation/MainNavigator';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'HealthProfileSetup'>;

const HealthProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [age, setAge] = useState('');
  const route = useRoute<RouteProps>();
  const { imageUri } = route.params;

  const handleContinue = () => {
    if (!age.trim()) {
      Alert.alert('Age Required', 'Please enter your age to continue.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 16) {
      Alert.alert('Invalid Age', 'You must be at least 16 years old to use this app.');
      return;
    }
    navigation.navigate('SkinAnalysis', { imageUri: imageUri ?? '' });
  };

  return (
    <View className="flex-1 bg-white px-6">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center mt-11 mb-8">
        <TouchableOpacity className="mr-4">
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-900 text-lg font-bold">Profile Setup</Text>
      </View>

      {/* Progress Dots */}
      <View className="flex-row justify-center mb-8">
        <View className="w-10 h-2 rounded-full bg-orange-500 mr-2" />
        <View className="w-2 h-2 rounded-full bg-gray-600 mr-2" />
        <View className="w-2 h-2 rounded-full bg-gray-600" />
      </View>

      {/* Title */}
      <Text className="text-slate-900 text-3xl font-extrabold mb-3">Let's get to know you</Text>
      <Text className="text-slate-600 text-base mb-10">
        We need a few details to personalize your UV safety plan and predictions.
      </Text>

      {/* Image Upload */}
      <View className="items-center mb-10">
        <View className="relative overflow-visible">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="w-72 h-72 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <TouchableOpacity
              className="w-44 h-44 rounded-full border-2 border-dashed border-gray-300 items-center justify-center bg-orange-50"
              onPress={() => navigation.navigate('FaceCapture')}
            >
              <FontAwesome name="camera" size={32} color="#f97316" />
            </TouchableOpacity>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            className="absolute bottom-0 right-0 w-12 h-12 rounded-full items-center justify-center border-4 border-white shadow-lg bg-orange-500"
          >
            <FontAwesome name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text className="text-slate-900 mt-5 font-semibold">Tap to add photo</Text>
      </View>

      {/* Age Input */}
      <Text className="text-slate-900 mb-2 font-semibold">How old are you?</Text>

      <View className="flex-row items-center bg-gray-100 rounded-full px-5 py-2 mb-4">
        <TextInput
          placeholder="16+"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          className="flex-1 text-slate-900 text-base"
          value={age}
          onChangeText={setAge}
        />
        <FontAwesome name="calendar" size={18} color="#64748b" />
      </View>

      {/* Info */}
      <View className="flex-row items-start mb-10">
        <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5">
          <FontAwesome name="shield" size={12} color="#000" />
        </View>
        <Text className="text-slate-600 text-sm flex-1">
          Strictly for tourists aged 16+. Used to calculate skin sensitivity and sun exposure
          limits.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        className="bg-primary rounded-full px-10 py-4 flex-row items-center justify-center shadow-lg"
        onPress={handleContinue}
      >
        <Text className="text-white font-extrabold text-lg mr-3">Upload Image & Continue</Text>
        <FontAwesome name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Privacy */}
      <Text className="text-center text-gray-500 text-xs tracking-widest mt-6">
        YOUR HEALTH DATA IS PRIVATE
      </Text>
    </View>
  );
};

export default HealthProfileSetupScreen;
