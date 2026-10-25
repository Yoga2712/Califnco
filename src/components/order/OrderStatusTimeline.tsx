import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatus } from '../../types/order';

interface TimelineStepConfig {
  key: OrderStatus;
  title: string;
  description: string;
  activeBadge: string;
}

const TIMELINE_STEPS: TimelineStepConfig[] = [
  {
    key: 'placed',
    title: 'Order Placed',
    description: 'Order received and verified by Califnco Care.',
    activeBadge: 'Received',
  },
  {
    key: 'confirmed',
    title: 'Order Confirmed',
    description: 'Certified technician assigned for installation.',
    activeBadge: 'Assigned',
  },
  {
    key: 'processing',
    title: 'System Tested & Packed',
    description: '8-stage membrane and TDS calibration completed.',
    activeBadge: 'In Prep',
  },
  {
    key: 'out_for_delivery',
    title: 'Out for Delivery',
    description: 'Technician in transit with TDS testing kit.',
    activeBadge: 'On The Way',
  },
  {
    key: 'delivered',
    title: 'Delivered & Installed',
    description: 'System mounted, tested and handed over.',
    activeBadge: 'Completed',
  },
];

const STATUS_ORDER_MAP: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  processing: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
};

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  estimatedDeliveryDate?: string;
  deliverySlotWindow?: string;
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  estimatedDeliveryDate,
  deliverySlotWindow,
}) => {
  const isCancelled = currentStatus === 'cancelled';
  const currentStepIndex = STATUS_ORDER_MAP[currentStatus] ?? 0;

  return (
    <View style={styles.container}>
      {isCancelled ? (
        <View style={styles.cancelledBanner}>
          <View style={styles.cancelledIconCircle}>
            <Text style={styles.cancelledIconText}>✕</Text>
          </View>
          <View style={styles.cancelledTextContainer}>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSubtitle}>
              This order was cancelled. Any pre-authorized charges or payments have been reversed.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <Text style={styles.sectionSubtitle}>Califnco Delivery & Installation</Text>
        </View>
        {!isCancelled && estimatedDeliveryDate ? (
          <View style={styles.etaPill}>
            <Text style={styles.etaLabel}>ETA</Text>
            <Text style={styles.etaValue}>{estimatedDeliveryDate}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stepsContainer}>
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = !isCancelled && index < currentStepIndex;
          const isCurrent = !isCancelled && index === currentStepIndex;
          const isUpcoming = isCancelled || index > currentStepIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* Left Column: Node indicator + Connecting line */}
              <View style={styles.indicatorColumn}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCircleCompleted,
                    isCurrent && styles.nodeCircleCurrent,
                    isUpcoming && styles.nodeCircleUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.completedCheckmark}>✓</Text>
                  ) : isCurrent ? (
                    <View style={styles.currentPulseDot} />
                  ) : (
                    <Text style={styles.upcomingNumber}>{index + 1}</Text>
                  )}
                </View>

                {!isLast ? (
                  <View
                    style={[
                      styles.connectingLine,
                      isCompleted ? styles.connectingLineCompleted : styles.connectingLineUpcoming,
                    ]}
                  />
                ) : null}
              </View>

              {/* Right Column: Step Content */}
              <View style={[styles.contentColumn, !isLast && styles.contentColumnSpaced]}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCompleted && styles.stepTitleCompleted,
                      isCurrent && styles.stepTitleCurrent,
                      isUpcoming && styles.stepTitleUpcoming,
                    ]}
                  >
                    {step.title}
                  </Text>

                  {isCurrent ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{step.activeBadge}</Text>
                    </View>
                  ) : isCompleted ? (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.stepDescription,
                    isCurrent && styles.stepDescriptionCurrent,
                    isUpcoming && styles.stepDescriptionUpcoming,
                  ]}
                >
                  {step.description}
                </Text>

                {isCurrent && deliverySlotWindow && (step.key === 'out_for_delivery' || step.key === 'confirmed') ? (
                  <View style={styles.slotCallout}>
                    <Text style={styles.slotCalloutIcon}>⏱</Text>
                    <Text style={styles.slotCalloutText}>Slot: {deliverySlotWindow}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cancelledIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelledIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelledTextContainer: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelledSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  etaPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  etaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 1,
  },
  stepsContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 32,
  },
  nodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  nodeCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  nodeCircleCurrent: {
    backgroundColor: '#0EA5E9',
    borderColor: '#BAE6FD',
    borderWidth: 3,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeCircleUpcoming: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  completedCheckmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  currentPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  upcomingNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  connectingLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
  },
  connectingLineCompleted: {
    backgroundColor: '#10B981',
  },
  connectingLineUpcoming: {
    backgroundColor: '#E2E8F0',
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 4,
  },
  contentColumnSpaced: {
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  stepTitleCompleted: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: '#0284C7',
    fontWeight: '800',
  },
  stepTitleUpcoming: {
    color: '#64748B',
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  doneBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  stepDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  stepDescriptionCurrent: {
    color: '#334155',
    fontWeight: '500',
  },
  stepDescriptionUpcoming: {
    color: '#94A3B8',
  },
  slotCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  slotCalloutIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  slotCalloutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
});
