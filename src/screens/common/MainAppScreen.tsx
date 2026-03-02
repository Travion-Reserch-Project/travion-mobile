import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeScreen, SafetyScreen, TransportScreen } from '@screens';
import { BottomTabBar, TabKey } from '@components/navigation/BottomTabBar';
import { TravionBotButton } from '@components/common/TravionBotButton';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import TourGuideScreen from '@screens/agent/TourGuideScreen';
import { WeatherScreen } from '@screens/weather/WeatherScreen';
// import RiskAnalyticsScreen from '../RiskAnalyticsScreen';

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
        return <TransportScreen navigation={navigation} />;
      case 'guide':
        return <TourGuideScreen />;
      case 'safety':
        return <SafetyScreen />;
      case 'weather':
        return <WeatherScreen />;
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
    <View className="flex-1 bg-white">
      <View className="flex-1">
        {renderScreen()}
        <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
      <TravionBotButton />
    </View>
  );
};
