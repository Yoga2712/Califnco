import React, { useMemo, useState } from 'react';
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
  Image,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { useDealerCart } from '../../services/dealerCartService';
import { useOrders, getOrderStatusInfo } from '../../services/orderService';
import { MOCK_PRODUCTS } from '../../data/products';
import { LOCAL_PRODUCT_IMAGES } from '../../data/productImages';
import { CategoryFilter, ProductCategory } from '../../types/product';
import { WholesaleProductCard } from '../../components/dealer/WholesaleProductCard';
import { RAZORPAY_CONFIG } from '../../config/razorpay';
import { RazorpayModal } from '../../components/payment/RazorpayModal';
import {
  RazorpayFailurePayload,
  RazorpayOptions,
  RazorpaySuccessPayload,
} from '../../types/payment';
import { Order, OrderStatus } from '../../types/order';

const CATEGORIES: CategoryFilter[] = [
  'All',
  'Purifiers',
  'Dispensers',
  'Pumps',
  'Filters',
  'Spares',
];

type DealerTab = 'catalog' | 'order_sheet' | 'purchase_orders' | 'account';

export default function DealerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const {
    user,
    role,
    isAuthenticated,
    login,
    registerDealer,
    logout,
    clearError,
    switchRoleForTesting,
  } = useAuth();

  const isDealerOrAdmin = isAuthenticated && (role === 'dealer' || role === 'admin');

  // Active Screen Tab
  const [activeTab, setActiveTab] = useState<DealerTab>('catalog');

  // Dealer Auth Form State (for unauthenticated dealers)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Catalog Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Bulk Cart Hook
  const {
    items: bulkCartItems,
    summary,
    totalUnits,
    setQuantity,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
  } = useDealerCart();

  // Orders Hook
  const { orders, createOrder } = useOrders();

  // Filter orders for this dealer
  const dealerOrders = useMemo(() => {
    return orders.filter(
      (o) => o.isDealerOrder || (user && o.userId === user.uid)
    );
  }, [orders, user]);

  // Order Sheet Form State
  const [receiverName, setReceiverName] = useState(
    user?.displayName || 'Apex Logistics Receiving'
  );
  const [receiverPhone, setReceiverPhone] = useState(
    user?.phoneNumber || '+91 98112 34567'
  );
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Warehouse 4B, Industrial Area, Whitefield'
  );
  const [warehouseCity, setWarehouseCity] = useState('Bengaluru');
  const [warehouseState, setWarehouseState] = useState('Karnataka');
  const [warehousePincode, setWarehousePincode] = useState('560066');
  const [freightPreference, setFreightPreference] = useState<'standard' | 'express'>('standard');
  const [paymentChoice, setPaymentChoice] = useState<'razorpay' | 'b2b_credit'>('razorpay');

  // Razorpay Test Mode Modal State
  const [isRazorpayVisible, setIsRazorpayVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<RazorpayOptions | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [recentPlacedPO, setRecentPlacedPO] = useState<Order | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle Added Feedback
  const handleProductAdded = (name: string, quantity: number) => {
    setFeedbackToast(`+${quantity} units of "${name}" added to wholesale sheet`);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3000);
  };

  // Dealer Auth Handlers
  const handleDealerLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your dealer email and password.');
      return;
    }
    setAuthLoading(true);
    const success = await login(email, password, 'dealer');
    setAuthLoading(false);
    if (success) {
      setEmail('');
      setPassword('');
    }
  };

  const handleDealerRegister = async () => {
    if (!companyName.trim() || !displayName.trim() || !email.trim() || !password || !phoneNumber.trim()) {
      Alert.alert('Incomplete Information', 'Please fill in all required company and contact fields.');
      return;
    }
    setAuthLoading(true);
    const success = await registerDealer({
      email,
      password,
      displayName,
      phoneNumber,
      companyName,
      gstin,
    });
    setAuthLoading(false);
    if (success) {
      setEmail('');
      setPassword('');
      setCompanyName('');
      setDisplayName('');
      setPhoneNumber('');
      setGstin('');
    }
  };

  // Place Bulk Order
  const handleInitiateOrder = () => {
    if (bulkCartItems.length === 0) {
      Alert.alert('Empty Sheet', 'Please add wholesale items before placing an order.');
      return;
    }
    if (!warehouseAddress.trim() || !warehouseCity.trim() || !warehousePincode.trim()) {
      Alert.alert('Delivery Address Required', 'Please provide complete warehouse dock details.');
      return;
    }

    if (paymentChoice === 'razorpay') {
      const options: RazorpayOptions = {
        key: RAZORPAY_CONFIG.keyId,
        amount: summary.finalTotalAmount * 100, // in paise
        currency: 'INR',
        name: 'Califnco Wholesale B2B',
        description: `Wholesale Purchase Order (${totalUnits} Units)`,
        image: RAZORPAY_CONFIG.logoUrl,
        prefill: {
          name: receiverName,
          email: user?.email || 'dealer@califnco.com',
          contact: receiverPhone,
        },
        theme: {
          color: '#0284C7',
        },
      };
      setRazorpayOptions(options);
      setIsRazorpayVisible(true);
    } else {
      // B2B Net 30 Credit PO
      void executePlaceOrder(undefined, 'pending');
    }
  };

  const executePlaceOrder = async (paymentId?: string, paymentStatus?: 'paid' | 'pending') => {
    setIsSubmittingOrder(true);
    try {
      const created = await createOrder({
        userId: user?.uid || 'usr_dealer_demo_01',
        isDealerOrder: true,
        dealerCompanyName: user?.companyName || 'Apex Water Solutions',
        dealerGstin: user?.gstin || '29AABCU9603R1Z7',
        tierDiscount: summary.tierDiscount,
        gstAmount: summary.gstAmount,
        items: bulkCartItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.wholesaleUnitPrice,
        })),
        shippingAddress: {
          fullName: receiverName,
          phoneNumber: receiverPhone,
          addressLine: warehouseAddress,
          city: warehouseCity,
          state: warehouseState,
          pincode: warehousePincode,
          addressType: 'Commercial',
        },
        deliverySlot: {
          id: freightPreference,
          title: freightPreference === 'express' ? 'Express Air Cargo' : 'Commercial Road Freight',
          timeWindow: 'Business Hours (09:00 AM - 06:00 PM)',
          sublabel: 'Dock Delivery with Liftgate',
        },
        paymentMethod: paymentChoice === 'razorpay' ? 'upi' : 'cod',
        paymentId,
        paymentStatus: paymentStatus ?? (paymentId ? 'paid' : 'pending'),
      });

      clearCart();
      setRecentPlacedPO(created);
      setActiveTab('purchase_orders');
      Alert.alert(
        'Purchase Order Placed! 🎉',
        `PO #${created.orderNumber} worth ₹${created.totalAmount.toLocaleString('en-IN')} has been sent to Califnco Commercial Dispatch.`
      );
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to place purchase order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Razorpay Callbacks
  const handlePaymentSuccess = (payload: RazorpaySuccessPayload) => {
    setIsRazorpayVisible(false);
    void executePlaceOrder(payload.razorpay_payment_id, 'paid');
  };

  const handlePaymentFailure = (errorPayload: RazorpayFailurePayload) => {
    setIsRazorpayVisible(false);
    Alert.alert(
      'Test Payment Failed',
      errorPayload.description || 'The test payment transaction was declined. You can retry anytime.'
    );
  };

  const handlePaymentDismiss = () => {
    setIsRazorpayVisible(false);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Dealer B2B Portal"
        subtitle={
          isDealerOrAdmin
            ? `${user?.companyName || user?.displayName} • Verified`
            : 'Wholesale Ordering'
        }
        onBack={() => router.push('/customer')}
      />

      {feedbackToast ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{feedbackToast}</Text>
        </View>
      ) : null}

      {!isDealerOrAdmin ? (
        /* ======================================================== */
        /* UNAUTHENTICATED DEALER LOGIN / REGISTRATION GATE         */
        /* ======================================================== */
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.contentContainer,
            isWide && styles.wideContainer,
            { paddingBottom: insets.bottom + 30 },
          ]}
        >
          <View style={styles.authCard}>
            <View style={styles.authHeader}>
              <View style={styles.portalIconCircle}>
                <Text style={styles.portalIcon}>🏢</Text>
              </View>
              <Text style={styles.authTitle}>Califnco Dealer Network</Text>
              <Text style={styles.authSubtitle}>
                Access exclusive wholesale B2B pricing, bulk container ordering, and commercial credit accounts.
              </Text>
            </View>

            {/* Quick 1-Tap Demo Evaluator Login Button */}
            <TouchableOpacity
              style={styles.demoLoginBtn}
              onPress={() => {
                switchRoleForTesting('dealer');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.demoLoginIcon}>⚡</Text>
              <View>
                <Text style={styles.demoLoginTitle}>1-Tap Demo Dealer Login</Text>
                <Text style={styles.demoLoginSubtitle}>
                  Apex Water Solutions • GSTIN: 29AABCU9603R1Z7
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR ENTER CREDENTIALS</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Auth Mode Toggle */}
            <View style={styles.tabToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, authMode === 'login' && styles.toggleBtnActive]}
                onPress={() => {
                  setAuthMode('login');
                  clearError();
                }}
              >
                <Text style={[styles.toggleBtnText, authMode === 'login' && styles.toggleBtnTextActive]}>
                  Dealer Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, authMode === 'register' && styles.toggleBtnActive]}
                onPress={() => {
                  setAuthMode('register');
                  clearError();
                }}
              >
                <Text style={[styles.toggleBtnText, authMode === 'register' && styles.toggleBtnTextActive]}>
                  Register Dealership
                </Text>
              </TouchableOpacity>
            </View>

            {authMode === 'register' ? (
              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Company / Enterprise Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Apex Aqua Trading Pvt Ltd"
                  value={companyName}
                  onChangeText={setCompanyName}
                />

                <Text style={styles.fieldLabel}>GSTIN (GST Identification Number)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 29AABCU9603R1Z7"
                  autoCapitalize="characters"
                  value={gstin}
                  onChangeText={setGstin}
                />

                <Text style={styles.fieldLabel}>Authorized Contact Person *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajesh Mehta"
                  value={displayName}
                  onChangeText={setDisplayName}
                />

                <Text style={styles.fieldLabel}>Commercial Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.fieldLabel}>Dealer Business Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="dealer@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.fieldLabel}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={authMode === 'login' ? handleDealerLogin : handleDealerRegister}
              disabled={authLoading}
              activeOpacity={0.8}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'login' ? 'Sign In as Dealer →' : 'Complete Dealer Registration →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ======================================================== */
        /* AUTHENTICATED DEALER B2B DASHBOARD & WHOLESALE PORTAL    */
        /* ======================================================== */
        <View style={styles.portalContainer}>
          {/* Top Dealer Status Banner */}
          <View style={styles.dealerHeaderBanner}>
            <View style={styles.dealerProfileRow}>
              <View style={styles.companyIconCircle}>
                <Text style={styles.companyIconText}>🏢</Text>
              </View>
              <View style={styles.companyInfo}>
                <View style={styles.companyNameBadgeRow}>
                  <Text style={styles.companyNameText} numberOfLines={1}>
                    {user?.companyName || user?.displayName}
                  </Text>
                  <View style={styles.tierPill}>
                    <Text style={styles.tierPillText}>TIER 1 DEALER</Text>
                  </View>
                </View>
                <Text style={styles.dealerGstinText}>
                  GSTIN: {user?.gstin || '29AABCU9603R1Z7'} • Active Wholesale Rate
                </Text>
              </View>
            </View>

            {/* Segmented Tab Navigation */}
            <View style={styles.segmentedTabBar}>
              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'catalog' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('catalog')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, activeTab === 'catalog' && styles.segmentBtnTextActive]}>
                  📦 Wholesale Catalog
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'order_sheet' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('order_sheet')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, activeTab === 'order_sheet' && styles.segmentBtnTextActive]}>
                  🛒 Bulk Sheet ({totalUnits})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'purchase_orders' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('purchase_orders')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, activeTab === 'purchase_orders' && styles.segmentBtnTextActive]}>
                  📋 PO History ({dealerOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, activeTab === 'account' && styles.segmentBtnActive]}
                onPress={() => setActiveTab('account')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, activeTab === 'account' && styles.segmentBtnTextActive]}>
                  ⚙️ Tier Info
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TAB 1: WHOLESALE CATALOG */}
          {activeTab === 'catalog' ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.contentContainer,
                isWide && styles.wideContainer,
                { paddingBottom: insets.bottom + 80 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Wholesale Savings Callout Banner */}
              <View style={styles.wholesaleSavingsBanner}>
                <Text style={styles.wholesaleSavingsIcon}>💎</Text>
                <View style={styles.wholesaleSavingsText}>
                  <Text style={styles.wholesaleSavingsTitle}>
                    Califnco Authorized B2B Wholesale Pricing
                  </Text>
                  <Text style={styles.wholesaleSavingsSubtitle}>
                    All prices reflect 25%–35% dealer wholesale margin off retail MRP. Minimum bulk batch order: 5 units.
                  </Text>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search wholesale purifiers, filters, pumps..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={styles.clearSearch}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroller}
                contentContainerStyle={styles.categoryScrollerContent}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPill,
                      selectedCategory === cat && styles.catPillActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        selectedCategory === cat && styles.catPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Product Cards List */}
              <View style={styles.productList}>
                {filteredProducts.map((product) => (
                  <WholesaleProductCard
                    key={product.id}
                    product={product}
                    onAddedFeedback={handleProductAdded}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

          {/* TAB 2: BULK ORDER SHEET (CART) */}
          {activeTab === 'order_sheet' ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.contentContainer,
                isWide && styles.wideContainer,
                { paddingBottom: insets.bottom + 80 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {bulkCartItems.length === 0 ? (
                <View style={styles.emptySheetCard}>
                  <Text style={styles.emptySheetEmoji}>📦</Text>
                  <Text style={styles.emptySheetTitle}>Wholesale Order Sheet is Empty</Text>
                  <Text style={styles.emptySheetSubtitle}>
                    Add water purifiers, commercial dispensers, or replacement cartridge cartons at wholesale rates.
                  </Text>
                  <TouchableOpacity
                    style={styles.browseCatalogBtn}
                    onPress={() => setActiveTab('catalog')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.browseCatalogBtnText}>Browse Wholesale Catalog →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* Items Review Header */}
                  <View style={styles.sheetHeaderRow}>
                    <Text style={styles.sheetHeading}>Bulk Line Items ({totalUnits} units)</Text>
                    <TouchableOpacity onPress={() => clearCart()}>
                      <Text style={styles.clearSheetText}>Clear Sheet</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Line Items List */}
                  {bulkCartItems.map((item) => {
                    const localImg = LOCAL_PRODUCT_IMAGES[item.product.id];
                    return (
                      <View key={item.product.id} style={styles.cartItemCard}>
                        <View style={styles.cartItemThumbBox}>
                          {localImg ? (
                            <Image
                              source={localImg}
                              style={styles.cartItemThumb}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={styles.cartItemEmoji}>💧</Text>
                          )}
                        </View>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemTitle} numberOfLines={1}>
                            {item.product.name}
                          </Text>
                          <Text style={styles.cartItemSpecs}>
                            Wholesale: ₹{item.wholesaleUnitPrice.toLocaleString('en-IN')} / unit • MRP: ₹
                            {item.product.price.toLocaleString('en-IN')}
                          </Text>
                          <View style={styles.qtySteppersRow}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => decreaseQuantity(item.product.id, 5)}
                            >
                              <Text style={styles.stepBtnText}>-5</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => decreaseQuantity(item.product.id, 1)}
                            >
                              <Text style={styles.stepBtnText}>-1</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyCountText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => increaseQuantity(item.product.id, 1)}
                            >
                              <Text style={styles.stepBtnText}>+1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => increaseQuantity(item.product.id, 5)}
                            >
                              <Text style={styles.stepBtnText}>+5</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.cartItemTotalBox}>
                          <Text style={styles.cartItemTotal}>
                            ₹{item.subtotal.toLocaleString('en-IN')}
                          </Text>
                          <TouchableOpacity
                            onPress={() => removeItem(item.product.id)}
                            style={styles.deleteBtn}
                          >
                            <Text style={styles.deleteBtnText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* Pricing Breakdown Card */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryHeading}>Commercial Invoice Breakdown</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Wholesale Subtotal:</Text>
                      <Text style={styles.summaryValue}>
                        ₹{summary.wholesaleSubtotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Retail MRP Equivalent:</Text>
                      <Text style={styles.summaryValueMuted}>
                        ₹{summary.retailValue.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.marginBannerBox}>
                      <Text style={styles.marginBannerText}>
                        🎉 Your Dealer Margin Savings: ₹{summary.marginSavings.toLocaleString('en-IN')} ({summary.marginPercentage}%)
                      </Text>
                    </View>

                    {summary.tierDiscount > 0 ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.tierDiscountLabel}>Tier-1 Volume Bonus:</Text>
                        <Text style={styles.tierDiscountValue}>
                          -₹{summary.tierDiscount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>GST (18% HSN 8421):</Text>
                      <Text style={styles.summaryValue}>
                        ₹{summary.gstAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Commercial Logistics:</Text>
                      <Text style={styles.freeFreightText}>FREE B2B FREIGHT</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.finalTotalLabel}>Total PO Amount (incl. GST):</Text>
                      <Text style={styles.finalTotalValue}>
                        ₹{summary.finalTotalAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery & Warehouse Address */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Warehouse & Dock Receiving</Text>
                    <Text style={styles.fieldLabel}>Receiving Manager / In-Charge *</Text>
                    <TextInput
                      style={styles.input}
                      value={receiverName}
                      onChangeText={setReceiverName}
                    />

                    <Text style={styles.fieldLabel}>Contact Phone *</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="phone-pad"
                      value={receiverPhone}
                      onChangeText={setReceiverPhone}
                    />

                    <Text style={styles.fieldLabel}>Warehouse Dock Address *</Text>
                    <TextInput
                      style={styles.input}
                      value={warehouseAddress}
                      onChangeText={setWarehouseAddress}
                    />

                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.fieldLabel}>City *</Text>
                        <TextInput
                          style={styles.input}
                          value={warehouseCity}
                          onChangeText={setWarehouseCity}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Pincode *</Text>
                        <TextInput
                          style={styles.input}
                          value={warehousePincode}
                          onChangeText={setWarehousePincode}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Payment Method Choice */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>B2B Payment Settlement</Text>
                    <TouchableOpacity
                      style={[
                        styles.paymentChoiceCard,
                        paymentChoice === 'razorpay' && styles.paymentChoiceCardActive,
                      ]}
                      onPress={() => setPaymentChoice('razorpay')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioDotOuter}>
                        {paymentChoice === 'razorpay' ? <View style={styles.radioDotInner} /> : null}
                      </View>
                      <View style={styles.paymentChoiceText}>
                        <Text style={styles.paymentChoiceTitle}>
                          Razorpay TEST MODE (UPI / Corporate NetBanking)
                        </Text>
                        <Text style={styles.paymentChoiceSubtitle}>
                          Instant online settlement with simulated transaction ID
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentChoiceCard,
                        paymentChoice === 'b2b_credit' && styles.paymentChoiceCardActive,
                      ]}
                      onPress={() => setPaymentChoice('b2b_credit')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioDotOuter}>
                        {paymentChoice === 'b2b_credit' ? <View style={styles.radioDotInner} /> : null}
                      </View>
                      <View style={styles.paymentChoiceText}>
                        <Text style={styles.paymentChoiceTitle}>
                          B2B Net 30 Commercial Credit / Invoice PO
                        </Text>
                        <Text style={styles.paymentChoiceSubtitle}>
                          30 days credit term for verified Califnco dealer accounts
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Place PO Button */}
                  <TouchableOpacity
                    style={styles.placePoBtn}
                    onPress={handleInitiateOrder}
                    disabled={isSubmittingOrder}
                    activeOpacity={0.8}
                  >
                    {isSubmittingOrder ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.placePoBtnText}>
                        {paymentChoice === 'razorpay'
                          ? `Pay with Razorpay (Test Mode) • ₹${summary.finalTotalAmount.toLocaleString('en-IN')}`
                          : `Place Purchase Order (Net 30 Credit) • ₹${summary.finalTotalAmount.toLocaleString('en-IN')}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : null}

          {/* TAB 3: PURCHASE ORDERS (ORDER HISTORY) */}
          {activeTab === 'purchase_orders' ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.contentContainer,
                isWide && styles.wideContainer,
                { paddingBottom: insets.bottom + 80 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.poListTitle}>Dealer Purchase Orders & Invoices</Text>
              <Text style={styles.poListSubtitle}>
                Track container dispatches, freight status, and commercial tax invoices.
              </Text>

              {dealerOrders.length === 0 ? (
                <View style={styles.emptySheetCard}>
                  <Text style={styles.emptySheetEmoji}>📋</Text>
                  <Text style={styles.emptySheetTitle}>No Purchase Orders Yet</Text>
                  <Text style={styles.emptySheetSubtitle}>
                    Place your first bulk container or filter carton purchase order.
                  </Text>
                </View>
              ) : (
                dealerOrders.map((po) => {
                  const statusInfo = getOrderStatusInfo(po.status);
                  const formattedDate = new Date(po.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <View key={po.id} style={styles.poCard}>
                      <View style={styles.poCardHeader}>
                        <View>
                          <Text style={styles.poNumberLabel}>PURCHASE ORDER NUMBER</Text>
                          <Text style={styles.poNumberText}>{po.orderNumber}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.badgeBg }]}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusInfo.indicatorColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusInfo.badgeTextColor },
                            ]}
                          >
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.poDateText}>Issued on {formattedDate}</Text>
                      <View style={styles.divider} />

                      {/* Items Summary */}
                      <View style={styles.poItemsBox}>
                        {po.items.map((item, idx) => (
                          <View key={idx} style={styles.poItemRow}>
                            <Text style={styles.poItemQtyText}>
                              {item.quantity} × {item.product.name}
                            </Text>
                            <Text style={styles.poItemSubtotalText}>
                              ₹{item.subtotal.toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.divider} />

                      {/* PO Meta Info */}
                      <View style={styles.poMetaRow}>
                        <Text style={styles.poMetaLabel}>Destination Warehouse:</Text>
                        <Text style={styles.poMetaValue} numberOfLines={1}>
                          {po.shippingAddress.addressLine}, {po.shippingAddress.city}
                        </Text>
                      </View>

                      <View style={styles.poMetaRow}>
                        <Text style={styles.poMetaLabel}>Settlement Term:</Text>
                        <View style={styles.payBadgeRow}>
                          <Text style={styles.poMetaValue}>
                            {po.paymentMethod === 'cod' ? 'Net 30 Commercial Credit' : 'Razorpay Instant UPI'}
                          </Text>
                          <View
                            style={[
                              styles.payStatusBadge,
                              po.paymentStatus === 'paid' ? styles.payStatusPaid : styles.payStatusPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.payStatusText,
                                po.paymentStatus === 'paid' ? styles.payStatusPaidText : styles.payStatusPendingText,
                              ]}
                            >
                              {po.paymentStatus === 'paid' ? 'PAID' : 'NET 30 PENDING'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {po.paymentId ? (
                        <View style={styles.poMetaRow}>
                          <Text style={styles.poMetaLabel}>Razorpay Payment ID:</Text>
                          <Text style={styles.paymentIdPill}>{po.paymentId}</Text>
                        </View>
                      ) : null}

                      <View style={styles.poFooterRow}>
                        <View>
                          <Text style={styles.poTotalLabel}>Total PO Value</Text>
                          <Text style={styles.poTotalAmount}>
                            ₹{po.totalAmount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={styles.gstVerifiedBadge}>
                          <Text style={styles.gstVerifiedText}>✓ GST INVOICE READY</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : null}

          {/* TAB 4: ACCOUNT & TIER */}
          {activeTab === 'account' ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.contentContainer,
                isWide && styles.wideContainer,
                { paddingBottom: insets.bottom + 80 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.accountCard}>
                <Text style={styles.accountHeading}>Dealership Enterprise Profile</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Company Legal Name</Text>
                  <Text style={styles.infoValue}>{user?.companyName || 'Apex Water Solutions'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>GST Identification Number (GSTIN)</Text>
                  <Text style={styles.infoValueBold}>{user?.gstin || '29AABCU9603R1Z7'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Authorized Contact</Text>
                  <Text style={styles.infoValue}>{user?.displayName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Business Email</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{user?.phoneNumber || '+91 98112 34567'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dealership Status</Text>
                  <Text style={styles.verifiedText}>Verified Authorized B2B Partner ✓</Text>
                </View>
              </View>

              <View style={styles.tierPerksCard}>
                <Text style={styles.tierPerksTitle}>Tier 1 Wholesale Benefits</Text>
                <View style={styles.perkRow}>
                  <Text style={styles.perkIcon}>✓</Text>
                  <Text style={styles.perkText}>25% to 35% discount off consumer MRP on all models</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkIcon}>✓</Text>
                  <Text style={styles.perkText}>5% extra volume bonus on batch orders above ₹50,000</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkIcon}>✓</Text>
                  <Text style={styles.perkText}>10% extra volume bonus on batch orders above ₹1,00,000</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkIcon}>✓</Text>
                  <Text style={styles.perkText}>Priority dock delivery with free road freight logistics</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkIcon}>✓</Text>
                  <Text style={styles.perkText}>Net 30 commercial payment terms eligibility</Text>
                </View>
              </View>

              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.switchRoleActionBtn}
                  onPress={() => {
                    switchRoleForTesting('customer');
                    router.push('/customer');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchRoleActionBtnText}>Switch to Retail Customer View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutActionBtn}
                  onPress={async () => {
                    await logout();
                    router.replace('/');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutActionBtnText}>Sign Out from Dealership</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : null}

          {/* Floating Wholesale Sheet Bar (shown in catalog when items are added) */}
          {activeTab === 'catalog' && totalUnits > 0 ? (
            <View style={[styles.floatingCartBar, { bottom: Math.max(insets.bottom, 16) }]}>
              <View>
                <Text style={styles.floatingCartUnits}>
                  {totalUnits} Units in Bulk Sheet
                </Text>
                <Text style={styles.floatingCartPrice}>
                  ₹{summary.wholesaleSubtotal.toLocaleString('en-IN')} (Save ₹{summary.marginSavings.toLocaleString('en-IN')})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.floatingCartBtn}
                onPress={() => setActiveTab('order_sheet')}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingCartBtnText}>Review Sheet →</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* Razorpay TEST MODE Modal */}
      {razorpayOptions ? (
        <RazorpayModal
          visible={isRazorpayVisible}
          options={razorpayOptions}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onDismiss={handlePaymentDismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toastBanner: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  wideContainer: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
  },
  portalContainer: {
    flex: 1,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  portalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  portalIcon: {
    fontSize: 32,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  demoLoginBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  demoLoginIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  demoLoginTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  demoLoginSubtitle: {
    fontSize: 11,
    color: '#0369A1',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
  formSection: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dealerHeaderBanner: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dealerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyIconText: {
    fontSize: 22,
  },
  companyInfo: {
    flex: 1,
  },
  companyNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  tierPill: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dealerGstinText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#0284C7',
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  wholesaleSavingsBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  wholesaleSavingsIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  wholesaleSavingsText: {
    flex: 1,
  },
  wholesaleSavingsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  wholesaleSavingsSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#94A3B8',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  categoryScroller: {
    marginBottom: 14,
  },
  categoryScrollerContent: {
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    marginBottom: 20,
  },
  emptySheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptySheetEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  browseCatalogBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseCatalogBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearSheetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  cartItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartItemThumbBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartItemThumb: {
    width: '90%',
    height: '90%',
  },
  cartItemEmoji: {
    fontSize: 22,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cartItemSpecs: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 6,
  },
  qtySteppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stepBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  qtyCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    paddingHorizontal: 6,
  },
  cartItemTotalBox: {
    alignItems: 'flex-end',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  deleteBtn: {
    padding: 2,
  },
  deleteBtnText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 10,
    marginBottom: 14,
  },
  summaryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryValueMuted: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  marginBannerBox: {
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  marginBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  tierDiscountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  tierDiscountValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  freeFreightText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  finalTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  paymentChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  paymentChoiceCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  radioDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  paymentChoiceText: {
    flex: 1,
  },
  paymentChoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentChoiceSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  placePoBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  placePoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  poListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  poListSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  poCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  poCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poNumberLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  poNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  poDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  poItemsBox: {
    gap: 6,
  },
  poItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poItemQtyText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  poItemSubtotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  poMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  poMetaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  poMetaValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  payBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payStatusPaid: {
    backgroundColor: '#DCFCE7',
  },
  payStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  payStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  payStatusPaidText: {
    color: '#15803D',
  },
  payStatusPendingText: {
    color: '#D97706',
  },
  paymentIdPill: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  poTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  poTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 1,
  },
  gstVerifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gstVerifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  accountHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '800',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  tierPerksCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 16,
    marginBottom: 16,
  },
  tierPerksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 10,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  perkIcon: {
    color: '#16A34A',
    fontWeight: '800',
    marginRight: 8,
    fontSize: 13,
  },
  perkText: {
    fontSize: 12,
    color: '#15803D',
    flex: 1,
  },
  actionBtnRow: {
    gap: 10,
  },
  switchRoleActionBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  switchRoleActionBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutActionBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutActionBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingCartUnits: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingCartPrice: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '600',
  },
  floatingCartBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  floatingCartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
