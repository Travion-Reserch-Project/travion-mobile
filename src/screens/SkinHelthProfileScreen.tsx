import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SkinAnalysisResult'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinAnalysisResult'>;

const SKIN_TYPE_INFO: Record<
  number,
  { name: string; description: string; spf: string; exposure: string }
> = {
  1: {
    name: 'Very Fair',
    description: 'Always burns, never tans. Very high risk of sun damage.',
    spf: '50+',
    exposure: 'Very Low',
  },
  2: {
    name: 'Fair',
    description: 'Burns easily, tans minimally. High risk of sun damage.',
    spf: '50+',
    exposure: 'Low',
  },
  3: {
    name: 'Medium',
    description: 'Burns moderately, tans gradually. Moderate risk of sun damage.',
    spf: '30 – 50+',
    exposure: 'Moderate',
  },
  4: {
    name: 'Olive',
    description: 'Burns minimally, tans well. Lower risk of sun damage.',
    spf: '15 – 30',
    exposure: 'Moderate-High',
  },
  5: {
    name: 'Brown',
    description: 'Rarely burns, tans easily. Low risk of sun damage.',
    spf: '15 – 30',
    exposure: 'High',
  },
  6: {
    name: 'Dark',
    description: 'Never burns, deeply pigmented. Very low risk of sun damage.',
    spf: '15',
    exposure: 'Very High',
  },
};

const SkinHelthProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { imageUri, skinType } = route.params;
  const skinInfo = SKIN_TYPE_INFO[skinType] || SKIN_TYPE_INFO[3];

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-10 pb-4">
        <TouchableOpacity className="mr-4" onPress={() => navigation.navigate('SkinAnalysis')}>
          <FontAwesome name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Health Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Image Result */}
        <View className="items-center mt-8">
          <View className="w-64 h-64 rounded-3xl overflow-hidden bg-orange-100 items-center justify-center">
            <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />

            {/* Confidence Badge */}
            <View className="absolute bottom-4 bg-white px-4 py-2 rounded-full flex-row items-center shadow">
              <FontAwesome name="check-circle" size={14} color="#f97316" />
            </View>
          </View>
        </View>

        {/* Skin Type */}
        <View className="items-center mt-8">
          <Text className="text-4xl font-extrabold text-slate-900">Type {skinType}</Text>
          <Text className="text-lg text-slate-500 mt-1">{skinInfo.name} Skin Tone</Text>
        </View>

        {/* Fitzpatrick Scale */}
        <View className="mt-8 px-6">
          {/* Labels */}
          <View className="flex-row justify-between mb-3 px-1">
            <Text className="text-xs font-semibold text-gray-400">FAIR</Text>
            <Text className="text-xs font-semibold text-gray-400">DEEP</Text>
          </View>

          {/* Scale Bar */}
          <View className="flex-row items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map(item => (
              <View
                key={item}
                className={`h-3 flex-1 mx-1 rounded-full ${
                  item === skinType ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </View>

          {/* Label */}
          <View className="items-center mt-4">
            <View className="bg-primary rounded-full px-5 py-2 flex-row items-center justify-center shadow-lg">
              <Text className="text-white text-xs font-bold tracking-widest">
                FITZPATRICK SCALE
              </Text>
            </View>
          </View>
        </View>

        {/* Sun Sensitivity Card */}
        <View className="px-6 mt-8">
          <View className="bg-gray-100 rounded-3xl p-6">
            <View className="flex-row items-center mb-3">
              <View className="bg-white p-3 rounded-full mr-3">
                <FontAwesome name="sun-o" size={18} color="#f97316" />
              </View>
              <Text className="text-lg font-bold text-slate-900">Sun Sensitivity</Text>
            </View>

            <Text className="text-slate-600 text-sm mb-6">{skinInfo.description}</Text>

            {/* Stats */}
            <View className="flex-row justify-between">
              <View className="flex-1 bg-white rounded-2xl p-4 mr-3">
                <Text className="text-xs text-slate-400 font-semibold mb-1">REC. SPF</Text>
                <Text className="text-lg font-extrabold text-slate-900">{skinInfo.spf}</Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4 ml-3">
                <Text className="text-xs text-slate-400 font-semibold mb-1">MAX EXPOSURE</Text>
                <Text className="text-lg font-extrabold text-slate-900">{skinInfo.exposure}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SkinHelthProfileScreen;
