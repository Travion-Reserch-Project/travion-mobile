import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SunburnHistory'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinAnalysisResult'>;

const SunburnHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [burnFrequency, setBurnFrequency] = useState('Sometimes');
  const [tanResponse, setTanResponse] = useState('Slight Tan');

  const { imageUri, skinType } = route.params;

  const handleSave = useCallback(() => {
    navigation.navigate('SkinHelthProfile', { imageUri, skinType });
  }, [navigation, imageUri, skinType]);

  return (
    <View className="flex-1 bg-white px-6">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center mt-6 mb-4">
          <TouchableOpacity className="mr-4" onPress={() => navigation.goBack()}>
            <FontAwesome name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold flex-1 text-center -ml-6">
            Assessment
          </Text>
        </View>

        {/* Progress Dots */}
        <View className="flex-row justify-center mb-8">
          <View className="w-2 h-2 rounded-full bg-gray-600 mx-1" />
          <View className="w-8 h-2 rounded-full bg-orange-500 mx-1" />
          <View className="w-2 h-2 rounded-full bg-gray-600 mx-1" />
          <View className="w-2 h-2 rounded-full bg-gray-600 mx-1" />
        </View>

        {/* Title */}
        <Text className="text-slate-900 text-3xl font-extrabold mb-2">Sunburn History</Text>
        <Text className="text-slate-600 text-base mb-8">
          Help us calculate your personal UV risk based on your skin's history.
        </Text>

        {/* Question 1 */}
        <Text className="text-slate-900 text-lg font-bold mb-4">
          How often do you get sunburned?
        </Text>

        <View className="flex-row flex-wrap justify-between mb-8">
          {[
            { label: 'Never', icon: 'shield' },
            { label: 'Rarely', icon: 'sun-o' },
            { label: 'Sometimes', icon: 'cloud' },
            { label: 'Often', icon: 'fire' },
          ].map(item => {
            const active = burnFrequency === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setBurnFrequency(item.label)}
                className={`w-[48%] h-28 rounded-2xl mb-4 items-center justify-center ${
                  active ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <FontAwesome name={item.icon} size={26} color={active ? '#fff' : '#64748b'} />
                <Text className={`mt-3 font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>
                  {item.label}
                </Text>

                {active && (
                  <View className="absolute top-3 right-3 bg-white/20 w-6 h-6 rounded-full items-center justify-center">
                    <FontAwesome name="check" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Question 2 */}
        <Text className="text-slate-900 text-lg font-bold mb-4">
          When you tan, how does your skin respond?
        </Text>

        {['No Tan', 'Slight Tan', 'Moderate Tan', 'Easy Tan'].map(item => {
          const active = tanResponse === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setTanResponse(item)}
              className={`flex-row items-center px-5 py-4 rounded-full mb-3 ${
                active ? 'border-2 border-orange-500 bg-gray-50' : 'bg-gray-100'
              }`}
            >
              <Text className="text-slate-900 font-semibold flex-1">{item}</Text>

              <View
                className={`w-5 h-5 rounded-full border-2 ${
                  active ? 'border-orange-500 bg-orange-500' : 'border-gray-500'
                } items-center justify-center`}
              >
                {active && <FontAwesome name="check" size={10} color="#000" />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Question 3 */}
        <Text className="text-slate-900 text-lg font-bold mt-8 mb-4">
          When was your last severe sunburn?
        </Text>

        <TouchableOpacity className="flex-row items-center bg-gray-100 rounded-full px-5 py-4 mb-10">
          <FontAwesome name="calendar" size={16} color="#64748b" />
          <Text className="text-slate-900 ml-3 flex-1">1 – 6 months ago</Text>
          <FontAwesome name="chevron-down" size={14} color="#64748b" />
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-primary rounded-full px-8 py-3 flex-row items-center justify-center shadow-lg mb-5"
        >
          <Text className="text-white font-extrabold text-lg mr-3">Save & Continue</Text>
          <FontAwesome name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default SunburnHistoryScreen;
