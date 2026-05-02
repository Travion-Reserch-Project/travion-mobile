/**
 * TourGuideChatScreen — "Ask Travion"
 * Travion-branded AI travel guide chat powered by the AI Agent Engine (LangGraph).
 * Features: session management, conversation memory, metadata display,
 * tour planning detection, itinerary rendering, conversation history,
 * image upload (camera/gallery), CLIP image search results.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import { tourGuideChatService } from '@services';
import type {
  GuideSession,
  GuideMessageMetadata,
  ItinerarySlot,
  ConstraintViolation,
  ImageSearchResult,
  ClarificationQuestion,
  CulturalTip,
  FinalItinerary,
  SelectionCard,
  StepResult,
  WeatherPromptOption,
  GuideMessageResponse,
} from '../../services/api/ChatService';
import { tourPlanService } from '../../services/api/TourPlanService';
import InlineClarificationBubble from '../../components/chat/InlineClarificationBubble';
import InlineHitlBubble from '../../components/chat/InlineHitlBubble';
import WeatherAlertBubble from '../../components/chat/WeatherAlertBubble';
import AgentProgressIndicator from '../../components/chat/AgentProgressIndicator';
import InlineTourPlanCard from '../../components/chat/InlineTourPlanCard';

const { width } = Dimensions.get('window');
const botAnimation = require('@assets/animations/onbord2.json');

// ─────────────────────────────────────────────
// BRAND TOKENS
// ─────────────────────────────────────────────
const C = {
  primary:      '#F5840E',
  primaryDark:  '#C2410C',
  primaryDeep:  '#7C2D06',
  userBubble:   '#FFF0E0',
  userBubbleBorder: '#FFD4A8',
  aiBubble:     '#FFFFFF',
  chatBg:       '#F5EDE3',
  sendBtn:      '#F5840E',
  tickActive:   '#F5840E',
  tickSent:     '#9CA3AF',
  dark:         '#1C1917',
  textMid:      '#44403C',
  textSoft:     '#78716C',
  border:       '#E7E0D8',
  white:        '#FFFFFF',
  onlineDot:    '#22C55E',
  tagBg:        'rgba(245,132,14,0.12)',
  tagText:      '#C2410C',
  success:      '#10B981',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#3B82F6',
  purple:       '#7C3AED',
  cyan:         '#0891B2',
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type PlanningBubbleKind =
  | 'agentProgress'
  | 'clarification'
  | 'hitlSelection'
  | 'weatherPrompt'
  | 'planCard';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered';
  metadata?: GuideMessageMetadata;
  itinerary?: ItinerarySlot[] | null;
  constraints?: ConstraintViolation[] | null;
  intent?: string | null;
  imageUri?: string | null;      // ImageKit CDN URL (permanent, used for history)
  imageBase64?: string | null;   // Raw base64 for instant in-session display
  imageResults?: ImageSearchResult[] | null;
  imageValidationMessage?: string | null;
  // Tour-planning artifacts — chosen by `bubbleKind` to pick a renderer
  bubbleKind?: PlanningBubbleKind;
  agentSteps?: StepResult[] | null;
  agentActive?: boolean;
  clarificationQuestion?: ClarificationQuestion | null;
  clarificationAnswered?: string | null;
  selectionCards?: SelectionCard[] | null;
  selectionPromptText?: string | null;
  selectionAnswered?: { cardId: string; label?: string } | null;
  weatherPromptMessage?: string | null;
  weatherPromptOptions?: WeatherPromptOption[] | null;
  weatherChoice?: string | null;
  finalItinerary?: FinalItinerary | null;
  culturalTips?: CulturalTip[] | null;
  matchScore?: number | null;
}

// ─────────────────────────────────────────────
// QUICK SUGGESTIONS
// ─────────────────────────────────────────────
const SUGGESTIONS = [
  { emoji: '🏛️', text: 'Best historical sites in Sri Lanka?' },
  { emoji: '🌊', text: 'Top beaches to visit?' },
  { emoji: '🌿', text: 'Wildlife & nature spots' },
  { emoji: '🍛', text: 'Must-try local food' },
  { emoji: '💡', text: 'Hidden gems & local tips' },
  { emoji: '🗺️', text: 'Plan a trip to Kandy' },
  { emoji: '📷', text: 'Show me photos of Sigiriya' },
  { emoji: '🏖️', text: 'Show me scenic beaches' },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatTime = (date: Date): string =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (date: Date): string => {
  const today = new Date();
  const d = new Date(date);
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatSessionDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ─────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────
const SEVERITY: Record<string, { icon: string; color: string; bg: string }> = {
  low:      { icon: 'information-circle', color: C.info,    bg: '#EFF6FF' },
  medium:   { icon: 'warning',           color: C.warning,  bg: '#FFFBEB' },
  high:     { icon: 'alert-circle',      color: C.error,    bg: '#FEF2F2' },
  critical: { icon: 'skull',             color: '#991B1B',  bg: '#FEE2E2' },
};

// ─────────────────────────────────────────────
// MARKDOWN CONFIG
// ─────────────────────────────────────────────
const MD_STYLES = {
  body:        { fontSize: 14.5, fontFamily: 'Gilroy-Regular', color: C.dark, lineHeight: 22 },
  paragraph:   { marginTop: 0, marginBottom: 6 },
  strong:      { fontFamily: 'Gilroy-Bold', color: C.dark },
  heading1:    { fontSize: 16,   fontFamily: 'Gilroy-Bold', color: C.primary,     marginBottom: 6  },
  heading2:    { fontSize: 15,   fontFamily: 'Gilroy-Bold', color: C.primaryDark, marginBottom: 4  },
  heading3:    { fontSize: 14.5, fontFamily: 'Gilroy-Bold', color: C.dark,        marginBottom: 3  },
  bullet_list_icon: { marginRight: 8, color: C.primary },
  bullet_list: { marginBottom: 4 },
  ordered_list:{ marginBottom: 4 },
  link:        { color: C.primary, textDecorationLine: 'underline' as const },
  blockquote:  { backgroundColor: '#FFF7ED', borderLeftColor: C.primary, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4, marginVertical: 4, borderRadius: 4 },
  code_inline: { backgroundColor: '#FFF0E0', color: C.primaryDark, fontFamily: 'Courier', fontSize: 13, borderRadius: 3, paddingHorizontal: 4 },
};

// ─────────────────────────────────────────────
// DATE SEPARATOR
// ─────────────────────────────────────────────
const DateSeparator: React.FC<{ date: Date }> = ({ date }) => (
  <View style={s.dateSep}>
    <View style={s.dateSepLine} />
    <View style={s.dateSepPill}><Text style={s.dateSepText}>{formatDate(date)}</Text></View>
    <View style={s.dateSepLine} />
  </View>
);

// ─────────────────────────────────────────────
// TRAVION AVATAR
// ─────────────────────────────────────────────
const TravionAvatar: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <LinearGradient
    colors={[C.primary, C.primaryDark]}
    style={[s.avatarGrad, { width: size, height: size, borderRadius: size / 2 }]}
  >
    <Text style={[s.avatarLetter, { fontSize: size * 0.44 }]}>T</Text>
  </LinearGradient>
);

// ─────────────────────────────────────────────
// METADATA BADGE
// ─────────────────────────────────────────────
const MetadataBadge: React.FC<{
  icon: string; label: string; color: string;
}> = ({ icon, label, color }) => (
  <View style={[s.metaBadge, { backgroundColor: `${color}15` }]}>
    <Ionicons name={icon as any} size={11} color={color} />
    <Text style={[s.metaBadgeText, { color }]}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────
// CONSTRAINT WARNING CARD
// ─────────────────────────────────────────────
const ConstraintCard: React.FC<{ constraint: ConstraintViolation }> = ({ constraint }) => {
  const sev = SEVERITY[constraint.severity] || SEVERITY.low;
  return (
    <View style={[s.constraintCard, { backgroundColor: sev.bg, borderLeftColor: sev.color }]}>
      <View style={s.constraintHeader}>
        <Ionicons name={sev.icon as any} size={14} color={sev.color} />
        <Text style={[s.constraintType, { color: sev.color }]}>
          {constraint.constraint_type.replace(/_/g, ' ').toUpperCase()}
        </Text>
      </View>
      <Text style={s.constraintDesc}>{constraint.description}</Text>
      {constraint.suggestion ? (
        <View style={s.constraintSuggRow}>
          <Ionicons name="bulb-outline" size={12} color={C.primary} />
          <Text style={s.constraintSugg}>{constraint.suggestion}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ─────────────────────────────────────────────
// ITINERARY SLOT CARD
// ─────────────────────────────────────────────
const ItineraryCard: React.FC<{ slot: ItinerarySlot; index: number }> = ({ slot, index }) => {
  const crowdColor = slot.crowd_prediction > 70 ? C.error : slot.crowd_prediction > 40 ? C.warning : C.success;
  return (
    <View style={s.itinCard}>
      <View style={s.itinTimeline}>
        <View style={[s.itinDot, { backgroundColor: C.primary }]} />
        {index < 99 && <View style={s.itinLine} />}
      </View>
      <View style={s.itinContent}>
        <View style={s.itinTimeRow}>
          <Text style={s.itinTime}>{slot.icon || '📍'} {slot.time}</Text>
          {slot.duration_minutes > 0 && (
            <Text style={s.itinDuration}>{slot.duration_minutes}min</Text>
          )}
        </View>
        <Text style={s.itinLocation}>{slot.location}</Text>
        <Text style={s.itinActivity}>{slot.activity}</Text>
        <View style={s.itinBadgeRow}>
          {slot.crowd_prediction > 0 && (
            <View style={[s.itinBadge, { backgroundColor: `${crowdColor}15` }]}>
              <Ionicons name="people" size={10} color={crowdColor} />
              <Text style={[s.itinBadgeText, { color: crowdColor }]}>{Math.round(slot.crowd_prediction)}%</Text>
            </View>
          )}
          {slot.lighting_quality && (
            <View style={[s.itinBadge, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="sunny" size={10} color={C.primary} />
              <Text style={[s.itinBadgeText, { color: C.primary }]}>{slot.lighting_quality}</Text>
            </View>
          )}
        </View>
        {slot.cultural_tip ? (
          <View style={s.itinTip}>
            <Text style={s.itinTipText}>💡 {slot.cultural_tip}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// IMAGE RESULT CARD
// ─────────────────────────────────────────────
const ImageResultCard: React.FC<{ result: ImageSearchResult }> = ({ result }) => (
  <View style={s.imgCard}>
    {result.image_url ? (
      <Image source={{ uri: result.image_url }} style={s.imgCardImage} resizeMode="cover" />
    ) : (
      <View style={[s.imgCardImage, s.imgCardPlaceholder]}>
        <Ionicons name="image-outline" size={28} color={C.textSoft} />
      </View>
    )}
    <View style={s.imgCardInfo}>
      <Text style={s.imgCardLocation} numberOfLines={1}>{result.location_name}</Text>
      <Text style={s.imgCardDesc} numberOfLines={2}>{result.description}</Text>
      <View style={s.imgCardFooter}>
        <View style={s.imgCardScore}>
          <Ionicons name="analytics-outline" size={10} color={C.primary} />
          <Text style={s.imgCardScoreText}>{Math.round(result.similarity_score * 100)}% match</Text>
        </View>
        {result.tags ? (
          <Text style={s.imgCardTags} numberOfLines={1}>{result.tags.split(',').slice(0, 2).join(', ')}</Text>
        ) : null}
      </View>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
const TypingIndicator: React.FC = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 280, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={s.typingRow}>
      <TravionAvatar size={30} />
      <View style={s.typingBubble}>
        <Text style={s.typingLabel}>Travion is thinking</Text>
        <View style={s.typingDots}>
          {dots.map((dot, i) => (
            <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: dot }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = message.metadata;
  const hasMetadata = !isUser && !!meta && !!(meta.documents_retrieved || meta.web_search_used || meta.reasoning_loops || meta.has_image_query);

  if (isUser) {
    return (
      <Animated.View style={[s.userRow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <View style={s.userBubble}>
          <View style={s.userTail} />
          {/* Show image: prefer base64 (instant, no permission issues) then fall back to CDN URL */}
          {(message.imageBase64 || message.imageUri) ? (
            <Image
              source={{ uri: message.imageBase64 ? `data:image/jpeg;base64,${message.imageBase64}` : message.imageUri! }}
              style={s.userImageThumb}
              resizeMode="cover"
            />
          ) : null}
          <Text style={s.userText}>{message.content}</Text>
          <View style={s.userFooter}>
            <Text style={s.timeUser}>{formatTime(message.timestamp)}</Text>
            <Ionicons name="checkmark-done" size={13} color={C.tickActive} style={{ marginLeft: 3 }} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.aiRow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <TravionAvatar size={30} />
      <View style={s.aiBubble}>
        <View style={s.aiTail} />
        <Text style={s.aiBubbleName}>Travion</Text>

        {/* Image validation message */}
        {message.imageValidationMessage && !message.imageResults?.length && (
          <View style={s.validationBanner}>
            <Ionicons name="alert-circle" size={14} color={C.warning} />
            <Text style={s.validationText}>{message.imageValidationMessage}</Text>
          </View>
        )}

        {/* Main response markdown */}
        <Markdown style={MD_STYLES}>{message.content}</Markdown>

        {/* Constraint warnings */}
        {message.constraints && message.constraints.length > 0 && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {message.constraints.map((c, i) => <ConstraintCard key={i} constraint={c} />)}
          </View>
        )}

        {/* Itinerary cards */}
        {message.itinerary && message.itinerary.length > 0 && (
          <View style={s.itinContainer}>
            <View style={s.itinHeader}>
              <Ionicons name="map-outline" size={14} color={C.primary} />
              <Text style={s.itinHeaderText}>Tour Plan</Text>
            </View>
            {message.itinerary.slice(0, 8).map((slot, i) => (
              <ItineraryCard key={i} slot={slot} index={i} />
            ))}
            {message.itinerary.length > 8 && (
              <Text style={s.itinMore}>+ {message.itinerary.length - 8} more stops</Text>
            )}
          </View>
        )}

        {/* Metadata badges */}
        {hasMetadata && (
          <View style={s.metaContainer}>
            <View style={s.metaDivider} />
            <View style={s.metaRow}>
              {meta!.documents_retrieved != null && meta!.documents_retrieved > 0 && (
                <MetadataBadge icon="library-outline" label={`${meta!.documents_retrieved} sources`} color={C.purple} />
              )}
              {meta!.web_search_used === true && (
                <MetadataBadge icon="globe-outline" label="Web search" color={C.cyan} />
              )}
              {meta!.has_image_query === true && (
                <MetadataBadge icon="camera-outline" label="Image search" color={C.primary} />
              )}
              {meta!.reasoning_loops != null && meta!.reasoning_loops > 0 && (
                <MetadataBadge icon="sparkles-outline" label={meta!.reasoning_loops > 1 ? `${meta!.reasoning_loops}x verified` : 'Verified'} color={C.success} />
              )}
            </View>
          </View>
        )}

        <Text style={s.timeAI}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// WELCOME CARD
