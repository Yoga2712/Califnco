import React, { useState, useEffect } from 'react';
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
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

interface RoleOption {
  id: UserRole;
  title: string;
  badge: string;
  icon: string;
  description: string;
  demoEmail: string;
  demoPhone: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'customer',
    title: 'Customer',
    badge: 'RETAIL',
    icon: '💧',
    description: 'Home & Kitchen RO purifiers, dispensers & scheduled filter AMC',
    demoEmail: 'customer@califnco.com',
    demoPhone: '+91 98765 43210',
  },
  {
    id: 'dealer',
    title: 'Dealer (B2B)',
    badge: 'WHOLESALE',
    icon: '🏢',
    description: 'B2B tiered wholesale pricing, bulk container orders & Net 30 POs',
    demoEmail: 'dealer@califnco.com',
    demoPhone: '+91 98112 34567',
  },
  {
    id: 'admin',
    title: 'Admin',
    badge: 'OPERATIONS',
    icon: '⚙️',
    description: 'Logistics command center, orders, inventory & Reels automation',
    demoEmail: 'admin@califnco.com',
    demoPhone: '+91 80000 12345',
  },
];

export default function LoginRoleScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const {
    user,
    isAuthenticated,
    isLoading: authContextLoading,
    error,
    login,
    registerCustomer,
    registerDealer,
    clearError,
  } = useAuth();

  // Selected destination role
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  // Auth Mode: Sign In or Register
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [identifier, setIdentifier] = useState('customer@califnco.com');
  const [password, setPassword] = useState('Califnco@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Registration Extra Fields
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regGstin, setRegGstin] = useState('');

  // When changing role, auto-update default demo credentials to make testing effortless
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    clearError();
    setLocalError(null);
    const targetRole = ROLES.find((r) => r.id === role);
    if (targetRole && authMode === 'login') {
      setIdentifier(targetRole.demoEmail);
      setPassword('Califnco@123');
    }
  };

  // If already authenticated and valid session exists, redirect directly to the corresponding portal
  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Redirect href="/admin" />;
    }
    if (user.role === 'dealer') {
      return <Redirect href="/dealer" />;
    }
    return <Redirect href="/customer" />;
  }

  const handleLoginSubmit = async () => {
    if (!identifier.trim() || !password) {
      setLocalError('Please enter your mobile number or email address, and your password.');
      return;
    }
    setLocalError(null);
    clearError();
    setIsSubmitting(true);

    try {
      const success = await login(identifier, password, selectedRole);
      if (success) {
        if (selectedRole === 'admin') {
          router.replace('/admin');
        } else if (selectedRole === 'dealer') {
          router.replace('/dealer');
        } else {
          router.replace('/customer');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!identifier.trim() || !password || !regFullName.trim()) {
      setLocalError('Please fill in your full name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setLocalError(null);
    clearError();
    setIsSubmitting(true);

    try {
      if (selectedRole === 'dealer') {
        if (!regCompanyName.trim()) {
          setLocalError('Please enter your registered Dealership / Business Name.');
          setIsSubmitting(false);
          return;
        }
        const success = await registerDealer({
          email: identifier,
          password,
          displayName: regFullName,
          phoneNumber: regPhone || '+91 98112 00000',
          companyName: regCompanyName,
          gstin: regGstin,
        });
        if (success) {
          router.replace('/dealer');
        }
      } else {
        const success = await registerCustomer({
          email: identifier,
          password,
          displayName: regFullName,
          phoneNumber: regPhone,
        });
        if (success) {
          router.replace('/customer');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Califnco Password Recovery',
      'For assignment evaluation, default test password for all demo accounts is "Califnco@123".\n\nFor production resets, please contact support@califnco.com or +91 80000 12345.',
      [{ text: 'Got It', style: 'default' }]
    );
  };

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const displayError = localError || error;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCard, isWide && styles.wideCard]}>
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>💧</Text>
            </View>
            <Text style={styles.brandTitle}>Califnco</Text>
            <Text style={styles.brandTagline}>Pure Water. Smarter Living.</Text>
            <Text style={styles.brandSubtitle}>
              Universal Water Purifier & Logistics Ecosystem
            </Text>
          </View>

          {/* Section: Select Role */}
          <View style={styles.roleSectionHeader}>
            <Text style={styles.sectionHeading}>Select Your Portal Role</Text>
            <Text style={styles.sectionSub}>
              Choose your account role to navigate to your authorized dashboard
            </Text>
          </View>

          <View style={styles.rolesGrid}>
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleCard,
                    isSelected && styles.roleCardActive,
                  ]}
                  onPress={() => handleSelectRole(r.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.roleTopRow}>
                    <View
                      style={[
                        styles.roleIconCircle,
                        isSelected && styles.roleIconCircleActive,
                      ]}
                    >
                      <Text style={styles.roleIcon}>{r.icon}</Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        isSelected && styles.roleBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          isSelected && styles.roleBadgeTextActive,
                        ]}
                      >
                        {r.badge}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.roleTitle,
                      isSelected && styles.roleTitleActive,
                    ]}
                  >
                    {r.title}
                  </Text>
                  <Text style={styles.roleDesc} numberOfLines={2}>
                    {r.description}
                  </Text>

                  <View style={styles.roleFooter}>
                    <Text
                      style={[
                        styles.roleNavArrow,
                        isSelected && styles.roleNavArrowActive,
                      ]}
                    >
                      {isSelected ? `✓ Selected (→ /${r.id})` : `Tap to select`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mode Tabs: Sign In / Create Account */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}
              onPress={() => {
                setAuthMode('login');
                clearError();
                setLocalError(null);
                handleSelectRole(selectedRole);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTabText,
                  authMode === 'login' && styles.modeTabTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            {selectedRole !== 'admin' ? (
              <TouchableOpacity
                style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]}
                onPress={() => {
                  setAuthMode('register');
                  clearError();
                  setLocalError(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    authMode === 'register' && styles.modeTabTextActive,
                  ]}
                >
                  Register {selectedRole === 'dealer' ? 'Dealership' : 'Customer'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Error Banner */}
          {displayError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.formContainer}>
            {authMode === 'login' ? (
              /* ======================================================== */
              /* LOGIN VIEW                                               */
              /* ======================================================== */
              <View>
                <View style={styles.formHeadingRow}>
                  <Text style={styles.formHeading}>
                    Sign in as {activeRoleConfig.title}
                  </Text>
                  <Text style={styles.formDestination}>
                    Destination: <Text style={styles.destRoute}>/{selectedRole}</Text>
                  </Text>
                </View>

                {/* Input: Mobile / Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number or Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>📧</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. name@califnco.com or +91 98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        setLocalError(null);
                      }}
                    />
                  </View>
                </View>

                {/* Input: Password */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>🔒</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        setLocalError(null);
                      }}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 1-Tap Demo Credentials Helper */}
                <TouchableOpacity
                  style={styles.demoHelperPill}
                  onPress={() => {
                    setIdentifier(activeRoleConfig.demoEmail);
                    setPassword('Califnco@123');
                    setLocalError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.demoHelperIcon}>⚡</Text>
                  <Text style={styles.demoHelperText}>
                    Fill Demo Account: <Text style={styles.demoHelperBold}>{activeRoleConfig.demoEmail}</Text> (Califnco@123)
                  </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (isSubmitting || authContextLoading) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleLoginSubmit}
                  disabled={isSubmitting || authContextLoading}
                  activeOpacity={0.85}
                >
                  {isSubmitting || authContextLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Sign In as {activeRoleConfig.title} →
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ======================================================== */
              /* REGISTRATION VIEW                                        */
              /* ======================================================== */
              <View>
                <View style={styles.formHeadingRow}>
                  <Text style={styles.formHeading}>
                    Create {activeRoleConfig.title} Account
                  </Text>
                  <Text style={styles.formDestination}>
                    Role: <Text style={styles.destRoute}>{selectedRole.toUpperCase()}</Text>
                  </Text>
                </View>

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>👤</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Aarun Kumar"
                      placeholderTextColor="#94A3B8"
                      value={regFullName}
                      onChangeText={setRegFullName}
                    />
                  </View>
                </View>

                {/* Dealer specific: Company name */}
                {selectedRole === 'dealer' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Registered Dealership / Company Name *</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputPrefixIcon}>🏢</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Apex Aqua Trading Pvt Ltd"
                          placeholderTextColor="#94A3B8"
                          value={regCompanyName}
                          onChangeText={setRegCompanyName}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>GSTIN (15 Digits)</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputPrefixIcon}>📄</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 29AABCU9603R1Z7"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                          value={regGstin}
                          onChangeText={setRegGstin}
                        />
                      </View>
                    </View>
                  </>
                ) : null}

                {/* Mobile */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>📞</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={regPhone}
                      onChangeText={setRegPhone}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>📧</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@domain.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={identifier}
                      onChangeText={setIdentifier}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password * (Min 6 characters)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefixIcon}>🔒</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Create a password"
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
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Register Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (isSubmitting || authContextLoading) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleRegisterSubmit}
                  disabled={isSubmitting || authContextLoading}
                  activeOpacity={0.85}
                >
                  {isSubmitting || authContextLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Complete Registration 💧
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Califnco Smart Ecosystem • Role-Based Security Verified
            </Text>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  wideCard: {
    padding: 32,
  },
  // Brand Header
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  // Role Section Header
  roleSectionHeader: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Roles Grid
  rolesGrid: {
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  roleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  roleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconCircleActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  roleIcon: {
    fontSize: 18,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  roleBadgeActive: {
    backgroundColor: '#0284C7',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  roleBadgeTextActive: {
    color: '#FFFFFF',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  roleTitleActive: {
    color: '#0369A1',
  },
  roleDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  roleFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  roleNavArrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  roleNavArrowActive: {
    color: '#0284C7',
  },
  // Mode Tabs
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#0F172A',
  },
  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  // Form
  formContainer: {
    marginTop: 4,
  },
  formHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 6,
  },
  formHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  formDestination: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  destRoute: {
    color: '#0284C7',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputPrefixIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 8,
  },
  eyeBtnText: {
    fontSize: 16,
  },
  // 1-Tap Demo helper
  demoHelperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  demoHelperIcon: {
    fontSize: 14,
  },
  demoHelperText: {
    flex: 1,
    fontSize: 11,
    color: '#15803D',
  },
  demoHelperBold: {
    fontWeight: '800',
  },
  // Submit Button
  submitBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Footer
  footerNote: {
    marginTop: 22,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
