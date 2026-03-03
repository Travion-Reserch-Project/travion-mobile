/**
 * Safety Checklist Data
 *
 * Maps each UV risk level to a list of safety tips.
 * Used by the SafetyChecklist component on multiple screens.
 */

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very high' | 'extreme';

export interface SafetyTip {
  /** FontAwesome icon name */
  icon: string;
  /** Card title */
  title: string;
  /** Short description */
  description: string;
}

/** Accent colours per risk level (icon background & icon tint) */
export const riskAccentColors: Record<RiskLevel, { bg: string; tint: string }> = {
  low: { bg: '#DCFCE7', tint: '#22C55E' }, // green
  moderate: { bg: '#FEF9C3', tint: '#EAB308' }, // yellow
  high: { bg: '#FFEDD5', tint: '#F97316' }, // orange
  'very high': { bg: '#FFE2CC', tint: '#FF8C1A' }, // deep orange
  extreme: { bg: '#FEE2E2', tint: '#EF4444' }, // red
};

/**
 * Full mapping: risk level → ordered list of safety tips.
 */
export const safetyChecklistByRisk: Record<RiskLevel, SafetyTip[]> = {
  /* ───────── LOW  (UV 0–2) ───────── */
  low: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 30+ (Optional)',
      description: 'If outdoors for long periods, apply once.',
    },
    {
      icon: 'eye',
      title: 'Sunglasses',
      description: 'UV protection is still helpful for your eyes.',
    },
    {
      icon: 'smile-o',
      title: 'Enjoy Outdoors',
      description: 'Low risk — normal activities are perfectly fine.',
    },
  ],

  /* ──────── MODERATE  (UV 3–5) ──────── */
  moderate: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 30+',
      description: 'Apply 15–20 min before going out; reapply every 2–3 hours.',
    },
    {
      icon: 'user',
      title: 'Protective Clothing',
      description: 'Light long sleeves if staying outdoors for extended periods.',
    },
    {
      icon: 'clock-o',
      title: 'Midday Caution',
      description: 'Reduce direct sun exposure around noon.',
    },
  ],

  /* ───────── HIGH  (UV 6–7) ───────── */
  high: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 50+',
      description: 'Reapply every 2 hours and after sweating or swimming.',
    },
    {
      icon: 'user',
      title: 'Protective Gear',
      description: 'Wide-brim hat and UV-blocking sunglasses recommended.',
    },
    {
      icon: 'clock-o',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    {
      icon: 'tint',
      title: 'Stay Hydrated',
      description: 'Drink water regularly throughout the day.',
    },
  ],

  /* ──────── VERY HIGH  (UV 8–10) ──────── */
  'very high': [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 50+',
      description: 'Apply liberally every 2 hours; especially after swimming.',
    },
    {
      icon: 'user',
      title: 'Protective Gear',
      description: 'Wide-brim hat and UV-blocking sunglasses are essential.',
    },
    {
      icon: 'clock-o',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    {
      icon: 'tint',
      title: 'Stay Hydrated',
      description: 'Heat risk is higher — drink water frequently.',
    },
    {
      icon: 'home',
      title: 'Limit Outdoor Time',
      description: 'Prefer indoor or covered areas during peak hours.',
    },
  ],

  /* ──────── EXTREME  (UV 11+) ──────── */
  extreme: [
    {
      icon: 'ban',
      title: 'Avoid Sun Exposure',
      description: 'Stay indoors during peak UV hours if possible.',
    },
    {
      icon: 'sun-o',
      title: 'Maximum Protection SPF 50+',
      description: 'Apply and reapply strictly every 2 hours.',
    },
    {
      icon: 'user',
      title: 'Full Coverage Clothing',
      description: 'Long sleeves, wide-brim hat, and sunglasses.',
    },
    {
      icon: 'heartbeat',
      title: 'Heat Safety',
      description: 'Watch for dizziness or headache; take cool breaks often.',
    },
    {
      icon: 'bell',
      title: 'Enable Alerts',
      description: 'Turn on high UV alerts to stay informed in real time.',
    },
  ],
};

/**
 * Normalise any risk-level string coming from the API to a typed RiskLevel.
 */
export const normalizeRiskLevel = (raw: string): RiskLevel => {
  const key = raw.trim().toLowerCase() as RiskLevel;
  if (key in safetyChecklistByRisk) {
    return key;
  }
  return 'low'; // safe fallback
};
