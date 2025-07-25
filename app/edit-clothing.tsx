import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { blink } from '@/lib/blink';
import { useLanguage } from '@/lib/i18n';
import { 
  CLOTHING_SUBDIVISIONS, 
  CLOTHING_STYLES, 
  CLOTHING_SEASONS, 
  CLOTHING_COLORS 
} from '@/lib/clothingTypes';

const CATEGORIES = ['tops', 'bottoms', 'shoes', 'accessories', 'outerwear'];

export default function EditClothingScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Parse the analysis result from params
  const analysisResult = params.analysis ? JSON.parse(params.analysis as string) : null;
  
  const [editedItem, setEditedItem] = useState({
    category: analysisResult?.category || 'tops',
    subcategory: analysisResult?.subcategory || '',
    color: analysisResult?.color || 'black',
    style: analysisResult?.style || 'casual',
    season: analysisResult?.season || 'all',
    description: analysisResult?.description || '',
    imageUrl: analysisResult?.imageUrl || ''
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadUserItems();
    }
  }, [user]);

  const loadUserItems = async () => {
    if (!user) return;
    
    try {
      const items = await blink.db.clothingItems.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      setUserItems(items);
    } catch (error) {
      console.error('Error loading user items:', error);
    }
  };

  const checkUpgradeNeeded = () => {
    const itemCount = userItems.length;
    
    if (itemCount >= 15 && itemCount < 100) {
      // Need $10 upgrade for 100 items
      return { needed: true, price: 10, limit: 100 };
    } else if (itemCount >= 100) {
      // Need $20 upgrade for 500 items
      return { needed: true, price: 20, limit: 500 };
    }
    
    return { needed: false, price: 0, limit: 15 };
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveClothingItem = async () => {
    if (!user || isSaving) return;

    const upgradeInfo = checkUpgradeNeeded();
    
    if (upgradeInfo.needed) {
      setShowUpgradeModal(true);
      return;
    }

    setIsSaving(true);

    try {
      await blink.db.clothingItems.create({
        id: `clothing_${Date.now()}`,
        userId: user.id,
        imageUrl: editedItem.imageUrl,
        category: editedItem.category,
        subcategory: editedItem.subcategory,
        color: editedItem.color,
        style: editedItem.style,
        season: editedItem.season,
        aiDescription: editedItem.description,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('success'),
        t('clothingItemAdded'),
        [
          { text: t('addMore'), onPress: () => router.back() },
          { text: t('viewWardrobe'), onPress: () => router.replace('/(tabs)') }
        ]
      );
    } catch (error) {
      console.error('Error saving clothing item:', error);
      Alert.alert(t('error'), t('failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'premium') => {
    // In a real app, this would integrate with payment processing
    Alert.alert(
      t('upgradeRequired'),
      tier === 'pro' 
        ? t('upgradeToProMessage')
        : t('upgradeToPremiumMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('upgrade'), 
          onPress: () => {
            // Simulate upgrade process
            Alert.alert(t('success'), t('upgradeSuccessful'));
            setShowUpgradeModal(false);
            saveClothingItem();
          }
        }
      ]
    );
  };

  const renderPicker = (
    visible: boolean,
    onClose: () => void,
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pickerOption,
                  selectedValue === option && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  selectedValue === option && styles.pickerOptionTextSelected
                ]}>
                  {option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderUpgradeModal = () => (
    <Modal visible={showUpgradeModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.upgradeModal}>
          <View style={styles.upgradeHeader}>
            <Ionicons name="star" size={32} color="#FF6B6B" />
            <Text style={styles.upgradeTitle}>{t('upgradeRequired')}</Text>
            <Text style={styles.upgradeSubtitle}>
              {t('youHaveReached')} {userItems.length} {t('items')}
            </Text>
          </View>

          <View style={styles.upgradeTiers}>
            <TouchableOpacity
              style={styles.upgradeTier}
              onPress={() => handleUpgrade('pro')}
            >
              <View style={styles.tierHeader}>
                <Text style={styles.tierName}>Pro</Text>
                <Text style={styles.tierPrice}>$10 USD</Text>
              </View>
              <Text style={styles.tierLimit}>{t('upTo')} 100 {t('items')}</Text>
              <View style={styles.tierFeatures}>
                <Text style={styles.tierFeature}>• {t('unlimitedOutfits')}</Text>
                <Text style={styles.tierFeature}>• {t('advancedAI')}</Text>
                <Text style={styles.tierFeature}>• {t('prioritySupport')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.upgradeTier, styles.premiumTier]}
              onPress={() => handleUpgrade('premium')}
            >
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, styles.premiumText]}>Premium</Text>
                <Text style={[styles.tierPrice, styles.premiumText]}>$20 USD</Text>
              </View>
              <Text style={[styles.tierLimit, styles.premiumText]}>{t('upTo')} 500 {t('items')}</Text>
              <View style={styles.tierFeatures}>
                <Text style={[styles.tierFeature, styles.premiumText]}>• {t('everythingInPro')}</Text>
                <Text style={[styles.tierFeature, styles.premiumText]}>• {t('personalStylist')}</Text>
                <Text style={[styles.tierFeature, styles.premiumText]}>• {t('exclusiveFeatures')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowUpgradeModal(false)}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!user || !analysisResult) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('editClothingDetails')}</Text>
        </View>

        {/* Image Preview */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.imageSection}>
          <Image source={{ uri: editedItem.imageUrl }} style={styles.clothingImage} />
        </Animated.View>

        {/* Edit Form */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.formSection}>
          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('category')}</Text>
            <TouchableOpacity
              style={styles.fieldButton}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.fieldValue}>{editedItem.category}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Subcategory */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('type')}</Text>
            <TouchableOpacity
              style={styles.fieldButton}
              onPress={() => setShowSubcategoryPicker(true)}
            >
              <Text style={styles.fieldValue}>
                {editedItem.subcategory || t('selectType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Color */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('color')}</Text>
            <TouchableOpacity
              style={styles.fieldButton}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={styles.colorPreview}>
                <View style={[styles.colorDot, { backgroundColor: editedItem.color }]} />
                <Text style={styles.fieldValue}>{editedItem.color}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Style */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('style')}</Text>
            <TouchableOpacity
              style={styles.fieldButton}
              onPress={() => setShowStylePicker(true)}
            >
              <Text style={styles.fieldValue}>{editedItem.style}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Season */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('season')}</Text>
            <TouchableOpacity
              style={styles.fieldButton}
              onPress={() => setShowSeasonPicker(true)}
            >
              <Text style={styles.fieldValue}>{editedItem.season}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('description')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editedItem.description}
              onChangeText={(text) => setEditedItem({ ...editedItem, description: text })}
              placeholder={t('enterDescription')}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={saveClothingItem}
            disabled={isSaving}
          >
            <Ionicons 
              name={isSaving ? "hourglass" : "checkmark-circle"} 
              size={24} 
              color="#FEFEFE" 
            />
            <Text style={styles.saveButtonText}>
              {isSaving ? t('saving') : t('saveToWardrobe')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Pickers */}
      {renderPicker(
        showCategoryPicker,
        () => setShowCategoryPicker(false),
        CATEGORIES,
        editedItem.category,
        (value) => setEditedItem({ ...editedItem, category: value, subcategory: '' }),
        t('selectCategory')
      )}

      {renderPicker(
        showSubcategoryPicker,
        () => setShowSubcategoryPicker(false),
        CLOTHING_SUBDIVISIONS[editedItem.category as keyof typeof CLOTHING_SUBDIVISIONS] || [],
        editedItem.subcategory,
        (value) => setEditedItem({ ...editedItem, subcategory: value }),
        t('selectType')
      )}

      {renderPicker(
        showColorPicker,
        () => setShowColorPicker(false),
        CLOTHING_COLORS,
        editedItem.color,
        (value) => setEditedItem({ ...editedItem, color: value }),
        t('selectColor')
      )}

      {renderPicker(
        showStylePicker,
        () => setShowStylePicker(false),
        CLOTHING_STYLES,
        editedItem.style,
        (value) => setEditedItem({ ...editedItem, style: value }),
        t('selectStyle')
      )}

      {renderPicker(
        showSeasonPicker,
        () => setShowSeasonPicker(false),
        CLOTHING_SEASONS,
        editedItem.season,
        (value) => setEditedItem({ ...editedItem, season: value }),
        t('selectSeason')
      )}

      {/* Upgrade Modal */}
      {renderUpgradeModal()}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  imageSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  clothingImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  fieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#FEFEFE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pickerOptions: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  pickerOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  pickerOptionTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  upgradeModal: {
    backgroundColor: '#FEFEFE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  upgradeTiers: {
    gap: 16,
    marginBottom: 30,
  },
  upgradeTier: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  premiumTier: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ECDC4',
  },
  premiumText: {
    color: '#FF6B6B',
  },
  tierLimit: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  tierFeatures: {
    gap: 4,
  },
  tierFeature: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});