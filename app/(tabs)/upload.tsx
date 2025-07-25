import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { blink } from '@/lib/blink';
import { useLanguage } from '@/lib/i18n';

export default function UploadScreen() {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'We need camera roll permissions to upload photos');
      return false;
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let result;
    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setAnalysisResult(null);
    }
  };

  const analyzeClothing = async () => {
    if (!selectedImage || !user) return;

    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Upload image to storage first
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      const { publicUrl } = await blink.storage.upload(
        blob,
        `clothing/${user.id}/${Date.now()}.jpg`,
        { upsert: true }
      );

      // Analyze the clothing with AI
      const { text } = await blink.ai.generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this clothing item and provide a JSON response with: category (tops/bottoms/shoes/accessories/outerwear), subcategory (specific type like t-shirt, jeans, sneakers), color (main color), style (casual/formal/sporty), season (spring/summer/fall/winter/all), and description (brief description). Only respond with valid JSON.'
              },
              {
                type: 'image',
                image: publicUrl
              }
            ]
          }
        ]
      });

      // Parse AI response
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch {
        // Fallback if JSON parsing fails
        analysis = {
          category: 'tops',
          subcategory: 'clothing item',
          color: 'unknown',
          style: 'casual',
          season: 'all',
          description: 'Clothing item'
        };
      }

      setAnalysisResult({
        ...analysis,
        imageUrl: publicUrl
      });

    } catch (error) {
      console.error('Error analyzing clothing:', error);
      Alert.alert(t('error'), 'Failed to analyze the clothing item. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveClothingItem = async () => {
    if (!analysisResult || !user) return;

    try {
      await blink.db.clothingItems.create({
        id: `clothing_${Date.now()}`,
        userId: user.id,
        imageUrl: analysisResult.imageUrl,
        category: analysisResult.category,
        subcategory: analysisResult.subcategory,
        color: analysisResult.color,
        style: analysisResult.style,
        season: analysisResult.season,
        aiDescription: analysisResult.description,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Clothing item added to your wardrobe', [
        { text: t('addClothes'), onPress: resetForm },
        { text: t('wardrobe'), onPress: resetForm }
      ]);
    } catch (error) {
      console.error('Error saving clothing item:', error);
      Alert.alert(t('error'), 'Failed to save the clothing item. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>{t('addNewClothing')}</Text>
          <Text style={styles.subtitle}>{t('takePhoto')} or {t('chooseFromGallery').toLowerCase()}</Text>
        </Animated.View>

        {/* Image Selection */}
        {!selectedImage ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.uploadSection}>
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('camera')}
              >
                <View style={styles.uploadButtonContent}>
                  <Ionicons name="camera" size={32} color="#FF6B6B" />
                  <Text style={styles.uploadButtonText}>{t('takePhoto')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('library')}
              >
                <View style={styles.uploadButtonContent}>
                  <Ionicons name="images" size={32} color="#4ECDC4" />
                  <Text style={styles.uploadButtonText}>{t('chooseFromGallery')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.imageSection}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            
            <View style={styles.imageActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetForm}
              >
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.secondaryButtonText}>{t('chooseFromGallery')}</Text>
              </TouchableOpacity>

              {!analysisResult && (
                <TouchableOpacity
                  style={[styles.primaryButton, isAnalyzing && styles.buttonDisabled]}
                  onPress={analyzeClothing}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color="#FEFEFE" size="small" />
                  ) : (
                    <Ionicons name="sparkles" size={20} color="#FEFEFE" />
                  )}
                  <Text style={styles.primaryButtonText}>
                    {isAnalyzing ? t('analyzing') : 'Analyze with AI'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>{t('clothingDetails')}</Text>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('type')}:</Text>
                <Text style={styles.resultValue}>{analysisResult.category}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('type')}:</Text>
                <Text style={styles.resultValue}>{analysisResult.subcategory}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('color')}:</Text>
                <Text style={styles.resultValue}>{analysisResult.color}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('style')}:</Text>
                <Text style={styles.resultValue}>{analysisResult.style}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('season')}:</Text>
                <Text style={styles.resultValue}>{analysisResult.season}</Text>
              </View>
              
              <Text style={styles.description}>{analysisResult.description}</Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveClothingItem}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FEFEFE" />
              <Text style={styles.saveButtonText}>{t('saveToWardrobe')}</Text>
            </TouchableOpacity>
          </Animated.View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  uploadSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  uploadButtons: {
    gap: 16,
  },
  uploadButton: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  uploadButtonContent: {
    alignItems: 'center',
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  imageSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 20,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FEFEFE',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 12,
  },
  saveButtonText: {
    color: '#FEFEFE',
    fontSize: 18,
    fontWeight: '700',
  },
});