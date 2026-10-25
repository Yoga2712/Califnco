import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useDealers, DealerItem } from '../../../services/dealerService';

export default function AdminDealersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { dealers, approveDealer, rejectDealer } = useDealers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = isAuthenticated && role === 'admin';

  const pendingCount = dealers.filter((d) => d.status === 'pending').length;
  const approvedCount = dealers.filter((d) => d.status === 'approved').length;
  const rejectedCount = dealers.filter((d) => d.status === 'rejected').length;
  const totalVolume = dealers.reduce((sum, d) => sum + d.totalWholesaleVolume, 0);

  const filteredDealers = dealers.filter((d) => {
    if (filterTab !== 'all' && d.status !== filterTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCompany = d.companyName.toLowerCase().includes(q);
      const matchPerson = d.displayName.toLowerCase().includes(q);
      const matchEmail = d.email.toLowerCase().includes(q);
      const matchGstin = d.gstin.toLowerCase().includes(q);
      const matchCity = d.city.toLowerCase().includes(q);
      return matchCompany || matchPerson || matchEmail || matchGstin || matchCity;
    }
    return true;
  });

  const handleApprove = async (dealer: DealerItem) => {
    const doApprove = async () => {
      await approveDealer(dealer.uid);
      setActionSuccessMsg(`Dealer "${dealer.companyName}" approved! Wholesale access granted.`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Approve "${dealer.companyName}" as an authorized Califnco dealer partner? This enables B2B wholesale orders and margin discounts.`
      );
      if (confirmed) {
        await doApprove();
      }
    } else {
      Alert.alert(
        'Approve Dealer Application',
        `Approve "${dealer.companyName}" as an authorized dealer partner?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve Partner', onPress: () => void doApprove() },
        ]
      );
    }
  };

  const handleReject = async (dealer: DealerItem) => {
    const doReject = async (reason?: string) => {
      await rejectDealer(dealer.uid, reason);
      setActionSuccessMsg(`Dealer application for "${dealer.companyName}" rejected.`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    };

    if (Platform.OS === 'web') {
      const reason = window.prompt(
        `Please specify the reason for rejecting "${dealer.companyName}":`,
        'Incomplete GSTIN or territorial non-overlap'
      );
      if (reason !== null) {
        await doReject(reason);
      }
    } else {
      Alert.alert(
        'Reject Dealer Application',
        `Are you sure you want to reject "${dealer.companyName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject', style: 'destructive', onPress: () => void doReject() },
        ]
      );
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Dealer Management" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to manage dealer approvals.
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
        title="Admin Dealer Desk"
        subtitle={`B2B Partner Onboarding & GST Verification Desk`}
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

        {/* Dealer KPI Overview */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{dealers.length}</Text>
            <Text style={styles.kpiLabel}>Total Partners</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>{approvedCount}</Text>
            <Text style={styles.kpiLabel}>Approved</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>{pendingCount}</Text>
            <Text style={styles.kpiLabel}>Pending Review</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>₹{Math.round(totalVolume / 1000)}k</Text>
            <Text style={styles.kpiLabel}>B2B Volume</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by company name, contact, GSTIN, or city..."
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

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'all' && styles.tabBtnActive]}
            onPress={() => setFilterTab('all')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'all' && styles.tabBtnTextActive]}>
              All ({dealers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setFilterTab('pending')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'pending' && styles.tabBtnTextActive]}>
              ⏳ Pending ({pendingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'approved' && styles.tabBtnActive]}
            onPress={() => setFilterTab('approved')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'approved' && styles.tabBtnTextActive]}>
              ✓ Approved ({approvedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, filterTab === 'rejected' && styles.tabBtnActive]}
            onPress={() => setFilterTab('rejected')}
          >
            <Text style={[styles.tabBtnText, filterTab === 'rejected' && styles.tabBtnTextActive]}>
              ✕ Rejected ({rejectedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dealers List */}
        {filteredDealers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No Dealer Partners Found</Text>
            <Text style={styles.emptySub}>No dealers match your search or filter selection.</Text>
          </View>
        ) : (
          filteredDealers.map((dealer) => {
            const isApproved = dealer.status === 'approved';
            const isPending = dealer.status === 'pending';
            const isRejected = dealer.status === 'rejected';

            return (
              <View key={dealer.uid} style={styles.dealerCard}>
                <View style={styles.dealerCardTop}>
                  <View style={styles.dealerIconCircle}>
                    <Text style={styles.dealerIcon}>🏢</Text>
                  </View>

                  <View style={styles.dealerDetailsCol}>
                    <View style={styles.companyStatusRow}>
                      <Text style={styles.companyName}>{dealer.companyName}</Text>
                      {isApproved ? (
                        <View style={styles.approvedBadge}>
                          <Text style={styles.approvedBadgeText}>✓ APPROVED</Text>
                        </View>
                      ) : isPending ? (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>⏳ PENDING REVIEW</Text>
                        </View>
                      ) : (
                        <View style={styles.rejectedBadge}>
                          <Text style={styles.rejectedBadgeText}>✕ REJECTED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.contactPersonText}>
                      Contact: <Text style={styles.boldDark}>{dealer.displayName}</Text>
                    </Text>
                    <Text style={styles.contactMetaText}>
                      📞 {dealer.phoneNumber} • ✉️ {dealer.email}
                    </Text>
                    <Text style={styles.locationText}>
                      📍 {dealer.city}, {dealer.state}
                    </Text>
                  </View>
                </View>

                {/* GSTIN & PO Stats Row */}
                <View style={styles.gstinStatsBox}>
                  <View style={styles.gstinCol}>
                    <Text style={styles.gstinLabel}>Registered GSTIN</Text>
                    <View style={styles.gstinBadgeRow}>
                      <Text style={styles.gstinValue}>{dealer.gstin}</Text>
                      <View style={styles.gstinVerifiedBadge}>
                        <Text style={styles.gstinVerifiedText}>VERIFIED</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.poCol}>
                    <Text style={styles.gstinLabel}>Wholesale Volume</Text>
                    <Text style={styles.poValue}>
                      ₹{dealer.totalWholesaleVolume.toLocaleString('en-IN')}{' '}
                      <Text style={styles.poCount}>({dealer.totalPurchaseOrders} POs)</Text>
                    </Text>
                  </View>
                </View>

                {/* Rejection Note if rejected */}
                {isRejected && dealer.rejectionReason ? (
                  <View style={styles.rejectionNotice}>
                    <Text style={styles.rejectionNoticeLabel}>Rejection Reason:</Text>
                    <Text style={styles.rejectionNoticeText}>{dealer.rejectionReason}</Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {isPending ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => void handleApprove(dealer)}
                      >
                        <Text style={styles.approveBtnText}>✓ Approve Dealer Partner</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => void handleReject(dealer)}
                      >
                        <Text style={styles.rejectBtnText}>Reject Application</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {isApproved ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.inspectBtn]}
                        onPress={() => router.push('/admin/orders')}
                      >
                        <Text style={styles.inspectBtnText}>Inspect B2B Orders 📋</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.suspendActionBtn]}
                        onPress={() => void handleReject(dealer)}
                      >
                        <Text style={styles.suspendActionBtnText}>Suspend Partner</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {isRejected ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.reApproveBtn]}
                      onPress={() => void handleApprove(dealer)}
                    >
                      <Text style={styles.reApproveBtnText}>⚡ Re-Evaluate & Approve Partner</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
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
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
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
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  tabBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tabBtnTextActive: {
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
  dealerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dealerCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  dealerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dealerIcon: {
    fontSize: 22,
  },
  dealerDetailsCol: {
    flex: 1,
  },
  companyStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  approvedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  approvedBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  rejectedBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rejectedBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  contactPersonText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
  contactMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  gstinStatsBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    marginBottom: 12,
    gap: 12,
  },
  gstinCol: {
    flex: 1,
  },
  gstinLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  gstinBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  gstinValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gstinVerifiedBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gstinVerifiedText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284C7',
  },
  poCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  poValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  poCount: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  rejectionNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  rejectionNoticeLabel: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '700',
  },
  rejectionNoticeText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#059669',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  inspectBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
  },
  inspectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  suspendActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  suspendActionBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  reApproveBtn: {
    flex: 1,
    backgroundColor: '#D97706',
  },
  reApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
