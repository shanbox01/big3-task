import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'bitetask_onboarding';

export type OnboardingStep = 'problem' | 'taskDump' | 'aiProcessing' | 'main';
export type ProblemOption = 'too_much_in_head' | 'cant_focus' | 'procrastinating' | 'feel_behind' | null;

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  selectedProblem: ProblemOption;
  hasCompletedFirstPlan: boolean;
  completedTaskCount: number;
  planGenerationCount: number;
}

const DEFAULT_STATE: OnboardingState = {
  hasCompletedOnboarding: false,
  selectedProblem: null,
  hasCompletedFirstPlan: false,
  completedTaskCount: 0,
  planGenerationCount: 0,
};

async function loadOnboardingState(): Promise<OnboardingState> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[OnboardingProvider] Loaded state:', parsed);
      return { ...DEFAULT_STATE, ...parsed };
    }
    return DEFAULT_STATE;
  } catch (error) {
    console.error('[OnboardingProvider] Error loading state:', error);
    return DEFAULT_STATE;
  }
}

async function saveOnboardingState(state: OnboardingState): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
    console.log('[OnboardingProvider] Saved state');
  } catch (error) {
    console.error('[OnboardingProvider] Error saving state:', error);
  }
}

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('problem');

  const stateQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: loadOnboardingState,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (stateQuery.data && !isInitialized) {
      setState(stateQuery.data);
      setIsInitialized(true);
      if (stateQuery.data.hasCompletedOnboarding) {
        setCurrentStep('main');
      }
      console.log('[OnboardingProvider] Initialized');
    }
  }, [stateQuery.data, isInitialized]);

  const saveMutation = useMutation({
    mutationFn: saveOnboardingState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const { mutate: saveState } = saveMutation;

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const selectProblem = useCallback((problem: ProblemOption) => {
    updateState({ selectedProblem: problem });
    setCurrentStep('taskDump');
  }, [updateState]);

  const completeOnboarding = useCallback(() => {
    updateState({ 
      hasCompletedOnboarding: true,
      hasCompletedFirstPlan: true,
      planGenerationCount: 1,
    });
    setCurrentStep('main');
  }, [updateState]);

  const incrementPlanCount = useCallback(() => {
    const newCount = state.planGenerationCount + 1;
    updateState({ planGenerationCount: newCount });
    return newCount;
  }, [state.planGenerationCount, updateState]);

  return {
    state,
    isInitialized,
    currentStep,
    setCurrentStep,
    selectProblem,
    completeOnboarding,
    incrementPlanCount,
  };
});
