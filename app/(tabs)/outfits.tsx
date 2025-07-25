import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { blink } from '@/lib/blink';
import { useLanguage } from '@/lib/i18n';

const { width } = Dimensions.get('window');

interface OutfitRecommendation {
  id: string;
  occasion: string;
  weather: string;
  styleVibe: string;
  recommendedItems: any[];
  missingItems: any[];
  aiExplanation: string;
}

const getQuestionsForLanguage = (t: (key: string) => string) => [
  {
    id: 'occasion',
    question: t('question1'),
    emoji: '🎯',
    options: [
      { value: 'casual', label: t('casual'), emoji: '😎' },
      { value: 'work', label: t('work'), emoji: '💼' },
      { value: 'date', label: t('date'), emoji: '💕' },
      { value: 'party', label: t('party'), emoji: '🎉' },
      { value: 'workout', label: t('gym'), emoji: '💪' },
    ]
  },
  {
    id: 'weather',
    question: t('question2'),
    emoji: '🌤️',
    options: [
      { value: 'hot', label: t('hot'), emoji: '☀️' },
      { value: 'warm', label: t('mild'), emoji: '🌤️' },
      { value: 'cool', label: t('mild'), emoji: '🌥️' },
      { value: 'cold', label: t('cold'), emoji: '❄️' },
      { value: 'rainy', label: t('rainy'), emoji: '🌧️' },
    ]
  },
  {
    id: 'vibe',
    question: t('question3'),
    emoji: '✨',
    options: [
      { value: 'comfortable', label: t('comfortable'), emoji: '🛋️' },
      { value: 'stylish', label: t('trendy'), emoji: '💫' },
      { value: 'professional', label: t('work'), emoji: '👔' },
      { value: 'trendy', label: t('trendy'), emoji: '🔥' },
      { value: 'classic', label: t('elegant'), emoji: '👑' },
    ]
  }
];

