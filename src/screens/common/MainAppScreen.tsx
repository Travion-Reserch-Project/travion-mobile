import React, { useCallback, useEffect, useState } from 'react';
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
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(new Set(['home']));
  const [weatherSubScreen, setWeatherSubScreen] = useState<'main' | 'sunProtection' | 'safetyAdvisor'>('main');
  const [safetyAdvisorParams, setSafetyAdvisorParams] = useState<{ uvIndex?: number; riskLevel?: string }>({});

  const handleTabPress = useCallback((tab: TabKey) => {
    if (tab !== 'weather') {
      setWeatherSubScreen('main');
    }
    setActiveTab(tab);
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  // Dynamically update the native screen container background
  // so the SafeAreaView padding zone matches the active tab's color
  useEffect(() => {
    navigation.setOptions({
      contentStyle: {
        flex: 1,
        backgroundColor: activeTab === 'guide' ? '#F5840E' : '#FFFFFF',
      },
    });
  }, [activeTab, navigation]);

  const renderWeatherContent = () => {
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: activeTab === 'guide' ? '#F5840E' : '#FFFFFF' }}>
      <View className="flex-1">
        {/* Home — always mounted */}
        <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none' }}>
          <HomeScreen
            userName={userName}
            onAlertsPress={() => navigation.navigate('AlertsScreen')}
            onProfilePress={() => navigation.navigate('ProfileScreen', { userName, userEmail })}
          />
        </View>

        {/* Transport — lazy mount, kept alive after first visit */}
        {mountedTabs.has('transport') && (
          <View style={{ flex: 1, display: activeTab === 'transport' ? 'flex' : 'none' }}>
            <TransportScreen navigation={navigation} />
          </View>
        )}

        {/* Guide — lazy mount, kept alive to prevent reload on every tab switch */}
        {mountedTabs.has('guide') && (
          <View style={{ flex: 1, display: activeTab === 'guide' ? 'flex' : 'none' }}>
            <TourGuideScreen
              navigation={navigation}
              onChatbotPress={() => navigation.navigate('TourGuideChat')}
            />
          </View>
        )}

        {/* Safety — lazy mount, kept alive after first visit */}
        {mountedTabs.has('safety') && (
          <View style={{ flex: 1, display: activeTab === 'safety' ? 'flex' : 'none' }}>
            <SafetyScreen />
          </View>
        )}

        {/* Weather — lazy mount, kept alive after first visit */}
        {mountedTabs.has('weather') && (
          <View style={{ flex: 1, display: activeTab === 'weather' ? 'flex' : 'none' }}>
            {renderWeatherContent()}
          </View>
        )}

        <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
      <TravionBotButton />
    </View>
  );
};
