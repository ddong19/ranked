import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAnonymous, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? Your local data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to log out');
            }
          },
        },
      ]
    );
  };

  const handleSignUp = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAnonymous ? (
          /* Anonymous User */
          <>
            <View style={styles.userSection}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle-outline" size={80} color="#666" />
              </View>
              <Text style={styles.email}>Guest User</Text>
              <Text style={styles.anonymousNote}>Using app without an account</Text>
            </View>

            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Create an account to:</Text>
              <View style={styles.benefitItem}>
                <Ionicons name="cloud-upload-outline" size={20} color="#0a7ea4" />
                <Text style={styles.benefitText}>Save your data to the cloud</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="sync-outline" size={20} color="#0a7ea4" />
                <Text style={styles.benefitText}>Sync across all your devices</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0a7ea4" />
                <Text style={styles.benefitText}>Never lose your rankings</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
              <Text style={styles.signUpButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInButton} onPress={handleSignUp}>
              <Text style={styles.signInButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Authenticated User */
          <>
            <View style={styles.userSection}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle-outline" size={80} color="#0a7ea4" />
              </View>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.syncBadge}>
                <Ionicons name="cloud-done-outline" size={16} color="#4CAF50" />
                <Text style={styles.syncBadgeText}>Synced to cloud</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  email: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  userId: {
    color: '#666',
    fontSize: 14,
  },
  anonymousNote: {
    color: '#999',
    fontSize: 14,
  },
  benefitsSection: {
    backgroundColor: '#2a2a2a',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 16,
  },
  benefitsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    color: '#ccc',
    fontSize: 15,
    flex: 1,
  },
  signUpButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    padding: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e3a1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  syncBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
