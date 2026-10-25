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
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../services/orderService';
import { useInventory } from '../../services/inventoryService';
import { useCustomers } from '../../services/customerService';
import { useDealers } from '../../services/dealerService';
import { useServiceDesk } from '../../services/serviceDeskService';
import { useReelsAutomation } from '../../services/reelsAutomationService';
import { notificationService } from '../../services/notificationService';

export default function AdminDashboardScreen() {
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
    logout,
    switchRoleForTesting,
  } = useAuth();

  const { orders } = useOrders();
  const { products } = useInventory();
  const { customers } = useCustomers();
  const { dealers } = useDealers();
  const { requests } = useServiceDesk();
  const { reels, overview } = useReelsAutomation();

  const isAdmin = isAuthenticated && role === 'admin';

  // Admin Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Derived metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.totalAmount : 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'placed' || o.status === 'confirmed' || o.status === 'processing').length;
  const lowStockCount = products.filter((p) => p.inStock && (p.stockQuantity || 0) <= 10).length;
  const pendingDealersCount = dealers.filter((d) => d.status === 'pending').length;
  const newServiceRequestsCount = requests.filter((r) => r.status === 'new').length;
  const pendingReelsCount = reels.filter((r) => r.status === 'Pending').length;

  const handleAdminLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter admin credentials.');
      return;
    }
    const success = await login(email, password, 'admin');
    if (success) {
      setEmail('');
      setPassword('');
    }
  };

  const handleSimulateStatusNotification = async (eventType: 'confirmed' | 'out_for_delivery' | 'delivered') => {
    const targetOrder = orders[0];
    if (!targetOrder) {
      Alert.alert('No Orders', 'Create an order first to test notification events.');
      return;
    }

    const targetUserId = targetOrder.userId || user?.uid || 'usr_customer_demo_01';

    if (eventType === 'confirmed') {
      await notificationService.notifyOrderConfirmed(targetUserId, targetOrder.orderNumber, targetOrder.id);
      setActionMsg(`Multi-channel Push & SMS Sent: Order #${targetOrder.orderNumber} Confirmed!`);
    } else if (eventType === 'out_for_delivery') {
      await notificationService.notifyOutForDelivery(
        targetUserId,
        targetOrder.orderNumber,
        targetOrder.id,
        targetOrder.deliverySlot.timeWindow
      );
      setActionMsg(`Multi-channel Push & SMS Sent: Order #${targetOrder.orderNumber} Out for Delivery!`);
    } else {
      await notificationService.notifyOrderDelivered(targetUserId, targetOrder.orderNumber, targetOrder.id);
      setActionMsg(`Multi-channel Push, SMS & Email Sent: Order #${targetOrder.orderNumber} Delivered & Setup!`);
    }
    setTimeout(() => setActionMsg(null), 4000);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Califnco Admin Panel"
        subtitle={isAdmin ? 'Central Operations & Logistics Command Desk' : 'Restricted Administrative Access'}
        onBack={() => router.push('/customer')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          isWide && styles.wideContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin ? (
          /* ======================================= */
          /* AUTHENTICATED ADMIN DASHBOARD VIEW      */
          /* ======================================= */
          <View>
            {/* Admin Overview Hero Card */}
            <View style={styles.adminHeroCard}>
              <View style={styles.adminIconCircle}>
                <Text style={styles.adminIcon}>⚙️</Text>
              </View>
              <View style={styles.adminHeroDetails}>
                <View style={styles.badgeRow}>
                  <Text style={styles.adminTitle}>{user?.displayName || 'Operations Admin'}</Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>SUPER ADMIN</Text>
                  </View>
                </View>
                <Text style={styles.adminEmail}>{user?.email}</Text>
                <Text style={styles.adminAccess}>
                  Role: Operations Master • Full Firestore & Catalog Authority
                </Text>
              </View>
            </View>

            {/* Live KPI Metric Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>₹{Math.round(totalRevenue / 1000)}k</Text>
                <Text style={styles.kpiLabel}>Revenue (Paid)</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{orders.length}</Text>
                <Text style={styles.kpiLabel}>Total Orders</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiVal, { color: '#059669' }]}>{dealers.filter((d) => d.isApprovedDealer).length}</Text>
                <Text style={styles.kpiLabel}>Active Dealers</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{customers.length}</Text>
                <Text style={styles.kpiLabel}>Customers</Text>
              </View>
            </View>

            {actionMsg ? (
              <View style={styles.actionBanner}>
                <Text style={styles.actionBannerText}>✓ {actionMsg}</Text>
              </View>
            ) : null}

            {/* Central Administrative Hubs */}
            <Text style={styles.hubsSectionTitle}>Operations Control Hubs</Text>

            <View style={styles.hubsGrid}>
              {/* 1. Orders Management */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/orders')}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={styles.hubIcon}>📦</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Orders Management</Text>
                    {pendingOrdersCount > 0 ? (
                      <View style={styles.hubAlertPill}>
                        <Text style={styles.hubAlertPillText}>{pendingOrdersCount} Active</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.hubSubtitle}>
                    {orders.length} orders • Retail & Dealer B2B • Status transitions & tracking sync
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 2. Products Management */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/products')}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={styles.hubIcon}>🚰</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Products & Catalog</Text>
                    <View style={styles.hubNeutralPill}>
                      <Text style={styles.hubNeutralPillText}>{products.length} SKUs</Text>
                    </View>
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Purifiers, Dispensers, Pumps, Filters • Retail & Wholesale pricing control
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 3. Customers Directory */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/customers' as unknown as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={styles.hubIcon}>👥</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Customers Directory</Text>
                    <View style={styles.hubNeutralPill}>
                      <Text style={styles.hubNeutralPillText}>{customers.length} Accounts</Text>
                    </View>
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Customer accounts, order history, contact details & lifetime analytics
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 4. Inventory Desk */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/inventory' as unknown as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.hubIcon}>📊</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Inventory & Stock Control</Text>
                    {lowStockCount > 0 ? (
                      <View style={[styles.hubAlertPill, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={[styles.hubAlertPillText, { color: '#DC2626' }]}>
                          {lowStockCount} Low Stock
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Warehouse stock quantities, threshold warnings & 1-tap stock adjustments
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 5. Reels Automation */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/reels')}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#FCE7F3' }]}>
                  <Text style={styles.hubIcon}>🎬</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Instagram Reels Automation</Text>
                    <View style={[styles.hubNeutralPill, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.hubNeutralPillText, { color: '#059669' }]}>Active Pipeline</Text>
                    </View>
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Schedule reel, queue ({pendingReelsCount} pending), Gemini AI captions, FB Graph API
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 6. Dealer Approvals */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/dealers')}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <Text style={styles.hubIcon}>🏢</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Dealer Partner Approvals</Text>
                    {pendingDealersCount > 0 ? (
                      <View style={styles.hubAlertPill}>
                        <Text style={styles.hubAlertPillText}>{pendingDealersCount} Review</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Review applications, verify GSTIN, approve wholesale privileges
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>

              {/* 7. Service Desk */}
              <TouchableOpacity
                style={styles.hubCard}
                onPress={() => router.push('/admin/services')}
                activeOpacity={0.7}
              >
                <View style={[styles.hubIconCircle, { backgroundColor: '#FED7AA' }]}>
                  <Text style={styles.hubIcon}>🛠️</Text>
                </View>
                <View style={styles.hubInfo}>
                  <View style={styles.hubTitleRow}>
                    <Text style={styles.hubTitle}>Field Service Desk</Text>
                    {newServiceRequestsCount > 0 ? (
                      <View style={styles.hubAlertPill}>
                        <Text style={styles.hubAlertPillText}>{newServiceRequestsCount} New</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.hubSubtitle}>
                    Water Tanker, RO Installation, Filter AMC & technician dispatch
                  </Text>
                </View>
                <Text style={styles.hubChevron}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Notification & Multi-Channel Simulator */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Multi-Channel Notification Dispatcher</Text>
              <Text style={styles.sectionSubtitle}>
                Trigger assignment-required push, SMS, and email alerts for active customer orders:
              </Text>

              <View style={styles.fcmTriggerList}>
                <TouchableOpacity
                  style={[styles.fcmTriggerBtn, styles.fcmConfirmedBtn]}
                  onPress={() => handleSimulateStatusNotification('confirmed')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fcmTriggerBtnText}>1. Dispatch "Order Confirmed" (Push + SMS) 📦</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fcmTriggerBtn, styles.fcmDispatchBtn]}
                  onPress={() => handleSimulateStatusNotification('out_for_delivery')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fcmTriggerBtnText}>2. Dispatch "Out for Delivery" (Push + SMS) 🚚</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fcmTriggerBtn, styles.fcmDeliveredBtn]}
                  onPress={() => handleSimulateStatusNotification('delivered')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fcmTriggerBtnText}>3. Dispatch "Delivered & Setup" (Push + SMS + Email) 🎉</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Multi-Channel Dispatch Audit Logs */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Notification Audit Logs</Text>
              <Text style={styles.sectionSubtitle}>Cross-channel dispatch records (Push, SMS, Email):</Text>
              {notificationService.getDispatchAuditLogs().slice(0, 4).map((log) => (
                <View key={log.id} style={styles.auditLogRow}>
                  <View style={styles.auditChannelBadge}>
                    <Text style={styles.auditChannelText}>{log.channel}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditEventText}>{log.details}</Text>
                    <Text style={styles.auditMetaText}>To: {log.recipient} • {log.timestamp}</Text>
                  </View>
                  <View style={styles.auditDeliveredBadge}>
                    <Text style={styles.auditDeliveredText}>SENT</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Role Switch / Sign Out Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.switchRoleBtn}
                onPress={() => {
                  switchRoleForTesting('customer');
                  router.push('/customer');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.switchRoleBtnText}>Switch to Customer View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchRoleBtn}
                onPress={() => {
                  switchRoleForTesting('dealer');
                  router.push('/dealer');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.switchRoleBtnText}>Switch to Dealer View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => void logout()}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ======================================= */
          /* ADMIN LOGIN REQUIRED VIEW               */
          /* ======================================= */
          <View style={styles.loginCard}>
            <View style={styles.lockIconCircle}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.loginTitle}>Admin Control Center</Text>
            <Text style={styles.loginSub}>
              Administrative privileges required. Please authenticate with your Califnco Operations credentials.
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@califnco.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter admin password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleAdminLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Authenticate as Admin ⚙️</Text>
              )}
            </TouchableOpacity>

            <View style={styles.demoBox}>
              <Text style={styles.demoBoxTitle}>Development Verification:</Text>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => switchRoleForTesting('admin')}
                activeOpacity={0.8}
              >
                <Text style={styles.demoBtnText}>⚡ 1-Tap Login as Califnco Operations Admin</Text>
              </TouchableOpacity>
            </View>
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
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  adminHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  adminIcon: {
    fontSize: 28,
  },
  adminHeroDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  adminAccess: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 3,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  hubsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  hubsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hubIcon: {
    fontSize: 22,
  },
  hubInfo: {
    flex: 1,
  },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  hubSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  hubAlertPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubAlertPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  hubNeutralPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubNeutralPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  hubChevron: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  actionBanner: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  actionBannerText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  fcmTriggerList: {
    gap: 8,
  },
  fcmTriggerBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  fcmConfirmedBtn: {
    backgroundColor: '#0284C7',
  },
  fcmDispatchBtn: {
    backgroundColor: '#7C3AED',
  },
  fcmDeliveredBtn: {
    backgroundColor: '#059669',
  },
  fcmTriggerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  auditLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  auditChannelBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  auditChannelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  auditEventText: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  auditMetaText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  auditDeliveredBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  auditDeliveredText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  switchRoleBtn: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  switchRoleBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  // Login card
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 30,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  loginSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  inputGroup: {
    width: '100%',
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
  submitBtn: {
    width: '100%',
    backgroundColor: '#D97706',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
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
    width: '100%',
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
  },
  demoBox: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  demoBoxTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
});
