import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  OnboardingScreen,
  LoginScreen,
  UserProfileSetupScreen,
  ProfileCompletionScreen,
  MainAppScreen,
} from '@screens';
import { UserProfileData } from '@components/forms';
import { useAuthStore } from '@stores';

function AppContent() {
  const { isAuthenticated, isLoading, user, initializeAuth, refreshProfile } = useAuthStore();
  const [currentScreen, setCurrentScreen] = useState<
    'onboarding' | 'login' | 'profileSetup' | 'completion' | 'home'
  >('onboarding');
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    // Initialize auth state on app start
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // If user is authenticated, go to home
    if (isAuthenticated && user) {
      setCurrentScreen('home');
      // Convert user data to UserProfileData format if needed
      setUserProfile({
        name: user.name || 'Anonymous',
        userName: user.name || 'Traveler',
        dob: new Date(),
        gender: '',
        country: '',
        preferredLanguage: 'English',
      });
    }
  }, [isAuthenticated, user]);

  // Show loading while checking auth state
  if (isLoading) {
    return null; // You could show a loading screen here
  }

  const handleFinishOnboarding = () => {
    setCurrentScreen('login');
  };

  const handleLoginSuccess = () => {
    if (isFirstTimeLogin) {
      setCurrentScreen('profileSetup');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleProfileComplete = async (profileData: UserProfileData) => {
    console.log('Profile setup completed:', profileData);
    setUserProfile(profileData);

    // Refresh the user profile to get the updated profileStatus
    try {
      await refreshProfile();
      console.log('Profile refreshed after completion');
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }

    setCurrentScreen('completion');
  };

  const handleGetStarted = () => {
    setIsFirstTimeLogin(false);
    setCurrentScreen('home');
  };

  const renderCurrentScreen = () => {
    if (currentScreen === 'profileSetup') {
      return <UserProfileSetupScreen onComplete={handleProfileComplete} />;
    }

    if (currentScreen === 'completion') {
      // Check if user has complete profile status or check directly from userProfile state
      const isComplete = user?.profileStatus === 'Complete' || userProfile !== null;
      console.log('App.tsx - user:', user);
      console.log('App.tsx - profileStatus:', user?.profileStatus);
      console.log('App.tsx - userProfile exists:', userProfile !== null);
      console.log('App.tsx - isComplete:', isComplete);

      return (
        <ProfileCompletionScreen onGetStarted={handleGetStarted} isProfileComplete={isComplete} />
      );
    }

    if (currentScreen === 'login') {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (currentScreen === 'home') {
      return (
        <MainAppScreen
          userName={userProfile?.userName || user?.name || 'Traveler'}
          userEmail={user?.email || 'travel@example.com'}
        />
      );
    }

    return <OnboardingScreen onFinish={handleFinishOnboarding} />;
  };

  return <>{renderCurrentScreen()}</>;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
