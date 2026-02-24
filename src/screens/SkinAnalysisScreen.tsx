import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { MainStackParamList } from '@navigation/MainNavigator';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

// Use the stack navigation type for this screen so navigate/goBack are scoped correctly
type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SkinAnalysis'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinAnalysis'>;

const SkinAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { imageUri, ageNum } = route.params;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageSelection = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select image');
      return;
    }
    if (response.assets && response.assets[0]?.uri) {
      setSelectedImage(response.assets[0].uri);
    }
  };

  const openGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      },
      handleImageSelection,
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 1,
        saveToPhotos: true,
      },
      handleImageSelection,
    );
  };

  const analyzeSkin = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'skin_image.jpg',
      } as any);

      // Use 10.0.2.2 for Android emulator to reach host machine
      // For physical device, use your machine's actual IP address (e.g., 192.168.x.x)
      const API_URL =
        Platform.OS === 'android'
          ? 'http://10.0.2.2:8002/api/skin/fitzpatrick_predict'
          : 'http://localhost:8002/api/skin/fitzpatrick_predict';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze skin');
      }

      const data = await response.json();
      navigation.navigate('SkinAnalysisResult', {
        imageUri: selectedImage,
        skinType: data.predicted_skin_type,
        ageNum,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze skin. Please try again.');
      console.error('Skin analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (imageUri) {
      setSelectedImage(imageUri);
    }
  }, [imageUri]);

  return (
    <View className="flex-1 bg-white px-6">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center mt-10 mb-10">
        <TouchableOpacity
          className="mr-4"
          onPress={() =>
            navigation.navigate('HealthProfileSetup', { imageUri: selectedImage ?? '' })
          }
        >
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Skin Analysis</Text>
      </View>

      {/* Title */}
      <Text className="text-3xl font-extrabold text-slate-900 text-center mb-3">
        Let's check your{'\n'}sensitivity.
      </Text>

      <Text className="text-slate-500 text-center text-base mb-8 px-4">
        Upload a clear image in good lighting,{'\n'}
        without filters.
      </Text>

      {/* Image Upload Area */}
      <View className="items-center mb-10">
        <View className="w-full h-80 rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50 items-center justify-center overflow-hidden">
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <>
              <View className="w-24 h-24 rounded-full bg-white items-center justify-center shadow-sm mb-4">
                <FontAwesome name="user" size={32} color="#f97316" />
              </View>

              <Text className="text-lg font-bold text-slate-900 mb-1">No Image Selected</Text>
              <Text className="text-slate-500 text-sm">Use the buttons below to add a photo</Text>
            </>
          )}
        </View>
      </View>

      {/* Camera / Gallery Buttons */}
      <View className="flex-row justify-between mb-10">
        <TouchableOpacity
          className="flex-1 bg-white border border-slate-200 rounded-2xl py-5 mr-3 items-center"
          onPress={openCamera}
        >
          <FontAwesome name="camera" size={22} color="#f97316" />
          <Text className="mt-2 font-semibold text-slate-900">Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-white border border-slate-200 rounded-2xl py-5 ml-3 items-center"
          onPress={openGallery}
        >
          <FontAwesome name="image" size={22} color="#94a3b8" />
          <Text className="mt-2 font-semibold text-slate-900">Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* CTA */}
      <TouchableOpacity
        className="bg-primary rounded-full px-10 py-5 flex-row justify-center items-center shadow-lg"
        onPress={analyzeSkin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <FontAwesome name="search" size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-lg mr-3">Analyze Skin Type</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Privacy Note */}
      <View className="flex-row justify-center items-center">
        <FontAwesome name="lock" size={12} color="#94a3b8" />
        <Text className="ml-2 text-slate-500 text-xs">
          Your photo is processed locally for privacy.
        </Text>
      </View>
    </View>
  );
};

export default SkinAnalysisScreen;