export default function OutfitsScreen() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outfitRecommendations, setOutfitRecommendations] = useState<OutfitRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [clothingItems, setClothingItems] = useState([]);
  
  const questions = getQuestionsForLanguage(t);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadClothingItems();
        loadPreviousRecommendations();
      }
    });
    return unsubscribe;
  }, []);

  const loadClothingItems = async () => {
    try {
      const items = await blink.db.clothingItems.list({
        where: { userId: user?.id },
      });
      setClothingItems(items);
    } catch (error) {
      console.error('Error loading clothing items:', error);
    }
  };

  const loadPreviousRecommendations = async () => {
    try {
      const recommendations = await blink.db.outfitRecommendations.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 10,
      });
      
      setOutfitRecommendations(recommendations.map(rec => ({
        id: rec.id,
        occasion: rec.occasion,
        weather: rec.weather,
        styleVibe: rec.styleVibe,
        recommendedItems: JSON.parse(rec.recommendedItems || '[]'),
        missingItems: JSON.parse(rec.missingItems || '[]'),
        aiExplanation: rec.aiExplanation,
      })));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleAnswer = (questionId: string, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setTimeout(() => generateOutfitRecommendations(), 500);
    }
  };

  const generateOutfitRecommendations = async () => {
    if (!user || clothingItems.length === 0) return;

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Create a description of available clothing
      const clothingDescription = clothingItems.map(item => 
        `${item.category}: ${item.subcategory || 'item'} in ${item.color || 'unknown color'} (${item.style || 'casual'} style, ${item.season || 'all season'})`
      ).join(', ');

      const prompt = `
        Based on these preferences:
        - Occasion: ${answers.occasion}
        - Weather: ${answers.weather}
        - Style Vibe: ${answers.vibe}
        
        And this wardrobe: ${clothingDescription}
        
        Generate 3 outfit recommendations. For each outfit, specify which items from the wardrobe to use and what items are missing (if any).
        
        Respond with JSON in this format:
        {
          "outfits": [
            {
              "name": "Outfit name",
              "items": ["item descriptions that match wardrobe items"],
              "missing": ["missing item descriptions with specific characteristics"],
              "explanation": "Why this outfit works for the occasion/weather/vibe"
            }
          ]
        }
      `;

      const { text } = await blink.ai.generateText({
        prompt,
        model: 'gpt-4o-mini',
      });

      let aiResponse;
      try {
        aiResponse = JSON.parse(text);
      } catch {
        // Fallback response
        aiResponse = {
          outfits: [{
            name: "Casual Outfit",
            items: ["Any available top", "Any available bottom"],
            missing: [],
            explanation: "A simple, comfortable outfit perfect for the occasion."
          }]
        };
      }

      // Save recommendations to database
      const newRecommendations = [];
      for (const outfit of aiResponse.outfits) {
        const recommendation = {
          id: `outfit_${Date.now()}_${Math.random()}`,
          userId: user.id,
          occasion: answers.occasion,
          weather: answers.weather,
          styleVibe: answers.vibe,
          recommendedItems: JSON.stringify(outfit.items),
          missingItems: JSON.stringify(outfit.missing || []),
          aiExplanation: outfit.explanation,
        };

        await blink.db.outfitRecommendations.create(recommendation);
        newRecommendations.push({
          ...recommendation,
          recommendedItems: outfit.items,
          missingItems: outfit.missing || [],
        });
      }

      setOutfitRecommendations(prev => [...newRecommendations, ...prev]);
      setCurrentStep(0);
      setAnswers({});

    } catch (error) {
      console.error('Error generating outfit recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
  };

  if (!user) return null;

  if (clothingItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>{t('emptyWardrobe')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('startAdding')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingTitle}>{t('loading')}</Text>
          <Text style={styles.loadingSubtitle}>{t('analyzing')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentStep < questions.length) {
    const question = questions[currentStep];
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.quizContainer}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / questions.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} of {questions.length}
            </Text>
          </View>

          {/* Question */}
          <Animated.View 
            key={currentStep}
            entering={SlideInRight.duration(400)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionEmoji}>{question.emoji}</Text>
            <Text style={styles.questionText}>{question.question}</Text>
          </Animated.View>

          {/* Options */}
          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {question.options.map((option, index) => (
              <Animated.View
                key={option.value}
                entering={FadeInUp.delay(index * 100)}
              >
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleAnswer(question.id, option.value)}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('outfitRecommendations')}</Text>
        <TouchableOpacity style={styles.newOutfitButton} onPress={resetQuiz}>
          <Ionicons name="add" size={20} color="#FEFEFE" />
          <Text style={styles.newOutfitButtonText}>{t('getRecommendations')}</Text>
        </TouchableOpacity>
      </View>

      {/* Outfit Cards */}
      <ScrollView style={styles.outfitsContainer} showsVerticalScrollIndicator={false}>
        {outfitRecommendations.map((outfit, index) => (
          <Animated.View
            key={outfit.id}
            entering={FadeInDown.delay(index * 100)}
            style={styles.outfitCard}
          >
            <View style={styles.outfitHeader}>
              <View style={styles.outfitTags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{outfit.occasion}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{outfit.weather}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{outfit.styleVibe}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.outfitExplanation}>{outfit.aiExplanation}</Text>

            {/* Recommended Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>{t('completeOutfit')}:</Text>
              {outfit.recommendedItems.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#4ECDC4" />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Missing Items */}
            {outfit.missingItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>{t('missingItems')}:</Text>
                {outfit.missingItems.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.itemRow}>
                    <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                    <Text style={styles.missingItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ))}

        {outfitRecommendations.length === 0 && (
          <View style={styles.emptyOutfits}>
            <Ionicons name="sparkles-outline" size={60} color="#E0E0E0" />
            <Text style={styles.emptyOutfitsTitle}>No outfits yet</Text>
            <Text style={styles.emptyOutfitsSubtitle}>
              Tap "New Outfit" to get AI recommendations
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  quizContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginVertical: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  questionContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  questionEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  newOutfitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  newOutfitButtonText: {
    color: '#FEFEFE',
    fontSize: 14,
    fontWeight: '600',
  },
  outfitsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  outfitCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  outfitHeader: {
    marginBottom: 16,
  },
  outfitTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#FEFEFE',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  outfitExplanation: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 24,
    marginBottom: 20,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  missingItemText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    lineHeight: 20,
  },
  emptyOutfits: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyOutfitsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyOutfitsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});