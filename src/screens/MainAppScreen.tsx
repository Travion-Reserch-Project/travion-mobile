import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeScreen, SafetyScreen, TransportScreen, GuideScreen } from '@screens';
import { BottomTabBar, TabKey } from '@components/navigation/BottomTabBar';
import type { MainStackParamList } from '../navigation/MainNavigator';
import RiskAnalyticsScreen from './RiskAnalyticsScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'MainApp'>;

export const MainAppScreen: React.FC<Props> = ({ route, navigation }) => {
  const userName = route.params?.userName;
  const userEmail = route.params?.userEmail;
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            userName={userName}
            onAlertsPress={() => navigation.navigate('AlertsScreen')}
            onProfilePress={() => navigation.navigate('ProfileScreen', { userName, userEmail })}
          />
        );
      case 'transport':
        return <TransportScreen />;
      case 'guide':
        return <GuideScreen />;
      case 'safety':
        return <SafetyScreen />;
      case 'weather':
        return <RiskAnalyticsScreen />;
      default:
        return (
          <HomeScreen
            userName={userName}
            onAlertsPress={() => navigation.navigate('AlertsScreen')}
            onProfilePress={() => navigation.navigate('ProfileScreen', { userName, userEmail })}
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {renderScreen()}
        <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
};
