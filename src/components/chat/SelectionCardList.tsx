/**
 * SelectionCardList
 *
 * Minimalist, Airbnb-inspired horizontal card picker for the HITL
 * selection flow. Renders when the AI Engine pauses the graph with
 * `pendingUserSelection: true` and returns `selectionCards`.
 *
 * Design: Slate-900 text · Indigo-600 primary · Soft gray cards
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SelectionCard } from '../../services/api/TourPlanService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.76;
const CARD_GAP = 14;

// ── Minimalist Palette ──
const P = {
  slate900: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  indigo600: '#4F46E5',
  indigo50: '#EEF2FF',
  amber500: '#F59E0B',
  emerald600: '#059669',
  white: '#FFFFFF',
};

// ── Sub-components ──

const StarRow: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={s.starRow}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < Math.floor(rating) ? 'star' : 'star-outline'}
        size={12}
        color={i < Math.floor(rating) ? P.amber500 : P.slate200}
        style={{ marginRight: 2 }}
      />
    ))}
    <Text style={s.ratingNum}>{rating.toFixed(1)}</Text>
  </View>
);

const PriceLevel: React.FC<{ price: string }> = ({ price }) => {
  const active = price.length;
  return (
    <View style={s.priceRow}>
      {[1, 2, 3, 4].map(i => (
        <Text key={i} style={[s.priceDollar, i <= active ? s.priceActive : s.priceInactive]}>
          $
        </Text>
      ))}
    </View>
  );
};

// ── Main Component ──

interface SelectionCardListProps {
  cards: SelectionCard[];
  onSelect: (cardId: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const SelectionCardList: React.FC<SelectionCardListProps> = ({
  cards,
  onSelect,
  onSkip,
  disabled = false,
  loading = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSelect = (cardId: string) => {
    setSelectedId(cardId);
    onSelect(cardId);
  };

  const renderCard = ({ item }: { item: SelectionCard }) => {
    const isSelected = selectedId === item.card_id;

    return (
      <View style={[s.card, isSelected && s.cardSelected]}>
        {/* Hero Image */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={s.heroImage} resizeMode="cover" />
        ) : (
          <View style={[s.heroImage, s.heroPlaceholder]}>
            <Ionicons name="image-outline" size={36} color={P.slate200} />
          </View>
        )}

        {/* Badge */}
        {item.badge ? (
          <View style={s.badgeContainer}>
            <Text style={s.badgeLabel}>{item.badge}</Text>
          </View>
        ) : null}

        {/* Body */}
        <View style={s.cardBody}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          {item.subtitle ? (
            <Text style={s.subtitle} numberOfLines={1}>{item.subtitle}</Text>
          ) : null}

          {/* Rating & Price */}
          <View style={s.metaRow}>
            {item.rating != null && <StarRow rating={item.rating} />}
            <View style={{ flex: 1 }} />
            {item.price_range && <PriceLevel price={item.price_range} />}
          </View>

          {/* Distance */}
          {item.distance_km != null && (
            <View style={s.distanceRow}>
              <Ionicons name="navigate-outline" size={13} color={P.slate400} />
              <Text style={s.distanceText}>
                {item.distance_km < 1
                  ? `${Math.round(item.distance_km * 1000)} m away`
                  : `${item.distance_km.toFixed(1)} km away`}
              </Text>
            </View>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={s.tagsRow}>
              {item.tags.slice(0, 4).map((tag, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Vibe Match */}
          {item.vibe_match_score != null && (
            <View style={s.vibeRow}>
              <MaterialCommunityIcons name="heart-pulse" size={13} color={P.indigo600} />
              <View style={s.vibeBarBg}>
                <View style={[s.vibeBarFill, { width: `${item.vibe_match_score}%` }]} />
              </View>
              <Text style={s.vibePercent}>{item.vibe_match_score}%</Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[s.ctaButton, (disabled || isSelected) && s.ctaButtonDisabled]}
            onPress={() => handleSelect(item.card_id)}
            disabled={disabled || loading || isSelected}
            activeOpacity={0.8}
          >
            {loading && isSelected ? (
              <ActivityIndicator size="small" color={P.white} />
            ) : (
              <>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18}
                  color={P.white}
                />
                <Text style={s.ctaText}>
                  {isSelected ? 'Selected' : 'Select & Add to Plan'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <View style={s.sectionHeader}>
        <MaterialCommunityIcons name="card-search-outline" size={16} color={P.indigo600} />
        <Text style={s.sectionLabel}>Choose one to continue</Text>
      </View>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={item => item.card_id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={s.listContent}
      />

      {cards.length > 1 && (
        <View style={s.dotsRow}>
          {cards.map((c, i) => (
            <View key={i} style={[s.dot, selectedId === c.card_id && s.dotActive]} />
          ))}
        </View>
      )}

      {/* Skip current selection step */}
      {onSkip && !selectedId && (
        <TouchableOpacity
          style={s.skipButton}
          onPress={onSkip}
          disabled={disabled || loading}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-forward-outline" size={15} color={P.slate500} />
          <Text style={s.skipText}>Skip this step</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default SelectionCardList;

// ── Styles ──

const s = StyleSheet.create({
  root: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: P.slate500,
    letterSpacing: 0.2,
  },
  listContent: {
    paddingLeft: 2,
    paddingRight: 20,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: P.white,
    borderRadius: 16,
    marginRight: CARD_GAP,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.slate100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSelected: {
    borderColor: P.indigo600,
    borderWidth: 2,
  },

  heroImage: {
    width: '100%',
    height: 160,
    backgroundColor: P.slate50,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: P.slate900,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLabel: {
    color: P.white,
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    letterSpacing: 0.3,
  },

  cardBody: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: P.slate500,
    marginTop: 2,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNum: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: P.slate700,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
  },
  priceDollar: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 1,
  },
  priceActive: {
    color: P.slate900,
  },
  priceInactive: {
    color: P.slate200,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: P.slate50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: P.slate200,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: P.slate700,
  },

  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  vibeBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: P.slate100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  vibeBarFill: {
    height: '100%',
    backgroundColor: P.indigo600,
    borderRadius: 2,
  },
  vibePercent: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: P.indigo600,
    width: 32,
    textAlign: 'right',
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.indigo600,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: P.slate400,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: P.white,
    letterSpacing: 0.2,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P.slate200,
  },
  dotActive: {
    backgroundColor: P.indigo600,
    width: 18,
    borderRadius: 3,
  },

  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.slate200,
    backgroundColor: P.slate50,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: P.slate500,
    letterSpacing: 0.1,
  },
});
