import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { trpcClient } from '@/lib/trpc';
import { Check, X, Sparkles, ChevronUp, Plus, CheckCircle, Trash2, ArrowUp, ChevronDown, Maximize2, Crown, Zap, Shield } from 'lucide-react-native';
import { Task } from '@/types/task';
import { useTasks } from '@/providers/TaskProvider';
import { useOnboarding, ProblemOption } from '@/providers/OnboardingProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';



if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

Dimensions.get('window');
const MAX_TOP_TASKS = 3;
const PAYWALL_TRIGGER_COUNT = 3;
const MAX_TOTAL_MINUTES = 150;
const MAX_TASKS_TO_RETURN = 10;

const PROBLEM_OPTIONS: { id: ProblemOption; label: string }[] = [
  { id: 'too_much_in_head', label: 'Too much in my head' },
  { id: 'cant_focus', label: "I can\'t focus" },
  { id: 'procrastinating', label: 'I keep procrastinating' },
  { id: 'feel_behind', label: 'I feel behind' },
];

function ProblemScreen({ onSelect }: { onSelect: (problem: ProblemOption) => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSelect = (problem: ProblemOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(problem);
  };

  return (
    <Animated.View style={[styles.onboardingScreen, { opacity: fadeAnim }]}>
      <View style={styles.onboardingContent}>
        <Text style={styles.onboardingTitle}>What&apos;s your biggest problem right now?</Text>
        <View style={styles.problemOptions}>
          {PROBLEM_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.problemOption,
                pressed && styles.problemOptionPressed,
              ]}
              onPress={() => handleSelect(option.id)}
            >
              <Text style={styles.problemOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function TaskDumpScreen({ 
  onSubmit,
  isPending,
  aiProgress,
  streamingLines,
  showExpandedStream,
  setShowExpandedStream,
}: { 
  onSubmit: (tasks: string[]) => void;
  isPending: boolean;
  aiProgress: number;
  streamingLines: string[];
  showExpandedStream: boolean;
  setShowExpandedStream: (show: boolean) => void;
}) {
  const [inputText, setInputText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSubmit = () => {
    console.log("handle submit")
    const tasks = inputText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (tasks.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit(tasks);
  };



  const hasContent = inputText.trim().length > 0;

  return (
    <Animated.View style={[styles.onboardingScreen, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.taskDumpContainer}
      >
        <View style={styles.taskDumpHeader}>
          <Text style={styles.onboardingTitle}>Dump everything you&apos;re thinking about.</Text>
          <Text style={styles.taskDumpSubtitle}>One task per line. No pressure.</Text>
        </View>

        <View style={styles.taskDumpInputArea}>
          <TextInput
            style={styles.taskDumpInput}
            placeholder="Buy groceries&#10;Call mom&#10;Finish report&#10;..."
            placeholderTextColor="#666"
            multiline
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
            editable={!isPending}
          />
        </View>

        <View style={styles.taskDumpBottom}>
          {isPending && (
            <View style={styles.streamingBox}>
              <View style={styles.streamingBoxHeader}>
                <Text style={styles.streamingBoxTitle}>Ai loading your day: {aiProgress}%</Text>
                <Pressable
                  style={styles.streamingExpandBtn}
                  onPress={() => setShowExpandedStream(!showExpandedStream)}
                >
                  {showExpandedStream ? (
                    <ChevronDown size={14} color="#666" strokeWidth={2} />
                  ) : (
                    <Maximize2 size={12} color="#666" strokeWidth={2} />
                  )}
                </Pressable>
              </View>
              <View style={styles.streamingProgressBar}>
                <View style={[styles.streamingProgressFill, { width: `${aiProgress}%` }]} />
              </View>
              {showExpandedStream && streamingLines.length > 0 && (
                <View style={styles.streamingLines}>
                  {streamingLines.map((line, index) => (
                    <View key={index} style={styles.streamingLineRow}>
                      <View style={styles.streamingLineDot} />
                      <Text style={styles.streamingLineLabel}>{line}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          
          {hasContent && !isPending && (
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.continueButtonPressed,
              ]}

              onPress={handleSubmit}
            >
              <Text style={styles.continueButtonText}>Create my plan</Text>
              <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function PaywallScreen({ 
  onPurchase, 
  isPurchasing,
  isRestoring,
  onRestore,
}: { 
  onPurchase: (productId: string) => void;
  isPurchasing: boolean;
  isRestoring: boolean;
  onRestore: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleYearlyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPurchase('big3_pro_yearly');
  };

  const handleMonthlyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPurchase('big3_pro_monthly');
  };

  return (
    <Animated.View style={[styles.paywallContainer, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.paywallSafeArea} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.paywallScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.paywallContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.paywallBadge}>
              <Crown size={20} color="#FFD700" strokeWidth={2.5} />
              <Text style={styles.paywallBadgeText}>PRO</Text>
            </View>

            <Text style={styles.paywallTitle}>Unlock Big 3 Pro</Text>
            <Text style={styles.paywallSubtitle}>
              You&apos;ve completed 3 tasks! Upgrade to continue crushing your goals.
            </Text>

            <View style={styles.paywallFeatures}>
              <View style={styles.paywallFeatureRow}>
                <View style={styles.paywallFeatureIcon}>
                  <Zap size={18} color="#1a1a1a" strokeWidth={2} />
                </View>
                <Text style={styles.paywallFeatureText}>Unlimited task management</Text>
              </View>
              <View style={styles.paywallFeatureRow}>
                <View style={styles.paywallFeatureIcon}>
                  <Sparkles size={18} color="#1a1a1a" strokeWidth={2} />
                </View>
                <Text style={styles.paywallFeatureText}>AI-powered prioritization</Text>
              </View>
              <View style={styles.paywallFeatureRow}>
                <View style={styles.paywallFeatureIcon}>
                  <Shield size={18} color="#1a1a1a" strokeWidth={2} />
                </View>
                <Text style={styles.paywallFeatureText}>Focus rules & micro-actions</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.paywallYearlyButton,
                pressed && styles.paywallButtonPressed,
                isPurchasing && styles.paywallButtonDisabled,
              ]}
              onPress={handleYearlyPress}
              disabled={isPurchasing || isRestoring}
            >
              <View style={styles.paywallBestValue}>
                <Text style={styles.paywallBestValueText}>BEST VALUE</Text>
              </View>
              <View style={styles.paywallButtonContent}>
                <View>
                  <Text style={styles.paywallYearlyTitle}>Yearly</Text>
                  <Text style={styles.paywallYearlyPrice}>$29.99/year</Text>
                </View>
                <View style={styles.paywallTrialBadge}>
                  <Text style={styles.paywallTrialText}>3-day free trial</Text>
                </View>
              </View>
              {isPurchasing && (
                <ActivityIndicator size="small" color="#fff" style={styles.paywallLoader} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.paywallMonthlyButton,
                pressed && styles.paywallMonthlyPressed,
                isPurchasing && styles.paywallButtonDisabled,
              ]}
              onPress={handleMonthlyPress}
              disabled={isPurchasing || isRestoring}
            >
              <Text style={styles.paywallMonthlyTitle}>Monthly</Text>
              <Text style={styles.paywallMonthlyPrice}>$2.99/month</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.paywallRestoreButton,
                pressed && styles.paywallRestorePressed,
              ]}
              onPress={onRestore}
              disabled={isPurchasing || isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={styles.paywallRestoreText}>Restore Purchases</Text>
              )}
            </Pressable>

            <Text style={styles.paywallDisclaimer}>
              Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

function Top3RevealScreen({ 
  tasks, 
  totalMinutes,
  onContinue 
}: { 
  tasks: Task[];
  totalMinutes: number;
  onContinue: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef(tasks.map(() => new Animated.Value(30))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    tasks.forEach((_, index) => {
      Animated.timing(slideAnims[index], {
        toValue: 0,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim, slideAnims, tasks]);

  return (
    <Animated.View style={[styles.onboardingScreen, { opacity: fadeAnim }]}>
      <View style={styles.top3RevealContent}>
        <Text style={styles.top3RevealTitle}>Here&apos;s your Top 3 for today.</Text>
        <Text style={styles.top3RevealSubtitle}>{totalMinutes} min total</Text>

        <View style={styles.top3RevealList}>
          {tasks.map((task, index) => (
            <Animated.View
              key={task.id}
              style={[
                styles.top3RevealCard,
                { transform: [{ translateY: slideAnims[index] }] },
              ]}
            >
              <View style={styles.top3RevealNumber}>
                <Text style={styles.top3RevealNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.top3RevealInfo}>
                <Text style={styles.top3RevealTaskText}>{task.text}</Text>
                <Text style={styles.top3RevealMeta}>{task.estimatedMinutes} min · {task.goal}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.startButtonText}>Start focusing</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function NextActionScreen() {
  const {
    tasks,
    setTasks,
    addTasks,
    completeTask,
    demoteTask,
    deleteTask,
    promoteTask,
    swapTasks,
    addNextTasks,
    clearCompleted,
    topTasks,
    bottomTasks,
    completedTasks,
    totalMinutes,
    isInitialized: tasksInitialized,
  } = useTasks();

  const {
    currentStep,
    selectProblem,
    completeOnboarding,
    isInitialized: onboardingInitialized,
    incrementPlanCount,
  } = useOnboarding();

  const [inputText, setInputText] = useState('');
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [selectedBottomTaskId, setSelectedBottomTaskId] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [streamingLines, setStreamingLines] = useState<string[]>([]);
  const [showExpandedStream, setShowExpandedStream] = useState(false);
  const [showTop3Reveal, setShowTop3Reveal] = useState(false);
  const [revealTasks, setRevealTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [previousCompletedCount, setPreviousCompletedCount] = useState(0);
  
  const {
    isPro,
    packages,
    purchasePackage,
    restorePurchases,
    isPurchasing,
    isRestoring,
    isLoading: rcLoading,
  } = useRevenueCat();
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const fadeAnims = useRef<Map<string, Animated.Value>>(new Map());
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());

  const onboardingMutation = useMutation({
    mutationFn: async (taskTexts: string[]) => {
      setAiProgress(0);
      setStreamingLines([]);
      
      const steps = [
        'Analyzing task complexity...',
        'Estimating time requirements...',
        'Calculating mental load...',
        'Prioritizing by containment...',
        'Generating micro-actions...',
        'Applying focus rules...',
        'Optimizing task order...',
        'Finalizing plan...',
      ];
      
      let currentStepIdx = 0;
      let progress = 0;
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      progressInterval.current = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress > 95) progress = 95;
        setAiProgress(Math.floor(progress));
        
        if (currentStepIdx < steps.length && progress > (currentStepIdx + 1) * (90 / steps.length)) {
          setStreamingLines(prev => [...prev, steps[currentStepIdx]]);
          currentStepIdx++;
        }
      }, 150);
      const result = await trpcClient.ai.generateTasks.mutate({
        taskTexts,
        isInitialLoad: true,
      });
      return result;
    },
    onSuccess: (data) => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setAiProgress(100);
      setStreamingLines(prev => [...prev, 'Complete!']);
      setTimeout(() => {
        setAiProgress(0);
        setStreamingLines([]);
        setShowExpandedStream(false);
      }, 800);
      
      const top3Tasks: Task[] = data.tasks.slice(0, 3).map((t, index) => ({
        id: `task-${Date.now()}-${index}`,
        text: t.text,
        estimatedMinutes: t.estimatedMinutes,
        goal: t.goal,
        rule: t.rule,
        doThis: t.doThis,
        priority: index + 1,
        status: 'top3' as const,
        createdAt: Date.now(),
      }));

      const moreTasks: Task[] = data.tasks.slice(3).map((t, index) => ({
        id: `task-${Date.now()}-bottom-${index}`,
        text: t.text,
        estimatedMinutes: t.estimatedMinutes,
        goal: t.goal,
        rule: t.rule,
        doThis: t.doThis,
        priority: index + 4,
        status: 'bottom' as const,
        createdAt: Date.now(),
      }));
      
      console.log('[Onboarding] Created', top3Tasks.length, 'top3 tasks and', moreTasks.length, 'more tasks');
      setTasks([...top3Tasks, ...moreTasks]);
      setRevealTasks(top3Tasks);
      setShowTop3Reveal(true);
    },
    onError: (error) => {
      // #region agent log
      const errData = (error as { message?: string; data?: unknown; cause?: unknown; shape?: { message?: string } });
      fetch('http://127.0.0.1:7242/ingest/f699d6fc-250e-496c-8428-c015d229e6ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/index.tsx:onboardingMutation.onError',message:'Onboarding AI error',data:{message:errData.message,shapeMessage:errData.shape?.message,data:errData.data,cause:String(errData.cause)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,E'})}).catch(()=>{});
      // #endregion
      console.error('[Onboarding] Error shape:', (error as { data?: unknown }).data);
      console.error('[Onboarding] AI Error:', error);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setAiProgress(0);
      setStreamingLines([]);
      setShowExpandedStream(false);
      Alert.alert(
        'Something went wrong',
        'Could not generate your plan. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ taskTexts, isInitialLoad }: { taskTexts: string[]; isInitialLoad: boolean }) => {
      setAiProgress(0);
      setStreamingLines([]);
      
      const steps = [
        'Analyzing task complexity...',
        'Estimating time requirements...',
        'Calculating mental load...',
        'Prioritizing by containment...',
        'Generating micro-actions...',
        'Applying focus rules...',
        'Optimizing task order...',
        'Finalizing plan...',
      ];
      
      let currentStepIdx = 0;
      let progress = 0;
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      progressInterval.current = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress > 95) progress = 95;
        setAiProgress(Math.floor(progress));
        
        if (currentStepIdx < steps.length && progress > (currentStepIdx + 1) * (90 / steps.length)) {
          setStreamingLines(prev => [...prev, steps[currentStepIdx]]);
          currentStepIdx++;
        }
      }, 150);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f699d6fc-250e-496c-8428-c015d229e6ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/index.tsx:processMutation.mutationFn',message:'Calling ai.generateTasks (process)',data:{taskTextsCount:taskTexts.length,isInitialLoad},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const result = await trpcClient.ai.generateTasks.mutate({
        taskTexts,
        isInitialLoad,
      });
      return { result, isInitialLoad };
    },
    onError: (error) => {
      // #region agent log
      const errData = (error as { message?: string; data?: unknown; cause?: unknown; shape?: { message?: string } });
      fetch('http://127.0.0.1:7242/ingest/f699d6fc-250e-496c-8428-c015d229e6ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/index.tsx:processMutation.onError',message:'Process AI error',data:{message:errData.message,shapeMessage:errData.shape?.message,data:errData.data,cause:String(errData.cause)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,A,E'})}).catch(()=>{});
      // #endregion
      console.error('[Onboarding] Error shape:', (error as { data?: unknown }).data);
      console.error('[Process] AI Error:', error);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setAiProgress(0);
      setStreamingLines([]);
      setShowExpandedStream(false);
      Alert.alert(
        'Something went wrong',
        'Could not generate your plan. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    },
    onSuccess: ({ result: data, isInitialLoad }) => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setAiProgress(100);
      setStreamingLines(prev => [...prev, 'Complete!']);
      setTimeout(() => {
        setAiProgress(0);
        setStreamingLines([]);
        setShowExpandedStream(false);
      }, 800);
      const currentTop3Count = topTasks.length;
      const existingNonCompleted = tasks.filter(t => t.status !== 'completed');
      
      const newTasks: Task[] = data.tasks.map((t, index) => ({
        id: `task-${Date.now()}-${index}`,
        text: t.text,
        estimatedMinutes: t.estimatedMinutes,
        goal: t.goal,
        rule: t.rule,
        doThis: t.doThis,
        priority: t.priority,
        status: (isInitialLoad && currentTop3Count === 0 && index < MAX_TOP_TASKS) ? 'top3' as const : 'bottom' as const,
        createdAt: Date.now(),
      }));
      
      if (isInitialLoad) {
        const completedFromPrev = tasks.filter(t => t.status === 'completed');
        setTasks([...completedFromPrev, ...newTasks]);
        incrementPlanCount();
      } else {
        const maxBottomPriority = existingNonCompleted.reduce((max, t) => Math.max(max, t.priority), 0);
        const adjustedNewTasks = newTasks.map((t, idx) => ({
          ...t,
          priority: maxBottomPriority + idx + 1,
        }));
        addTasks(adjustedNewTasks);
      }
    },
  });

  const { mutate, isPending } = processMutation;

  const getAnimValue = useCallback((id: string, type: 'fade' | 'scale') => {
    const map = type === 'fade' ? fadeAnims.current : scaleAnims.current;
    if (!map.has(id)) {
      map.set(id, new Animated.Value(1));
    }
    return map.get(id)!;
  }, []);

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!tasksInitialized || !onboardingInitialized) return;
    if (isPro) {
      setShowPaywall(false);
      return;
    }
    
    const currentCompletedCount = completedTasks.length;
    
    if (currentCompletedCount >= PAYWALL_TRIGGER_COUNT && currentCompletedCount > previousCompletedCount) {
      console.log('[Paywall] Triggering paywall - completed:', currentCompletedCount);
      setShowPaywall(true);
    }
    
    setPreviousCompletedCount(currentCompletedCount);
  }, [completedTasks.length, isPro, tasksInitialized, onboardingInitialized, previousCompletedCount]);

  const handlePurchase = useCallback(async (productId: string) => {
    console.log('[Paywall] Attempting purchase for:', productId);
    
    const pkg = packages.find(p => 
      p.product.identifier === productId || 
      p.identifier.toLowerCase().includes(productId.includes('yearly') ? 'annual' : 'monthly')
    );
    
    if (!pkg) {
      console.error('[Paywall] Package not found:', productId);
      Alert.alert('Error', 'Unable to find subscription package. Please try again.');
      return;
    }
    
    try {
      await purchasePackage(pkg);
      console.log('[Paywall] Purchase successful');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaywall(false);
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('[Paywall] Purchase error:', error);
        Alert.alert('Purchase Failed', 'There was an error processing your purchase. Please try again.');
      }
    }
  }, [packages, purchasePackage]);

  const handleRestore = useCallback(async () => {
    console.log('[Paywall] Attempting restore');
    try {
      const customerInfo = await restorePurchases();
      const hasEntitlement = customerInfo?.entitlements?.active?.['big3_pro'];
      
      if (hasEntitlement) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowPaywall(false);
        Alert.alert('Success', 'Your subscription has been restored!');
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
      }
    } catch (error) {
      console.error('[Paywall] Restore error:', error);
      Alert.alert('Restore Failed', 'There was an error restoring your purchases. Please try again.');
    }
  }, [restorePurchases]);

  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newRawTasks = inputText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (newRawTasks.length === 0) return;

    const hasExistingTasks = tasks.filter(t => t.status !== 'completed').length > 0;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (hasExistingTasks) {
      setInputText('');
      mutate({ taskTexts: newRawTasks, isInitialLoad: false });
    } else {
      setInputText('');
      mutate({ taskTexts: newRawTasks, isInitialLoad: true });
    }
  }, [inputText, tasks, mutate]);

  const animateOut = useCallback((id: string, callback: () => void) => {
    const fadeAnim = getAnimValue(id, 'fade');
    const scaleAnim = getAnimValue(id, 'scale');
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      callback();
    });
  }, [getAnimValue]);

  const handleComplete = useCallback((task: Task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    animateOut(task.id, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      completeTask(task.id);
    });
  }, [animateOut, completeTask]);

  const handleDemote = useCallback((task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    animateOut(task.id, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      demoteTask(task.id);
    });
  }, [animateOut, demoteTask]);

  const handleDelete = useCallback((task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    animateOut(task.id, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteTask(task.id);
    });
  }, [animateOut, deleteTask]);

  const canAddMoreToTop = topTasks.length < MAX_TOP_TASKS && bottomTasks.length > 0;

  const handlePromoteTask = useCallback((taskId: string) => {
    if (topTasks.length >= MAX_TOP_TASKS) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    promoteTask(taskId);
  }, [topTasks.length, promoteTask]);

  const selectBottomTask = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBottomTaskId(prev => prev === taskId ? null : taskId);
  }, []);

  const handleSwapTasks = useCallback((topTaskId: string) => {
    if (!selectedBottomTaskId) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    swapTasks(topTaskId, selectedBottomTaskId);
    setSelectedBottomTaskId(null);
  }, [selectedBottomTaskId, swapTasks]);

  const handleAddNextTasks = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addNextTasks();
  }, [addNextTasks]);

  const deleteCompletedTask = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    deleteTask(taskId);
  }, [deleteTask]);

  const clearAllCompleted = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    clearCompleted();
  }, [clearCompleted]);

  const formatCompletionTime = useCallback((timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, []);

  const { mutate: onboardingMutate } = onboardingMutation;

  const handleOnboardingTaskDump = useCallback((taskTexts: string[]) => {
    onboardingMutate(taskTexts);
  }, [onboardingMutate]);

  const handleTop3RevealContinue = useCallback(() => {
    setShowTop3Reveal(false);
    completeOnboarding();
  }, [completeOnboarding]);

  if (!tasksInitialized || !onboardingInitialized || rcLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a1a1a" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (showPaywall && !isPro) {
    return (
      <PaywallScreen
        onPurchase={handlePurchase}
        isPurchasing={isPurchasing}
        isRestoring={isRestoring}
        onRestore={handleRestore}
      />
    );
  }

  if (currentStep === 'problem') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ProblemScreen onSelect={selectProblem} />
        </SafeAreaView>
      </View>
    );
  }

  if (currentStep === 'taskDump' || currentStep === 'aiProcessing') {
    if (showTop3Reveal && revealTasks.length > 0) {
      const revealTotalMinutes = revealTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
      return (
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <Top3RevealScreen 
              tasks={revealTasks} 
              totalMinutes={revealTotalMinutes}
              onContinue={handleTop3RevealContinue} 
            />
          </SafeAreaView>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <TaskDumpScreen 
            onSubmit={handleOnboardingTaskDump}
            isPending={onboardingMutation.isPending}
            aiProgress={aiProgress}
            streamingLines={streamingLines}
            showExpandedStream={showExpandedStream}
            setShowExpandedStream={setShowExpandedStream}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {"Today's Plan"}{topTasks.length > 0 ? ` — ${totalMinutes} min` : ''}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.completedHeaderButton,
                pressed && styles.completedHeaderButtonPressed,
              ]}
              onPress={() => setShowCompletedModal(true)}
            >
              <CheckCircle size={14} color="#1a1a1a" strokeWidth={2} />
              <Text style={styles.completedHeaderText}>{completedTasks.length > 0 ? completedTasks.length : '✔'}</Text>
            </Pressable>
          </View>

          <ScrollView 
            style={styles.taskList}
            contentContainerStyle={styles.taskListContent}
            showsVerticalScrollIndicator={false}
          >
            {topTasks.length === 0 && bottomTasks.length === 0 && !isPending && (
              <View style={styles.emptyState}>
                <Sparkles size={48} color="#ccc" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>Ready to focus</Text>
                <Text style={styles.emptySubtitle}>
                  {"Dump your tasks below.\nI will pick your top 3 priorities."}
                </Text>
              </View>
            )}

            {topTasks.map((task) => {
              const fadeAnim = getAnimValue(task.id, 'fade');
              const scaleAnim = getAnimValue(task.id, 'scale');
              
              return (
                <Pressable
                  key={task.id}
                  onPress={() => selectedBottomTaskId ? handleSwapTasks(task.id) : null}
                  disabled={!selectedBottomTaskId}
                >
                <Animated.View
                  style={[
                    styles.taskCard,
                    selectedBottomTaskId && styles.taskCardSwappable,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskNumber}>#{task.priority}</Text>
                    <Text style={styles.taskText} numberOfLines={2}>{task.text}</Text>
                    <View style={styles.taskActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.completeButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => handleComplete(task)}
                      >
                        <Check size={16} color="#fff" strokeWidth={2.5} />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.skipButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => handleDemote(task)}
                      >
                        <X size={16} color="#6c757d" strokeWidth={2.5} />
                      </Pressable>
                    </View>
                  </View>
                  
                  <View style={styles.guidesContainer}>
                    <View style={styles.durationTag}>
                      <Text style={styles.durationText}>{task.estimatedMinutes} min</Text>
                    </View>
                    <View style={styles.guideRow}>
                      <Text style={styles.guideLabel}>Goal</Text>
                      <Text style={styles.guideValue}>{task.goal}</Text>
                    </View>
                    <View style={styles.guideRow}>
                      <Text style={styles.guideLabel}>Rule</Text>
                      <Text style={styles.guideValue}>{task.rule}</Text>
                    </View>
                    <View style={styles.guideRow}>
                      <Text style={styles.guideLabel}>Do This</Text>
                      <Text style={styles.guideValue}>{task.doThis}</Text>
                    </View>
                  </View>
                </Animated.View>
                </Pressable>
              );
            })}

            {selectedBottomTaskId && topTasks.length > 0 && (
              <View style={styles.swapHint}>
                <Text style={styles.swapHintText}>Tap a task above to swap</Text>
                <Pressable
                  style={styles.cancelSwapButton}
                  onPress={() => setSelectedBottomTaskId(null)}
                >
                  <Text style={styles.cancelSwapText}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {canAddMoreToTop && (
              <Pressable
                style={({ pressed }) => [
                  styles.addNextButton,
                  pressed && styles.addNextButtonPressed,
                ]}
                onPress={handleAddNextTasks}
              >
                <Plus size={18} color="#1a1a1a" strokeWidth={2} />
                <Text style={styles.addNextButtonText}>Bring in More Tasks</Text>
              </Pressable>
            )}

            {bottomTasks.length > 0 && (
              <View style={styles.remainingSection}>
                <View style={styles.remainingHeader}>
                  <Text style={styles.remainingSectionTitle}>More tasks</Text>
                  {topTasks.length < MAX_TOP_TASKS && bottomTasks.length > 0 && (
                    <Text style={styles.slotsHint}>{MAX_TOP_TASKS - topTasks.length} slot{MAX_TOP_TASKS - topTasks.length !== 1 ? 's' : ''} open</Text>
                  )}
                </View>
                {bottomTasks.map((task, index) => {
                  const fadeAnim = getAnimValue(task.id, 'fade');
                  const scaleAnim = getAnimValue(task.id, 'scale');
                  
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => topTasks.length >= MAX_TOP_TASKS ? selectBottomTask(task.id) : handlePromoteTask(task.id)}
                    >
                    <Animated.View
                      style={[
                        styles.compactTaskCard,
                        selectedBottomTaskId === task.id && styles.compactTaskCardSelected,
                        {
                          opacity: fadeAnim,
                          transform: [{ scale: scaleAnim }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.promoteButton,
                          topTasks.length >= MAX_TOP_TASKS && !selectedBottomTaskId && styles.promoteButtonDisabled,
                          selectedBottomTaskId === task.id && styles.promoteButtonSelected,
                        ]}
                      >
                        <ChevronUp size={16} color={selectedBottomTaskId === task.id ? "#fff" : "#1a1a1a"} strokeWidth={2} />
                      </View>
                      <Text style={styles.compactTaskNumber}>#{index + 1}</Text>
                      <Text style={styles.compactTaskText} numberOfLines={1}>{task.text}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.compactActionButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => handleDelete(task)}
                      >
                        <X size={14} color="#adb5bd" strokeWidth={2} />
                      </Pressable>
                    </Animated.View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            </ScrollView>

          <View style={styles.inputSection}>
            {isPending && (
              <View style={styles.streamingBox}>
                <View style={styles.streamingBoxHeader}>
                  <Text style={styles.streamingBoxTitle}>Ai loading your day: {aiProgress}%</Text>
                  <Pressable
                    style={styles.streamingExpandBtn}
                    onPress={() => setShowExpandedStream(!showExpandedStream)}
                  >
                    {showExpandedStream ? (
                      <ChevronDown size={14} color="#666" strokeWidth={2} />
                    ) : (
                      <Maximize2 size={12} color="#666" strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
                <View style={styles.streamingProgressBar}>
                  <Animated.View style={[styles.streamingProgressFill, { width: `${aiProgress}%` }]} />
                </View>
                {showExpandedStream && streamingLines.length > 0 && (
                  <View style={styles.streamingLines}>
                    {streamingLines.map((line, index) => (
                      <View key={index} style={styles.streamingLineRow}>
                        <View style={styles.streamingLineDot} />
                        <Text style={styles.streamingLineLabel}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Add a task…"
                placeholderTextColor="#adb5bd"
                multiline
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSubmit}
                blurOnSubmit={false}
                returnKeyType="default"
                textAlignVertical="top"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  !inputText.trim() && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!inputText.trim()}
              >
                <ArrowUp size={20} color={inputText.trim() ? '#fff' : '#999'} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={showCompletedModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompletedModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Completed Tasks</Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              onPress={() => setShowCompletedModal(false)}
            >
              <X size={20} color="#495057" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {completedTasks.length === 0 ? (
              <View style={styles.emptyCompleted}>
                <CheckCircle size={48} color="#ccc" strokeWidth={1.5} />
                <Text style={styles.emptyCompletedText}>No completed tasks yet</Text>
              </View>
            ) : (
              completedTasks.map((task) => (
                <View key={task.id} style={styles.modalTaskCard}>
                  <Check size={18} color="#1a1a1a" strokeWidth={2.5} />
                  <View style={styles.modalTaskInfo}>
                    <Text style={styles.modalTaskText}>{task.text}</Text>
                    <Text style={styles.modalTaskTime}>{formatCompletionTime(task.completedAt)}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => deleteCompletedTask(task.id)}
                  >
                    <Trash2 size={16} color="#dc3545" strokeWidth={2} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {completedTasks.length > 0 && (
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.clearAllButton,
                  pressed && styles.clearAllButtonPressed,
                ]}
                onPress={clearAllCompleted}
              >
                <Trash2 size={16} color="#dc3545" strokeWidth={2} />
                <Text style={styles.clearAllText}>Clear All</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={styles.modalBottomSafe} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  onboardingScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 32,
    lineHeight: 36,
  },
  problemOptions: {
    gap: 12,
  },
  problemOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  problemOptionPressed: {
    backgroundColor: '#e8e8e8',
    borderColor: '#d0d0d0',
  },
  problemOptionText: {
    fontSize: 17,
    color: '#1a1a1a',
    fontWeight: '500' as const,
  },
  taskDumpContainer: {
    flex: 1,
  },
  taskDumpHeader: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  taskDumpSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
  },
  taskDumpInputArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  taskDumpInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
  },
  taskDumpBottom: {
    paddingBottom: 16,
  },
  continueButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonPressed: {
    backgroundColor: '#333',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  top3RevealContent: {
    flex: 1,
    paddingTop: 60,
  },
  top3RevealTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  top3RevealSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  top3RevealList: {
    gap: 12,
    marginBottom: 32,
  },
  top3RevealCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  top3RevealNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top3RevealNumberText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  top3RevealInfo: {
    flex: 1,
  },
  top3RevealTaskText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  top3RevealMeta: {
    fontSize: 13,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  startButtonPressed: {
    backgroundColor: '#333',
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  completedHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedHeaderButtonPressed: {
    backgroundColor: '#e8e8e8',
  },
  completedHeaderText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  taskCardSwappable: {
    borderColor: '#1a1a1a',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#fff',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  guidesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  durationTag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  guideRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guideLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 52,
  },
  guideValue: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  remainingSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  remainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  remainingSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotsHint: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500' as const,
  },
  compactTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  compactTaskCardSelected: {
    backgroundColor: '#f5f5f5',
    borderColor: '#1a1a1a',
    borderWidth: 2,
  },
  promoteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoteButtonPressed: {
    backgroundColor: '#e8e8e8',
  },
  promoteButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  promoteButtonSelected: {
    backgroundColor: '#1a1a1a',
  },
  compactTaskNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#666',
    minWidth: 24,
  },
  compactTaskText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  compactActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#1a1a1a',
  },
  skipButton: {
    backgroundColor: '#e0e0e0',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    color: '#1a1a1a',
    minHeight: 28,
    maxHeight: 100,
    paddingVertical: 4,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    backgroundColor: '#333',
    transform: [{ scale: 0.95 }],
  },
  submitButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  addNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  addNextButtonPressed: {
    backgroundColor: '#f5f5f5',
  },
  addNextButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  swapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  swapHintText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500' as const,
  },
  cancelSwapButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelSwapText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalBottomSafe: {
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#e8e8e8',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyCompleted: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyCompletedText: {
    fontSize: 15,
    color: '#666',
  },
  modalTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalTaskInfo: {
    flex: 1,
    gap: 2,
  },
  modalTaskText: {
    fontSize: 15,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  modalTaskTime: {
    fontSize: 12,
    color: '#444',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: '#fecaca',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllButtonPressed: {
    backgroundColor: '#fecaca',
  },
  clearAllText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#dc3545',
  },
  streamingBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  streamingBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  streamingBoxTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  streamingExpandBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamingProgressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  streamingProgressFill: {
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
  },
  streamingLines: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  streamingLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  streamingLineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  streamingLineLabel: {
    fontSize: 12,
    color: '#666',
  },
  paywallContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  paywallSafeArea: {
    flex: 1,
  },
  paywallScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  paywallContent: {
    alignItems: 'center',
  },
  paywallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  paywallBadgeText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFD700',
    letterSpacing: 1,
  },
  paywallTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  paywallSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  paywallFeatures: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  paywallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  paywallFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallFeatureText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500' as const,
  },
  paywallYearlyButton: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    position: 'relative',
    overflow: 'visible',
  },
  paywallButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  paywallButtonDisabled: {
    opacity: 0.7,
  },
  paywallBestValue: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paywallBestValueText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  paywallButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paywallYearlyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  paywallYearlyPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  paywallTrialBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paywallTrialText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  paywallLoader: {
    position: 'absolute',
    right: 20,
    top: '50%',
  },
  paywallMonthlyButton: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paywallMonthlyPressed: {
    backgroundColor: '#e8e8e8',
  },
  paywallMonthlyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  paywallMonthlyPrice: {
    fontSize: 14,
    color: '#666',
  },
  paywallRestoreButton: {
    paddingVertical: 12,
    marginBottom: 20,
  },
  paywallRestorePressed: {
    opacity: 0.7,
  },
  paywallRestoreText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  paywallDisclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
