/**
 * useInterruptResume
 *
 * Custom hook that encapsulates the HITL (Human-in-the-Loop) interrupt
 * and resume flow for the AI Tour Planner.
 *
 * Detects two interrupt states from the AI Engine response:
 *   1. `pendingUserSelection` → user must pick a hotel / restaurant card
 *   2. `weatherInterrupt`     → user must decide on weather action
 *
 * Exposes `resumeSelection` and `resumeWeather` methods that POST the
 * user's choice to the Node.js backend, which in turn updates the
 * LangGraph state and resumes graph execution.
 *
 * Usage:
 *   const { interruptState, resumeSelection, resumeWeather, isResuming }
 *     = useInterruptResume(threadId);
 *
 *   // Feed each AI response into the hook:
 *   useEffect(() => { detectInterrupt(response); }, [response]);
 */

import { useState, useCallback, useRef } from 'react';
import {
  tourPlanService,
  type TourPlanResponse,
  type SelectionCard,
  type WeatherPromptOption,
} from '../services/api';

// ── Types ──

export type InterruptKind = 'selection' | 'weather' | null;

export interface InterruptState {
  kind: InterruptKind;
  /** Selection cards from MCP search (when kind === 'selection') */
  selectionCards: SelectionCard[];
  /** Weather prompt options (when kind === 'weather') */
  weatherOptions: WeatherPromptOption[];
  /** Human-readable weather prompt message */
  weatherMessage: string | null;
}

export interface UseInterruptResumeReturn {
  /** Current interrupt state detected from the latest AI response */
  interruptState: InterruptState;
  /** True while a resume call is in flight */
  isResuming: boolean;
  /** Inspect the response and set interruptState accordingly */
  detectInterrupt: (response: TourPlanResponse) => void;
  /** Clear interrupt (e.g. when navigating away) */
  clearInterrupt: () => void;
  /** Resume graph after user selects a search candidate card */
  resumeSelection: (cardId: string) => Promise<TourPlanResponse>;
  /** Resume graph after user picks a weather action */
  resumeWeather: (choice: 'switch_indoor' | 'reschedule' | 'keep') => Promise<TourPlanResponse>;
}

const EMPTY_STATE: InterruptState = {
  kind: null,
  selectionCards: [],
  weatherOptions: [],
  weatherMessage: null,
};

// ── Hook ──

export const useInterruptResume = (threadId: string | null): UseInterruptResumeReturn => {
  const [interruptState, setInterruptState] = useState<InterruptState>(EMPTY_STATE);
  const [isResuming, setIsResuming] = useState(false);

  // Keep a stable ref for threadId so callbacks don't go stale
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;

  /**
   * Inspect an AI Engine response and determine whether the graph is
   * paused waiting for user input.
   */
  const detectInterrupt = useCallback((response: TourPlanResponse) => {
    // Priority 1: Selection required
    if (
      response.pendingUserSelection &&
      response.selectionCards &&
      response.selectionCards.length > 0
    ) {
      setInterruptState({
        kind: 'selection',
        selectionCards: response.selectionCards,
        weatherOptions: [],
        weatherMessage: null,
      });
      return;
    }

    // Priority 2: Weather interrupt
    if (
      response.weatherInterrupt &&
      response.weatherPromptOptions &&
      response.weatherPromptOptions.length > 0
    ) {
      setInterruptState({
        kind: 'weather',
        selectionCards: [],
        weatherOptions: response.weatherPromptOptions,
        weatherMessage: response.weatherPromptMessage || null,
      });
      return;
    }

    // No interrupt → clear
    setInterruptState(EMPTY_STATE);
  }, []);

  const clearInterrupt = useCallback(() => {
    setInterruptState(EMPTY_STATE);
  }, []);

  /**
   * Send the user's candidate selection to the backend and return the
   * updated TourPlanResponse (with the re-optimised itinerary).
   */
  const resumeSelection = useCallback(async (cardId: string): Promise<TourPlanResponse> => {
    const tid = threadIdRef.current;
    if (!tid) throw new Error('No active thread');

    setIsResuming(true);
    try {
      const response = await tourPlanService.resumeSelection({
        threadId: tid,
        selectedCandidateId: cardId,
      });
      // After resume the interrupt is resolved
      setInterruptState(EMPTY_STATE);
      return response;
    } finally {
      setIsResuming(false);
    }
  }, []);

  /**
   * Send the user's weather decision to the backend and return the
   * updated TourPlanResponse.
   */
  const resumeWeather = useCallback(
    async (choice: 'switch_indoor' | 'reschedule' | 'keep'): Promise<TourPlanResponse> => {
      const tid = threadIdRef.current;
      if (!tid) throw new Error('No active thread');

      setIsResuming(true);
      try {
        const response = await tourPlanService.resumeWeather({
          threadId: tid,
          userWeatherChoice: choice,
        });
        setInterruptState(EMPTY_STATE);
        return response;
      } finally {
        setIsResuming(false);
      }
    },
    [],
  );

  return {
    interruptState,
    isResuming,
    detectInterrupt,
    clearInterrupt,
    resumeSelection,
    resumeWeather,
  };
};

export default useInterruptResume;
