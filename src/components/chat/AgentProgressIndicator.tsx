/**
 * AgentProgressIndicator — Live "what the agent is doing right now" bubble.
 * Driven by SSE step events from the AI engine. Each known node maps to a
 * friendly label so the user sees: Crowd → Weather → Routing → Photography
 * → Cultural → Plan, with a checkmark and duration once each step finishes.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import type { StepResult } from '../../services/api/TourPlanService';

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  aiBubble: '#FFFFFF',
  dark: '#1C1917',
  textMid: '#44403C',
  textSoft: '#78716C',
  border: '#E7E0D8',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  pendingBg: '#F5F0EB',
};

// Maps LangGraph node names to user-facing labels and icons.
const NODE_PRESENTATION: Record<
  string,
  { label: string; icon: string }
> = {
  router: { label: 'Understanding your request', icon: 'compass-outline' },
  retrieve: { label: 'Searching knowledge base', icon: 'library-outline' },
  retrieval: { label: 'Searching knowledge base', icon: 'library-outline' },
  grader: { label: 'Grading sources', icon: 'options-outline' },
  web_search: { label: 'Web search for fresh info', icon: 'globe-outline' },
  shadow_monitor: { label: 'Constraint check (Poya, weather, safety)', icon: 'shield-checkmark-outline' },
  crowdcast: { label: 'Predicting crowd levels', icon: 'people-outline' },
  weather: { label: 'Checking weather', icon: 'partly-sunny-outline' },
  golden_hour: { label: 'Calculating photo windows', icon: 'sunny-outline' },
  event_sentinel: { label: 'Cultural & holiday awareness', icon: 'calendar-outline' },
  mcp_routing: { label: 'Optimizing route (Google Maps MCP)', icon: 'map-outline' },
  mcp_google_maps: { label: 'Optimizing route (Google Maps MCP)', icon: 'map-outline' },
  vision_retrieval: { label: 'Matching your photo (CLIP)', icon: 'camera-outline' },
  vision_retrieve: { label: 'Matching your photo (CLIP)', icon: 'camera-outline' },
  clarification: { label: 'Checking for missing details', icon: 'help-circle-outline' },
  tour_plan_generate: { label: 'Assembling your tour plan', icon: 'sparkles-outline' },
  tour_plan_generator: { label: 'Assembling your tour plan', icon: 'sparkles-outline' },
  hotel_search: { label: 'Searching hotels & restaurants', icon: 'restaurant-outline' },
  advanced_search: { label: 'Searching for venues', icon: 'search-outline' },
  selection_handler: { label: 'Re-optimising itinerary', icon: 'refresh-outline' },
  restaurant_selection_handler: { label: 'Restaurant picks', icon: 'fast-food-outline' },
  generate: { label: 'Drafting response', icon: 'chatbubble-ellipses-outline' },
  verify: { label: 'Verifying response', icon: 'checkmark-done-outline' },
  verifier: { label: 'Verifying response', icon: 'checkmark-done-outline' },
};

const friendlyForNode = (node: string) => {
  return (
    NODE_PRESENTATION[node] || {
      label: node.replace(/_/g, ' '),
      icon: 'ellipsis-horizontal-circle-outline',
    }
  );
};

interface Props {
  steps: StepResult[]; // accumulated steps so far (in arrival order)
  active?: boolean; // true when the stream is still running
  title?: string;
}

const SpinnerDot: React.FC = () => {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Ionicons name="sync" size={14} color={C.primary} />
    </Animated.View>
  );
};

export const AgentProgressIndicator: React.FC<Props> = ({
  steps,
  active = false,
  title = 'Travion is planning your trip',
}) => {
  // Deduplicate by node — keep the latest step for each node so a re-run
  // (e.g. tour_plan_generator after restaurant selection) overwrites the entry.
  const ordered: StepResult[] = [];
  const seen = new Map<string, number>();
  for (const step of steps) {
    if (!step?.node) continue;
    if (seen.has(step.node)) {
      ordered[seen.get(step.node)!] = step;
    } else {
      seen.set(step.node, ordered.length);
      ordered.push(step);
    }
  }

  return (
    <View style={s.row}>
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={s.avatar}
      >
        <Text style={s.avatarLetter}>T</Text>
      </LinearGradient>
      <View style={s.bubble}>
        <View style={s.headerRow}>
          {active ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Ionicons name="checkmark-done-circle" size={16} color={C.success} />
          )}
          <Text style={s.title}>{active ? title : 'Plan ready'}</Text>
        </View>

        <View style={s.list}>
          {ordered.length === 0 ? (
            <View style={s.emptyRow}>
              <SpinnerDot />
              <Text style={s.emptyText}>Warming up the agent…</Text>
            </View>
          ) : (
            ordered.map((step, i) => {
              const meta = friendlyForNode(step.node);
              const isError =
                (step.status || '').toLowerCase().includes('error') ||
                step.status === 'fail';
              const isWaiting =
                (step.status || '').toLowerCase() === 'needs_input';
              return (
                <View key={`${step.node}-${i}`} style={s.stepRow}>
                  <View
                    style={[
                      s.stepIcon,
                      isError && { backgroundColor: '#FEF2F2' },
                      isWaiting && { backgroundColor: '#FFFBEB' },
                    ]}
                  >
                    {isError ? (
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                    ) : isWaiting ? (
                      <Ionicons name="help-circle" size={14} color={C.warning} />
                    ) : (
                      <Ionicons
                        name={meta.icon as any}
                        size={14}
                        color={C.success}
                      />
                    )}
                  </View>
                  <View style={s.stepBody}>
                    <Text style={s.stepLabel}>{meta.label}</Text>
                    {step.summary ? (
                      <Text style={s.stepSummary} numberOfLines={2}>
                        {step.summary}
                      </Text>
                    ) : null}
                  </View>
                  {step.duration_ms ? (
                    <Text style={s.stepDuration}>
                      {Math.round(step.duration_ms)}ms
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {active ? (
          <View style={s.pendingHint}>
            <SpinnerDot />
            <Text style={s.pendingText}>Working on the next step…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    marginTop: 2,
    gap: 7,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
  bubble: {
    flex: 1,
    backgroundColor: C.aiBubble,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.18)',
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    padding: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
  },
  list: { gap: 6 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1 },
  stepLabel: {
    fontSize: 12.5,
    fontFamily: 'Gilroy-SemiBold',
    color: C.dark,
  },
  stepSummary: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    marginTop: 1,
    lineHeight: 14,
  },
  stepDuration: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    marginLeft: 4,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
  },
  pendingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3EAE0',
  },
  pendingText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: C.textSoft,
  },
});

export default AgentProgressIndicator;
