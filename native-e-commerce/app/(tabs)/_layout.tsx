import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F83758',
        tabBarInactiveTintColor: '#232327',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginBottom: 5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 25 : 15,
          left: 20,
          right: 20,
          elevation: 8,
          backgroundColor: '#ffffff',
          borderRadius: 25,
          height: 65,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          paddingBottom: 0,
          display: 'flex',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={22} color={color} style={{ marginTop: 5 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={22} color={color} style={{ marginTop: 5 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.floatingCart}>
              <View style={{
                backgroundColor: '#F83758',
                height: 48,
                width: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#F83758',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
              }}>
                <Feather name="shopping-cart" size={22} color="white" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={22} color={color} style={{ marginTop: 5 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={22} color={color} style={{ marginTop: 5 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null, // Hide from tab bar but keep route
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingCart: {
    top: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
