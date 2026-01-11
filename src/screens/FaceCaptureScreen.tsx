import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const FaceCaptureScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCameraCapture = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.8,
      saveToPhotos: false,
    });

    if (result.assets && result.assets[0]?.uri) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const handleGalleryPick = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]?.uri) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (capturedImage) {
      navigation.navigate('HealthProfileSetup', { imageUri: capturedImage });
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Bar */}
      <View className="absolute top-0 left-0 right-0 z-10 px-6 pt-12 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>

        <Text className="text-slate-900 font-semibold text-base">Skin Analysis</Text>

        <TouchableOpacity>
          <FontAwesome name="question-circle" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Camera Preview Placeholder */}
      <View className="flex-1 bg-white items-center justify-center">
        {/* Dark Overlay */}
        <View className="absolute inset-0 bg-black/40" />

        {/* Outer Olive Circle */}
        <View className="w-80 h-80 rounded-full bg-[#8b8b4a] items-center justify-center">
          {/* Face Frame */}
          <View className="w-72 h-72 rounded-full border-2 border-dashed border-orange-400 items-center justify-center overflow-hidden">
            {capturedImage ? (
              /* Captured Image Preview */
              <Image
                source={{ uri: capturedImage }}
                className="w-72 h-72 rounded-full"
                resizeMode="cover"
              />
            ) : (
              /* Inner Glow - Placeholder */
              <View className="w-64 h-64 rounded-full bg-[#c9c78a] items-center justify-center">
                {/* Face Icon */}
                <View className="w-20 h-20 rounded-full bg-white items-center justify-center">
                  <FontAwesome name="user" size={36} color="#f97316" />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View className="absolute top-[18%] items-center px-6">
          <Text className="text-slate-900 text-lg font-semibold text-center mb-2">
            {capturedImage ? 'Photo captured!' : 'Position your face within\nthe frame'}
          </Text>

          <View className="flex-row items-center bg-gray-200 px-3 py-1 rounded-full">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-gray-600 text-xs">
              {capturedImage ? 'Ready for analysis' : 'No filters applied'}
            </Text>
          </View>
        </View>

        <Text className="absolute bottom-[10%] text-gray-500 text-xs text-center px-10">
          {capturedImage
            ? 'Tap continue to analyze your skin'
            : 'Make sure your face is well-lit and\nclearly visible'}
        </Text>
      </View>

      {/* Bottom Controls */}
      <View className="px-8 pb-6">
        <View className="flex-row justify-between items-center mb-6">
          {capturedImage ? (
            /* After capture controls */
            <>
              {/* Retake */}
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center"
                onPress={handleRetake}
              >
                <FontAwesome name="refresh" size={18} color="#374151" />
              </TouchableOpacity>

              {/* Continue Button */}
              <TouchableOpacity
                className="w-20 h-20 rounded-full items-center justify-center border-4 border-gray-300 shadow-lg"
                style={{ backgroundColor: '#22c55e' }}
                onPress={handleContinue}
              >
                <FontAwesome name="check" size={26} color="#fff" />
              </TouchableOpacity>

              {/* Empty placeholder for alignment */}
              <View className="w-12 h-12" />
            </>
          ) : (
            /* Before capture controls */
            <>
              {/* Gallery */}
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center"
                onPress={handleGalleryPick}
              >
                <FontAwesome name="image" size={18} color="#374151" />
              </TouchableOpacity>

              {/* Capture Button */}
              <TouchableOpacity
                className="w-20 h-20 rounded-full items-center justify-center border-4 border-gray-300 shadow-lg"
                style={{ backgroundColor: '#f97316' }}
                onPress={handleCameraCapture}
              >
                <FontAwesome name="camera" size={26} color="#fff" />
              </TouchableOpacity>

              {/* Flash */}
              <TouchableOpacity className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                <FontAwesome name="bolt" size={18} color="#374151" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Privacy */}
        <View className="flex-row justify-center items-center">
          <FontAwesome name="lock" size={12} color="#9ca3af" />
          <Text className="ml-2 text-gray-400 text-xs">
            Your photo is processed locally and never stored
          </Text>
        </View>
      </View>
    </View>
  );
};

export default FaceCaptureScreen;
