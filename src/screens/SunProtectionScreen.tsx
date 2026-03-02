import { MainStackParamList } from '@navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import { weatherService } from '../services/api/WeatherService';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const SunProtectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [locationName, setLocationName] = useState('Detecting Location...');

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);

        // Request Location Permission
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }

        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;

            // Get Location Name
            try {
              const results = await RNGeocoding.from(latitude, longitude);
              if (results && results?.results && results?.results.length > 0) {
                const addressParts = results.results[0].formatted_address.split(',');
                setLocationName(
                  addressParts.length > 2
                    ? `${addressParts[addressParts.length - 3]}, ${
                        addressParts[addressParts.length - 1]
                      }`
                    : results.results[0].formatted_address,
                );
              }
            } catch (err) {
              console.error('Geocoding error:', err);
              setLocationName('Current Location');
            }

            // Fetch prediction
            try {
              const response = await weatherService.predictSunRisk(latitude, longitude);
              if (response.success) {
                setPredictionData(response.data);
              }
            } catch (err) {
              console.error('Prediction fetch error:', err);
            } finally {
              setLoading(false);
            }
          },
          error => {
            console.error('Geolocation error:', error);
            // Fallback to default coordinates (Mirissa)
            fetchPredictionWithDefaults();
          },
        );
      } catch (err) {
        console.error('Setup error:', err);
        setLoading(false);
      }
    };

    const fetchPredictionWithDefaults = async () => {
      try {
        const response = await weatherService.predictSunRisk(5.9482, 80.4716);
        if (response.success) {
          setPredictionData(response.data);
          setLocationName('Mirissa, Sri Lanka (Default)');
        }
      } catch (err) {
        console.error('Fallback prediction error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="mt-4 text-gray-500 font-semibold">Analyzing Sun Exposure Risk...</Text>
      </SafeAreaView>
    );
  }

  const riskLevel = predictionData?.prediction?.prediction?.risk_level || 'Low';
  const uvIndex = predictionData?.weather?.uvIndex || 0;
  const temperature = predictionData?.weather?.temperatureC || '--';
  const skinType = predictionData?.healthProfileSummary?.skinType || 'II';
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map risk level to color and gauge rotation
  const getRiskInfo = (risk: string) => {
    const r = risk.toLowerCase();
    if (r === 'low')
      return {
        color: '#22c55e',
        rotation: '-60deg',
        label: 'LOW RISK',
        bg: 'bg-green-100',
        text: 'text-green-600',
        message: 'UV levels are safe. Enjoy your day outdoors.',
      };
    if (r === 'moderate')
      return {
        color: '#eab308',
        rotation: '0deg',
        label: 'MODERATE RISK',
        bg: 'bg-yellow-100',
        text: 'text-yellow-600',
        message: 'Seek shade during midday when the sun is strongest.',
      };
    if (r === 'high')
      return {
        color: '#f97316',
        rotation: '60deg',
        label: 'HIGH RISK',
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        message: 'UV levels are dangerous. Sun protection required.',
      };
    if (r === 'very high')
      return {
        color: '#ef4444',
        rotation: '120deg',
        label: 'VERY HIGH RISK',
        bg: 'bg-red-100',
        text: 'text-red-600',
        message: 'Extra protection needed. Avoid sun between 11am and 4pm.',
      };
    return {
      color: '#22c55e',
      rotation: '-60deg',
      label: 'LOW RISK',
      bg: 'bg-green-100',
      text: 'text-green-600',
      message: 'UV levels are safe.',
    };
  };

  const riskInfo = getRiskInfo(riskLevel);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ================= LOCATION ================= */}
        <View className="flex-row items-center justify-between px-6 pt-6">
          <View className="flex-row items-center">
            <View className="bg-orange-100 p-3 rounded-full mr-3">
              <FontAwesome name="map-marker" size={18} color="#f97316" />
            </View>
            <View>
              <Text className="text-xs text-gray-400 uppercase">Current Location</Text>
              <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          </View>
          <TouchableOpacity>
            <Text className="text-orange-500 font-semibold">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ================= RISK METER ================= */}
        <View className="items-center mt-10 mb-6">
          <View className="w-56 h-32 relative overflow-hidden">
            {/* Gauge background arc */}
            <View
              className="absolute w-56 h-56 rounded-full"
              style={{
                borderWidth: 14,
                borderColor: '#e5e7eb',
                borderBottomColor: 'transparent',
                top: 0,
                left: 0,
              }}
            />
            {/* Gauge progress arc */}
            <View
              className="absolute w-56 h-56 rounded-full"
              style={{
                borderWidth: 14,
                borderColor: 'transparent',
                borderTopColor: riskInfo.color,
                borderRightColor:
                  riskLevel.toLowerCase() !== 'low' ? riskInfo.color : 'transparent',
                top: 0,
                left: 0,
                transform: [{ rotate: riskLevel.toLowerCase() === 'very high' ? '45deg' : '0deg' }],
              }}
            />
            {/* Needle indicator */}
            <View
              className="absolute"
              style={{
                width: 3,
                height: 80,
                backgroundColor: riskInfo.color,
                left: '50%',
                bottom: 0,
                marginLeft: -1.5,
                transformOrigin: 'bottom',
                transform: [{ rotate: riskInfo.rotation }],
                borderRadius: 2,
              }}
            />
            {/* Needle center circle */}
            <View
              className="absolute bg-white rounded-full"
              style={{
                width: 16,
                height: 16,
                left: '50%',
                bottom: -2,
                marginLeft: -8,
                borderWidth: 3,
                borderColor: riskInfo.color,
              }}
            />
            {/* Icon in center */}
            <View
              className={`absolute ${riskInfo.bg} p-3 rounded-full`}
              style={{
                left: '50%',
                top: 35,
                marginLeft: -22,
              }}
            >
              <FontAwesome
                name={riskLevel.toLowerCase() === 'low' ? 'sun-o' : 'exclamation-triangle'}
                size={20}
                color={riskInfo.color}
              />
            </View>
          </View>
        </View>

        {/* ================= TITLE ================= */}
        <View className="items-center px-6 mb-10">
          <View className={`${riskInfo.bg} px-4 py-1 rounded-full mb-3`}>
            <Text className={`${riskInfo.text} text-xs font-semibold uppercase`}>
              {riskInfo.label}
            </Text>
          </View>

          <Text className="text-3xl font-extrabold text-center mb-3">
            {riskLevel.toLowerCase() === 'low' ? 'Low Risk Day' : 'Sun Protection\nRequired'}
          </Text>

          <Text className="text-gray-500 text-center text-base">{riskInfo.message}</Text>
        </View>

        {/* ================= FACTORS ================= */}
        <View className="px-6 mb-6">
          <View className="flex-row justify-between mb-4">
            <Text className="text-lg font-bold">Contributing Factors</Text>
            <Text className="text-xs text-gray-400">Updated {lastUpdated}</Text>
          </View>

          {/* Skin type */}
          <View className="bg-gray-50 rounded-2xl p-5 flex-row items-center mb-4">
            <View className="bg-orange-100 p-3 rounded-full mr-4">
              <FontAwesome name="user" size={16} color="#f97316" />
            </View>
            <View>
              <Text className="text-sm text-gray-400">Your Skin Type</Text>
              <Text className="font-bold text-gray-900">Type {skinType}</Text>
            </View>
          </View>

          {/* UV + Temperature */}
          <View className="flex-row justify-between">
            <View className="bg-gray-50 rounded-2xl p-5 w-[48%]">
              <View className="flex-row items-center mb-2">
                <FontAwesome name="sun-o" size={18} color="#f97316" />
                <View className={`ml-2 ${riskInfo.bg} px-2 py-0.5 rounded-full`}>
                  <Text className={`text-xs ${riskInfo.text} font-semibold capitalize`}>
                    {riskLevel}
                  </Text>
                </View>
              </View>
              <Text className="text-3xl font-extrabold">{uvIndex}</Text>
              <Text className="text-gray-400 text-sm">UV Index</Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-5 w-[48%]">
              <View className="flex-row items-center mb-2">
                <FontAwesome name="thermometer-half" size={18} color="#ef4444" />
                <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-blue-600 font-semibold">Current</Text>
                </View>
              </View>
              <Text className="text-xl font-extrabold">{temperature}°C</Text>
              <Text className="text-gray-400 text-sm">Temperature</Text>
            </View>
          </View>
        </View>

        {/* ================= ACTIONS ================= */}
        <View className="px-6">
          <Text className="text-lg font-bold mb-4">Recommended Actions</Text>

          {[
            riskLevel.toLowerCase() === 'low'
              ? 'No special precautions needed'
              : 'Apply broad-spectrum sunscreen SPF 50+',
            riskLevel.toLowerCase() === 'moderate' ||
            riskLevel.toLowerCase() === 'high' ||
            riskLevel.toLowerCase() === 'very high'
              ? 'Wear protective clothing & sunglasses'
              : 'Stay hydrated throughout the day',
            'Seek shade if staying outdoors for long',
          ].map((item, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View
                className={`bg-${
                  riskLevel.toLowerCase() === 'low' ? 'green' : 'orange'
                }-500 p-2 rounded-full mr-4`}
              >
                <FontAwesome name="check" size={12} color="#fff" />
              </View>
              <Text className="text-gray-700 text-base">{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ================= CTA (FIXED) ================= */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-3 border-t border-gray-100">
        <TouchableOpacity
          className="bg-primary py-4 rounded-2xl flex-row justify-center items-center"
          onPress={() => navigation.navigate('SafetyAdvisor')}
        >
          <Text className="text-white font-bold text-lg mr-2">Get More Details</Text>
          <FontAwesome name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SunProtectionScreen;
