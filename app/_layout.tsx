import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { blink } from '@/lib/blink';

export default function RootLayout() {
  useFrameworkReady();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFEFE' }}>
        <Text style={{ fontSize: 18, color: '#FF6B6B', fontWeight: '600' }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFEFE', padding: 20 }}>
        <Text style={{ fontSize: 24, color: '#FF6B6B', fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
          Welcome to Your AI Wardrobe! 👗
        </Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>
          Sign in to start building your smart wardrobe and get personalized outfit recommendations
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6B6B',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 12,
            marginTop: 20
          }}
          onPress={() => blink.auth.login()}
        >
          <Text style={{ color: '#FEFEFE', fontSize: 18, fontWeight: '600' }}>
            Sign In to Continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}