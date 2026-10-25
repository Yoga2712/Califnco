import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../../../services/notificationService';
import { UserRole } from '../../../types/user';

export default function CustomerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const {
    user,
    role,
    isAuthenticated,
    isLoading,
    error,
    login,
    registerCustomer,
    logout,
    clearError,
    switchRoleForTesting,
    updateFcmToken,
  } = useAuth();

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fcmStatusMsg, setFcmStatusMsg] = useState<string | null>(null);
  const [isRegisteringFcm, setIsRegisteringFcm] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }
    const success = await login(email, password);
    if (success) {
      setEmail('');
      setPassword('');
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    const success = await registerCustomer({
      email,
      password,
      displayName,
      phoneNumber,
    });
    if (success) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setPhoneNumber('');
    }
  };

  React.useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleQuickDemoLogin = async (roleToUse: UserRole) => {
    clearError();
    switchRoleForTesting(roleToUse);
    Alert.alert(
      'Session Switched',
      `Switched session to verified ${roleToUse.toUpperCase()} role.`
    );
  };

  const handleRegisterFcmToken = async () => {
    if (!user) return;
    setIsRegisteringFcm(true);
    setFcmStatusMsg(null);
    try {
      await notificationService.requestPermission();
      const token = await notificationService.registerDeviceToken(user.uid);
      await updateFcmToken(token);
      setFcmStatusMsg(`FCM Token Registered: ${token.substring(0, 16)}...`);
    } catch {
      setFcmStatusMsg('Could not register FCM token in this environment.');
    } finally {
      setIsRegisteringFcm(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!user) return;
    try {
      await notificationService.sendNotification({
        userId: user.uid,
        title: 'Califnco Pure Water Alert 💧',
        body: 'FCM Push Notification received! Your filtration system is operating at 99.8% purity.',
        eventType: 'system_alert',
      });
      Alert.alert(
        'Push Notification Dispatched',
        'FCM notification has been recorded in Firestore and delivered to your foreground session!'
      );
    } catch {
      Alert.alert('Notification Error', 'Failed to dispatch push notification.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Account & Profile"
        subtitle={user ? `Signed in as ${user.displayName}` : 'Firebase Authentication'}
        onBack={() => router.push('/customer')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          isWide && styles.wideContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isAuthenticated && user ? (
          /* ======================================= */
          /* AUTHENTICATED USER PROFILE VIEW         */
          /* ======================================= */
          <View>
            {/* User Profile Hero Card */}
            <View style={styles.profileHeroCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileHeroDetails}>
                <View style={styles.roleBadgeRow}>
                  <Text style={styles.profileName}>{user.displayName}</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      user.role === 'admin'
                        ? styles.roleBadgeAdmin
                        : user.role === 'dealer'
                        ? styles.roleBadgeDealer
                        : styles.roleBadgeCustomer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        user.role === 'admin'
                          ? styles.roleTextAdmin
                          : user.role === 'dealer'
                          ? styles.roleTextDealer
                          : styles.roleTextCustomer,
                      ]}
                    >
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.profileEmail}>{user.email}</Text>
                {user.phoneNumber ? (
                  <Text style={styles.profilePhone}>📞 {user.phoneNumber}</Text>
                ) : null}
                {user.companyName ? (
                  <Text style={styles.profileCompany}>🏢 {user.companyName}</Text>
                ) : null}
                <Text style={styles.profileUid}>UID: {user.uid}</Text>
              </View>
            </View>

            {/* Quick Navigation Cards */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Account Quick Links</Text>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push('/customer/orders')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>📦</Text>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>My Orders</Text>
                  <Text style={styles.actionSubtitle}>Track active & past water purifier orders</Text>
                </View>
                <Text style={styles.actionChevron}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push('/customer/products')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>💧</Text>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Water Purifier Products</Text>
                  <Text style={styles.actionSubtitle}>Browse filters, dispensers & RO machines</Text>
                </View>
                <Text style={styles.actionChevron}>→</Text>
              </TouchableOpacity>

              {user.role === 'dealer' || user.role === 'admin' ? (
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => router.push('/dealer')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>🏢</Text>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Dealer Wholesale Portal</Text>
                    <Text style={styles.actionSubtitle}>B2B pricing & bulk water orders</Text>
                  </View>
                  <Text style={styles.actionChevron}>→</Text>
                </TouchableOpacity>
              ) : null}

              {user.role === 'admin' ? (
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => router.push('/admin')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>⚙️</Text>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Admin Control Center</Text>
                    <Text style={styles.actionSubtitle}>Manage platform operations & dealers</Text>
                  </View>
                  <Text style={styles.actionChevron}>→</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Firebase Cloud Messaging (FCM) Card */}
            <View style={styles.sectionCard}>
              <View style={styles.fcmHeaderRow}>
                <View style={styles.fcmTitleContainer}>
                  <Text style={styles.fcmIcon}>🔔</Text>
                  <View>
                    <Text style={styles.sectionTitle}>Firebase Cloud Messaging (FCM)</Text>
                    <Text style={styles.fcmSubtitle}>Push notifications for order events</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tokenStatusBox}>
                <Text style={styles.tokenLabel}>Device Push Token:</Text>
                <Text style={styles.tokenValue} numberOfLines={2}>
                  {user.fcmToken || 'No FCM token registered yet.'}
                </Text>
              </View>

              {fcmStatusMsg ? (
                <View style={styles.fcmSuccessBanner}>
                  <Text style={styles.fcmSuccessText}>✓ {fcmStatusMsg}</Text>
                </View>
              ) : null}

              <View style={styles.fcmButtonsRow}>
                <TouchableOpacity
                  style={styles.fcmBtn}
                  onPress={handleRegisterFcmToken}
                  activeOpacity={0.8}
                  disabled={isRegisteringFcm}
                >
                  {isRegisteringFcm ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.fcmBtnText}>Register FCM Token</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fcmBtn, styles.fcmTestBtn]}
                  onPress={handleSendTestPush}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fcmTestBtnText}>Test Push ⚡</Text>
                </TouchableOpacity>
              </View>
            </View>



            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutButtonText}>Sign Out of Califnco</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ======================================= */
          /* UNAUTHENTICATED AUTHENTICATION VIEW     */
          /* ======================================= */
          <View>
            {/* Header / Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, authMode === 'login' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('login');
                  clearError();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, authMode === 'login' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, authMode === 'register' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('register');
                  clearError();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, authMode === 'register' && styles.tabTextActive]}>
                  Register Customer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {authMode === 'login' ? (
              /* LOGIN FORM */
              <View style={styles.formCard}>
                <Text style={styles.formHeading}>Welcome Back to Califnco</Text>
                <Text style={styles.formSubheading}>
                  Sign in to access your water purifier orders, tracking & warranty
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. customer@califnco.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeBtnText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleLogin}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In 💧</Text>
                  )}
                </TouchableOpacity>

                {/* Instant Verification Credentials */}
                <View style={styles.demoCredentialsBox}>
                  <Text style={styles.demoHeading}>Quick Test Verification Logins:</Text>
                  <View style={styles.demoPillsRow}>
                    <TouchableOpacity
                      style={styles.demoPill}
                      onPress={() => handleQuickDemoLogin('customer')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.demoPillText}>Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.demoPill}
                      onPress={() => handleQuickDemoLogin('dealer')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.demoPillText}>Dealer (B2B)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.demoPill}
                      onPress={() => handleQuickDemoLogin('admin')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.demoPillText}>Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              /* REGISTRATION FORM */
              <View style={styles.formCard}>
                <Text style={styles.formHeading}>Create Califnco Account</Text>
                <Text style={styles.formSubheading}>
                  Register to order water purifiers and schedule certified installations
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Aarun Kumar"
                    placeholderTextColor="#94A3B8"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="yourname@domain.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password * (Min 6 characters)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a secure password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleRegister}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account 💧</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  wideContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  // Profile Hero
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  profileHeroDetails: {
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  profileCompany: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 2,
  },
  profileUid: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeCustomer: {
    backgroundColor: '#E0F2FE',
  },
  roleBadgeDealer: {
    backgroundColor: '#EDE9FE',
  },
  roleBadgeAdmin: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleTextCustomer: {
    color: '#0284C7',
  },
  roleTextDealer: {
    color: '#7C3AED',
  },
  roleTextAdmin: {
    color: '#D97706',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionChevron: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  // FCM Push Box
  fcmHeaderRow: {
    marginBottom: 8,
  },
  fcmTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fcmIcon: {
    fontSize: 20,
  },
  fcmSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  tokenStatusBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  tokenLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tokenValue: {
    fontSize: 11,
    color: '#0284C7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  fcmSuccessBanner: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  fcmSuccessText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  fcmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fcmBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fcmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fcmTestBtn: {
    backgroundColor: '#059669',
  },
  fcmTestBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Role Switcher
  roleSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  roleSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleSwitchBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  roleSwitchTextActive: {
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  // Tab Switch
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  eyeBtnText: {
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 16,
  },
  demoCredentialsBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  demoHeading: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  demoPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoPill: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
});