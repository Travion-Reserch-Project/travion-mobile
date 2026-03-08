import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeScreen, SafetyScreen, TransportScreen } from '@screens';
import { BottomTabBar, TabKey } from '@components/navigation/BottomTabBar';
import { TravionBotButton } from '@components/common/TravionBotButton';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import TourGuideScreen from '@screens/agent/TourGuideScreen';
import { WeatherScreen } from '@screens/weather/WeatherScreen';
import SunProtectionScreen from '@screens/weather/SunProtectionScreen';
import SafetyAdvisorScreen from '@screens/weather/SafetyAdvisorScreen';
// import RiskAnalyticsScreen from '../RiskAnalyticsScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'MainApp'>;

export const MainAppScreen: React.FC<Props> = ({ route, navigation }) => {
  const userName = route.params?.userName;
  const userEmail = route.params?.userEmail;
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [weatherSubScreen, setWeatherSubScreen] = useState<'main' | 'sunProtection' | 'safetyAdvisor'>('main');
  const [safetyAdvisorParams, setSafetyAdvisorParams] = useState<{ uvIndex?: number; riskLevel?: string }>({});

  const handleTabPress = useCallback((tab: TabKey) => {
    if (tab !== 'weather') {
      setWeatherSubScreen('main');
    }
    setActiveTab(tab);
  }, []);

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
        return <TourGuideScreen navigation={navigation} />;
      case 'safety':
        return <SafetyScreen />;
      case 'weather':
        if (weatherSubScreen === 'safetyAdvisor') {
          return (
            <SafetyAdvisorScreen
              onBack={() => setWeatherSubScreen('sunProtection')}
              uvIndexProp={safetyAdvisorParams.uvIndex}
              riskLevelProp={safetyAdvisorParams.riskLevel}
            />
          );
        }
        if (weatherSubScreen === 'sunProtection') {
          return (
            <SunProtectionScreen
              onBack={() => setWeatherSubScreen('main')}
              onNavigateToSafetyAdvisor={(params) => {
                setSafetyAdvisorParams(params);
                setWeatherSubScreen('safetyAdvisor');
              }}
            />
          );
        }
        return (
          <WeatherScreen
            onNavigateToSunProtection={() => setWeatherSubScreen('sunProtection')}
          />
        );
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
        <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
      <TravionBotButton />
    </View>
  );
};
