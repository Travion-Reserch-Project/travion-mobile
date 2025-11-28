import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Button } from '@components/common';
import { colors, spacing } from '@theme';
import { logger } from '@utils';

export const HomeScreen: React.FC = () => {
  const handlePress = () => {
    logger.info('Button pressed!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Travion</Text>
          <Text style={styles.subtitle}>Your journey starts here</Text>
        </View>

        <View style={styles.content}>
          <Button title="Get Started" onPress={handlePress} fullWidth />
          <View style={styles.spacer} />
          <Button title="Learn More" variant="outline" onPress={handlePress} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  spacer: {
    height: spacing.md,
  },
});
