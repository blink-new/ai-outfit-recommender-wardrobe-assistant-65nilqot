import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { blink } from '@/lib/blink';
import { useLanguage } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const itemSize = (width - 48) / 3; // 3 columns with padding

interface ClothingItem {
  id: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  color?: string;
  aiDescription?: string;
}

const getCategoriesForLanguage = (t: (key: string) => string) => [
  { id: 'all', name: t('all'), icon: 'grid-outline' },
  { id: 'tops', name: t('tops'), icon: 'shirt-outline' },
  { id: 'bottoms', name: t('bottoms'), icon: 'fitness-outline' },
  { id: 'shoes', name: t('shoes'), icon: 'footsteps-outline' },
  { id: 'accessories', name: t('accessories'), icon: 'watch-outline' },
  { id: 'outerwear', name: t('outerwear'), icon: 'jacket-outline' },
];

export default function WardrobeScreen() {
  const { t } = useLanguage();
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  
  const categories = getCategoriesForLanguage(t);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadClothingItems();
      }
    });
    return unsubscribe;
  }, []);

  const loadClothingItems = async () => {
    if (!user?.id) return;
    
    try {
      const items = await blink.db.clothingItems.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      
      setClothingItems(items.map(item => ({
        id: item.id,
        imageUrl: item.imageUrl,
        category: item.category,
        subcategory: item.subcategory,
        color: item.color,
        aiDescription: item.aiDescription,
      })));
    } catch (error) {
      console.error('Error loading clothing items:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClothingItems();
    setRefreshing(false);
  };

  const deleteClothingItem = async (itemId: string, itemName: string) => {
    // Add haptic feedback for long press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      t('deleteItem'),
      `${t('deleteConfirmation')} ${itemName}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blink.db.clothingItems.delete(itemId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadClothingItems(); // Refresh the list
            } catch (error) {
              console.error('Error deleting item:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('error'), t('failedToDelete'));
            }
          }
        }
      ]
    );
  };

  const filteredItems = selectedCategory === 'all' 
    ? clothingItems 
    : clothingItems.filter(item => item.category === selectedCategory);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('myWardrobe')}</Text>
        <Text style={styles.subtitle}>{clothingItems.length} {t('totalItems').toLowerCase()}</Text>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category, index) => (
          <Animated.View
            key={category.id}
            entering={FadeInDown.delay(index * 100)}
          >
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={selectedCategory === category.id ? '#FEFEFE' : '#FF6B6B'}
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Clothing Grid */}
      <ScrollView
        style={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B6B"
          />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shirt-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>{t('emptyWardrobe')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('startAdding')}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 50)}
              >
                <TouchableOpacity 
                  style={styles.gridItem}
                  onLongPress={() => deleteClothingItem(item.id, item.subcategory || item.category)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemOverlay}>
                    <Text style={styles.itemCategory}>
                      {item.subcategory || item.category}
                    </Text>
                  </View>
                  <View style={styles.deleteHint}>
                    <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.7)" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  categoryContainer: {
    marginBottom: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  categoryTextActive: {
    color: '#FEFEFE',
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 100,
  },
  gridItem: {
    width: itemSize,
    height: itemSize,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  itemCategory: {
    color: '#FEFEFE',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 40,
  },
});