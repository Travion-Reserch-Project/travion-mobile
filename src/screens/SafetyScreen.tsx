import React, { useState } from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafetyAlerts, type SafetyAlert } from '@components/explore/SafetyAlerts';
import type { MainStackParamList } from '../navigation/MainNavigator';

export const SafetyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(null);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);

  return (
    <View className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Safety</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          Live safety alerts and nearby risks
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-6">
          <SafetyAlerts
            onViewFullMap={() =>
              navigation.navigate('MapScreen', {
                alerts,
                selectedAlert: selectedAlert || undefined,
              })
            }
            onReportIncident={() => navigation.navigate('ReportIncidentScreen')}
            onPoliceHelp={() => navigation.navigate('PoliceHelpScreen')}
            onViewAlerts={() => navigation.navigate('AlertsScreen')}
            onAlertSelected={alert => setSelectedAlert(alert)}
            onAlertsLoaded={loadedAlerts => setAlerts(loadedAlerts)}
          />
        </View>
      </ScrollView>
    </View>
  );
};
