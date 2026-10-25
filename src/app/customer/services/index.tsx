import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';
import { useServiceDesk } from '../../../services/serviceDeskService';
import { ServiceType } from '../../../types/service';

const SERVICES_CATALOG: {
  type: ServiceType;
  title: string;
  description: string;
  priceNote: string;
  turnaround: string;
  icon: string;
}[] = [
  {
    type: 'Water Delivery',
    title: 'Packaged 20L Water Delivery',
    description: 'Fresh 20-litre mineral water cans delivered directly to your home or office from certified Califnco depots.',
    priceNote: '₹90 per 20L Can • Free doorstep delivery',
    turnaround: 'Same day (within 2-4 hours)',
    icon: '💧',
  },
  {
    type: 'Water Tanker',
    title: 'Potable Water Tanker (6000L / 12000L)',
    description: 'High-capacity potable mineral water tankers for residential apartments, villas, and industrial facilities.',
    priceNote: 'Starting from ₹1,499 per tanker',
    turnaround: 'Scheduled within 2-6 hours',
    icon: '🚚',
  },
  {
    type: 'Purifier Installation',
    title: 'Professional RO Installation & Setup',
    description: 'Certified Califnco technicians mount your purifier, check inlet pressure, and verify raw vs output TDS balance.',
    priceNote: 'Free with new purifiers • ₹499 standalone',
    turnaround: 'Next-day confirmed slot',
    icon: '🔧',
  },
  {
    type: 'Filter Replacement',
    title: 'Sediment, Carbon & Membrane Service',
    description: 'Replacement of worn-out RO membranes, copper-alkaline mineral cartridges, and UV sterilization lamps.',
    priceNote: 'Genuine OEM cartridges with 6-month warranty',
    turnaround: 'Slot within 24 hours',
    icon: '🧪',
  },
  {
    type: 'TDS Water Quality Test',
    title: 'Complete Water Purity & Hardness Lab Test',
    description: 'Technician on-site comprehensive testing of raw input TDS, pH, hardness, and heavy mineral presence.',
    priceNote: '100% Free Doorstep Consultation',
    turnaround: 'Same-day / Tomorrow morning',
    icon: '🔬',
  },
  {
    type: 'Maintenance / AMC',
    title: 'Annual Comprehensive Care Plan (AMC)',
    description: 'Unlimited service visits, 2 scheduled filter changes per year, and emergency breakdown assistance.',
    priceNote: '₹2,499 / year all-inclusive',
    turnaround: 'Priority 4-hour response guarantee',
    icon: '🛡️',
  },
];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { user } = useAuth();
  const { requests, createServiceRequest } = useServiceDesk();

  const [bookingService, setBookingService] = useState<typeof SERVICES_CATALOG[0] | null>(null);
  const [customerName, setCustomerName] = useState(user?.displayName || 'Aarun Kumar');
  const [customerPhone, setCustomerPhone] = useState(user?.phoneNumber || '9876543210');
  const [addressLine, setAddressLine] = useState('Flat 402, Green Meadows, 1st Cross, Indiranagar');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560038');
  const [preferredDate, setPreferredDate] = useState('Tomorrow');
  const [preferredSlot, setPreferredSlot] = useState('Morning (10 AM - 1 PM)');
  const [notes, setNotes] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const myRequests = requests.filter(
    (r) => r.userId === user?.uid || r.customerEmail === user?.email || r.customerName === user?.displayName
  );

  const handleBookService = async () => {
    if (!bookingService) return;
    if (!customerName.trim() || !customerPhone.trim() || !addressLine.trim()) {
      Alert.alert('Required Fields', 'Please complete your contact name, phone, and address.');
      return;
    }

    const created = await createServiceRequest({
      userId: user?.uid || 'usr_customer_demo_01',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: user?.email || 'customer@califnco.com',
      serviceType: bookingService.type,
      priority: bookingService.type === 'Water Tanker' ? 'high' : 'medium',
      shippingAddress: {
        fullName: customerName.trim(),
        phoneNumber: customerPhone.trim(),
        addressLine: addressLine.trim(),
        city: city.trim() || 'Bengaluru',
        state: 'Karnataka',
        pincode: pincode.trim() || '560038',
        addressType: 'Home',
      },
      preferredDate,
      preferredTimeSlot: preferredSlot,
      customerNotes: notes.trim(),
    });

    setBookingService(null);
    setNotes('');
    setSuccessBanner(`Service Ticket #${created.ticketNumber} registered! Certified technician will be assigned.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Califnco Services"
        subtitle="Doorstep Water Delivery, RO Installation & Tankers"
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
        {successBanner ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✓ {successBanner}</Text>
          </View>
        ) : null}

        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Comprehensive Water Services</Text>
          <Text style={styles.heroSubtitle}>
            From same-day 20L water cans to commercial water tankers and certified RO maintenance, Califnco ensures pure water reliability across your city.
          </Text>
        </View>

        {/* Active Customer Bookings */}
        {myRequests.length > 0 ? (
          <View style={styles.myRequestsSection}>
            <Text style={styles.sectionHeading}>Your Active Service Requests</Text>
            {myRequests.map((req) => (
              <View key={req.id} style={styles.myRequestCard}>
                <View style={styles.reqTop}>
                  <Text style={styles.reqTicketNum}>Ticket #{req.ticketNumber}</Text>
                  <View style={styles.reqStatusBadge}>
                    <Text style={styles.reqStatusBadgeText}>{req.status.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reqType}>{req.serviceType}</Text>
                <Text style={styles.reqSlot}>Slot: {req.preferredDate} ({req.preferredTimeSlot})</Text>
                {req.assignedTechnician ? (
                  <Text style={styles.reqTech}>Assigned Tech: {req.assignedTechnician} (📞 {req.technicianPhone})</Text>
                ) : (
                  <Text style={styles.reqAssignPending}>Technician assignment in progress...</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {/* Available Services Grid */}
        <Text style={styles.sectionHeading}>Select a Service to Book</Text>
        <View style={styles.catalogGrid}>
          {SERVICES_CATALOG.map((svc) => (
            <View key={svc.type} style={styles.serviceCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>{svc.icon}</Text>
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.cardTitle}>{svc.title}</Text>
                  <Text style={styles.cardTurnaround}>⏱️ {svc.turnaround}</Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{svc.description}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceNote}>{svc.priceNote}</Text>
              </View>

              <TouchableOpacity
                style={styles.bookNowBtn}
                onPress={() => setBookingService(svc)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookNowBtnText}>Book This Service →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!bookingService} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book {bookingService?.title}</Text>
                <Text style={styles.modalSubtitle}>{bookingService?.turnaround}</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingService(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Your Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={customerName}
                onChangeText={setCustomerName}
              />

              <Text style={styles.inputLabel}>Contact Mobile Number *</Text>
              <TextInput
                style={styles.textInput}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Service Address (Flat, Street) *</Text>
              <TextInput
                style={styles.textInput}
                value={addressLine}
                onChangeText={setAddressLine}
              />

              <View style={styles.twoInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.textInput}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PIN Code</Text>
                  <TextInput
                    style={styles.textInput}
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Preferred Date</Text>
              <View style={styles.pillRow}>
                {['Today', 'Tomorrow', 'In 2 Days'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.choicePill, preferredDate === d && styles.choicePillActive]}
                    onPress={() => setPreferredDate(d)}
                  >
                    <Text style={[styles.choicePillText, preferredDate === d && styles.choicePillTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Preferred Time Slot</Text>
              <View style={styles.pillRow}>
                {['Morning (10 AM - 1 PM)', 'Afternoon (2 PM - 5 PM)', 'Evening (5 PM - 8 PM)'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.choicePill, preferredSlot === s && styles.choicePillActive]}
                    onPress={() => setPreferredSlot(s)}
                  >
                    <Text style={[styles.choicePillText, preferredSlot === s && styles.choicePillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Special Instructions / Notes</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="e.g. Bring extra 20L cans, inlet pressure is low..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={styles.confirmBookingBtn}
                onPress={handleBookService}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBookingBtnText}>Confirm Doorstep Request 🚀</Text>
              </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#0284C7',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#E0F2FE',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  myRequestsSection: {
    marginBottom: 24,
  },
  myRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqTicketNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reqStatusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reqStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  reqType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  reqSlot: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reqTech: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  reqAssignPending: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 4,
    fontStyle: 'italic',
  },
  catalogGrid: {
    gap: 14,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardTurnaround: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  priceRow: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  priceNote: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  bookNowBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookNowBtnText: {
    color: '#FFFFFF',
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
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  modalClose: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  modalForm: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  multilineInput: {
    height: 55,
    textAlignVertical: 'top',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  choicePill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  choicePillActive: {
    backgroundColor: '#0284C7',
  },
  choicePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmBookingBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});