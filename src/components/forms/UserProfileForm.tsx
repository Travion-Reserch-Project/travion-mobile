import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button } from '@components/common';

export interface UserProfileData {
  username: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | '';
  country: string;
  preferredLanguage: string;
}

interface UserProfileFormProps {
  onSubmit: (profileData: UserProfileData) => void;
}

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ onSubmit }) => {
  const [profileData, setProfileData] = useState<UserProfileData>({
    username: '',
    birthDate: '',
    gender: '',
    country: '',
    preferredLanguage: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserProfileData, string>>>({});
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const handleInputChange = (field: keyof UserProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof UserProfileData, string>> = {};

    if (!profileData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!profileData.birthDate.trim()) {
      newErrors.birthDate = 'Birth date is required';
    }

    if (!profileData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!profileData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!profileData.preferredLanguage.trim()) {
      newErrors.preferredLanguage = 'Preferred language is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(profileData);
    }
  };

  const handleGenderSelect = (gender: 'male' | 'female' | 'other') => {
    handleInputChange('gender', gender);
  };

  const handleLanguageSelect = (language: string) => {
    handleInputChange('preferredLanguage', language);
    setShowLanguageDropdown(false);
  };

  return (
    <View>
      {/* Username Input */}
      <View className="mb-6 mt-5">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Username</Text>
        <View className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center">
          <View className="w-6 h-6 mr-3 items-center justify-center">
            <FontAwesome5 name="user" size={16} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-base font-gilroy-regular text-gray-900"
            placeholder="Enter your username"
            placeholderTextColor="#9CA3AF"
            value={profileData.username}
            onChangeText={value => handleInputChange('username', value)}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.username && (
          <Text className="text-sm font-gilroy-regular text-red-400 mt-1">{errors.username}</Text>
        )}
      </View>

      {/* Birth Date Input */}
      <View className="mb-6">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Birth Date</Text>
        <View className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center">
          <View className="w-6 h-6 mr-3 items-center justify-center">
            <FontAwesome5 name="calendar" size={16} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-base font-gilroy-regular text-gray-900"
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9CA3AF"
            value={profileData.birthDate}
            onChangeText={value => handleInputChange('birthDate', value)}
            keyboardType="numeric"
          />
        </View>
        {errors.birthDate && (
          <Text className="text-sm font-gilroy-regular text-red-400 mt-1">{errors.birthDate}</Text>
        )}
      </View>

      {/* Gender Selection */}
      <View className="mb-6">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-3">Gender</Text>
        <View className="flex-row justify-between">
          {[
            { key: 'male', label: 'Male', icon: 'mars' },
            { key: 'female', label: 'Female', icon: 'venus' },
            { key: 'other', label: 'Other', icon: 'genderless' },
          ].map(option => (
            <TouchableOpacity
              key={option.key}
              className={`flex-1 border-2 rounded-lg py-4 px-3 mx-1 items-center ${
                profileData.gender === option.key
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300'
              }`}
              onPress={() => handleGenderSelect(option.key as any)}
            >
              <FontAwesome5
                name={option.icon}
                size={20}
                color={profileData.gender === option.key ? '#F5840E' : '#6B7280'}
                className="mb-2"
              />
              <Text
                className={`text-sm font-gilroy-medium ${
                  profileData.gender === option.key ? 'text-primary' : 'text-gray-700'
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender && (
          <Text className="text-sm font-gilroy-regular text-red-400 mt-1">{errors.gender}</Text>
        )}
      </View>

      {/* Country Input */}
      <View className="mb-6">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Country</Text>
        <View className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center">
          <View className="w-6 h-6 mr-3 items-center justify-center">
            <FontAwesome5 name="globe" size={16} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-base font-gilroy-regular text-gray-900"
            placeholder="Enter your country"
            placeholderTextColor="#9CA3AF"
            value={profileData.country}
            onChangeText={value => handleInputChange('country', value)}
            autoCapitalize="words"
          />
        </View>
        {errors.country && (
          <Text className="text-sm font-gilroy-regular text-red-400 mt-1">{errors.country}</Text>
        )}
      </View>

      {/* Preferred Language */}
      <View className="mb-8">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Preferred Language</Text>
        <TouchableOpacity
          className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center justify-between"
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-6 h-6 mr-3 items-center justify-center">
              <FontAwesome5 name="language" size={16} color="#6B7280" />
            </View>
            <Text
              className={`text-base font-gilroy-regular ${
                profileData.preferredLanguage ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {profileData.preferredLanguage
                ? COMMON_LANGUAGES.find(lang => lang.code === profileData.preferredLanguage)
                    ?.name || profileData.preferredLanguage
                : 'Select your preferred language'}
            </Text>
          </View>
          <FontAwesome5
            name={showLanguageDropdown ? 'chevron-up' : 'chevron-down'}
            size={12}
            color="#6B7280"
          />
        </TouchableOpacity>

        {/* Language Dropdown */}
        {showLanguageDropdown && (
          <View className="border border-gray-300 rounded-lg mt-2 bg-white">
            {COMMON_LANGUAGES.map(language => (
              <TouchableOpacity
                key={language.code}
                className="px-4 py-3 border-b border-gray-200 last:border-b-0"
                onPress={() => handleLanguageSelect(language.code)}
              >
                <Text className="text-base font-gilroy-regular text-gray-900">{language.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {errors.preferredLanguage && (
          <Text className="text-sm font-gilroy-regular text-red-400 mt-1">
            {errors.preferredLanguage}
          </Text>
        )}
      </View>

      {/* Submit Button */}
      <Button title="Complete Profile" onPress={handleSubmit} className="mt-7" variant="primary" />
    </View>
  );
};
