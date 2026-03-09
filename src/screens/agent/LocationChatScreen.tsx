/**
 * LocationChatScreen
 * WhatsApp-style AI-powered chat screen focused on a specific location
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useChatStore } from '@stores';
import type { ChatMessage } from '@types';
import {
  tourPlanService,
  aiService,
  locationService,
  type SelectedLocation,
  type TourPlanResponse,
  type SimpleRecommendationLocation,
  type SelectionCard,
  type WeatherPromptOption,
} from '../../services/api';
import { useInterruptResume } from '../../hooks/useInterruptResume';

const { width } = Dimensions.get('window');
const BOTTOM_PADDING = Platform.OS === 'ios' ? 34 : 16;

// WhatsApp-inspired theme (matches TourPlanChatScreen)
const THEME = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  chatBg: '#ECE5DD',
  userBubble: '#DCF8C6',
  aiBubble: '#FFFFFF',
  inputBg: '#FFFFFF',
  sendBtn: '#075E54',
  tickColor: '#4FC3F7',
  dark: '#1F2937',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
  },
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#FBBF24',
  error: '#EF4444',
};

interface LocationChatScreenProps {
  route: {
    params: {
      locationName: string;
    };
  };
  navigation: any;
}

// Format timestamp like WhatsApp (HH:MM)
const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Date separator component (WhatsApp style)
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorPill}>
      <Text style={styles.dateSeparatorText}>{date}</Text>
    </View>
  </View>
);

// AI response metadata badge — tappable to show source detail
const MetadataBadge: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress?: () => void;
}> = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={onPress ? 0.65 : 1}
    style={[styles.metadataBadge, { backgroundColor: `${color}15` }]}
  >
    <Ionicons name={icon as any} size={11} color={color} />
    <Text style={[styles.metadataBadgeText, { color }]}>{label}</Text>
    {onPress && <Ionicons name="chevron-forward" size={9} color={color} style={{ marginLeft: 1 }} />}
  </TouchableOpacity>
);

// WhatsApp-style message bubble
const MessageBubble: React.FC<{
  message: ChatMessage;
}> = ({ message }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [sourcesVisible, setSourcesVisible] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const markdownStyles = {
    body: {
      fontSize: 14.5,
      fontFamily: 'Gilroy-Regular',
      color: THEME.dark,
      lineHeight: 21,
    },
    paragraph: { marginTop: 0, marginBottom: 6 },
    strong: { fontFamily: 'Gilroy-Bold', color: THEME.dark },
    heading1: { fontSize: 16, fontFamily: 'Gilroy-Bold', color: THEME.primary, marginBottom: 6 },
    heading2: {
      fontSize: 15,
      fontFamily: 'Gilroy-Bold',
      color: THEME.primaryDark,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 14.5,
      fontFamily: 'Gilroy-Bold',
      color: THEME.dark,
      marginBottom: 3,
    },
    bullet_list_icon: { marginRight: 8, color: THEME.primary },
    bullet_list: { marginBottom: 4 },
    ordered_list: { marginBottom: 4 },
    link: { color: THEME.primary, textDecorationLine: 'underline' as const },
    blockquote: {
      backgroundColor: '#FFF7ED',
      borderLeftColor: THEME.primary,
      borderLeftWidth: 3,
      paddingLeft: 10,
      paddingVertical: 4,
      marginVertical: 4,
    },
  };

  const meta = message.metadata;
  const hasMetadata = !isUser && !!meta && !!(meta.documentsRetrieved || meta.webSearchUsed || meta.reasoningLoops);

  // Show the sources modal whenever the user taps a source/web-search badge
  const canShowSources = !isUser && !!meta && !!(meta.webSearchUsed || meta.documentsRetrieved);

  return (
    <Animated.View
      style={[isUser ? styles.userBubbleRow : styles.aiBubbleRow, { opacity: fadeAnim }]}
    >
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {/* Bubble tail */}
        <View style={isUser ? styles.userBubbleTail : styles.aiBubbleTail} />

        {isUser ? (
          <>
            <Text style={styles.userMessageText}>{message.content}</Text>
            <View style={styles.userBubbleFooter}>
              <Text style={styles.bubbleTimeUser}>{formatTime(message.timestamp)}</Text>
              <Ionicons
                name="checkmark-done"
                size={14}
                color={THEME.tickColor}
                style={{ marginLeft: 4 }}
              />
            </View>
          </>
        ) : (
          <>
            <Markdown style={markdownStyles}>{message.content}</Markdown>

            {/* AI Source & Metadata Footer — small indicator chips */}
            {hasMetadata && (
              <View style={styles.metadataContainer}>
                <View style={styles.metadataDivider} />
                <View style={styles.metadataBadgeRow}>
                  {meta!.documentsRetrieved != null && meta!.documentsRetrieved > 0 ? (
                    <MetadataBadge
                      icon="library-outline"
                      label={`${meta!.documentsRetrieved} sources`}
                      color="#7C3AED"
                      onPress={canShowSources ? () => setSourcesVisible(true) : undefined}
                    />
                  ) : null}
                  {meta!.webSearchUsed === true ? (
                    <MetadataBadge
                      icon="globe-outline"
                      label="Web search"
                      color="#0891B2"
                      onPress={() => setSourcesVisible(true)}
                    />
                  ) : null}
                  {meta!.reasoningLoops != null && meta!.reasoningLoops > 0 ? (
                    <MetadataBadge
                      icon="sparkles-outline"
                      label={meta!.reasoningLoops > 1 ? `${meta!.reasoningLoops}x verified` : 'Verified'}
                      color="#059669"
                    />
                  ) : null}
                </View>
              </View>
            )}

            <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
          </>
        )}
      </View>

      {/* Sources detail modal — shown whenever a source badge is tapped */}
      {canShowSources && (
        <Modal
          visible={sourcesVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSourcesVisible(false)}
        >
          <TouchableOpacity
            style={styles.sourcesModalOverlay}
            activeOpacity={1}
            onPress={() => setSourcesVisible(false)}
          >
            <View style={styles.sourcesModalSheet} onStartShouldSetResponder={() => true}>
              {/* Handle bar */}
              <View style={styles.sourcesModalHandle} />

              <Text style={styles.sourcesModalTitle}>📚 Sources</Text>

              {/* Knowledge Base section */}
              {meta!.kbSources && meta!.kbSources.length > 0 && (
                <View style={styles.sourcesSection}>
                  <View style={styles.sourcesSectionHeader}>
                    <Ionicons name="library-outline" size={13} color="#7C3AED" />
                    <Text style={[styles.sourcesSectionLabel, { color: '#7C3AED' }]}>
                      Knowledge Base
                    </Text>
                  </View>
                  {meta!.kbSources!.map((loc, i) => (
                    <View key={i} style={styles.sourcesKbRow}>
                      <Ionicons name="location-outline" size={12} color={THEME.gray[500]} />
                      <Text style={styles.sourcesKbText}>{loc}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Web / MCP sources */}
              {meta!.webSearchUsed && (
                <View style={styles.sourcesSection}>
                  <View style={styles.sourcesSectionHeader}>
                    <Ionicons name="globe-outline" size={13} color="#0891B2" />
                    <Text style={[styles.sourcesSectionLabel, { color: '#0891B2' }]}>
                      Web Sources
                    </Text>
                  </View>
                  {meta!.sourceUrls && meta!.sourceUrls.length > 0 ? (
                    meta!.sourceUrls!.map((src, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.sourcesLinkRow}
                        onPress={() => Linking.openURL(src.url)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="open-outline" size={12} color="#0891B2" />
                        <Text style={styles.sourcesLinkText} numberOfLines={2}>
                          {src.title}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.sourcesKbRow}>
                      <Ionicons name="information-circle-outline" size={12} color={THEME.gray[500]} />
                      <Text style={styles.sourcesKbText}>
                        Live web search was used to find this information.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.sourcesCloseBtn}
                onPress={() => setSourcesVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.sourcesCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Animated.View>
  );
};

// Typing indicator (WhatsApp style)
const TypingIndicator: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.aiBubbleTail} />
        <View style={styles.typingDotsRow}>
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim, marginHorizontal: 4 }]} />
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
        </View>
      </View>
    </View>
  );
};

// Quick reply chip
const QuickReply: React.FC<{
  text: string;
  icon: string;
  onPress: () => void;
}> = ({ text, icon, onPress }) => (
  <TouchableOpacity style={styles.quickReply} onPress={onPress} activeOpacity={0.7}>
    <FontAwesome5 name={icon} size={11} color={THEME.primary} />
    <Text style={styles.quickReplyText}>{text}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// PLANNING MODE TYPES & CONSTANTS
// ─────────────────────────────────────────────

type PlanningStep =
  | 'idle'
  | 'date-selection'
  | 'location-selection'
  | 'dining-pref'
  | 'budget-selection'
  | 'restaurant-selection'
  | 'hotel-selection'
  | 'generating'
  | 'weather-interrupt'
  | 'hitl-selection'
  | 'complete';

// Patterns that trigger planning mode
const PLAN_TRIGGER_PATTERNS = [
  /plan (my |a |the |your )?(trip|tour|visit|itinerary)/i,
  /(create|make|build|generate|design) (a |an |my )?(tour|trip|plan|itinerary)/i,
  /(suggest|recommend) (a |an |my )?(itinerary|tour plan|day plan)/i,
  /can (you |u )?(help me )?(plan|make a plan)/i,
  /help me (plan|organize|arrange)/i,
  /i (want|would like|need|wanna) (to )?(plan|visit|explore|go on a trip)/i,
  /planning (a |my |the )?(trip|tour|visit)/i,
  /make (me |us )?(an? )?(itinerary|tour plan|travel plan)/i,
];

// LangGraph workflow step labels shown during generation (12 nodes)
const WORKFLOW_STEPS: { id: string; label: string; icon: string }[] = [
  { id: 'router',              label: 'Understanding your request',       icon: 'search-outline' },
  { id: 'retrieval',           label: 'Searching knowledge base',         icon: 'library-outline' },
  { id: 'grader',              label: 'Evaluating context quality',       icon: 'checkmark-done-outline' },
  { id: 'shadow_monitor',      label: 'Checking events & Poya days',      icon: 'calendar-outline' },
  { id: 'crowdcast',           label: 'Predicting crowd levels',          icon: 'people-outline' },
  { id: 'event_sentinel',      label: 'Scanning local events',            icon: 'flag-outline' },
  { id: 'golden_hour',         label: 'Optimising sunrise & sunset times',icon: 'sunny-outline' },
  { id: 'weather_api',         label: 'Fetching live weather forecast',   icon: 'partly-sunny-outline' },
  { id: 'tour_plan_generator', label: 'Building your itinerary',          icon: 'map-outline' },
  { id: 'hotel_search',        label: 'Finding dining & accommodation',   icon: 'bed-outline' },
  { id: 'generator',           label: 'Writing your personalised plan',   icon: 'sparkles-outline' },
  { id: 'verifier',            label: 'Final review & quality check',     icon: 'shield-checkmark-outline' },
];

// ─────────────────────────────────────────────
// PLANNING MODE COMPONENTS
// ─────────────────────────────────────────────

/** Inline date-range selection card shown in the chat */
const PlanDatePickerCard: React.FC<{
  startDate: Date;
  endDate: Date;
  onChangeStart: () => void;
  onChangeEnd: () => void;
  onConfirm: () => void;
}> = ({ startDate, endDate, onChangeStart, onChangeEnd, onConfirm }) => {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
        <View style={styles.aiBubbleTail} />
        <Text style={styles.planCardTitle}>📅 When are you visiting?</Text>
        <Text style={styles.planCardSubtitle}>Select your travel dates to get started.</Text>

        <TouchableOpacity style={styles.dateRow} onPress={onChangeStart} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={THEME.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.dateLabel}>Check-in</Text>
            <Text style={styles.dateValue}>{fmt(startDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateRow} onPress={onChangeEnd} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={THEME.primaryDark} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.dateLabel}>Check-out</Text>
            <Text style={styles.dateValue}>{fmt(endDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} />
        </TouchableOpacity>

        <View style={styles.durationBadge}>
          <Text style={styles.durationBadgeText}>
            {nights === 0
              ? '🌅 Day trip · 1 day'
              : `${nights} ${nights === 1 ? 'night' : 'nights'} · ${nights + 1} days`}
          </Text>
        </View>

        <TouchableOpacity style={styles.planConfirmBtn} onPress={onConfirm} activeOpacity={0.85}>
          <Text style={styles.planConfirmBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Nearby location selection cards shown in the chat */
const NearbyLocationsCard: React.FC<{
  locationName: string;
  locations: SimpleRecommendationLocation[];
  selectedIds: Set<string>;
  onToggle: (name: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
}> = ({ locationName, locations, selectedIds, onToggle, onConfirm, onSkip }) => (
  <View style={styles.aiBubbleRow}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
      <View style={styles.aiBubbleTail} />
      <Text style={styles.planCardTitle}>📍 Add Nearby Attractions?</Text>
      <Text style={styles.planCardSubtitle}>
        These popular spots are close to **{locationName}**. Tap to include them in your plan.
      </Text>

      {locations.map(loc => {
        const selected = selectedIds.has(loc.name);
        return (
          <TouchableOpacity
            key={loc.name}
            style={[styles.locationCard, selected && styles.locationCardSelected]}
            onPress={() => onToggle(loc.name)}
            activeOpacity={0.85}
          >
            <View style={[styles.locationCardCheck, selected && styles.locationCardCheckSelected]}>
              {selected && <Ionicons name="checkmark" size={12} color={THEME.white} />}
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.locationCardName, selected && { color: THEME.primary }]}>
                {loc.name}
              </Text>
              <Text style={styles.locationCardDist}>
                📏 {loc.distance_km.toFixed(1)} km away
              </Text>
            </View>
            {loc.is_outdoor && (
              <View style={styles.locationCardBadge}>
                <Text style={styles.locationCardBadgeText}>🌿 Outdoor</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.planCardBtnRow}>
        <TouchableOpacity style={styles.planSkipBtn} onPress={onSkip} activeOpacity={0.75}>
          <Text style={styles.planSkipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.planConfirmBtn} onPress={onConfirm} activeOpacity={0.85}>
          <Text style={styles.planConfirmBtnText}>
            {selectedIds.size > 0 ? `Add ${selectedIds.size} location${selectedIds.size > 1 ? 's' : ''}` : 'Proceed →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/** Animated LangGraph workflow progress shown while the plan is generating */
const WorkflowProgressCard: React.FC<{
  activeStepIndex: number;
  completedSteps?: string[];
}> = ({ activeStepIndex, completedSteps = [] }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
        <View style={styles.aiBubbleTail} />
        <Text style={styles.planCardTitle}>🤖 Building your tour plan…</Text>

        <View style={styles.workflowStepsList}>
          {WORKFLOW_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(step.id) || i < activeStepIndex;
            const isActive = i === activeStepIndex;
            const isPending = i > activeStepIndex && !isDone;

            return (
              <View key={step.id} style={styles.workflowStep}>
                {/* Line connector */}
                {i < WORKFLOW_STEPS.length - 1 && (
                  <View style={[styles.workflowLine, isDone && styles.workflowLineDone]} />
                )}

                {/* Step icon */}
                <Animated.View
                  style={[
                    styles.workflowDot,
                    isDone && styles.workflowDotDone,
                    isActive && { opacity: pulseAnim },
                    isActive && styles.workflowDotActive,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={10} color={THEME.white} />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={9}
                      color={isActive ? THEME.white : THEME.gray[400]}
                    />
                  )}
                </Animated.View>

                {/* Step label */}
                <Text
                  style={[
                    styles.workflowLabel,
                    isDone && styles.workflowLabelDone,
                    isActive && styles.workflowLabelActive,
                    isPending && styles.workflowLabelPending,
                  ]}
                >
                  {step.label}
                  {isActive && '…'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

/** Renders the final generated tour plan inside a chat bubble */
const TourPlanResultCard: React.FC<{
  plan: TourPlanResponse;
  locationName: string;
  onViewFullPlan?: () => void;
}> = ({ plan, locationName, onViewFullPlan }) => {
  const markdownStyles = {
    body: { fontSize: 14, fontFamily: 'Gilroy-Regular', color: THEME.dark, lineHeight: 20 },
    strong: { fontFamily: 'Gilroy-Bold', color: THEME.dark },
    bullet_list_icon: { marginRight: 6, color: THEME.primary },
  };

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
        <View style={styles.aiBubbleTail} />

        {/* Plan header */}
        <View style={styles.planResultHeader}>
          <Text style={styles.planResultTitle}>🗺️ Your Tour Plan</Text>
          {plan.metadata && (
            <View style={styles.planResultMeta}>
              <Text style={styles.planResultMetaText}>
                📍 {plan.metadata.total_locations} locations · {plan.metadata.total_days} day{plan.metadata.total_days !== 1 ? 's' : ''}
              </Text>
              {plan.metadata.golden_hour_optimized && (
                <Text style={styles.planResultMetaText}>🌅 Golden hour optimised</Text>
              )}
            </View>
          )}
        </View>

        {/* Main response text */}
        {plan.response ? (
          <Markdown style={markdownStyles}>{plan.response}</Markdown>
        ) : null}

        {/* Itinerary stops (quick preview) */}
        {plan.itinerary && plan.itinerary.length > 0 && (
          <View style={styles.itineraryPreview}>
            {plan.itinerary.slice(0, 5).map((slot, i) => (
              <View key={i} style={styles.itinerarySlot}>
                <Text style={styles.itineraryTime}>⏰ {slot.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itineraryLocation}>
                    {slot.icon ? `${slot.icon} ` : '📍 '}{slot.location}
                  </Text>
                  {slot.notes ? (
                    <Text style={styles.itineraryNote} numberOfLines={1}>💡 {slot.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
            {plan.itinerary.length > 5 && (
              <Text style={styles.itineraryMore}>
                + {plan.itinerary.length - 5} more stops…
              </Text>
            )}
          </View>
        )}

        {/* Tips and warnings */}
        {plan.tips && plan.tips.length > 0 && (
          <View style={styles.planTips}>
            {plan.tips.slice(0, 2).map((tip, i) => (
              <Text key={i} style={styles.planTipText}>💡 {tip}</Text>
            ))}
          </View>
        )}

        {/* Workflow steps completed */}
        {plan.stepResults && plan.stepResults.length > 0 && (
          <View style={styles.planStepsRow}>
            {plan.stepResults.map((s, i) => (
              <View key={i} style={[styles.planStepChip, s.status === 'success' ? styles.planStepChipOk : styles.planStepChipWarn]}>
                <Ionicons
                  name={s.status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={10}
                  color={s.status === 'success' ? '#059669' : '#D97706'}
                />
                <Text style={[styles.planStepChipText, { color: s.status === 'success' ? '#059669' : '#D97706' }]}>
                  {s.node}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.planResultHint}>
          💬 Ask me to refine or adjust anything about this plan!
        </Text>
      </View>
    </View>
  );
};

/** Dining & accommodation preference selection */
const PlanDiningPrefCard: React.FC<{
  onSelect: (pref: 'dining' | 'accommodation' | 'both' | 'skip') => void;
}> = ({ onSelect }) => (
  <View style={styles.aiBubbleRow}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
      <View style={styles.aiBubbleTail} />
      <Text style={styles.planCardTitle}>🍽️ Dining & Accommodation?</Text>
      <Text style={styles.planCardSubtitle}>
        Shall I include restaurant and/or accommodation suggestions in your plan?
      </Text>
      {(
        [
          { id: 'dining',         icon: 'restaurant-outline',    label: 'Restaurants only',      sub: 'Local eateries & cuisine spots' },
          { id: 'accommodation',  icon: 'bed-outline',           label: 'Accommodation only',    sub: 'Hotels, resorts & guesthouses' },
          { id: 'both',           icon: 'apps-outline',          label: 'Both dining & stays',   sub: 'Full dining & hotel recommendations' },
          { id: 'skip',           icon: 'close-circle-outline',  label: 'Skip for now',          sub: 'Just the itinerary, no suggestions' },
        ] as { id: 'dining' | 'accommodation' | 'both' | 'skip'; icon: string; label: string; sub: string }[]
      ).map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={styles.prefOptionRow}
          onPress={() => onSelect(opt.id)}
          activeOpacity={0.8}
        >
          <View style={styles.prefOptionIcon}>
            <Ionicons name={opt.icon as any} size={18} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefOptionLabel}>{opt.label}</Text>
            <Text style={styles.prefOptionSub}>{opt.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

/** Budget level selection */
const PlanBudgetCard: React.FC<{
  onSelect: (budget: 'budget' | 'mid-range' | 'luxury') => void;
}> = ({ onSelect }) => (
  <View style={styles.aiBubbleRow}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
      <View style={styles.aiBubbleTail} />
      <Text style={styles.planCardTitle}>💰 What's your budget?</Text>
      <Text style={styles.planCardSubtitle}>
        This helps me find the right restaurants and stays for you.
      </Text>
      {(
        [
          { id: 'budget',    emoji: '₹',    label: 'Budget-friendly',  sub: 'Local gems & guesthouses',       color: '#059669' },
          { id: 'mid-range', emoji: '₹₹',   label: 'Mid-range',        sub: 'Comfortable & quality picks',    color: '#0891B2' },
          { id: 'luxury',    emoji: '₹₹₹',  label: 'Luxury',           sub: 'Premium resorts & fine dining',  color: '#7C3AED' },
        ] as { id: 'budget' | 'mid-range' | 'luxury'; emoji: string; label: string; sub: string; color: string }[]
      ).map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={[styles.budgetCard, { borderColor: `${opt.color}40` }]}
          onPress={() => onSelect(opt.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.budgetEmoji, { color: opt.color }]}>{opt.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetLabel}>{opt.label}</Text>
            <Text style={styles.budgetSub}>{opt.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

/** Weather interrupt card — shown when backend flags bad weather */
const PlanWeatherInterruptCard: React.FC<{
  message: string | null;
  options: WeatherPromptOption[];
  onSelect: (choice: 'switch_indoor' | 'reschedule' | 'keep') => void;
  isLoading: boolean;
}> = ({ message, options, onSelect, isLoading }) => (
  <View style={styles.aiBubbleRow}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
      <View style={styles.aiBubbleTail} />
      <Text style={styles.planCardTitle}>🌧️ Weather Alert</Text>
      {message ? (
        <Text style={styles.planCardSubtitle}>{message}</Text>
      ) : (
        <Text style={styles.planCardSubtitle}>
          Unfavourable weather detected for your travel dates. How would you like to proceed?
        </Text>
      )}
      {isLoading ? (
        <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 12 }} />
      ) : (
        options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={styles.weatherOptionRow}
            onPress={() => onSelect(opt.id as 'switch_indoor' | 'reschedule' | 'keep')}
            activeOpacity={0.8}
          >
            <Text style={styles.weatherOptionLabel}>{opt.label}</Text>
            <Text style={styles.weatherOptionDesc}>{opt.description}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  </View>
);

/** HITL selection card — user picks a hotel / restaurant from MCP results */
const PlanHITLSelectionCard: React.FC<{
  cards: SelectionCard[];
  promptText?: string;
  onSelect: (cardId: string) => void;
  isLoading: boolean;
}> = ({ cards, promptText, onSelect, isLoading }) => (
  <View style={styles.aiBubbleRow}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
      <View style={styles.aiBubbleTail} />
      <Text style={styles.planCardTitle}>🏨 Choose Your Preference</Text>
      {promptText ? (
        <Text style={styles.planCardSubtitle}>{promptText}</Text>
      ) : (
        <Text style={styles.planCardSubtitle}>
          Select one of the following options found near your destinations.
        </Text>
      )}
      {isLoading ? (
        <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 12 }} />
      ) : (
        cards.map(card => (
          <TouchableOpacity
            key={card.card_id}
            style={styles.hitlCard}
            onPress={() => onSelect(card.card_id)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.hitlCardTitle}>{card.title}</Text>
              {card.subtitle ? (
                <Text style={styles.hitlCardSub}>{card.subtitle}</Text>
              ) : null}
            </View>
            {card.badge ? (
              <View style={styles.hitlCardBadge}>
                <Text style={styles.hitlCardBadgeText}>{card.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ))
      )}
    </View>
  </View>
);

/** Pre-generation MCP place picker — restaurant or hotel */
const PlanMCPPlacesCard: React.FC<{
  type: 'restaurant' | 'hotel';
  locationName: string;
  cards: SelectionCard[];
  isLoading: boolean;
  onSelect: (cardId: string) => void;
  onSkip: () => void;
}> = ({ type, locationName, cards, isLoading, onSelect, onSkip }) => {
  const icon   = type === 'restaurant' ? '🍽️' : '🏨';
  const title  = type === 'restaurant' ? 'Pick a Restaurant' : 'Pick a Hotel / Villa';
  const subtitle = type === 'restaurant'
    ? `Top dining spots near ${locationName} at your budget. Tap one to include it in the plan.`
    : `Top accommodation options near ${locationName} at your budget. Tap one to include it in the plan.`;

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
        <View style={styles.aiBubbleTail} />
        <Text style={styles.planCardTitle}>{icon} {title}</Text>
        <Text style={styles.planCardSubtitle}>{subtitle}</Text>

        {isLoading ? (
          <View style={styles.mcpLoadingRow}>
            <ActivityIndicator size="small" color={THEME.primary} />
            <Text style={styles.mcpLoadingText}>Searching Google Maps…</Text>
          </View>
        ) : cards.length === 0 ? (
          <View>
            <Text style={styles.mcpNoResults}>No results found nearby.</Text>
            <TouchableOpacity style={styles.planConfirmBtn} onPress={onSkip} activeOpacity={0.85}>
              <Text style={styles.planConfirmBtnText}>Continue without selection →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {cards.map(card => (
              <TouchableOpacity
                key={card.card_id}
                style={styles.mcpPlaceCard}
                onPress={() => onSelect(card.card_id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.mcpPlaceTitle}>{card.title}</Text>
                  {card.subtitle ? (
                    <Text style={styles.mcpPlaceSub} numberOfLines={2}>{card.subtitle}</Text>
                  ) : null}
                  <View style={styles.mcpPlaceMeta}>
                    {card.rating != null ? (
                      <View style={styles.mcpRatingBadge}>
                        <Text style={styles.mcpRatingText}>⭐ {card.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                    {card.price_range ? (
                      <View style={styles.mcpPriceBadge}>
                        <Text style={styles.mcpPriceText}>{card.price_range}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={THEME.gray[400]} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.planSkipBtn, { marginTop: 4, paddingHorizontal: 0, alignSelf: 'stretch' }]}
              onPress={onSkip}
              activeOpacity={0.75}
            >
              <Text style={styles.planSkipBtnText}>Skip this step</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export const LocationChatScreen: React.FC<LocationChatScreenProps> = ({
  route,
  navigation,
}) => {
  const { locationName } = route.params;
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // ── Planning mode state ──────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [planningStep, setPlanningStep] = useState<PlanningStep>('idle');
  const [planStartDate, setPlanStartDate] = useState<Date>(today);
  const [planEndDate, setPlanEndDate]   = useState<Date>(today);       // same = day trip
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]   = useState(false);
  const [nearbyLocations, setNearbyLocations] = useState<SimpleRecommendationLocation[]>([]);
  const [selectedPlanLocIds, setSelectedPlanLocIds] = useState<Set<string>>(new Set());
  const [planDiningPref, setPlanDiningPref] = useState<'dining' | 'accommodation' | 'both' | 'skip' | null>(null);
  const planDiningPrefRef = useRef<'dining' | 'accommodation' | 'both' | 'skip' | null>(null);
  const [planBudget, setPlanBudget] = useState<'budget' | 'mid-range' | 'luxury' | null>(null);
  const planBudgetRef = useRef<'budget' | 'mid-range' | 'luxury' | null>(null);

  // ── Pre-generation MCP place search ─────────────────────────────────
  const [mcpRestaurants, setMcpRestaurants] = useState<SelectionCard[]>([]);
  const [mcpHotels, setMcpHotels] = useState<SelectionCard[]>([]);
  const [selectedRestaurantCard, setSelectedRestaurantCard] = useState<SelectionCard | null>(null);
  const [isFetchingMCP, setIsFetchingMCP] = useState(false);
  const [planThreadId, setPlanThreadId] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<TourPlanResponse | null>(null);
  const [workflowStepIndex, setWorkflowStepIndex] = useState(0);
  const workflowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── HITL / weather interrupt hook ──────────────────────────────────
  const {
    interruptState,
    isResuming,
    detectInterrupt,
    clearInterrupt,
    resumeSelection,
    resumeWeather,
  } = useInterruptResume(planThreadId);

  const {
    setCurrentLocation,
    loadLocationSession,
    sendMessage,
    addUserMessageOnly,
    clearChat,
    clearError,
  } = useChatStore();

  const chatState = useChatStore(state => state.locationChats[locationName]);
  const messages = chatState?.messages || [];
  const isLoading = chatState?.isLoading || false;
  const isSending = chatState?.isSending || false;
  const error = chatState?.error || null;

  useEffect(() => {
    setCurrentLocation(locationName);
    loadLocationSession(locationName);
  }, [locationName, setCurrentLocation, loadLocationSession]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isSending]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => clearError(locationName) },
      ]);
    }
  }, [error, clearError, locationName]);

  // ── Planning mode helpers ─────────────────────────────────────────────

  /** Start planning mode — show the date picker bubble */
  const startPlanningFlow = useCallback(() => {
    setPlanningStep('date-selection');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  /** Fetch nearby locations then transition to location-selection step */
  const handleDatesConfirmed = useCallback(async () => {
    setPlanningStep('location-selection');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    try {
      // Get coordinates for the current location
      const searchResults = await locationService.searchLocations(locationName, 1);
      if (searchResults && searchResults.length > 0) {
        const { latitude, longitude } = searchResults[0].coordinates;
        const reco = await aiService.getSimpleRecommendations({
          latitude,
          longitude,
          max_distance_km: 60,
          top_k: 4,
        });
        const filtered = (reco.recommendations || []).filter(
          r => r.name.toLowerCase() !== locationName.toLowerCase(),
        );
        setNearbyLocations(filtered.slice(0, 4));
      }
    } catch (e) {
      console.warn('Nearby location fetch failed:', e);
      setNearbyLocations([]);
    }
  }, [locationName]);

  /** Toggle a nearby location in/out of the selection set */
  const togglePlanLocation = useCallback((name: string) => {
    setSelectedPlanLocIds(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  /**
   * Call the backend hotel-search endpoint (which uses Google Maps MCP) and
   * return up to 3 results as SelectionCards for the pre-generation picker.
   */
  const searchMCPPlaces = useCallback(async (
    type: 'restaurant' | 'hotel',
    budget: 'budget' | 'mid-range' | 'luxury',
  ): Promise<SelectionCard[]> => {
    const priceLabel = { budget: '$', 'mid-range': '$$', luxury: '$$$' }[budget];
    const query = type === 'restaurant'
      ? `${priceLabel} restaurants near ${locationName} Sri Lanka`
      : `${priceLabel} hotels and villas near ${locationName} Sri Lanka`;
    try {
      const result = await tourPlanService.searchHotels(query, locationName);
      return (result.results || []).slice(0, 3).map((r, i) => ({
        card_id: `${type}-${i}-${r.name.replace(/\s+/g, '-').toLowerCase()}`,
        title: r.name,
        subtitle: r.description ? r.description.slice(0, 90) : undefined,
        badge: [r.price_range, r.rating != null ? `⭐ ${r.rating}` : ''].filter(Boolean).join(' · ') || undefined,
        rating: r.rating,
        price_range: r.price_range,
      }));
    } catch (e) {
      console.warn('MCP place search failed:', e);
      return [];
    }
  }, [locationName]);

  /** Stop the workflow progress animation */
  const stopWorkflowAnimation = useCallback(() => {
    if (workflowIntervalRef.current) {
      clearInterval(workflowIntervalRef.current);
      workflowIntervalRef.current = null;
    }
  }, []);

  /** Move to dining preference step after location selection */
  const handleLocationsConfirmed = useCallback(() => {
    setPlanningStep('dining-pref');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  /** Record dining preference and move to budget step */
  const handleDiningPrefConfirmed = useCallback((pref: 'dining' | 'accommodation' | 'both' | 'skip') => {
    setPlanDiningPref(pref);
    planDiningPrefRef.current = pref;
    setPlanningStep('budget-selection');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  /** Run full plan generation with all user choices */
  const startPlanGeneration = useCallback(async (
    diningPref: 'dining' | 'accommodation' | 'both' | 'skip',
    budget: 'budget' | 'mid-range' | 'luxury',
    restaurantCard: SelectionCard | null = null,
    hotelCard: SelectionCard | null = null,
  ) => {
    setPlanningStep('generating');
    setWorkflowStepIndex(0);
    clearInterrupt();
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);

    // Animate through workflow steps (one step every ~2 s)
    let stepIdx = 0;
    workflowIntervalRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, WORKFLOW_STEPS.length - 2);
      setWorkflowStepIndex(stepIdx);
    }, 2000);

    // Resolve main location coordinates
    const mainLocation: SelectedLocation = { name: locationName, latitude: 0, longitude: 0 };
    try {
      const searchResults = await locationService.searchLocations(locationName, 1);
      if (searchResults && searchResults.length > 0) {
        mainLocation.latitude  = searchResults[0].coordinates.latitude;
        mainLocation.longitude = searchResults[0].coordinates.longitude;
      }
    } catch (_) {}

    const additionalLocs: SelectedLocation[] = nearbyLocations
      .filter(l => selectedPlanLocIds.has(l.name))
      .map(l => ({ name: l.name, latitude: l.latitude, longitude: l.longitude, distance_km: l.distance_km }));

    const allLocations = [mainLocation, ...additionalLocs];
    const startStr = planStartDate.toISOString().split('T')[0];
    const endStr   = planEndDate.toISOString().split('T')[0];

    // Build preferences array for the backend
    const preferences: string[] = [budget];
    if (diningPref === 'dining')         preferences.push('restaurants');
    else if (diningPref === 'accommodation') preferences.push('hotels');
    else if (diningPref === 'both')      preferences.push('restaurants', 'hotels');
    else if (diningPref === 'skip')      preferences.push('skip_restaurants', 'skip_hotels');

    const msgParts = [`Generate an optimised tour plan for ${locationName}, Sri Lanka`];
    if (budget) msgParts.push(`Budget preference: ${budget}`);
    if (diningPref !== 'skip') msgParts.push(`Include ${diningPref} recommendations using Google Maps MCP`);
    if (restaurantCard) msgParts.push(`User pre-selected restaurant: "${restaurantCard.title}" — include it in the dining section`);
    if (hotelCard) msgParts.push(`User pre-selected hotel/accommodation: "${hotelCard.title}" — include it in the accommodation section`);

    try {
      const result = await tourPlanService.generatePlan({
        selectedLocations: allLocations,
        startDate: startStr,
        endDate: endStr,
        preferences,
        message: msgParts.join('. '),
      });

      stopWorkflowAnimation();
      setWorkflowStepIndex(WORKFLOW_STEPS.length - 1);
      setPlanThreadId(result.threadId);

      // Detect HITL / weather interrupts
      detectInterrupt(result);
      if (result.weatherInterrupt) {
        setPlanResult(result);
        setPlanningStep('weather-interrupt');
      } else if (result.pendingUserSelection) {
        setPlanResult(result);
        setPlanningStep('hitl-selection');
      } else {
        setPlanResult(result);
        setPlanningStep('complete');
      }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      stopWorkflowAnimation();
      setPlanningStep('idle');
      Alert.alert('Plan Generation Failed', err?.message || 'Something went wrong. Please try again.');
    }
  }, [locationName, nearbyLocations, selectedPlanLocIds, planStartDate, planEndDate, stopWorkflowAnimation, clearInterrupt, detectInterrupt]);

  // ── Pre-generation MCP selection refs (stable values inside async callbacks) ──
  const selectedRestaurantCardRef = useRef<SelectionCard | null>(null);

  /** Helper — fetch hotels and transition to hotel-selection step.
   *  Called with the already-resolved restaurantCard so no stale closure. */
  const fetchHotelsStep = useCallback(async (
    budget: 'budget' | 'mid-range' | 'luxury',
    restaurantCard: SelectionCard | null,
  ) => {
    const diningPref = planDiningPrefRef.current || 'accommodation';
    setIsFetchingMCP(true);
    setPlanningStep('hotel-selection');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    const hotels = await searchMCPPlaces('hotel', budget);
    setMcpHotels(hotels);
    setIsFetchingMCP(false);
    if (hotels.length === 0) {
      await startPlanGeneration(diningPref, budget, restaurantCard, null);
    }
  }, [searchMCPPlaces, startPlanGeneration]);

  /** Record budget then route to restaurant-selection, hotel-selection, or generation */
  const handleBudgetConfirmed = useCallback(async (budget: 'budget' | 'mid-range' | 'luxury') => {
    setPlanBudget(budget);
    planBudgetRef.current = budget;
    setSelectedRestaurantCard(null);
    selectedRestaurantCardRef.current = null;
    setMcpRestaurants([]);
    setMcpHotels([]);

    const diningPref = planDiningPrefRef.current || 'skip';

    if (diningPref === 'dining' || diningPref === 'both') {
      setIsFetchingMCP(true);
      setPlanningStep('restaurant-selection');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
      const restaurants = await searchMCPPlaces('restaurant', budget);
      setMcpRestaurants(restaurants);
      setIsFetchingMCP(false);
      if (restaurants.length === 0) {
        if (diningPref === 'both') {
          await fetchHotelsStep(budget, null);
        } else {
          await startPlanGeneration(diningPref, budget, null, null);
        }
      }
    } else if (diningPref === 'accommodation') {
      await fetchHotelsStep(budget, null);
    } else {
      await startPlanGeneration(diningPref, budget, null, null);
    }
  }, [startPlanGeneration, searchMCPPlaces, fetchHotelsStep]);

  /** User tapped a restaurant card */
  const handleRestaurantSelected = useCallback(async (cardId: string) => {
    const card = mcpRestaurants.find(c => c.card_id === cardId) || null;
    setSelectedRestaurantCard(card);
    selectedRestaurantCardRef.current = card;

    const diningPref = planDiningPrefRef.current || 'dining';
    const budget = planBudgetRef.current || 'mid-range';

    if (diningPref === 'both') {
      await fetchHotelsStep(budget, card);
    } else {
      await startPlanGeneration(diningPref, budget, card, null);
    }
  }, [mcpRestaurants, fetchHotelsStep, startPlanGeneration]);

  /** User skipped the restaurant step */
  const handleSkipRestaurant = useCallback(async () => {
    setSelectedRestaurantCard(null);
    selectedRestaurantCardRef.current = null;
    const diningPref = planDiningPrefRef.current || 'dining';
    const budget = planBudgetRef.current || 'mid-range';
    if (diningPref === 'both') {
      await fetchHotelsStep(budget, null);
    } else {
      await startPlanGeneration(diningPref, budget, null, null);
    }
  }, [fetchHotelsStep, startPlanGeneration]);

  /** User tapped a hotel card */
  const handleHotelSelected = useCallback(async (cardId: string) => {
    const card = mcpHotels.find(c => c.card_id === cardId) || null;
    const diningPref = planDiningPrefRef.current || 'accommodation';
    const budget = planBudgetRef.current || 'mid-range';
    await startPlanGeneration(diningPref, budget, selectedRestaurantCardRef.current, card);
  }, [mcpHotels, startPlanGeneration]);

  /** User skipped the hotel step */
  const handleSkipHotel = useCallback(async () => {
    const diningPref = planDiningPrefRef.current || 'accommodation';
    const budget = planBudgetRef.current || 'mid-range';
    await startPlanGeneration(diningPref, budget, selectedRestaurantCardRef.current, null);
  }, [startPlanGeneration]);

  /** Resume after user picks a weather action */
  const handleWeatherChoice = useCallback(async (choice: 'switch_indoor' | 'reschedule' | 'keep') => {
    try {
      const result = await resumeWeather(choice);
      detectInterrupt(result);
      if (result.pendingUserSelection) {
        setPlanResult(result);
        setPlanningStep('hitl-selection');
      } else {
        setPlanResult(result);
        setPlanningStep('complete');
      }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resume plan after weather choice.');
    }
  }, [resumeWeather, detectInterrupt]);

  /** Resume after user selects a hotel / restaurant card */
  const handleSelectionCard = useCallback(async (cardId: string) => {
    try {
      const result = await resumeSelection(cardId);
      detectInterrupt(result);
      if (result.weatherInterrupt) {
        setPlanResult(result);
        setPlanningStep('weather-interrupt');
      } else if (result.pendingUserSelection) {
        setPlanResult(result);
        setPlanningStep('hitl-selection');
      } else {
        setPlanResult(result);
        setPlanningStep('complete');
      }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to confirm your selection.');
    }
  }, [resumeSelection, detectInterrupt]);

  // Cleanup interval on unmount
  useEffect(() => () => stopWorkflowAnimation(), [stopWorkflowAnimation]);

  const handleSend = useCallback(() => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isSending) return;

    // Detect plan trigger in message
    const isPlanRequest = planningStep === 'idle' &&
      PLAN_TRIGGER_PATTERNS.some(p => p.test(trimmedText));

    setInputText('');

    if (isPlanRequest) {
      // Add user bubble WITHOUT calling AI — planning mode takes over immediately
      addUserMessageOnly(locationName, trimmedText);
      setTimeout(() => startPlanningFlow(), 400);
    } else {
      sendMessage(locationName, trimmedText);
    }
  }, [inputText, isSending, locationName, sendMessage, addUserMessageOnly, planningStep, startPlanningFlow]);

  const handleSuggestionPress = useCallback((text: string) => {
    setInputText(text);
    setTimeout(() => {
      sendMessage(locationName, text);
      setInputText('');
    }, 100);
  }, [locationName, sendMessage]);

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearChat(locationName),
        },
      ]
    );
  }, [locationName, clearChat]);

  const suggestions = [
    { text: 'Best time to visit?', icon: 'clock' },
    { text: 'Tell me the history', icon: 'book' },
    { text: 'Photography tips', icon: 'camera' },
    { text: 'Hidden gems nearby', icon: 'gem' },
    { text: 'Local food to try', icon: 'utensils' },
    { text: 'Safety tips', icon: 'shield-alt' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* WhatsApp-style Header */}
      <LinearGradient
        colors={[THEME.primary, THEME.primaryDark]}
        style={[styles.header, { marginTop: -insets.top, paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.white} />
        </TouchableOpacity>

        {/* AI Avatar with online dot */}
        <View style={styles.headerAvatar}>
          <MaterialCommunityIcons name="robot-happy-outline" size={20} color={THEME.white} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>AI Travel Guide</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isLoading || isSending ? 'typing...' : locationName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleClearChat}
          activeOpacity={0.7}
          disabled={messages.length === 0}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={messages.length === 0 ? 'rgba(255,255,255,0.4)' : THEME.white}
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date separator */}
          <DateSeparator date="Today" />

          {isLoading ? (
            <View style={styles.aiBubbleRow}>
              <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12 }]}>
                <View style={styles.aiBubbleTail} />
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={[styles.bubbleTime, { marginTop: 6 }]}>Loading conversation...</Text>
              </View>
            </View>
          ) : messages.length === 0 ? (
            /* Empty state as a centered chat prompt */
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconBg}>
                <MaterialCommunityIcons name="robot-happy-outline" size={36} color={THEME.white} />
              </View>
              <Text style={styles.emptyStateTitle}>Your AI Guide for</Text>
              <Text style={styles.emptyStateLocation}>{locationName}</Text>
              <Text style={styles.emptyStateSubtitle}>
                Ask me anything about this place — history, tips, food, hidden gems, and more!
              </Text>
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {suggestions.map((s, i) => (
                    <QuickReply
                      key={i}
                      text={s.text}
                      icon={s.icon}
                      onPress={() => handleSuggestionPress(s.text)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <>
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isSending && <TypingIndicator />}

              {/* ── Planning mode inline UI ─────────────────────────── */}
              {planningStep === 'date-selection' && (
                <PlanDatePickerCard
                  startDate={planStartDate}
                  endDate={planEndDate}
                  onChangeStart={() => setShowStartPicker(true)}
                  onChangeEnd={() => setShowEndPicker(true)}
                  onConfirm={handleDatesConfirmed}
                />
              )}

              {planningStep === 'location-selection' && (
                nearbyLocations.length > 0 ? (
                  <NearbyLocationsCard
                    locationName={locationName}
                    locations={nearbyLocations}
                    selectedIds={selectedPlanLocIds}
                    onToggle={togglePlanLocation}
                    onConfirm={handleLocationsConfirmed}
                    onSkip={handleLocationsConfirmed}
                  />
                ) : (
                  <View style={styles.aiBubbleRow}>
                    <View style={[styles.messageBubble, styles.assistantBubble, styles.planCard]}>
                      <View style={styles.aiBubbleTail} />
                      <Text style={styles.planCardTitle}>📍 Finding nearby spots…</Text>
                      <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 10 }} />
                    </View>
                  </View>
                )
              )}

              {planningStep === 'dining-pref' && (
                <PlanDiningPrefCard onSelect={handleDiningPrefConfirmed} />
              )}

              {planningStep === 'budget-selection' && (
                <PlanBudgetCard onSelect={handleBudgetConfirmed} />
              )}

              {planningStep === 'restaurant-selection' && (
                <PlanMCPPlacesCard
                  type="restaurant"
                  locationName={locationName}
                  cards={mcpRestaurants}
                  isLoading={isFetchingMCP}
                  onSelect={handleRestaurantSelected}
                  onSkip={handleSkipRestaurant}
                />
              )}

              {planningStep === 'hotel-selection' && (
                <PlanMCPPlacesCard
                  type="hotel"
                  locationName={locationName}
                  cards={mcpHotels}
                  isLoading={isFetchingMCP}
                  onSelect={handleHotelSelected}
                  onSkip={handleSkipHotel}
                />
              )}

              {planningStep === 'generating' && (
                <WorkflowProgressCard activeStepIndex={workflowStepIndex} />
              )}

              {planningStep === 'weather-interrupt' && (
                <PlanWeatherInterruptCard
                  message={interruptState.weatherMessage}
                  options={interruptState.weatherOptions}
                  onSelect={handleWeatherChoice}
                  isLoading={isResuming}
                />
              )}

              {planningStep === 'hitl-selection' && (
                <PlanHITLSelectionCard
                  cards={interruptState.selectionCards}
                  promptText={planResult?.promptText}
                  onSelect={handleSelectionCard}
                  isLoading={isResuming}
                />
              )}

              {planningStep === 'complete' && planResult && (
                <TourPlanResultCard
                  plan={planResult}
                  locationName={locationName}
                />
              )}
            </>
          )}
        </ScrollView>

        {/* Quick suggestions (shown when messages exist and not sending) */}
        {!isLoading && !isSending && messages.length > 0 && messages.length <= 2 && (
          <View style={styles.quickRepliesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesScroll}
            >
              {suggestions.map((s, i) => (
                <QuickReply
                  key={i}
                  text={s.text}
                  icon={s.icon}
                  onPress={() => handleSuggestionPress(s.text)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* WhatsApp-style Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={THEME.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isSending}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Ionicons name="send" size={18} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Date picker modals for planning mode */}
      {/* Date pickers — end date allows same day for day trips */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        minimumDate={today}
        date={planStartDate}
        onConfirm={d => {
          setShowStartPicker(false);
          setPlanStartDate(d);
          // Reset end date if it's before the new start
          if (planEndDate < d) setPlanEndDate(d);
        }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        minimumDate={planStartDate}
        date={planEndDate}
        onConfirm={d => { setShowEndPicker(false); setPlanEndDate(d); }}
        onCancel={() => setShowEndPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary,
    overflow: 'visible',
  },

  // Header (WhatsApp style)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: THEME.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat area
  chatArea: {
    flex: 1,
    backgroundColor: THEME.chatBg,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 10,
    flexGrow: 1,
  },

  // Date separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorPill: {
    backgroundColor: 'rgba(225,218,208,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[700],
  },

  // Message rows
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  aiBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },

  // Message bubble
  messageBubble: {
    maxWidth: width * 0.78,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: THEME.userBubble,
    borderTopRightRadius: 2,
    marginRight: 4,
  },
  assistantBubble: {
    backgroundColor: THEME.aiBubble,
    borderTopLeftRadius: 2,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  // Bubble tails
  userBubbleTail: {
    position: 'absolute',
    top: 0,
    right: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: THEME.userBubble,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  aiBubbleTail: {
    position: 'absolute',
    top: 0,
    left: -6,
    width: 0,
    height: 0,
    borderRightWidth: 6,
    borderRightColor: THEME.aiBubble,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },

  // User message
  userMessageText: {
    fontSize: 14.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    lineHeight: 20,
  },
  userBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  bubbleTimeUser: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
    textAlign: 'right',
    marginTop: 3,
  },

  // Typing
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.gray[400],
  },

  // Empty state
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  emptyStateIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },
  emptyStateLocation: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  suggestionsContainer: {
    marginTop: 20,
    width: '100%',
  },
  suggestionsScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },

  // Quick replies
  quickRepliesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: THEME.chatBg,
    paddingVertical: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReply: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.primary,
    gap: 6,
  },
  quickReplyText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.primary,
  },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: BOTTOM_PADDING,
    backgroundColor: THEME.chatBg,
    gap: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 4 : 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: THEME.gray[300],
  },

  // Metadata badges
  metadataContainer: {
    marginTop: 6,
  },
  metadataDivider: {
    height: 1,
    backgroundColor: THEME.gray[200],
    marginBottom: 6,
  },
  metadataBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  metadataBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Medium',
  },

  // Sources modal
  sourcesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sourcesModalSheet: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sourcesModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.gray[300],
    alignSelf: 'center',
    marginBottom: 14,
  },
  sourcesModalTitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginBottom: 14,
  },
  sourcesSection: {
    marginBottom: 14,
  },
  sourcesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  sourcesSectionLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesKbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    marginBottom: 4,
  },
  sourcesKbText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[700],
    flex: 1,
  },
  sourcesLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#EFF8FF',
    borderRadius: 8,
    marginBottom: 4,
  },
  sourcesLinkText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#0891B2',
    flex: 1,
    textDecorationLine: 'underline',
  },
  sourcesCloseBtn: {
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: THEME.gray[100],
    alignItems: 'center',
  },
  sourcesCloseBtnText: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.gray[600],
  },

  // ─── Planning mode ───────────────────────────────────────────────────
  planCard: {
    padding: 14,
    maxWidth: width * 0.85,
  },
  planCardTitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginBottom: 4,
  },
  planCardSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginBottom: 12,
    lineHeight: 17,
  },

  // Date picker rows
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: THEME.gray[100],
    borderRadius: 10,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateValue: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginTop: 1,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${THEME.primary}18`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  durationBadgeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.primary,
  },

  // Buttons
  planConfirmBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    flex: 1,
  },
  planConfirmBtnText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: THEME.white,
  },
  planSkipBtn: {
    borderWidth: 1.5,
    borderColor: THEME.gray[300],
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 18,
  },
  planSkipBtnText: {
    fontSize: 13,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.gray[500],
  },
  planCardBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  // Nearby location cards
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME.gray[200],
    marginBottom: 7,
    backgroundColor: THEME.white,
  },
  locationCardSelected: {
    borderColor: THEME.primary,
    backgroundColor: `${THEME.primary}0A`,
  },
  locationCardCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCardCheckSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  locationCardName: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  locationCardDist: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 1,
  },
  locationCardBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locationCardBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-SemiBold',
    color: '#065F46',
  },

  // Workflow progress
  workflowStepsList: {
    marginTop: 10,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  workflowLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    width: 2,
    height: 20,
    backgroundColor: THEME.gray[200],
    zIndex: 0,
  },
  workflowLineDone: {
    backgroundColor: THEME.success,
  },
  workflowDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  workflowDotActive: {
    backgroundColor: THEME.primary,
  },
  workflowDotDone: {
    backgroundColor: THEME.success,
  },
  workflowLabel: {
    marginLeft: 10,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
    flex: 1,
  },
  workflowLabelActive: {
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  workflowLabelDone: {
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[600],
    textDecorationLine: 'line-through',
  },
  workflowLabelPending: {
    color: THEME.gray[300],
  },

  // Tour plan result
  planResultHeader: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray[100],
  },
  planResultTitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginBottom: 4,
  },
  planResultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  planResultMetaText: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },
  itineraryPreview: {
    marginTop: 10,
    gap: 6,
  },
  itinerarySlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: THEME.gray[50],
    borderRadius: 8,
  },
  itineraryTime: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.primary,
    width: 70,
    marginTop: 1,
  },
  itineraryLocation: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  itineraryNote: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 1,
  },
  itineraryMore: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: THEME.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  planTips: {
    marginTop: 10,
    gap: 4,
  },
  planTipText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[600],
    lineHeight: 17,
  },
  planStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.gray[100],
  },
  planStepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planStepChipOk: { backgroundColor: '#D1FAE5' },
  planStepChipWarn: { backgroundColor: '#FEF3C7' },
  planStepChipText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Medium',
  },
  planResultHint: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
    fontStyle: 'italic',
  },

  // ─── Dining preference options ──────────────────────────────────────
  prefOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: THEME.gray[50],
    borderRadius: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: THEME.gray[200],
  },
  prefOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${THEME.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prefOptionLabel: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  prefOptionSub: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 1,
  },

  // ─── Budget cards ───────────────────────────────────────────────────
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: THEME.white,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  budgetEmoji: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    width: 40,
    textAlign: 'center',
  },
  budgetLabel: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  budgetSub: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 1,
  },

  // ─── Weather interrupt options ──────────────────────────────────────
  weatherOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  weatherOptionLabel: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginBottom: 2,
  },
  weatherOptionDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[600],
    lineHeight: 17,
  },

  // ─── MCP pre-generation place picker ────────────────────────────────
  mcpLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  mcpLoadingText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },
  mcpNoResults: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginBottom: 10,
    fontStyle: 'italic',
  },
  mcpPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: THEME.white,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: THEME.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  mcpPlaceTitle: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginBottom: 2,
  },
  mcpPlaceSub: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    lineHeight: 16,
    marginBottom: 4,
  },
  mcpPlaceMeta: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  mcpRatingBadge: {
    backgroundColor: '#FEF9C3',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mcpRatingText: {
    fontSize: 11,
    fontFamily: 'Gilroy-SemiBold',
    color: '#92400E',
  },
  mcpPriceBadge: {
    backgroundColor: `${THEME.primary}18`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mcpPriceText: {
    fontSize: 11,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.primary,
  },

  // ─── HITL selection cards ───────────────────────────────────────────
  hitlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: THEME.gray[50],
    borderRadius: 10,
    marginBottom: 7,
    borderWidth: 1.5,
    borderColor: THEME.gray[200],
  },
  hitlCardTitle: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  hitlCardSub: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 2,
  },
  hitlCardBadge: {
    backgroundColor: `${THEME.primary}18`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  hitlCardBadgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.primary,
  },
});

export default LocationChatScreen;
