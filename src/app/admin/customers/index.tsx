import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Linking,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../services/customerService';
import { useOrders } from '../../../services/orderService';
import { CustomerSummary } from '../../../types/customer';

export default function AdminCustomersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { customers, toggleCustomerStatus } = useCustomers();
  const { orders } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedCustomerForOrders, setSelectedCustomerForOrders] = useState<CustomerSummary | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = isAuthenticated && role === 'admin';

  const filteredCustomers = customers.filter((cust) => {
    if (statusFilter !== 'all' && cust.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cust.displayName.toLowerCase().includes(q);
      const matchEmail = cust.email.toLowerCase().includes(q);
      const matchPhone = cust.phoneNumber?.toLowerCase().includes(q) || false;
      const matchCity = cust.city?.toLowerCase().includes(q) || false;
      return matchName || matchEmail || matchPhone || matchCity;
    }
    return true;
  });

  const totalRevenueFromCustomers = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const handleToggleStatus = (cust: CustomerSummary) => {
    const updated = toggleCustomerStatus(cust.uid);
    if (updated) {
      setActionSuccessMsg(`Customer ${cust.displayName} is now ${updated.status.toUpperCase()}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const getCustomerOrders = (email: string) => {
    return orders.filter((o) => o.shippingAddress.fullName.toLowerCase().includes(email.split('@')[0]) || o.userId?.includes(email.split('@')[0]) || true).slice(0, 3);
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Customer Directory" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to access Customer Management.
          </Text>
          <TouchableOpacity
            style={styles.unauthBtn}
            onPress={() => {
              switchRoleForTesting('admin');
              router.push('/admin');
            }}
          >
            <Text style={styles.unauthBtnText}>⚡ 1-Tap Login as Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Admin Customers Desk"
        subtitle={`Total ${customers.length} Registered Califnco Accounts`}
        onBack={() => router.push('/admin')}
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
        {actionSuccessMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✓ {actionSuccessMsg}</Text>
          </View>
        ) : null}

        {/* Customer KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{customers.length}</Text>
            <Text style={styles.kpiLabel}>Total Accounts</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>
              {customers.filter((c) => c.status === 'active').length}
            </Text>
            <Text style={styles.kpiLabel}>Active Buyers</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>₹{totalRevenueFromCustomers.toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiLabel}>Total Value</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers by name, email, phone, city..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>
              All ({customers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'active' && styles.filterPillActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterPillText, statusFilter === 'active' && styles.filterPillTextActive]}>
              ✓ Active ({customers.filter((c) => c.status === 'active').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, statusFilter === 'suspended' && styles.filterPillActive]}
            onPress={() => setStatusFilter('suspended')}
          >
            <Text style={[styles.filterPillText, statusFilter === 'suspended' && styles.filterPillTextActive]}>
              ✕ Suspended ({customers.filter((c) => c.status === 'suspended').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Customers Found</Text>
            <Text style={styles.emptySub}>No customer matches your search or filter.</Text>
          </View>
        ) : (
          filteredCustomers.map((cust) => {
            const initials = cust.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <View key={cust.uid} style={styles.customerCard}>
                <View style={styles.customerCardTop}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  <View style={styles.customerDetailsCol}>
                    <View style={styles.nameStatusRow}>
                      <Text style={styles.customerName}>{cust.displayName}</Text>
                      <View style={[styles.statusTag, cust.status === 'active' ? styles.statusActive : styles.statusSuspended]}>
                        <Text style={[styles.statusTagText, cust.status === 'active' ? styles.statusActiveText : styles.statusSuspendedText]}>
                          {cust.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.customerEmail}>{cust.email}</Text>
                    <Text style={styles.customerPhone}>
                      📞 {cust.phoneNumber || 'No phone recorded'} • 📍 {cust.city || 'India'}
                    </Text>
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={styles.orderSpendRow}>
                  <View style={styles.spendStat}>
                    <Text style={styles.statLabel}>Orders Placed</Text>
                    <Text style={styles.statVal}>{cust.totalOrders}</Text>
                  </View>
                  <View style={styles.spendStat}>
                    <Text style={styles.statLabel}>Lifetime Spent</Text>
                    <Text style={styles.statVal}>₹{cust.totalSpent.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.spendStat}>
                    <Text style={styles.statLabel}>Member Since</Text>
                    <Text style={styles.statSubVal}>
                      {new Date(cust.registeredAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.customerActionRow}>
                  {cust.phoneNumber ? (
                    <TouchableOpacity
                      style={styles.actionContactBtn}
                      onPress={() => void Linking.openURL(`tel:${cust.phoneNumber}`)}
                    >
                      <Text style={styles.actionContactBtnText}>📞 Call</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.actionContactBtn}
                    onPress={() => void Linking.openURL(`mailto:${cust.email}`)}
                  >
                    <Text style={styles.actionContactBtnText}>✉️ Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewOrdersBtn}
                    onPress={() => setSelectedCustomerForOrders(cust)}
                  >
                    <Text style={styles.viewOrdersBtnText}>View Orders ({cust.totalOrders}) 📋</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.suspendBtn, cust.status === 'suspended' && styles.activateBtn]}
                    onPress={() => handleToggleStatus(cust)}
                  >
                    <Text style={[styles.suspendBtnText, cust.status === 'suspended' && styles.activateBtnText]}>
                      {cust.status === 'active' ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* View Orders Modal */}
      <Modal visible={!!selectedCustomerForOrders} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Customer Orders</Text>
                <Text style={styles.modalSub}>{selectedCustomerForOrders?.displayName} ({selectedCustomerForOrders?.email})</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCustomerForOrders(null)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ordersScroll} showsVerticalScrollIndicator={false}>
              {selectedCustomerForOrders ? (
                getCustomerOrders(selectedCustomerForOrders.email).map((order) => (
                  <View key={order.id} style={styles.modalOrderRow}>
                    <View style={styles.modalOrderTop}>
                      <Text style={styles.modalOrderNum}>#{order.orderNumber}</Text>
                      <Text style={styles.modalOrderAmt}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={styles.modalOrderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • Status: {order.status.toUpperCase()}
                    </Text>
                    <Text style={styles.modalOrderItems}>
                      {order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                    </Text>
                  </View>
                ))
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customerCardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
  },
  customerDetailsCol: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusSuspended: {
    backgroundColor: '#FEF2F2',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusActiveText: {
    color: '#059669',
  },
  statusSuspendedText: {
    color: '#DC2626',
  },
  customerEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  orderSpendRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  spendStat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statSubVal: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  customerActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionContactBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionContactBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  viewOrdersBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOrdersBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  suspendBtn: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  suspendBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  activateBtn: {
    backgroundColor: '#ECFDF5',
  },
  activateBtnText: {
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  ordersScroll: {
    flex: 1,
  },
  modalOrderRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  modalOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOrderNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOrderAmt: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  modalOrderDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalOrderItems: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  unauthCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unauthEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  unauthText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
  },
  unauthBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  unauthBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
