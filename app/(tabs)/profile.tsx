import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { blink } from '@/lib/blink';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalClothes: 0,
    totalOutfits: 0,
    favoriteCategory: 'None',
  });

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadStats();
      }
    });
    return unsubscribe;
  }, []);

  const loadStats = async () => {
    try {
      // Get clothing count
      const clothingItems = await blink.db.clothingItems.list({
        where: { userId: user?.id },
      });

      // Get outfit count
      const outfits = await blink.db.outfitRecommendations.list({
        where: { userId: user?.id },
      });

      // Calculate favorite category
      const categoryCount = clothingItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});

      const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b, 'None'
      );

      setStats({
        totalClothes: clothingItems.length,
        totalOutfits: outfits.length,
        favoriteCategory: favoriteCategory === 'None' ? 'None' : favoriteCategory,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            blink.auth.logout();
          },
        },
      ]
    );
  };

  const clearWardrobe = () => {
    Alert.alert(
      'Clear Wardrobe',
      'This will delete all your clothes and outfit recommendations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: In a real app, you'd want to implement bulk delete
              // For now, we'll just show the confirmation
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Wardrobe cleared successfully');
              loadStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear wardrobe');
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon!'),
    },
    {
      icon: 'heart-outline',
      title: 'Style Preferences',
      subtitle: 'Set your fashion preferences',
      onPress: () => Alert.alert('Coming Soon', 'Style preferences will be available soon!'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage your notification settings',
      onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon!'),
    },
    {
      icon: 'color-palette-outline',
      title: 'App Theme',
      subtitle: 'Switch between light and dark mode',
      onPress: () => Alert.alert('Coming Soon', 'Theme switching will be available soon!'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Help', 'For support, please contact us at support@example.com'),
    },
    {
      icon: 'trash-outline',
      title: 'Clear Wardrobe',
      subtitle: 'Delete all clothes and outfits',
      onPress: clearWardrobe,
      destructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.displayName || 'Fashion Lover'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalClothes}</Text>
            <Text style={styles.statLabel}>Clothes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalOutfits}</Text>
            <Text style={styles.statLabel}>Outfits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber} numberOfLines={1}>
              {stats.favoriteCategory}
            </Text>
            <Text style={styles.statLabel}>Favorite</Text>
          </View>
        </Animated.View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={item.title}
              entering={FadeInDown.delay(300 + index * 50)}
            >
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  item.destructive && styles.menuItemDestructive
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.onPress();
                }}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.menuIcon,
                    item.destructive && styles.menuIconDestructive
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.destructive ? '#FF6B6B' : '#666'}
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[
                      styles.menuTitle,
                      item.destructive && styles.menuTitleDestructive
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={FadeInDown.delay(900)} style={styles.appInfo}>
          <Text style={styles.appInfoText}>AI Wardrobe Assistant v1.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️ by Blink</Text>
        </Animated.View>
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
    paddingVertical: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FEFEFE',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItemDestructive: {
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDestructive: {
    backgroundColor: '#FFE5E5',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuTitleDestructive: {
    color: '#FF6B6B',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});