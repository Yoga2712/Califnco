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
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useServiceDesk } from '../../../services/serviceDeskService';
import { ServicePriority, ServiceRequest, ServiceStatus, ServiceType } from '../../../types/service';

const STATUS_FILTERS: { label: string; value: 'all' | ServiceStatus }[] = [
  { label: 'All Tickets', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const TECHNICIANS = [
  { name: 'Ramesh Sundaram', role: 'Lead RO Installation Engineer', phone: '+91 98450 11223' },
  { name: 'Suresh Gowda', role: 'Commercial Fleet & Tanker Specialist', phone: '+91 97410 88990' },
  { name: 'Anand Kumar', role: 'Preventive Maintenance & Membrane Tech', phone: '+91 99002 33445' },
  { name: 'Praveen Joshi', role: 'Water Quality & TDS Analyst', phone: '+91 98200 44556' },
];

export default function AdminServicesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { isAuthenticated, role, switchRoleForTesting } = useAuth();
  const { requests, updateServiceStatus, assignTechnician } = useServiceDesk();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all');
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<ServiceRequest | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = isAuthenticated && role === 'admin';

  const newCount = requests.filter((r) => r.status === 'new').length;
  const inProgressCount = requests.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = req.ticketNumber.toLowerCase().includes(q);
      const matchName = req.customerName.toLowerCase().includes(q);
      const matchPhone = req.customerPhone.toLowerCase().includes(q);
      const matchType = req.serviceType.toLowerCase().includes(q);
      const matchCity = req.shippingAddress.city.toLowerCase().includes(q);
      return matchNum || matchName || matchPhone || matchType || matchCity;
    }
    return true;
  });

  const handleAssignTech = (ticketId: string, techName: string, techPhone: string) => {
    assignTechnician(ticketId, techName, techPhone);
    setSelectedTicketForAssign(null);
    setActionSuccessMsg(`Assigned ${techName} to ticket`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleStartJob = (ticket: ServiceRequest) => {
    updateServiceStatus(ticket.id, 'in_progress');
    setActionSuccessMsg(`Ticket #${ticket.ticketNumber} marked In Progress`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleCompleteJob = (ticketId: string, ticketNumber: string) => {
    const notes = resolutionInput.trim() || 'Service successfully performed and water TDS tested at customer premises.';
    updateServiceStatus(ticketId, 'completed', notes);
    setResolvingTicketId(null);
    setResolutionInput('');
    setActionSuccessMsg(`Ticket #${ticketNumber} resolved & completed!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const openMapForAddress = (req: ServiceRequest) => {
    const q = `${req.shippingAddress.addressLine}, ${req.shippingAddress.city}, ${req.shippingAddress.state} ${req.shippingAddress.pincode}`;
    const url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
    void Linking.openURL(url);
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Header title="Service Desk" subtitle="Restricted Admin Desk" onBack={() => router.push('/admin')} />
        <View style={styles.unauthCard}>
          <Text style={styles.unauthEmoji}>🔒</Text>
          <Text style={styles.unauthTitle}>Admin Authentication Required</Text>
          <Text style={styles.unauthText}>
            You must be logged in as Califnco Operations Admin to manage the Service Desk.
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
        title="Admin Service Desk"
        subtitle={`Field Operations • Tanker Dispatch • Technician Scheduling`}
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

        {/* Service Desk KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{requests.length}</Text>
            <Text style={styles.kpiLabel}>Total Tickets</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>{newCount}</Text>
            <Text style={styles.kpiLabel}>New Requests</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#0284C7' }]}>{inProgressCount}</Text>
            <Text style={styles.kpiLabel}>In Field</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>{completedCount}</Text>
            <Text style={styles.kpiLabel}>Resolved</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets by ID, customer name, phone, city..."
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

        {/* Status Filter Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
          {STATUS_FILTERS.map((tab) => {
            const count = tab.value === 'all' ? requests.length : requests.filter((r) => r.status === tab.value).length;
            const isSelected = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                onPress={() => setStatusFilter(tab.value)}
              >
                <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Service Tickets List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={styles.emptyTitle}>No Service Tickets Found</Text>
            <Text style={styles.emptySub}>No tickets match your search or filter selection.</Text>
          </View>
        ) : (
          filteredRequests.map((req) => {
            const isNew = req.status === 'new';
            const isAssigned = req.status === 'assigned';
            const isInProgress = req.status === 'in_progress';
            const isCompleted = req.status === 'completed';

            const priorityColor =
              req.priority === 'urgent'
                ? '#DC2626'
                : req.priority === 'high'
                ? '#D97706'
                : req.priority === 'medium'
                ? '#0284C7'
                : '#64748B';

            return (
              <View key={req.id} style={styles.ticketCard}>
                {/* Ticket Top Bar */}
                <View style={styles.ticketTopBar}>
                  <View style={styles.ticketHeaderLeft}>
                    <Text style={styles.ticketNumber}>#{req.ticketNumber}</Text>
                    <View style={styles.serviceTypeBadge}>
                      <Text style={styles.serviceTypeBadgeText}>{req.serviceType}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
                      <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                        {req.priority.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isNew && styles.statusNew,
                        isAssigned && styles.statusAssigned,
                        isInProgress && styles.statusProgress,
                        isCompleted && styles.statusCompleted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isNew && styles.statusNewText,
                          isAssigned && styles.statusAssignedText,
                          isInProgress && styles.statusProgressText,
                          isCompleted && styles.statusCompletedText,
                        ]}
                      >
                        {req.status.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.customerBox}>
                  <Text style={styles.customerName}>{req.customerName}</Text>
                  <Text style={styles.customerContact}>
                    📞 {req.customerPhone} • ✉️ {req.customerEmail}
                  </Text>
                  <Text style={styles.preferredSlotText}>
                    📅 Preferred: <Text style={styles.boldDark}>{req.preferredDate}</Text> • {req.preferredTimeSlot}
                  </Text>
                </View>

                {/* Address Box with Map button */}
                <View style={styles.addressBox}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressLabel}>📍 Service Location ({req.shippingAddress.addressType})</Text>
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => openMapForAddress(req)}
                    >
                      <Text style={styles.mapBtnText}>View on Map ↗</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.addressLine}>{req.shippingAddress.addressLine}</Text>
                  <Text style={styles.addressCity}>
                    {req.shippingAddress.city}, {req.shippingAddress.state} - {req.shippingAddress.pincode}
                  </Text>
                </View>

                {/* Customer Notes */}
                {req.customerNotes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Customer Issue / Description:</Text>
                    <Text style={styles.notesText}>{req.customerNotes}</Text>
                  </View>
                ) : null}

                {/* Assigned Technician Card if assigned */}
                {req.assignedTechnician ? (
                  <View style={styles.techCard}>
                    <View style={styles.techIconCircle}>
                      <Text style={styles.techIcon}>🔧</Text>
                    </View>
                    <View style={styles.techInfo}>
                      <Text style={styles.techTitle}>Assigned Technician</Text>
                      <Text style={styles.techName}>{req.assignedTechnician}</Text>
                      <Text style={styles.techPhone}>📞 {req.technicianPhone}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Resolution Summary if completed */}
                {isCompleted && req.resolutionNotes ? (
                  <View style={styles.resolutionBox}>
                    <Text style={styles.resolutionTitle}>✓ Resolution & TDS Test Summary:</Text>
                    <Text style={styles.resolutionText}>{req.resolutionNotes}</Text>
                  </View>
                ) : null}

                {/* Completion Input if actively resolving */}
                {resolvingTicketId === req.id ? (
                  <View style={styles.resolveInputBox}>
                    <Text style={styles.resolveInputTitle}>Resolution & TDS Notes:</Text>
                    <TextInput
                      style={styles.resolveInput}
                      placeholder="e.g. Purifier installed, water input TDS 680 ppm, output pure TDS 65 ppm."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      value={resolutionInput}
                      onChangeText={setResolutionInput}
                    />
                    <View style={styles.resolveBtnRow}>
                      <TouchableOpacity
                        style={styles.confirmResolveBtn}
                        onPress={() => handleCompleteJob(req.id, req.ticketNumber)}
                      >
                        <Text style={styles.confirmResolveBtnText}>Confirm Complete ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelResolveBtn}
                        onPress={() => setResolvingTicketId(null)}
                      >
                        <Text style={styles.cancelResolveBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Action Row */}
                <View style={styles.actionRow}>
                  {isNew ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnAssign]}
                      onPress={() => setSelectedTicketForAssign(req)}
                    >
                      <Text style={styles.actionBtnText}>1. Assign Field Technician 🔧</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isAssigned ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnStart]}
                      onPress={() => handleStartJob(req)}
                    >
                      <Text style={styles.actionBtnText}>2. Start Field Job ⏳</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isInProgress && resolvingTicketId !== req.id ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnComplete]}
                      onPress={() => {
                        setResolvingTicketId(req.id);
                        setResolutionInput('');
                      }}
                    >
                      <Text style={styles.actionBtnText}>3. Complete Service & Log TDS ✅</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Ticket Resolved & Signed Off</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Technician Assignment Modal */}
      <Modal visible={!!selectedTicketForAssign} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch Field Technician</Text>
                <Text style={styles.modalSub}>
                  Ticket #{selectedTicketForAssign?.ticketNumber} • {selectedTicketForAssign?.serviceType}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTicketForAssign(null)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              Select a certified Califnco service engineer for immediate dispatch:
            </Text>

            <View style={styles.techList}>
              {TECHNICIANS.map((tech) => (
                <TouchableOpacity
                  key={tech.name}
                  style={styles.techSelectCard}
                  onPress={() => {
                    if (selectedTicketForAssign) {
                      handleAssignTech(selectedTicketForAssign.id, tech.name, tech.phone);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.techIconCircle}>
                    <Text style={styles.techIcon}>👨‍🔧</Text>
                  </View>
                  <View style={styles.techDetails}>
                    <Text style={styles.techCardName}>{tech.name}</Text>
                    <Text style={styles.techCardRole}>{tech.role}</Text>
                    <Text style={styles.techCardPhone}>{tech.phone}</Text>
                  </View>
                  <Text style={styles.selectChevron}>Assign →</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  tabScroll: {
    marginBottom: 14,
  },
  tabScrollContent: {
    gap: 8,
  },
  tabBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabBtnText: {
    fontSize: 12,
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
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusNew: {
    backgroundColor: '#FEF3C7',
  },
  statusNewText: {
    color: '#D97706',
  },
  statusAssigned: {
    backgroundColor: '#E0F2FE',
  },
  statusAssignedText: {
    color: '#0284C7',
  },
  statusProgress: {
    backgroundColor: '#EDE9FE',
  },
  statusProgressText: {
    color: '#7C3AED',
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusCompletedText: {
    color: '#059669',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customerBox: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerContact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  preferredSlotText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  addressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  addressLine: {
    fontSize: 12,
    color: '#334155',
  },
  addressCity: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  notesText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  techIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techIcon: {
    fontSize: 18,
  },
  techInfo: {
    flex: 1,
  },
  techTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  techName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  techPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  resolutionBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  resolutionText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  resolveInputBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  resolveInputTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  resolveInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 50,
  },
  resolveBtnRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  confirmResolveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  confirmResolveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelResolveBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  cancelResolveBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnAssign: {
    backgroundColor: '#0284C7',
  },
  btnStart: {
    backgroundColor: '#7C3AED',
  },
  btnComplete: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
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
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  modalInstruction: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 12,
  },
  techList: {
    gap: 10,
  },
  techSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  techDetails: {
    flex: 1,
  },
  techCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  techCardRole: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 1,
  },
  techCardPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  selectChevron: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
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
