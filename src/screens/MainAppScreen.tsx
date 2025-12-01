import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen, ExploreScreen, AlertsScreen, ChatbotScreen, ProfileScreen } from '@screens';
import { BottomTabBar, TabKey } from '@components/navigation/BottomTabBar';

interface MainAppScreenProps {
  userName?: string;
  userEmail?: string;
}

export const MainAppScreen: React.FC<MainAppScreenProps> = ({ userName, userEmail }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen userName={userName} />;
      case 'chatbot':
        return <ChatbotScreen />;
      case 'explore':
        return <ExploreScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'profile':
        return <ProfileScreen userName={userName} userEmail={userEmail} />;
      default:
        return <HomeScreen userName={userName} />;
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
