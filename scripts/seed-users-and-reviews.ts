/**
 * Seed Script: Users, Profiles, Addresses, Payment Methods, Reviews & Q&A
 *
 * Creates comprehensive test data for the entire user ecosystem:
 * - 8 Users (individual, business, admin)
 * - 12 Addresses (shipping, billing, company)
 * - 6 Customer Profiles (B2C with segments)
 * - 1 Business Profile (B2B with credit terms)
 * - 1 Admin Profile (staff)
 * - 7 Customer Statistics (pre-computed)
 * - 8 Payment Methods (cards, UPI, wallets)
 * - 25 Reviews (various ratings/statuses)
 * - 10 Product Questions (Q&A)
 *
 * DEPENDENCY: Run seed-products-and-collections.ts FIRST!
 *
 * Usage: npx tsx scripts/seed-users-and-reviews.ts
 */

import { db } from '../src/database';
import { users } from '../src/features/user/shared/user.schema';
import { userAddresses } from '../src/features/user/shared/addresses.schema';
import { customerProfiles } from '../src/features/user/shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../src/features/user/shared/business-profiles.schema';
import { adminProfiles } from '../src/features/user/shared/admin-profiles.schema';
import { customerStatistics } from '../src/features/user/shared/customer-statistics.schema';
import { userPaymentMethods } from '../src/features/user/shared/payment-methods.schema';
import { reviews } from '../src/features/reviews/shared/reviews.schema';
import { productQuestions } from '../src/features/reviews/shared/product-questions.schema';
import { products } from '../src/features/product/shared/product.schema';
import { like, inArray } from 'drizzle-orm';

// Test email domain for cleanup
// const TEST_EMAIL_SUFFIXES = ['@test.com', '@anantenterprises.test', '@techsolutions.test'];

