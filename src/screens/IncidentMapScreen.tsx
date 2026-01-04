import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainNavigator';

const INITIAL_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SAMPLE_REPORTS = [
  {
    id: '1',
    title: 'Road block',
    snippet: 'Police checkpoint; one lane open',
    latitude: 6.9301,
    longitude: 79.8612,
    level: 'medium',
  },
  {
    id: '2',
    title: 'Debris on road',
    snippet: 'Tree branches; slow traffic',
    latitude: 6.9201,
    longitude: 79.8705,
    level: 'low',
  },
  {
    id: '3',
    title: 'Accident cleared',
    snippet: 'Expect residual delays',
    latitude: 6.935,
    longitude: 79.853,
    level: 'high',
  },
];

const badgeColor = (level: string) => {
  switch (level) {
    case 'high':
      return '#DC2626';
    case 'medium':
      return '#F97316';
    default:
      return '#16A34A';
  }
};

export const IncidentMapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [region] = useState(INITIAL_REGION);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-3">
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-gilroy-bold text-gray-900">Reported incidents map</Text>
      </View>

      <View className="flex-1">
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsCompass
        >
          {SAMPLE_REPORTS.map(report => (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              title={report.title}
              description={report.snippet}
            >
              <View className="items-center">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: badgeColor(report.level) }}
                >
                  <Text className="text-xs font-gilroy-bold text-white">{report.level}</Text>
                </View>
                <FontAwesome5 name="map-marker-alt" size={26} color={badgeColor(report.level)} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
    </View>
  );
};