// ─────────────────────────────────────────────
const WelcomeCard: React.FC = () => (
  <View style={s.welcomeCard}>
    <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={s.welcomeGrad}>
      <View style={s.welcomeAvatarWrap}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={s.welcomeAvatarCircle}>
          <LottieView source={botAnimation} autoPlay loop style={{ width: 46, height: 46 }} />
        </LinearGradient>
      </View>
      <Text style={s.welcomeName}>Travion</Text>
      <Text style={s.welcomeRole}>Your AI Travel Guide for Sri Lanka</Text>
      <View style={s.welcomeDivider} />
      <Text style={s.welcomeDesc}>
        Ask me about destinations, culture, food, hidden gems, or tour planning.{'\n'}
        You can also send a photo to find similar places!
      </Text>
      <View style={s.welcomeTags}>
        {['Destinations', 'Culture', 'Food', 'Planning', 'Photos'].map(t => (
          <View key={t} style={s.welcomeTag}><Text style={s.welcomeTagText}>{t}</Text></View>
        ))}
      </View>
    </LinearGradient>
  </View>
);

// ─────────────────────────────────────────────
// CONVERSATION HISTORY MODAL
// ─────────────────────────────────────────────
const ConversationListModal: React.FC<{
  visible: boolean;
  sessions: GuideSession[];
  loading: boolean;
  onSelect: (session: GuideSession) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}> = ({ visible, sessions, loading, onSelect, onNewChat, onDelete, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.modalHandle} />

          <View style={s.modalTitleRow}>
            <Text style={s.modalTitle}>Conversations</Text>
            <TouchableOpacity onPress={onNewChat} style={s.modalNewBtn} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={16} color={C.white} />
              <Text style={s.modalNewBtnText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.modalLoading}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={s.modalLoadingText}>Loading...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={s.modalEmpty}>
              <Ionicons name="chatbubbles-outline" size={36} color={C.textSoft} />
              <Text style={s.modalEmptyText}>No past conversations</Text>
              <Text style={s.modalEmptySubtext}>Start chatting with Travion!</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={item => item.sessionId}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.sessionItem}
                  onPress={() => onSelect(item)}
                  onLongPress={() => {
                    Alert.alert('Delete Conversation', `Delete "${item.title}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.sessionId) },
                    ]);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={s.sessionIcon}>
                    <Ionicons name="chatbubble-outline" size={16} color={C.primary} />
                  </View>
                  <View style={s.sessionInfo}>
                    <Text style={s.sessionTitle} numberOfLines={1}>{item.title || 'Untitled Chat'}</Text>
                    <Text style={s.sessionMeta}>
                      {item.messageCount} messages · {formatSessionDate(item.updatedAt)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textSoft} />
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={s.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// IMAGE ATTACHMENT PREVIEW
// ─────────────────────────────────────────────
const AttachmentPreview: React.FC<{
  uri: string;
  onRemove: () => void;
}> = ({ uri, onRemove }) => (
  <View style={s.attachPreview}>
    <Image source={{ uri }} style={s.attachThumb} resizeMode="cover" />
    <TouchableOpacity onPress={onRemove} style={s.attachRemoveBtn} activeOpacity={0.7}>
      <Ionicons name="close-circle" size={20} color={C.error} />
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export const TourGuideChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Image attachment state
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Conversation history state
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<GuideSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Tour-planning state
  const [planningMode, setPlanningMode] = useState(false);
  const [pendingResume, setPendingResume] = useState<{
    kind: 'selection' | 'weather';
    bubbleMsgId: string;
  } | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const streamHandleRef = useRef<{ abort: () => void } | null>(null);

  // Scroll to bottom
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, isTyping]);

  // Load sessions for history modal
  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await tourGuideChatService.getSessions('active');
      if (res.success && res.data) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Load messages from a past session — re-render planning bubbles from
  // metadata persisted by the backend so a finalized plan or HITL turn
  // shows up the same way on reload.
  const loadSession = useCallback(async (session: GuideSession) => {
    try {
      setShowHistory(false);
      setSessionId(session.sessionId);
      setIsTyping(true);
      setPlanningMode(false);

      const res = await tourGuideChatService.getHistory(session.sessionId, 50);
      if (res.success && res.data) {
        let sawPlanning = false;
        const loaded: ChatMessage[] = (res.data.messages || []).map((msg: any) => {
          const meta = msg.metadata || {};
          const finalItinerary = meta.final_itinerary || null;
          const clarification = meta.clarification_question || null;
          const selectionCards = meta.selection_cards || null;
          const weatherOptions = meta.weather_prompt_options || null;
          const stepResults = meta.step_results || null;

          let bubbleKind: PlanningBubbleKind | undefined;
          if (msg.role === 'assistant') {
            if (finalItinerary && finalItinerary.stops?.length) bubbleKind = 'planCard';
            else if (clarification) bubbleKind = 'clarification';
            else if (selectionCards && selectionCards.length) bubbleKind = 'hitlSelection';
            else if (weatherOptions && weatherOptions.length) bubbleKind = 'weatherPrompt';
          }
          if (bubbleKind) sawPlanning = true;

          return {
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
            metadata: meta,
            imageUri: msg.imageUrl || null,
            imageResults: meta.image_results || null,
            itinerary: meta.itinerary || null,
            constraints: meta.constraints || null,
            intent: meta.intent || null,
            bubbleKind,
            agentSteps: bubbleKind === 'planCard' ? null : stepResults,
            agentActive: false,
            clarificationQuestion: clarification,
            // Once history is reloaded, clarification answers are not actionable —
            // mark them as answered to lock the chips visually.
            clarificationAnswered: clarification ? '' : null,
            selectionCards,
            selectionPromptText: meta.prompt_text || null,
            selectionAnswered: null,
            weatherPromptMessage: meta.weather_prompt_message || null,
            weatherPromptOptions: weatherOptions,
            weatherChoice: null,
            finalItinerary,
            culturalTips: meta.cultural_tips || null,
            matchScore: meta?.metadata?.match_score ?? null,
          } as ChatMessage;
        });
        setMessages(loaded);
        if (sawPlanning) setPlanningMode(true);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsTyping(false);
    }
  }, []);

  // Start new conversation
  const startNewChat = useCallback(() => {
    streamHandleRef.current?.abort();
    streamHandleRef.current = null;
    setSessionId(null);
    setMessages([]);
    setShowHistory(false);
    setAttachedImageUri(null);
    attachedImageBase64Ref.current = null;
    attachedImageDisplayUriRef.current = null;
    setPlanningMode(false);
    setPendingResume(null);
    setResumeBusy(false);
    setSavingPlanId(null);
  }, []);

  // Delete session
  const deleteSession = useCallback(async (id: string) => {
    try {
      await tourGuideChatService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.sessionId !== id));
      if (sessionId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [sessionId, startNewChat]);

  // ─────────────────────────────────────────
  // IMAGE PICKER
  // ─────────────────────────────────────────
  // base64 for the pending attachment (stored alongside the URI for sending)
  const attachedImageBase64Ref = useRef<string | null>(null);
  // data: URI for immediate display in the chat bubble before ImageKit URL arrives
  const attachedImageDisplayUriRef = useRef<string | null>(null);

  const handleImagePicked = useCallback((response: ImagePickerResponse) => {
    setShowAttachMenu(false);
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select image');
      return;
    }
    const asset = response.assets?.[0];
    if (asset?.uri) {
      setAttachedImageUri(asset.uri);
      attachedImageBase64Ref.current = asset.base64 ?? null;
      if (!inputText.trim()) {
        setInputText('Where is this place?');
      }
    }
  }, [inputText]);

  const openGallery = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 1024, maxHeight: 1024, selectionLimit: 1, includeBase64: true },
      handleImagePicked,
    );
  }, [handleImagePicked]);

  const openCamera = useCallback(() => {
    launchCamera(
      { mediaType: 'photo', quality: 0.8, maxWidth: 1024, maxHeight: 1024, saveToPhotos: false, includeBase64: true },
      handleImagePicked,
    );
  }, [handleImagePicked]);

  // ─────────────────────────────────────────
  // RESPONSE → BUBBLE INGESTION
  // ─────────────────────────────────────────
  // Convert a backend response (sync or stream-complete) into one or more
  // assistant chat bubbles based on which planning artifacts came back.
  const ingestServerResponse = useCallback(
    (data: GuideMessageResponse['data'], userMsgId?: string) => {
      // Persist session id
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      // Swap in ImageKit URL on the user message we just sent
      if (data.userImageUrl && userMsgId) {
        setMessages(prev =>
          prev.map(m =>
            m.id === userMsgId
              ? { ...m, imageUri: data.userImageUrl!, imageBase64: null }
              : m,
          ),
        );
      }

      const isPlanning =
        data.intent === 'trip_planning' ||
        !!data.finalItinerary ||
        !!data.clarificationQuestion ||
        (data.pendingUserSelection && (data.selectionCards?.length || 0) > 0) ||
        (data.weatherInterrupt && (data.weatherPromptOptions?.length || 0) > 0);
      if (isPlanning) setPlanningMode(true);

      const newBubbles: ChatMessage[] = [];
      const baseId = `a-${Date.now()}`;

      // Priority order: clarification → HITL → weather → final plan → text
      if (data.clarificationQuestion) {
        newBubbles.push({
          id: `${baseId}-c`,
          content: data.clarificationQuestion.question,
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent ?? null,
          metadata: data.metadata,
          bubbleKind: 'clarification',
          clarificationQuestion: data.clarificationQuestion,
          clarificationAnswered: null,
        });
      } else if (data.pendingUserSelection && data.selectionCards?.length) {
        const id = `${baseId}-h`;
        newBubbles.push({
          id,
          content: data.promptText || 'Pick one to continue',
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent ?? null,
          metadata: data.metadata,
          bubbleKind: 'hitlSelection',
          selectionCards: data.selectionCards,
          selectionPromptText: data.promptText ?? null,
          selectionAnswered: null,
        });
        setPendingResume({ kind: 'selection', bubbleMsgId: id });
      } else if (data.weatherInterrupt && data.weatherPromptOptions?.length) {
        const id = `${baseId}-w`;
        newBubbles.push({
          id,
          content: data.weatherPromptMessage || 'Weather decision needed',
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent ?? null,
          metadata: data.metadata,
          bubbleKind: 'weatherPrompt',
          weatherPromptMessage: data.weatherPromptMessage ?? null,
          weatherPromptOptions: data.weatherPromptOptions,
          weatherChoice: null,
        });
        setPendingResume({ kind: 'weather', bubbleMsgId: id });
      } else if (data.finalItinerary && data.finalItinerary.stops?.length) {
        newBubbles.push({
          id: `${baseId}-p`,
          content: data.response || 'Your tour plan is ready.',
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent ?? null,
          metadata: data.metadata,
          bubbleKind: 'planCard',
          finalItinerary: data.finalItinerary,
          culturalTips: data.culturalTips ?? null,
          matchScore: (data.metadata as any)?.match_score ?? null,
          itinerary: data.itinerary ?? null,
          constraints: data.constraints ?? null,
          // Show step results above the plan card so the user can see how it
          // was assembled.
          agentSteps: data.stepResults ?? null,
          agentActive: false,
        });
      } else {
        newBubbles.push({
          id: `${baseId}-t`,
          content: data.response || "I couldn't generate a response. Please try again.",
          role: 'assistant',
          timestamp: new Date(),
          intent: data.intent ?? null,
          metadata: data.metadata,
          itinerary: data.itinerary,
          constraints: data.constraints,
          imageResults: data.imageResults,
          imageValidationMessage: data.imageValidationMessage,
        });
      }

      // Replace the live "agentProgress" bubble (if any) with the final
      // bubbles, otherwise append.
      setMessages(prev => {
        const idx = prev.findIndex(m => m.bubbleKind === 'agentProgress' && m.agentActive);
        if (idx === -1) return [...prev, ...newBubbles];
        const next = [...prev];
        next.splice(idx, 1, ...newBubbles);
        return next;
      });
    },
    [sessionId],
  );

  // ─────────────────────────────────────────
  // SEND MESSAGE  (streaming with sync fallback inside ChatService)
  // ─────────────────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const textToSend = (text ?? inputText).trim();
      if ((!textToSend && !attachedImageUri) || isTyping || resumeBusy) return;

      const messageText =
        textToSend || (attachedImageUri ? 'Where is this place?' : '');
      const currentImageBase64 = attachedImageBase64Ref.current ?? undefined;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        content: messageText,
        role: 'user',
        timestamp: new Date(),
        status: 'sent',
        imageBase64: currentImageBase64 ?? null,
        imageUri: null,
      };

      const progressMsgId = `a-progress-${Date.now()}`;
      const progressMsg: ChatMessage = {
        id: progressMsgId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        bubbleKind: 'agentProgress',
        agentSteps: [],
        agentActive: true,
      };

      setMessages(prev => [...prev, userMsg, progressMsg]);
      setInputText('');
      setAttachedImageUri(null);
      attachedImageBase64Ref.current = null;
      attachedImageDisplayUriRef.current = null;
      setIsTyping(true);

      // If we don't have a sessionId yet, fall back to sync quickChat (which
      // creates one). Streaming uses sessionId-scoped routes.
      if (!sessionId) {
        try {
          const resp = await tourGuideChatService.quickChat(
            messageText,
            undefined,
            currentImageBase64,
          );
          if (resp.success && resp.data) {
            ingestServerResponse(resp.data, userMsg.id);
          } else {
            setMessages(prev =>
              prev.filter(m => m.id !== progressMsgId).concat({
                id: `a-${Date.now()}`,
                content: 'Something went wrong. Please try again.',
                role: 'assistant',
                timestamp: new Date(),
              }),
            );
          }
        } catch (err: any) {
          const errorText =
            err?.response?.status === 401
              ? 'Authentication failed. Please log in again.'
              : 'Network error. Please check your connection and try again.';
          setMessages(prev =>
            prev.filter(m => m.id !== progressMsgId).concat({
              id: `a-${Date.now()}`,
              content: errorText,
              role: 'assistant',
              timestamp: new Date(),
            }),
          );
        } finally {
          setIsTyping(false);
        }
        return;
      }

      // Streaming path
      streamHandleRef.current?.abort();
      streamHandleRef.current = tourGuideChatService.sendMessageStream(
        sessionId,
        messageText,
        {
          onStep: step => {
            setMessages(prev =>
              prev.map(m =>
                m.id === progressMsgId
                  ? {
                      ...m,
                      agentSteps: [...(m.agentSteps || []), step],
                      agentActive: true,
                    }
                  : m,
              ),
            );
          },
          onComplete: data => {
            ingestServerResponse(data, userMsg.id);
            setIsTyping(false);
            streamHandleRef.current = null;
          },
          onError: err => {
            console.error('Stream error:', err);
            const status = (err as any)?.response?.status;
            const errorText =
              status === 401
                ? 'Authentication failed. Please log in again.'
                : 'Something went wrong while planning. Please try again.';
            setMessages(prev =>
              prev.filter(m => m.id !== progressMsgId).concat({
                id: `a-${Date.now()}`,
                content: errorText,
                role: 'assistant',
                timestamp: new Date(),
              }),
            );
            setIsTyping(false);
            streamHandleRef.current = null;
          },
        },
        currentImageBase64,
      );
    },
    [
      inputText,
      isTyping,
      sessionId,
      attachedImageUri,
      resumeBusy,
      ingestServerResponse,
    ],
  );

  // ─────────────────────────────────────────
  // RESUME HANDLERS (clarification, HITL, weather)
  // ─────────────────────────────────────────
  const handleClarificationAnswer = useCallback(
    (msgId: string, label: string) => {
      // Lock the chips visually and fire the answer as a normal user message
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId ? { ...m, clarificationAnswered: label } : m,
        ),
      );
      handleSend(label);
    },
    [handleSend],
  );

  const handleHitlSelect = useCallback(
    async (msgId: string, cardId: string, label?: string) => {
      if (!sessionId) return;
      setResumeBusy(true);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, selectionAnswered: { cardId, label } }
            : m,
        ),
      );
      // Append a synthetic user message so the chat reads naturally
      setMessages(prev => [
        ...prev,
        {
          id: `u-sel-${Date.now()}`,
          content: label ? `Selected: ${label}` : `Selected option`,
          role: 'user',
          timestamp: new Date(),
          status: 'sent',
        },
      ]);
      // Drop in a fresh progress bubble while the agent re-runs
      const progressMsgId = `a-progress-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: progressMsgId,
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          bubbleKind: 'agentProgress',
          agentSteps: [],
          agentActive: true,
        },
      ]);

      try {
        const resp = await tourGuideChatService.resumeSelection(
          sessionId,
          cardId,
          label,
        );
        if (resp.success && resp.data) {
          ingestServerResponse(resp.data);
        }
      } catch (err) {
        console.error('Resume selection failed:', err);
        setMessages(prev =>
          prev.filter(m => m.id !== progressMsgId).concat({
            id: `a-${Date.now()}`,
            content: 'Could not apply your selection. Please try again.',
            role: 'assistant',
            timestamp: new Date(),
          }),
        );
      } finally {
        setResumeBusy(false);
        setPendingResume(null);
      }
    },
    [sessionId, ingestServerResponse],
  );

  const handleHitlSkip = useCallback(
    (msgId: string) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, selectionAnswered: { cardId: '', label: 'Skipped' } }
            : m,
        ),
      );
      setPendingResume(null);
      handleSend('Skip selection — use your default ranking.');
    },
    [handleSend],
  );

  const handleWeatherChoice = useCallback(
    async (
      msgId: string,
      choice: 'switch_indoor' | 'reschedule' | 'keep',
      label: string,
    ) => {
      if (!sessionId) return;
      setResumeBusy(true);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId ? { ...m, weatherChoice: choice } : m,
        ),
      );
      setMessages(prev => [
        ...prev,
        {
          id: `u-wx-${Date.now()}`,
          content: label,
          role: 'user',
          timestamp: new Date(),
          status: 'sent',
        },
      ]);
      const progressMsgId = `a-progress-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: progressMsgId,
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          bubbleKind: 'agentProgress',
          agentSteps: [],
          agentActive: true,
        },
      ]);

      try {
        const resp = await tourGuideChatService.resumeWeather(sessionId, choice);
        if (resp.success && resp.data) ingestServerResponse(resp.data);
      } catch (err) {
        console.error('Resume weather failed:', err);
      } finally {
        setResumeBusy(false);
        setPendingResume(null);
      }
    },
    [sessionId, ingestServerResponse],
  );

  // Save plan → uses the existing TourPlanService.acceptPlan
  const handleSavePlan = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.finalItinerary || !sessionId) return;
      setSavingPlanId(msg.id);
      try {
        const itinerarySlots = (msg.finalItinerary.stops || []).map((stop, i) => ({
          time: stop.time,
          location: stop.location,
          activity: stop.activity,
          duration_minutes: stop.duration_minutes,
          crowd_prediction: stop.crowd_prediction,
          lighting_quality: stop.lighting_quality,
          notes: stop.notes,
          day: stop.day,
          order: i,
          icon: stop.icon,
          highlight: stop.highlight,
          ai_insight: stop.ai_insight,
          cultural_tip: stop.cultural_tip,
          ethical_note: stop.ethical_note,
          best_photo_time: stop.best_photo_time,
        }));
        const tripTitle = msg.finalItinerary.summary?.slice(0, 80) || 'Travion Tour Plan';
        await tourPlanService.acceptPlan({
          threadId: sessionId,
          title: tripTitle,
          description: msg.finalItinerary.summary,
          itinerary: itinerarySlots as any,
        });
        Alert.alert('Saved', 'Your tour plan has been saved to My Trips.');
      } catch (err: any) {
        console.error('Save plan failed:', err);
        Alert.alert('Could not save', err?.message || 'Please try again later.');
      } finally {
        setSavingPlanId(null);
      }
    },
    [sessionId],
  );

  const handleRefinePlan = useCallback(() => {
    inputRef.current?.focus();
    setInputText('');
  }, []);

  const canSend = (inputText.trim().length > 0 || !!attachedImageUri) && !isTyping;
  const showSuggestions = messages.length === 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* -- HEADER -- */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { marginTop: -insets.top, paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={s.headerAvatarWrap}>
          <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']} style={s.headerAvatarGrad}>
            <Text style={s.headerAvatarLetter}>T</Text>
          </LinearGradient>
          <View style={s.headerOnlineDot} />
        </View>

        <View style={s.headerInfo}>
          <Text style={s.headerName}>Travion</Text>
          <View style={s.headerStatusRow}>
            <MaterialCommunityIcons name="lightning-bolt" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={s.headerStatus}>
              {isTyping
                ? planningMode
                  ? 'Planning your trip…'
                  : 'thinking...'
                : planningMode
                  ? 'Planning mode · ready'
                  : 'AI Travel Guide · Online'}
            </Text>
          </View>
        </View>

        {/* History button */}
        <TouchableOpacity
          onPress={() => { loadSessions(); setShowHistory(true); }}
          style={s.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        {/* New chat button */}
        <TouchableOpacity onPress={startNewChat} style={s.headerBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* -- CHAT + INPUT -- */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.chatBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome card (only on new conversation) */}
          {showSuggestions && <WelcomeCard />}

          <DateSeparator date={new Date()} />

          {/* Messages */}
          {messages.map(msg => {
            // Dispatch to the right renderer based on bubbleKind so
            // planning bubbles (clarification, HITL, weather, plan card)
            // render alongside regular text bubbles.
            if (msg.bubbleKind === 'agentProgress') {
              return (
                <AgentProgressIndicator
                  key={msg.id}
                  steps={msg.agentSteps || []}
                  active={!!msg.agentActive}
                />
              );
            }
            if (msg.bubbleKind === 'clarification' && msg.clarificationQuestion) {
              return (
                <InlineClarificationBubble
                  key={msg.id}
                  question={msg.clarificationQuestion}
                  selectedLabel={msg.clarificationAnswered ?? null}
                  disabled={!!msg.clarificationAnswered || isTyping}
                  onSelect={label => handleClarificationAnswer(msg.id, label)}
                />
              );
            }
            if (msg.bubbleKind === 'hitlSelection' && msg.selectionCards?.length) {
              return (
                <InlineHitlBubble
                  key={msg.id}
                  cards={msg.selectionCards}
                  promptText={msg.selectionPromptText}
                  disabled={!!msg.selectionAnswered || resumeBusy}
                  loading={resumeBusy && pendingResume?.bubbleMsgId === msg.id}
                  onSelect={(cardId, label) => handleHitlSelect(msg.id, cardId, label)}
                  onSkip={() => handleHitlSkip(msg.id)}
                />
              );
            }
            if (msg.bubbleKind === 'weatherPrompt' && msg.weatherPromptOptions?.length) {
              return (
                <WeatherAlertBubble
                  key={msg.id}
                  message={msg.weatherPromptMessage || 'Weather alert'}
                  options={msg.weatherPromptOptions}
                  selectedId={msg.weatherChoice}
                  disabled={!!msg.weatherChoice || resumeBusy}
                  onChoose={(choice, label) =>
                    handleWeatherChoice(msg.id, choice, label)
                  }
                />
              );
            }
            if (msg.bubbleKind === 'planCard' && msg.finalItinerary) {
              return (
                <View key={msg.id}>
                  {msg.agentSteps && msg.agentSteps.length > 0 && (
                    <AgentProgressIndicator
                      steps={msg.agentSteps}
                      active={false}
                    />
                  )}
                  <InlineTourPlanCard
                    finalItinerary={msg.finalItinerary}
                    culturalTips={msg.culturalTips}
                    matchScore={msg.matchScore ?? undefined}
                    isSaving={savingPlanId === msg.id}
                    onSave={() => handleSavePlan(msg)}
                    onRefine={handleRefinePlan}
                  />
                </View>
              );
            }
            return <MessageBubble key={msg.id} message={msg} />;
          })}

          {/* Typing indicator (only show when no live progress bubble) */}
          {isTyping &&
            !messages.some(
              m => m.bubbleKind === 'agentProgress' && m.agentActive,
            ) && <TypingIndicator />}

          {/* Quick suggestions */}
          {showSuggestions && !isTyping && (
            <View style={s.suggestSection}>
              <View style={s.suggestHeader}>
                <View style={s.suggestLine} />
                <Text style={s.suggestLabel}>ASK TRAVION</Text>
                <View style={s.suggestLine} />
              </View>
              <View style={s.suggestGrid}>
                {SUGGESTIONS.map(sg => (
                  <TouchableOpacity key={sg.text} style={s.suggestChip} onPress={() => handleSend(sg.text)} activeOpacity={0.7}>
                    <Text style={s.suggestEmoji}>{sg.emoji}</Text>
                    <Text style={s.suggestText}>{sg.text}</Text>
                    <Ionicons name="chevron-forward" size={11} color={C.primary} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* -- INPUT BAR -- */}
        <View style={[s.inputBar, inputFocused && s.inputBarFocused, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {/* Image attachment preview */}
          {attachedImageUri && (
            <AttachmentPreview uri={attachedImageUri} onRemove={() => setAttachedImageUri(null)} />
          )}

          <View style={s.inputRow}>
            {/* Attach button */}
            <TouchableOpacity
              onPress={() => setShowAttachMenu(prev => !prev)}
              style={s.attachBtn}
              activeOpacity={0.7}
            >
              <Ionicons name={showAttachMenu ? 'close' : 'camera-outline'} size={22} color={showAttachMenu ? C.error : C.primary} />
            </TouchableOpacity>

            <View style={[s.inputWrap, inputFocused && s.inputWrapFocused]}>
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder={attachedImageUri ? 'Add a message about this image...' : 'Ask Travion anything...'}
                placeholderTextColor={C.textSoft}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                returnKeyType="default"
              />
            </View>
            <TouchableOpacity onPress={() => handleSend()} disabled={!canSend} activeOpacity={0.85} style={s.sendBtnWrap}>
              <LinearGradient colors={canSend ? [C.primary, C.primaryDark] : ['#D1C7BE', '#BDB3AA']} style={s.sendBtn}>
                {isTyping ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="send" size={18} color={C.white} style={{ marginLeft: 2 }} />}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Attach options menu */}
          {showAttachMenu && (
            <View style={s.attachMenu}>
              <TouchableOpacity style={s.attachMenuItem} onPress={openCamera} activeOpacity={0.7}>
                <View style={[s.attachMenuIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="camera" size={20} color={C.info} />
                </View>
                <Text style={s.attachMenuText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.attachMenuItem} onPress={openGallery} activeOpacity={0.7}>
                <View style={[s.attachMenuIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="images" size={20} color={C.success} />
                </View>
                <Text style={s.attachMenuText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.poweredRow}>
            <MaterialCommunityIcons name="shield-check" size={10} color={C.textSoft} />
            <Text style={s.poweredText}>Powered by Travion AI Agent Engine</Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* -- CONVERSATION HISTORY MODAL -- */}
      <ConversationListModal
        visible={showHistory}
        sessions={sessions}
        loading={loadingSessions}
        onSelect={loadSession}
        onNewChat={startNewChat}
        onDelete={deleteSession}
        onClose={() => setShowHistory(false)}
      />
    </View>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.primaryDeep, overflow: 'visible' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, elevation: 6, shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6 },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  headerAvatarWrap: { marginLeft: 2, marginRight: 10, position: 'relative' },
  headerAvatarGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  headerAvatarLetter: { fontSize: 20, fontFamily: 'Gilroy-Bold', color: C.white },
  headerOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 5.5, backgroundColor: C.onlineDot, borderWidth: 2, borderColor: C.primaryDark },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16.5, fontFamily: 'Gilroy-Bold', color: C.white, letterSpacing: 0.2 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  headerStatus: { fontSize: 11, fontFamily: 'Gilroy-Regular', color: 'rgba(255,255,255,0.82)' },

  // Scroll
  scroll: { flex: 1, backgroundColor: C.chatBg },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 4 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: C.border },
  dateSepPill: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3, marginHorizontal: 10, borderWidth: 1, borderColor: C.border },
  dateSepText: { fontSize: 11.5, fontFamily: 'Gilroy-Medium', color: C.textSoft },

  // Welcome card
  welcomeCard: { marginTop: 4, marginBottom: 4, borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  welcomeGrad: { padding: 20, alignItems: 'center' },
  welcomeAvatarWrap: { alignItems: 'center', marginBottom: 10 },
  welcomeAvatarCircle: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: C.white, elevation: 4 },
  welcomeName: { fontSize: 24, fontFamily: 'Gilroy-Bold', color: C.primaryDark, letterSpacing: 0.5, marginBottom: 2 },
  welcomeRole: { fontSize: 13, fontFamily: 'Gilroy-Medium', color: C.textMid },
  welcomeDivider: { width: 40, height: 2, backgroundColor: C.primary, borderRadius: 2, marginVertical: 12, opacity: 0.5 },
  welcomeDesc: { fontSize: 13.5, fontFamily: 'Gilroy-Regular', color: C.textMid, textAlign: 'center', lineHeight: 20, paddingHorizontal: 4 },
  welcomeTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  welcomeTag: { backgroundColor: C.tagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  welcomeTagText: { fontSize: 12, fontFamily: 'Gilroy-SemiBold', color: C.tagText },

  // Avatar
  avatarGrad: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: 'Gilroy-Bold', color: C.white },

  // User bubble
  userRow: { alignItems: 'flex-end', marginBottom: 4, marginTop: 2 },
  userBubble: { maxWidth: width * 0.76, backgroundColor: C.userBubble, borderRadius: 18, borderBottomRightRadius: 4, borderWidth: 1, borderColor: C.userBubbleBorder, padding: 10, paddingBottom: 7, elevation: 1 },
  userTail: { position: 'absolute', right: -7, bottom: 8, width: 0, height: 0, borderTopWidth: 7, borderLeftWidth: 9, borderTopColor: 'transparent', borderLeftColor: C.userBubbleBorder },
  userText: { fontSize: 14.5, fontFamily: 'Gilroy-Regular', color: C.dark, lineHeight: 21 },
  userFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
  timeUser: { fontSize: 10.5, fontFamily: 'Gilroy-Regular', color: C.textSoft },
  userImageThumb: { width: '100%', height: 160, borderRadius: 12, marginBottom: 8 },

  // AI bubble
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, marginTop: 2, gap: 7 },
  aiBubble: { flex: 1, maxWidth: width * 0.76, backgroundColor: C.aiBubble, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(245,132,14,0.18)', padding: 10, paddingBottom: 7, elevation: 1, borderLeftWidth: 3, borderLeftColor: C.primary },
  aiTail: { position: 'absolute', left: -9, bottom: 8, width: 0, height: 0, borderTopWidth: 7, borderRightWidth: 9, borderTopColor: 'transparent', borderRightColor: C.primary },
  aiBubbleName: { fontSize: 11.5, fontFamily: 'Gilroy-Bold', color: C.primary, marginBottom: 4, letterSpacing: 0.3 },
  timeAI: { fontSize: 10.5, fontFamily: 'Gilroy-Regular', color: C.textSoft, textAlign: 'right', marginTop: 4 },

  // Validation banner
  validationBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: '#FDE68A' },
  validationText: { flex: 1, fontSize: 12.5, fontFamily: 'Gilroy-Medium', color: '#92400E', lineHeight: 17 },

  // Image search results
  imgResultsContainer: { marginTop: 8, backgroundColor: '#FFFAF5', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(245,132,14,0.15)' },
  imgResultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  imgResultsTitle: { fontSize: 13, fontFamily: 'Gilroy-Bold', color: C.primary, flex: 1 },
  imgResultsCount: { fontSize: 11, fontFamily: 'Gilroy-Medium', color: C.textSoft },
  imgResultsScroll: { marginHorizontal: -4 },

  // Image result card
  imgCard: { width: 160, marginHorizontal: 4, borderRadius: 12, backgroundColor: C.white, borderWidth: 1, borderColor: '#F0EBE5', overflow: 'hidden', elevation: 1 },
  imgCardImage: { width: '100%', height: 100 },
  imgCardPlaceholder: { backgroundColor: '#F5F0EB', alignItems: 'center', justifyContent: 'center' },
  imgCardInfo: { padding: 8 },
  imgCardLocation: { fontSize: 12.5, fontFamily: 'Gilroy-Bold', color: C.dark },
  imgCardDesc: { fontSize: 11, fontFamily: 'Gilroy-Regular', color: C.textMid, lineHeight: 15, marginTop: 2 },
  imgCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  imgCardScore: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  imgCardScoreText: { fontSize: 10, fontFamily: 'Gilroy-Medium', color: C.primary },
  imgCardTags: { fontSize: 9.5, fontFamily: 'Gilroy-Regular', color: C.textSoft, maxWidth: 80 },

  // Metadata badges
  metaContainer: { marginTop: 6 },
  metaDivider: { height: 1, backgroundColor: '#F3F0EB', marginBottom: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, gap: 4 },
  metaBadgeText: { fontSize: 10.5, fontFamily: 'Gilroy-Medium' },

  // Constraint cards
  constraintCard: { borderRadius: 10, padding: 10, borderLeftWidth: 3, marginBottom: 4 },
  constraintHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  constraintType: { fontSize: 10.5, fontFamily: 'Gilroy-Bold', letterSpacing: 0.3 },
  constraintDesc: { fontSize: 12.5, fontFamily: 'Gilroy-Regular', color: C.dark, lineHeight: 18 },
  constraintSuggRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  constraintSugg: { fontSize: 12, fontFamily: 'Gilroy-Medium', color: C.primaryDark, flex: 1, lineHeight: 17 },

  // Itinerary
  itinContainer: { marginTop: 10, backgroundColor: '#FFFAF5', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(245,132,14,0.15)' },
  itinHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  itinHeaderText: { fontSize: 13, fontFamily: 'Gilroy-Bold', color: C.primary },
  itinCard: { flexDirection: 'row', marginBottom: 2 },
  itinTimeline: { width: 20, alignItems: 'center' },
  itinDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  itinLine: { width: 2, flex: 1, backgroundColor: '#FFD4A8', marginVertical: 2 },
  itinContent: { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 8, marginBottom: 6, marginLeft: 6, borderWidth: 1, borderColor: '#F0EBE5' },
  itinTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itinTime: { fontSize: 12, fontFamily: 'Gilroy-Bold', color: C.primary },
  itinDuration: { fontSize: 10.5, fontFamily: 'Gilroy-Regular', color: C.textSoft },
  itinLocation: { fontSize: 13.5, fontFamily: 'Gilroy-Bold', color: C.dark, marginTop: 3 },
  itinActivity: { fontSize: 12.5, fontFamily: 'Gilroy-Regular', color: C.textMid, lineHeight: 18, marginTop: 2 },
  itinBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  itinBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  itinBadgeText: { fontSize: 10, fontFamily: 'Gilroy-Medium' },
  itinTip: { marginTop: 6, backgroundColor: '#FFF7ED', borderRadius: 6, padding: 6 },
  itinTipText: { fontSize: 11.5, fontFamily: 'Gilroy-Regular', color: C.primaryDark, lineHeight: 16 },
  itinMore: { fontSize: 12, fontFamily: 'Gilroy-Medium', color: C.primary, textAlign: 'center', paddingVertical: 6 },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6, marginTop: 4, gap: 7 },
  typingBubble: { backgroundColor: C.aiBubble, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(245,132,14,0.18)', borderLeftWidth: 3, borderLeftColor: C.primary, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 1 },
  typingLabel: { fontSize: 12, fontFamily: 'Gilroy-Medium', color: C.textSoft, marginRight: 4 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary, opacity: 0.7 },

  // Suggestions
  suggestSection: { marginTop: 6, marginBottom: 4 },
  suggestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingHorizontal: 4 },
  suggestLine: { flex: 1, height: 1, backgroundColor: C.border },
  suggestLabel: { fontSize: 12, fontFamily: 'Gilroy-Bold', color: C.primary, letterSpacing: 0.8 },
  suggestGrid: { gap: 8 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(245,132,14,0.2)', elevation: 1, gap: 10 },
  suggestEmoji: { fontSize: 18 },
  suggestText: { fontSize: 13.5, fontFamily: 'Gilroy-Medium', color: C.dark, flex: 1 },

  // Input bar
  inputBar: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 12, paddingTop: 10, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  inputBarFocused: { borderTopColor: `${C.primary}55` },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F9F5F0', borderRadius: 26, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 2, minHeight: 46, maxHeight: 120 },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: '#FFFAF5' },
  input: { flex: 1, fontSize: 14.5, fontFamily: 'Gilroy-Regular', color: C.dark, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, margin: 0 },
  sendBtnWrap: { alignSelf: 'flex-end' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },

  // Attach button & menu
  attachBtn: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center' },
  attachMenu: { flexDirection: 'row', gap: 16, paddingVertical: 10, paddingHorizontal: 4 },
  attachMenuItem: { alignItems: 'center', gap: 4 },
  attachMenuIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  attachMenuText: { fontSize: 11, fontFamily: 'Gilroy-Medium', color: C.textMid },

  // Attachment preview
  attachPreview: { position: 'relative', marginBottom: 8, alignSelf: 'flex-start' },
  attachThumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  attachRemoveBtn: { position: 'absolute', top: -6, right: -6 },

  poweredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6, paddingBottom: 2 },
  poweredText: { fontSize: 10, fontFamily: 'Gilroy-Regular', color: C.textSoft },

  // Conversation history modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '75%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Gilroy-Bold', color: C.dark },
  modalNewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 5 },
  modalNewBtnText: { fontSize: 12.5, fontFamily: 'Gilroy-Bold', color: C.white },
  modalLoading: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  modalLoadingText: { fontSize: 13, fontFamily: 'Gilroy-Regular', color: C.textSoft },
  modalEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  modalEmptyText: { fontSize: 15, fontFamily: 'Gilroy-Bold', color: C.dark },
  modalEmptySubtext: { fontSize: 13, fontFamily: 'Gilroy-Regular', color: C.textSoft },
  sessionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F5F0EB', gap: 12 },
  sessionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontFamily: 'Gilroy-SemiBold', color: C.dark },
  sessionMeta: { fontSize: 11.5, fontFamily: 'Gilroy-Regular', color: C.textSoft, marginTop: 2 },
  modalCloseBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F5F0EB' },
  modalCloseBtnText: { fontSize: 14, fontFamily: 'Gilroy-Bold', color: C.textSoft },
});

export default TourGuideChatScreen;