async function seedUsersAndReviews() {
  console.log('🌱 Starting comprehensive User Ecosystem seed...\n');

  // ============================================
  // STEP 0: VERIFY PRODUCTS EXIST
  // ============================================
  console.log('🔍 Step 0: Verifying products exist...');
  const existingProducts = await db
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .limit(5);
  if (existingProducts.length === 0) {
    console.error('❌ No products found! Run seed-products-and-collections.ts first.');
    process.exit(1);
  }
  console.log(`   ✅ Found ${existingProducts.length}+ products\n`);

  // Get product map for reviews
  const allProducts = await db.select({ id: products.id, sku: products.sku }).from(products);
  const productMap = new Map(allProducts.map(p => [p.sku, p.id]));

  // ============================================
  // STEP 1: CLEANUP OLD TEST DATA
  // ============================================
  console.log('🧹 Step 1: Cleaning up old test data...');

  // Find test users
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, '%@test.com'));

  // Also find other test emails
  const testUsers2 = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, '%@anantenterprises.test'));

  const testUsers3 = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, '%@techsolutions.test'));

  const allTestUserIds = [...testUsers, ...testUsers2, ...testUsers3].map(u => u.id);

  if (allTestUserIds.length > 0) {
    // Delete in reverse dependency order (cascade should handle most)
    await db.delete(reviews).where(inArray(reviews.user_id, allTestUserIds));
    await db.delete(productQuestions).where(inArray(productQuestions.user_id, allTestUserIds));
    await db.delete(userPaymentMethods).where(inArray(userPaymentMethods.user_id, allTestUserIds));
    await db.delete(customerStatistics).where(inArray(customerStatistics.user_id, allTestUserIds));
    await db.delete(adminProfiles).where(inArray(adminProfiles.user_id, allTestUserIds));
    await db
      .delete(businessCustomerProfiles)
      .where(inArray(businessCustomerProfiles.user_id, allTestUserIds));
    await db.delete(customerProfiles).where(inArray(customerProfiles.user_id, allTestUserIds));
    await db.delete(userAddresses).where(inArray(userAddresses.user_id, allTestUserIds));
    await db.delete(users).where(inArray(users.id, allTestUserIds));
    console.log(`   ✅ Deleted ${allTestUserIds.length} test users and related data\n`);
  } else {
    console.log('   ✅ No existing test data to clean\n');
  }

  // ============================================
  // STEP 2: INSERT 8 USERS
  // ============================================
  console.log('👤 Step 2: Inserting 8 Users...');

  const userData = [
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543210',
      phone_country_code: '+91',
      phone_verified: true,
      gender: 'male' as const,
      profile_image_url: 'https://placehold.co/100x100/0066cc/white?text=RS',
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543211',
      phone_country_code: '+91',
      phone_verified: true,
      gender: 'female' as const,
      profile_image_url: 'https://placehold.co/100x100/cc0066/white?text=PP',
    },
    {
      name: 'Amit Kumar',
      email: 'amit.kumar@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543212',
      phone_country_code: '+91',
      phone_verified: false,
      gender: 'male' as const,
    },
    {
      name: 'Sneha Reddy',
      email: 'sneha.reddy@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543213',
      phone_country_code: '+91',
      phone_verified: true,
      gender: 'female' as const,
    },
    {
      name: 'Tech Solutions Pvt Ltd',
      email: 'contact@techsolutions.test',
      user_type: 'business' as const,
      phone_number: '2012345678',
      phone_country_code: '+91',
      phone_verified: true,
    },
    {
      name: 'Admin User',
      email: 'admin@anantenterprises.test',
      user_type: 'individual' as const,
      phone_number: '9999999999',
      phone_country_code: '+91',
      phone_verified: true,
      gender: 'male' as const,
    },
    {
      name: 'Vikram Desai',
      email: 'vikram.desai@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543214',
      phone_country_code: '+91',
      phone_verified: false,
      gender: 'male' as const,
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@test.com',
      user_type: 'individual' as const,
      phone_number: '9876543215',
      phone_country_code: '+91',
      phone_verified: true,
      gender: 'female' as const,
    },
  ];

  const insertedUsers = await db.insert(users).values(userData).returning();
  console.log(`   ✅ Inserted ${insertedUsers.length} users\n`);

  // Create user lookup map
  const userMap = new Map(insertedUsers.map(u => [u.email, u]));

  const rahul = userMap.get('rahul.sharma@test.com')!;
  const priya = userMap.get('priya.patel@test.com')!;
  const amit = userMap.get('amit.kumar@test.com')!;
  const sneha = userMap.get('sneha.reddy@test.com')!;
  const techSolutions = userMap.get('contact@techsolutions.test')!;
  const adminUser = userMap.get('admin@anantenterprises.test')!;
  const vikram = userMap.get('vikram.desai@test.com')!;
  const ananya = userMap.get('ananya.iyer@test.com')!;

  // ============================================
  // STEP 3: INSERT 12 ADDRESSES
  // ============================================
  console.log('📍 Step 3: Inserting 12 Addresses...');

  const addressData = [
    // Rahul - 3 addresses
    {
      user_id: rahul.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Rahul Sharma',
      phone_number: '9876543210',
      phone_country_code: '+91',
      address_line1: '123, MG Road, Andheri West',
      city: 'Mumbai',
      state_province: 'Maharashtra',
      postal_code: '400053',
      country: 'India',
      country_code: 'IN',
      latitude: '19.1197',
      longitude: '72.8464',
    },
    {
      user_id: rahul.id,
      address_type: 'billing' as const,
      is_default: true,
      recipient_name: 'Rahul Sharma',
      phone_number: '9876543210',
      phone_country_code: '+91',
      address_line1: '123, MG Road, Andheri West',
      city: 'Mumbai',
      state_province: 'Maharashtra',
      postal_code: '400053',
      country: 'India',
      country_code: 'IN',
    },
    {
      user_id: rahul.id,
      address_type: 'shipping' as const,
      is_default: false,
      recipient_name: 'Rahul Sharma (Office)',
      phone_number: '9876543210',
      phone_country_code: '+91',
      address_line1: 'Tower A, Business Park',
      address_line2: 'Hinjewadi Phase 1',
      city: 'Pune',
      state_province: 'Maharashtra',
      postal_code: '411057',
      country: 'India',
      country_code: 'IN',
    },
    // Priya - combined address
    {
      user_id: priya.id,
      address_type: 'both' as const,
      is_default: true,
      recipient_name: 'Priya Patel',
      phone_number: '9876543211',
      phone_country_code: '+91',
      address_line1: '456, Koramangala 5th Block',
      city: 'Bangalore',
      state_province: 'Karnataka',
      postal_code: '560095',
      country: 'India',
      country_code: 'IN',
      latitude: '12.9352',
      longitude: '77.6245',
    },
    // Amit - one address
    {
      user_id: amit.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Amit Kumar',
      phone_number: '9876543212',
      phone_country_code: '+91',
      address_line1: '789, Connaught Place',
      city: 'New Delhi',
      state_province: 'Delhi',
      postal_code: '110001',
      country: 'India',
      country_code: 'IN',
    },
    // Sneha - 2 addresses
    {
      user_id: sneha.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Sneha Reddy',
      phone_number: '9876543213',
      phone_country_code: '+91',
      address_line1: '101, Hitech City',
      city: 'Hyderabad',
      state_province: 'Telangana',
      postal_code: '500081',
      country: 'India',
      country_code: 'IN',
    },
    {
      user_id: sneha.id,
      address_type: 'shipping' as const,
      is_default: false,
      recipient_name: 'Sneha Reddy (Parents)',
      phone_number: '9876543213',
      phone_country_code: '+91',
      address_line1: '55, Anna Nagar',
      city: 'Chennai',
      state_province: 'Tamil Nadu',
      postal_code: '600040',
      country: 'India',
      country_code: 'IN',
    },
    // Tech Solutions - 2 addresses
    {
      user_id: techSolutions.id,
      address_type: 'company' as const,
      is_default: true,
      recipient_name: 'Tech Solutions Pvt Ltd',
      company_name: 'Tech Solutions Private Limited',
      phone_number: '2012345678',
      phone_country_code: '+91',
      address_line1: 'EON IT Park, Tower 5',
      address_line2: 'Kharadi',
      city: 'Pune',
      state_province: 'Maharashtra',
      postal_code: '411014',
      country: 'India',
      country_code: 'IN',
      tax_id: '27AABCT1234A1Z5',
    },
    {
      user_id: techSolutions.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Tech Solutions - Warehouse',
      company_name: 'Tech Solutions Private Limited',
      phone_number: '2012345679',
      phone_country_code: '+91',
      address_line1: 'Plot 45, MIDC',
      city: 'Mumbai',
      state_province: 'Maharashtra',
      postal_code: '400093',
      country: 'India',
      country_code: 'IN',
    },
    // Admin
    {
      user_id: adminUser.id,
      address_type: 'billing' as const,
      is_default: true,
      recipient_name: 'Admin User',
      phone_number: '9999999999',
      phone_country_code: '+91',
      address_line1: 'Anant Enterprises HQ',
      city: 'Mumbai',
      state_province: 'Maharashtra',
      postal_code: '400001',
      country: 'India',
      country_code: 'IN',
    },
    // Vikram
    {
      user_id: vikram.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Vikram Desai',
      phone_number: '9876543214',
      phone_country_code: '+91',
      address_line1: '22, Civil Lines',
      city: 'Jaipur',
      state_province: 'Rajasthan',
      postal_code: '302006',
      country: 'India',
      country_code: 'IN',
    },
    // Ananya
    {
      user_id: ananya.id,
      address_type: 'shipping' as const,
      is_default: true,
      recipient_name: 'Ananya Iyer',
      phone_number: '9876543215',
      phone_country_code: '+91',
      address_line1: '88, Marine Drive',
      city: 'Kochi',
      state_province: 'Kerala',
      postal_code: '682001',
      country: 'India',
      country_code: 'IN',
    },
  ];

  const insertedAddresses = await db.insert(userAddresses).values(addressData).returning();
  console.log(`   ✅ Inserted ${insertedAddresses.length} addresses\n`);

  // ============================================
  // STEP 4: INSERT CUSTOMER PROFILES (B2C)
  // ============================================
  console.log('👥 Step 4: Inserting 6 Customer Profiles (B2C)...');

  const customerProfileData = [
    {
      user_id: rahul.id,
      segment: 'vip' as const,
      store_credit_balance: '500.00',
      referral_code: 'RAHUL2024',
      marketing_opt_in: true,
      sms_opt_in: true,
      email_opt_in: true,
      whatsapp_opt_in: true,
      push_notifications_opt_in: true,
      account_status: 'active' as const,
    },
    {
      user_id: priya.id,
      segment: 'regular' as const,
      store_credit_balance: '0.00',
      referral_code: 'PRIYA2024',
      referred_by_user_id: rahul.id, // Referred by Rahul
      referral_bonus_credited: true,
      marketing_opt_in: false,
      sms_opt_in: false,
      email_opt_in: true,
      whatsapp_opt_in: false,
      push_notifications_opt_in: false,
      account_status: 'active' as const,
    },
    {
      user_id: amit.id,
      segment: 'new' as const,
      store_credit_balance: '100.00',
      referral_code: 'AMIT2024',
      marketing_opt_in: true,
      sms_opt_in: true,
      email_opt_in: true,
      whatsapp_opt_in: true,
      push_notifications_opt_in: true,
      account_status: 'active' as const,
    },
    {
      user_id: sneha.id,
      segment: 'at_risk' as const,
      store_credit_balance: '0.00',
      referral_code: 'SNEHA2024',
      marketing_opt_in: false,
      sms_opt_in: false,
      email_opt_in: false,
      whatsapp_opt_in: false,
      push_notifications_opt_in: false,
      account_status: 'active' as const,
    },
    {
      user_id: vikram.id,
      segment: 'regular' as const,
      store_credit_balance: '0.00',
      marketing_opt_in: false,
      account_status: 'suspended' as const,
      suspended_reason: 'Multiple payment failures and chargebacks',
      suspended_until: new Date('2026-06-01'),
    },
    {
      user_id: ananya.id,
      segment: 'new' as const,
      store_credit_balance: '50.00',
      referral_code: 'ANANYA24',
      marketing_opt_in: true,
      sms_opt_in: true,
      email_opt_in: true,
      whatsapp_opt_in: true,
      push_notifications_opt_in: true,
      account_status: 'active' as const,
    },
  ];

  await db.insert(customerProfiles).values(customerProfileData);
  console.log(`   ✅ Inserted 6 customer profiles\n`);

  // ============================================
  // STEP 5: INSERT BUSINESS PROFILE (B2B)
  // ============================================
  console.log('🏢 Step 5: Inserting 1 Business Profile (B2B)...');

  // Get address IDs for business
  const techHQAddress = insertedAddresses.find(
    a => a.user_id === techSolutions.id && a.address_type === 'company'
  );
  const techShipAddress = insertedAddresses.find(
    a => a.user_id === techSolutions.id && a.address_type === 'shipping'
  );

  await db.insert(businessCustomerProfiles).values({
    user_id: techSolutions.id,
    business_type: 'llc',
    company_legal_name: 'Tech Solutions Private Limited',
    company_trade_name: 'TechSol',
    company_registration_number: 'U72200MH2020PTC123456',
    industry: 'IT Services',
    website: 'https://techsolutions.test',
    tax_id: '27AABCT1234A1Z5',
    tax_exempt: false,
    business_email: 'accounts@techsolutions.test',
    business_phone: '2012345678',
    business_phone_country_code: '+91',
    billing_address_id: techHQAddress?.id,
    shipping_address_id: techShipAddress?.id,
    payment_terms: 'net_30',
    credit_limit: '500000.00',
    credit_used: '75000.00',
    credit_approved_by: adminUser.id,
    credit_approved_at: new Date(),
    account_manager_id: adminUser.id,
    tier: 'gold',
    bulk_discount_percent: '10.00',
    minimum_order_value: '10000.00',
    account_status: 'active',
    approved_by: adminUser.id,
    approved_at: new Date('2025-01-15'),
    notes: 'Key enterprise client. Monthly bulk orders for water purifiers.',
  });
  console.log(`   ✅ Inserted 1 business profile\n`);

  // ============================================
  // STEP 6: INSERT ADMIN PROFILE
  // ============================================
  console.log('🔑 Step 6: Inserting 1 Admin Profile...');

  await db.insert(adminProfiles).values({
    user_id: adminUser.id,
    employee_id: 'EMP-001',
    department: 'Sales',
    job_title: 'Sales Manager',
    is_active: true,
  });
  console.log(`   ✅ Inserted 1 admin profile\n`);

  // ============================================
  // STEP 7: INSERT CUSTOMER STATISTICS
  // ============================================
  console.log('📊 Step 7: Inserting 7 Customer Statistics...');

  const statsData = [
    {
      user_id: rahul.id,
      total_orders: 15,
      completed_orders: 14,
      cancelled_orders: 1,
      returned_orders: 0,
      total_spent: '125000.00',
      average_order_value: '8333.33',
      highest_order_value: '25999.00',
      first_order_at: new Date('2024-01-15'),
      last_order_at: new Date('2025-12-20'),
      days_since_last_order: 14,
      reviews_count: 6,
      average_review_rating: '4.50',
      cart_abandonment_count: 2,
      wishlist_items_count: 5,
    },
    {
      user_id: priya.id,
      total_orders: 8,
      completed_orders: 8,
      cancelled_orders: 0,
      returned_orders: 0,
      total_spent: '65000.00',
      average_order_value: '8125.00',
      highest_order_value: '18999.00',
      first_order_at: new Date('2024-06-01'),
      last_order_at: new Date('2025-11-15'),
      days_since_last_order: 49,
      reviews_count: 5,
      average_review_rating: '4.80',
    },
    {
      user_id: amit.id,
      total_orders: 3,
      completed_orders: 3,
      cancelled_orders: 0,
      returned_orders: 0,
      total_spent: '25000.00',
      average_order_value: '8333.33',
      first_order_at: new Date('2025-10-01'),
      last_order_at: new Date('2025-12-01'),
      days_since_last_order: 33,
      reviews_count: 4,
      average_review_rating: '4.00',
    },
    {
      user_id: sneha.id,
      total_orders: 2,
      completed_orders: 2,
      cancelled_orders: 0,
      returned_orders: 0,
      total_spent: '12000.00',
      average_order_value: '6000.00',
      first_order_at: new Date('2025-03-01'),
      last_order_at: new Date('2025-05-15'),
      days_since_last_order: 233,
      reviews_count: 3,
      average_review_rating: '4.33',
    },
    {
      user_id: techSolutions.id,
      total_orders: 5,
      completed_orders: 5,
      cancelled_orders: 0,
      returned_orders: 0,
      total_spent: '350000.00',
      average_order_value: '70000.00',
      highest_order_value: '150000.00',
      first_order_at: new Date('2025-02-01'),
      last_order_at: new Date('2025-12-15'),
      days_since_last_order: 19,
      reviews_count: 3,
      average_review_rating: '5.00',
    },
    {
      user_id: vikram.id,
      total_orders: 1,
      completed_orders: 0,
      cancelled_orders: 1,
      returned_orders: 0,
      total_spent: '0.00',
      average_order_value: '0.00',
    },
    {
      user_id: ananya.id,
      total_orders: 0,
      completed_orders: 0,
      cancelled_orders: 0,
      returned_orders: 0,
      total_spent: '0.00',
      average_order_value: '0.00',
    },
  ];

  await db.insert(customerStatistics).values(statsData);
  console.log(`   ✅ Inserted 7 customer statistics\n`);

  // ============================================
  // STEP 8: INSERT PAYMENT METHODS
  // ============================================
  console.log('💳 Step 8: Inserting 8 Payment Methods...');

  const billingAddressRahul = insertedAddresses.find(
    a => a.user_id === rahul.id && a.address_type === 'billing'
  );

  const paymentData = [
    {
      user_id: rahul.id,
      payment_type: 'card' as const,
      is_default: true,
      razorpay_customer_id: 'cust_rahul_test',
      razorpay_token_id: 'token_visa_4242',
      display_name: 'Visa •••• 4242',
      card_last4: '4242',
      card_brand: 'Visa',
      card_network: 'Visa',
      card_type: 'credit' as const,
      card_issuer: 'HDFC Bank',
      card_exp_month: 12,
      card_exp_year: 2028,
      billing_address_id: billingAddressRahul?.id,
      is_verified: true,
      verified_at: new Date(),
      last_used_at: new Date(),
    },
    {
      user_id: rahul.id,
      payment_type: 'upi' as const,
      is_default: false,
      display_name: 'rahul@upi',
      upi_id: 'rahul.sharma@paytm',
      is_verified: true,
      verified_at: new Date(),
    },
    {
      user_id: priya.id,
      payment_type: 'card' as const,
      is_default: true,
      razorpay_customer_id: 'cust_priya_test',
      razorpay_token_id: 'token_mc_5555',
      display_name: 'Mastercard •••• 5555',
      card_last4: '5555',
      card_brand: 'Mastercard',
      card_network: 'Mastercard',
      card_type: 'debit' as const,
      card_issuer: 'ICICI Bank',
      card_exp_month: 6,
      card_exp_year: 2027,
      is_verified: true,
      verified_at: new Date(),
    },
    {
      user_id: amit.id,
      payment_type: 'upi' as const,
      is_default: true,
      display_name: 'amit.kumar@paytm',
      upi_id: 'amit.kumar@paytm',
      is_verified: true,
      verified_at: new Date(),
    },
    {
      user_id: sneha.id,
      payment_type: 'wallet' as const,
      is_default: true,
      display_name: 'PhonePe Wallet',
      wallet_type: 'PhonePe',
      is_verified: true,
      verified_at: new Date(),
    },
    {
      user_id: techSolutions.id,
      payment_type: 'netbanking' as const,
      is_default: true,
      display_name: 'HDFC Bank - Corporate',
      netbanking_bank_code: 'HDFC',
      netbanking_bank_name: 'HDFC Bank',
      is_verified: true,
      verified_at: new Date(),
    },
    {
      user_id: techSolutions.id,
      payment_type: 'card' as const,
      is_default: false,
      razorpay_customer_id: 'cust_techsol_test',
      razorpay_token_id: 'token_rupay_1234',
      display_name: 'RuPay •••• 1234',
      card_last4: '1234',
      card_brand: 'RuPay',
      card_network: 'RuPay',
      card_type: 'debit' as const,
      card_issuer: 'SBI',
      card_exp_month: 9,
      card_exp_year: 2026,
      is_verified: true,
    },
    {
      user_id: ananya.id,
      payment_type: 'upi' as const,
      is_default: true,
      display_name: 'ananya@gpay',
      upi_id: 'ananya.iyer@okhdfcbank',
      is_verified: true,
      verified_at: new Date(),
    },
  ];

  await db.insert(userPaymentMethods).values(paymentData);
  console.log(`   ✅ Inserted 8 payment methods\n`);

  // ============================================
  // STEP 9: INSERT 25 REVIEWS
  // ============================================
  console.log('⭐ Step 9: Inserting 25 Reviews...');

  // Helper to get product ID
  const getProductId = (sku: string) => {
    const id = productMap.get(sku);
    if (!id) throw new Error(`Product not found: ${sku}`);
    return id;
  };

  const reviewData = [
    // AquaPure RO 500 - 5 reviews
    {
      product_id: getProductId('AP-RO-500'),
      user_id: rahul.id,
      rating: 5,
      title: 'Excellent water purifier!',
      comment: 'Best purchase I made. Water quality is amazing and the installation was quick.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 45,
      admin_reply: "Thank you for your kind words, Rahul! We're glad you're enjoying pure water.",
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: priya.id,
      rating: 5,
      title: 'Worth every rupee',
      comment: 'Premium quality product. Family loves the taste of water now.',
      media_urls: ['https://placehold.co/400x300/0066cc/white?text=Review+Image'],
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 32,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: amit.id,
      rating: 4,
      title: 'Good but expensive',
      comment: 'Great purifier but the price is on the higher side. Quality is top-notch though.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 12,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: sneha.id,
      rating: 5,
      title: 'Perfect for home',
      comment: 'Compact design, great filtration. Highly recommended!',
      is_verified_purchase: false,
      status: 'approved' as const,
      helpful_votes: 8,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: techSolutions.id,
      rating: 4,
      title: 'Good for office use',
      comment: 'Installed 3 units in our office. Staff is happy with the water quality.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 5,
    },
    // AquaPure RO 300 - 3 reviews
    {
      product_id: getProductId('AP-RO-300'),
      user_id: rahul.id,
      rating: 4,
      title: 'Great value for money',
      comment: 'Budget-friendly option with decent performance.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 15,
    },
    {
      product_id: getProductId('AP-RO-300'),
      user_id: priya.id,
      rating: 5,
      title: 'Perfect for small family',
      comment: 'Bought for my parents. Easy to use and maintain.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 10,
    },
    {
      product_id: getProductId('AP-RO-300'),
      user_id: vikram.id,
      rating: 3,
      title: 'Average product',
      comment: 'Does the job but nothing special.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 3,
    },
    // PureFlow UV Pro - 3 reviews
    {
      product_id: getProductId('PF-UV-PRO'),
      user_id: amit.id,
      rating: 5,
      title: 'Best UV purifier',
      comment: 'UV technology works great with our municipal water supply.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 20,
    },
    {
      product_id: getProductId('PF-UV-PRO'),
      user_id: sneha.id,
      rating: 4,
      title: 'Good for soft water areas',
      comment: 'Perfect if you already have low TDS water.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 7,
    },
    {
      product_id: getProductId('PF-UV-PRO'),
      user_id: ananya.id,
      rating: 4,
      title: 'Nice product',
      comment: 'Just installed, looks promising.',
      is_verified_purchase: false,
      status: 'pending' as const,
      helpful_votes: 0,
    },
    // PureFlow UV Lite - 2 reviews
    {
      product_id: getProductId('PF-UV-LITE'),
      user_id: rahul.id,
      rating: 3,
      title: 'Basic but works',
      comment: 'Entry level purifier. Good for bachelor pads.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 5,
    },
    {
      product_id: getProductId('PF-UV-LITE'),
      user_id: priya.id,
      rating: 4,
      title: 'Compact and efficient',
      comment: 'Small size, fits anywhere. Good for kitchen.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 4,
    },
    // Commercial products - 3 reviews
    {
      product_id: getProductId('COMM-RO-1000'),
      user_id: techSolutions.id,
      rating: 5,
      title: 'Industrial grade quality',
      comment: 'Handles our entire office of 100 people easily.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 18,
    },
    {
      product_id: getProductId('COMM-RO-1000'),
      user_id: amit.id,
      rating: 5,
      title: 'Commercial beast',
      comment: 'Saw this at a restaurant, works flawlessly.',
      is_verified_purchase: false,
      status: 'approved' as const,
      helpful_votes: 6,
    },
    {
      product_id: getProductId('COMM-RO-2000'),
      user_id: techSolutions.id,
      rating: 5,
      title: 'Enterprise solution',
      comment: 'Installed in our main campus. Zero complaints.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 25,
    },
    // Accessories - 2 reviews
    {
      product_id: getProductId('ACC-FC-10'),
      user_id: rahul.id,
      rating: 5,
      title: 'Perfect replacement',
      comment: 'Fits perfectly in my purifier. Good quality.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 30,
    },
    {
      product_id: getProductId('ACC-FC-10'),
      user_id: sneha.id,
      rating: 4,
      title: 'Standard cartridge',
      comment: 'Does the job. Replace every 3 months.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 8,
    },
    // Spare Parts - 2 reviews
    {
      product_id: getProductId('SP-RO-100'),
      user_id: priya.id,
      rating: 5,
      title: 'Genuine membrane',
      comment: 'Replaced my old membrane. Water tastes fresh again!',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 12,
    },
    {
      product_id: getProductId('SP-RO-50'),
      user_id: amit.id,
      rating: 3,
      title: 'Okay membrane',
      comment: 'Works but expected better flow rate.',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 2,
    },
    // Premium products - 2 reviews
    {
      product_id: getProductId('AP-COMBO-01'),
      user_id: rahul.id,
      rating: 5,
      title: 'Ultimate purifier',
      comment: 'Everything you need in one machine. Smart features!',
      is_verified_purchase: true,
      status: 'approved' as const,
      helpful_votes: 35,
    },
    {
      product_id: getProductId('LE-GOLD-01'),
      user_id: priya.id,
      rating: 5,
      title: 'Stunning design',
      comment: 'The gold finish is gorgeous. Works like a charm.',
      is_verified_purchase: true,
      status: 'pending' as const,
      helpful_votes: 0,
    },
    // Rejected reviews
    {
      product_id: getProductId('LE-GOLD-01'),
      user_id: vikram.id,
      rating: 2,
      title: 'SPAM SPAM SPAM',
      comment: 'Buy from my website instead: spam-link.com',
      is_verified_purchase: false,
      status: 'rejected' as const,
      helpful_votes: 0,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: vikram.id,
      rating: 1,
      title: 'Hate this product',
      comment: 'Inappropriate content removed',
      is_verified_purchase: false,
      status: 'rejected' as const,
      helpful_votes: 0,
    },
    // Pending review
    {
      product_id: getProductId('PF-UV-PRO'),
      user_id: ananya.id,
      rating: 2,
      title: 'Not impressed',
      comment: 'Expected more for the price. Waiting for response.',
      is_verified_purchase: false,
      status: 'pending' as const,
      helpful_votes: 0,
    },
  ];

  await db.insert(reviews).values(reviewData);
  console.log(`   ✅ Inserted 25 reviews\n`);

  // ============================================
  // STEP 10: INSERT 10 PRODUCT QUESTIONS
  // ============================================
  console.log('❓ Step 10: Inserting 10 Product Questions...');

  const questionData = [
    {
      product_id: getProductId('AP-RO-500'),
      user_id: sneha.id,
      question: 'Does this work with low water pressure?',
      answer:
        'Yes, the AquaPure RO 500 comes with a built-in booster pump that works efficiently even with low water pressure (as low as 0.3 kg/cm²).',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: amit.id,
      question: 'What is the warranty period?',
      answer:
        'The AquaPure RO 500 comes with a comprehensive 5-year warranty on the purifier body and 1-year warranty on electrical components.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('AP-RO-500'),
      user_id: ananya.id,
      question: 'Can I install it myself?',
      status: 'pending' as const,
      is_public: false,
    },
    {
      product_id: getProductId('AP-RO-300'),
      user_id: priya.id,
      question: 'What is the storage capacity?',
      answer: 'The AquaPure RO 300 has an 8-liter food-grade plastic storage tank.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('PF-UV-PRO'),
      user_id: rahul.id,
      question: 'Is UV lamp replacement easy?',
      answer:
        'Yes! The UV lamp can be easily replaced at home. Simply open the top panel and slide out the old lamp. No tools required. We recommend replacement every 8000 hours.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('PF-UV-LITE'),
      user_id: sneha.id,
      question: 'Does this remove TDS?',
      answer:
        'No, UV purifiers do not reduce TDS. They are designed to kill bacteria and viruses. For TDS reduction, you need an RO purifier.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('COMM-RO-1000'),
      user_id: techSolutions.id,
      question: 'Do you offer AMC contracts?',
      answer:
        'Yes, we offer Annual Maintenance Contracts for all commercial products. Contact our B2B team at business@anantenterprises.com for customized plans.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('ACC-FC-10'),
      user_id: amit.id,
      question: 'How often should I replace this?',
      answer:
        'For optimal performance, we recommend replacing the sediment filter cartridge every 3-6 months depending on your water quality and usage.',
      answered_by: adminUser.id,
      status: 'answered' as const,
      is_public: true,
    },
    {
      product_id: getProductId('AP-COMBO-01'),
      user_id: vikram.id,
      question: 'Is this the best model you have?',
      status: 'rejected' as const,
      is_public: false,
    },
    {
      product_id: getProductId('LE-GOLD-01'),
      user_id: ananya.id,
      question: 'How many units are still available?',
      status: 'pending' as const,
      is_public: false,
    },
  ];

  await db.insert(productQuestions).values(questionData);
  console.log(`   ✅ Inserted 10 product questions\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('═'.repeat(50));
  console.log('🎉 USER ECOSYSTEM SEED COMPLETED SUCCESSFULLY!');
  console.log('═'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   • Users: 8 (6 individual, 1 business, 1 admin)`);
  console.log(`   • Addresses: 12`);
  console.log(`   • Customer Profiles (B2C): 6`);
  console.log(`   • Business Profiles (B2B): 1`);
  console.log(`   • Admin Profiles: 1`);
  console.log(`   • Customer Statistics: 7`);
  console.log(`   • Payment Methods: 8`);
  console.log(`   • Reviews: 25 (18 approved, 5 pending, 2 rejected)`);
  console.log(`   • Product Questions: 10 (7 answered, 2 pending, 1 rejected)`);
  console.log('\n👥 Users Created:');
  insertedUsers.forEach(u => {
    console.log(`   • ${u.name} (${u.email}) - ${u.user_type}`);
  });
  console.log('\n✨ Test the APIs:');
  console.log('   curl.exe http://localhost:8000/api/products/AP-RO-500-UUID/reviews');
  console.log('   curl.exe http://localhost:8000/api/products');

  process.exit(0);
}

// Run the seed
seedUsersAndReviews().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
