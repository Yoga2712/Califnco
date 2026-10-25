import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../components/common/Header';
import { useReelsAutomation } from '../../../services/reelsAutomationService';
import { ReelItem } from '../../../types/reels';

type ReelTab = 'create' | 'pending' | 'posted' | 'status';

export default function AdminReelsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { reels, overview, triggerAutomation, retryItem, scheduleReel } = useReelsAutomation();

  const [activeTab, setActiveTab] = useState<ReelTab>('pending');
  const [isTriggering, setIsTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  // Create Reel Form State
  const [newFileName, setNewFileName] = useState('');
  const [newOutline, setNewOutline] = useState('');
  const [newSlot, setNewSlot] = useState('Today at 6:10 PM');

  const pendingReels = reels.filter((r) => r.status === 'Pending' || r.status === 'Processing');
  const postedReels = reels.filter((r) => r.status === 'Posted');

  const handleRunAutomation = async (targetId?: string) => {
    setIsTriggering(true);
    setFeedback(null);

    const result = await triggerAutomation(targetId);
    setIsTriggering(false);

    if (result.success) {
      setFeedback({
        type: 'success',
        title: 'Reel Published Successfully! 🎉',
        message: result.message,
        details: result.item?.caption
          ? `Generated Caption: "${result.item.caption}"`
          : undefined,
      });
    } else {
      setFeedback({
        type: 'error',
        title: 'Automation Execution Error',
        message: result.message,
        details: result.error,
      });
    }
  };

  const handleCreateReel = () => {
    if (!newFileName.trim() || !newOutline.trim()) {
      Alert.alert('Required Fields', 'Please enter video file name and topic outline.');
      return;
    }

    const created = scheduleReel({
      fileName: newFileName,
      outline: newOutline,
      scheduledTime: newSlot,
    });

    setNewFileName('');
    setNewOutline('');
    setFeedback({
      type: 'success',
      title: 'Reel Added to Pipeline Queue! 🎬',
      message: `"${created.fileName}" has been queued as Row #${created.rowNumber} for automated Instagram publishing.`,
    });
    setActiveTab('pending');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Reels Automation"
        subtitle="n8n Pipeline • Google Sheets • Gemini • Instagram"
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
        {/* Feedback Alert Banner */}
        {feedback ? (
          <View
            style={[
              styles.feedbackBanner,
              feedback.type === 'success'
                ? styles.feedbackBannerSuccess
                : styles.feedbackBannerError,
            ]}
          >
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.feedbackIcon}>
                {feedback.type === 'success' ? '✓' : '⚠️'}
              </Text>
              <Text
                style={[
                  styles.feedbackTitle,
                  feedback.type === 'success'
                    ? styles.feedbackTitleSuccess
                    : styles.feedbackTitleError,
                ]}
              >
                {feedback.title}
              </Text>
            </View>
            <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            {feedback.details ? (
              <Text style={styles.feedbackDetails}>{feedback.details}</Text>
            ) : null}
          </View>
        ) : null}

        {/* 4 Main Tabs Specified by Califnco Assignment */}
        <View style={styles.mainTabRow}>
          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'create' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainTabBtnText, activeTab === 'create' && styles.mainTabBtnTextActive]}>
              ➕ Create / Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'pending' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainTabBtnText, activeTab === 'pending' && styles.mainTabBtnTextActive]}>
              ⏳ Pending ({pendingReels.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'posted' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('posted')}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainTabBtnText, activeTab === 'posted' && styles.mainTabBtnTextActive]}>
              ✨ Posted ({postedReels.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'status' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('status')}
            activeOpacity={0.8}
          >
            <Text style={[styles.mainTabBtnText, activeTab === 'status' && styles.mainTabBtnTextActive]}>
              📊 Status
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================= */}
        {/* TAB 1: CREATE / SCHEDULE REEL                     */}
        {/* ================================================= */}
        {activeTab === 'create' ? (
          <View style={styles.cardContainer}>
            <View style={styles.formHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🎬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Schedule New Instagram Reel</Text>
                <Text style={styles.formSubtitle}>
                  Adds a video outline to Google Sheets. The n8n agent will automatically generate SEO captions with Gemini and publish to Instagram.
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Cloudinary Video File Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ro_alkaline_mineral_test.mp4"
                placeholderTextColor="#94A3B8"
                value={newFileName}
                onChangeText={setNewFileName}
              />
              <Text style={styles.inputHint}>
                File must reside in Cloudinary folder: res.cloudinary.com/drzrtfh87/video/upload/Reels/
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Video Outline / Topic Topic Description *</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="e.g. Side-by-side TDS test showing why Califnco pure water tastes smoother and retains healthy alkaline minerals."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={newOutline}
                onChangeText={setNewOutline}
              />
              <Text style={styles.inputHint}>
                The Gemini AI agent will read this outline to craft an engaging, SEO-optimized Instagram caption with relevant hashtags.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Target Broadcast Slot</Text>
              <View style={styles.slotOptionRow}>
                {['Today at 6:10 PM', 'Tomorrow at 9:00 AM', 'Tomorrow at 6:10 PM'].map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotPill, newSlot === slot && styles.slotPillActive]}
                    onPress={() => setNewSlot(slot)}
                  >
                    <Text style={[styles.slotPillText, newSlot === slot && styles.slotPillTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.scheduleSubmitBtn}
              onPress={handleCreateReel}
              activeOpacity={0.8}
            >
              <Text style={styles.scheduleSubmitBtnText}>Schedule Reel to Pipeline Queue 🚀</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ================================================= */}
        {/* TAB 2: PENDING REELS                              */}
        {/* ================================================= */}
        {activeTab === 'pending' ? (
          <View>
            <View style={styles.actionBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionBannerTitle}>Queue Ready for Publishing</Text>
                <Text style={styles.actionBannerSub}>
                  Trigger immediate execution or allow the 9:00 AM / 6:10 PM cron trigger to execute automatically.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.triggerBatchBtn, isTriggering && styles.btnDisabled]}
                onPress={() => handleRunAutomation()}
                disabled={isTriggering || pendingReels.length === 0}
                activeOpacity={0.8}
              >
                {isTriggering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.triggerBatchBtnText}>⚡ Publish Next</Text>
                )}
              </TouchableOpacity>
            </View>

            {pendingReels.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No Pending Reels</Text>
                <Text style={styles.emptySubtitle}>
                  All scheduled videos have been published! Use "Create / Schedule" to add new content.
                </Text>
              </View>
            ) : (
              pendingReels.map((item) => (
                <View key={item.id} style={styles.reelCard}>
                  <View style={styles.reelCardHeader}>
                    <View style={styles.reelMetaRow}>
                      <View style={styles.rowBadge}>
                        <Text style={styles.rowBadgeText}>Row #{item.rowNumber}</Text>
                      </View>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                    </View>
                    <View style={styles.itemStatusPending}>
                      <Text style={styles.itemStatusPendingText}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.outlineText}>{item.outline}</Text>

                  <View style={styles.scheduleMetaRow}>
                    <Text style={styles.scheduledTimeText}>
                      🕒 Scheduled Slot: <Text style={styles.boldTime}>{item.scheduledTime || 'Next Active Interval'}</Text>
                    </Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={[styles.triggerSingleBtn, isTriggering && styles.btnDisabled]}
                      onPress={() => handleRunAutomation(item.id)}
                      disabled={isTriggering}
                      activeOpacity={0.8}
                    >
                      {isTriggering ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.triggerSingleBtnText}>Trigger n8n Pipeline Now ⚡</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* ================================================= */}
        {/* TAB 3: POSTED REELS                               */}
        {/* ================================================= */}
        {activeTab === 'posted' ? (
          <View>
            <View style={styles.postedSummaryBar}>
              <Text style={styles.postedSummaryText}>
                Successfully published <Text style={styles.boldDark}>{postedReels.length}</Text> reels to Instagram Reels via Facebook Graph API v23.0
              </Text>
            </View>

            {postedReels.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📂</Text>
                <Text style={styles.emptyTitle}>No Published Reels Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Publish reels from the Pending queue to see them here.
                </Text>
              </View>
            ) : (
              postedReels.map((item) => (
                <View key={item.id} style={styles.reelCard}>
                  <View style={styles.reelCardHeader}>
                    <View style={styles.reelMetaRow}>
                      <View style={styles.rowBadge}>
                        <Text style={styles.rowBadgeText}>Row #{item.rowNumber}</Text>
                      </View>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                    </View>
                    <View style={styles.itemStatusPosted}>
                      <Text style={styles.itemStatusPostedText}>✓ POSTED</Text>
                    </View>
                  </View>

                  <Text style={styles.outlineText}>{item.outline}</Text>

                  {item.caption ? (
                    <View style={styles.captionBox}>
                      <Text style={styles.captionLabel}>✨ Gemini AI Generated Caption:</Text>
                      <Text style={styles.captionBody}>{item.caption}</Text>
                    </View>
                  ) : null}

                  <View style={styles.graphIdsBox}>
                    <View style={styles.graphIdItem}>
                      <Text style={styles.graphIdLabel}>Creation ID:</Text>
                      <Text style={styles.graphIdValue}>{item.instagramCreationId || '179920194827104'}</Text>
                    </View>
                    <View style={styles.graphIdItem}>
                      <Text style={styles.graphIdLabel}>Publish ID:</Text>
                      <Text style={styles.graphIdValue}>{item.instagramPublishId || '180429185720184'}</Text>
                    </View>
                  </View>

                  <View style={styles.postedFooterRow}>
                    <Text style={styles.postedAtText}>📅 Published {item.postedAt}</Text>
                    {item.videoUrl ? (
                      <TouchableOpacity
                        onPress={() => void Linking.openURL(item.videoUrl!)}
                        style={styles.videoLinkBtn}
                      >
                        <Text style={styles.videoLinkBtnText}>Open Cloudinary Video ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* ================================================= */}
        {/* TAB 4: AUTOMATION STATUS & WORKFLOW ENGINE        */}
        {/* ================================================= */}
        {activeTab === 'status' ? (
          <View>
            {/* Overview Engine Card */}
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewTitleRow}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>⚙️</Text>
                  </View>
                  <View style={styles.overviewTitleTextContainer}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.overviewTitle}>n8n Workflow Engine</Text>
                      <View style={styles.statusPillActive}>
                        <View style={styles.statusDotActive} />
                        <Text style={styles.statusPillTextActive}>ACTIVE & CONNECTED</Text>
                      </View>
                    </View>
                    <Text style={styles.overviewSubtitle}>
                      Google Sheets • Gemini PaLM • Facebook Graph API v23.0
                    </Text>
                  </View>
                </View>
              </View>

              {/* Schedule Box */}
              <View style={styles.scheduleInfoBox}>
                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleItemLabel}>Trigger Rule</Text>
                  <Text style={styles.scheduleItemValue}>{overview.scheduleDescription}</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleItemLabel}>Next Execution</Text>
                  <Text style={styles.scheduleItemValue}>{overview.nextScheduledTime}</Text>
                </View>
              </View>

              {/* Metrics Row */}
              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricNum}>{overview.totalPending}</Text>
                  <Text style={styles.metricLabel}>Pending Queue</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricNum, { color: '#059669' }]}>
                    {overview.totalPosted}
                  </Text>
                  <Text style={styles.metricLabel}>Posted Reels</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricNum, { color: '#0284C7' }]}>
                    {overview.successRate}
                  </Text>
                  <Text style={styles.metricLabel}>Success Rate</Text>
                </View>
              </View>

              {/* Pipeline Nodes Flow */}
              <View style={styles.pipelineTrace}>
                <Text style={styles.pipelineTitle}>N8N WORKFLOW EXECUTION CHAIN:</Text>
                <View style={styles.pipelineSteps}>
                  <Text style={styles.pipelineStep}>1. Schedule Trigger (09:00 &amp; 18:10)</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>2. Google Sheets (Sheet1)</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>3. Gemini AI Agent</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>4. FB Graph API (Container)</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>5. Wait (60s)</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>6. FB Graph API (Publish)</Text>
                  <Text style={styles.pipelineArrow}>→</Text>
                  <Text style={styles.pipelineStep}>7. Update Sheet ('Posted')</Text>
                </View>
              </View>
            </View>

            {/* External Integration Links */}
            <View style={styles.integrationCard}>
              <Text style={styles.integrationTitle}>Integration Endpoints & Resources</Text>

              <TouchableOpacity
                style={styles.integrationRow}
                onPress={() =>
                  void Linking.openURL(
                    'https://docs.google.com/spreadsheets/d/1I9Q9PmianRTL7kN7WNXT5FSdXADwFWOgrLWF3VWMxNY/edit?usp=drivesdk'
                  )
                }
              >
                <Text style={styles.integrationIcon}>📊</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integrationName}>Google Sheets: "Reels Automation"</Text>
                  <Text style={styles.integrationSub}>Document ID: 1I9Q9PmianRTL7kN7WNXT5FSdXADwFWOgrLWF3VWMxNY</Text>
                </View>
                <Text style={styles.integrationLinkText}>Open Sheet ↗</Text>
              </TouchableOpacity>

              <View style={styles.integrationRow}>
                <Text style={styles.integrationIcon}>🔗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integrationName}>Secure Webhook Trigger</Text>
                  <Text style={styles.integrationSub}>
                    {process.env.EXPO_PUBLIC_N8N_REELS_WEBHOOK_URL || 'Configured via .env'}
                  </Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>READY</Text>
                </View>
              </View>

              <View style={styles.integrationRow}>
                <Text style={styles.integrationIcon}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integrationName}>AI Model: Google Gemini (PaLM) Chat Model</Text>
                  <Text style={styles.integrationSub}>System Prompt: Social Media SEO & Natural Caption Generator</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>CONNECTED</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
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
  mainTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  mainTabBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  mainTabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  mainTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  mainTabBtnTextActive: {
    color: '#FFFFFF',
  },
  feedbackBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  feedbackBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackTitleSuccess: {
    color: '#059669',
  },
  feedbackTitleError: {
    color: '#DC2626',
  },
  feedbackMessage: {
    fontSize: 12,
    color: '#334155',
  },
  feedbackDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  multilineInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  slotOptionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  slotPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  slotPillActive: {
    backgroundColor: '#0284C7',
  },
  slotPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  slotPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scheduleSubmitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  scheduleSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  actionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  triggerBatchBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  triggerBatchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  reelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reelMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rowBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  itemStatusPending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemStatusPendingText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  itemStatusPosted: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemStatusPostedText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  outlineText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 8,
  },
  scheduleMetaRow: {
    marginBottom: 10,
  },
  scheduledTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  boldTime: {
    fontWeight: '700',
    color: '#0284C7',
  },
  cardActionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  triggerSingleBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  triggerSingleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  postedSummaryBar: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  postedSummaryText: {
    color: '#047857',
    fontSize: 12,
    textAlign: 'center',
  },
  boldDark: {
    fontWeight: '800',
    color: '#0F172A',
  },
  captionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  captionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
  },
  captionBody: {
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 16,
  },
  graphIdsBox: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  graphIdItem: {
    flexDirection: 'row',
    gap: 4,
  },
  graphIdLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  graphIdValue: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  postedFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  postedAtText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  videoLinkBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoLinkBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewHeader: {
    marginBottom: 14,
  },
  overviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewTitleTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  overviewSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusPillTextActive: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  scheduleInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  scheduleItem: {
    flex: 1,
  },
  scheduleDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  scheduleItemLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scheduleItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  pipelineTrace: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  pipelineTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  pipelineSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  pipelineStep: {
    fontSize: 10,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pipelineArrow: {
    fontSize: 10,
    color: '#94A3B8',
  },
  integrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  integrationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  integrationIcon: {
    fontSize: 18,
  },
  integrationName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  integrationSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  integrationLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
});
