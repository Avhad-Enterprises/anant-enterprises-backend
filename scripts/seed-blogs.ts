/**
 * Seed Script: Blogs
 *
 * Populates the database with blog posts matching the frontend static data.
 * Each blog includes full HTML content for the detail pages.
 *
 * Usage: npx tsx scripts/seed-blogs.ts
 */

import { db } from '../src/database';
import { blogs } from '../src/features/blog/shared/blog.schema';
import { inArray } from 'drizzle-orm';

// ============================================
// BLOG SEED DATA
// ============================================

const BLOG_SLUGS = [
    'why-water-purification-is-essential',
    'understanding-tds-levels',
    'maintenance-tips-for-ro-purifiers',
    'alkaline-water-benefits',
];

const blogData = [
    {
        slug: 'why-water-purification-is-essential',
        title: 'Why Water Purification is Essential for Your Health',
        description: 'Discover the hidden dangers in tap water and how a good purifier can protect your family from waterborne diseases.',
        quote: 'Investing in a good water purifier is not just a luxury, it\'s a necessity for safeguarding your family\'s health in the long run.',
        content: `
      <p class="mb-6 text-lg">Water is the elixir of life, but not all water is created equal. In today's world, tap water can contain a variety of contaminants that are invisible to the naked eye. From heavy metals to bacteria, the threats are real.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">The Invisible Dangers</h2>
      <p class="mb-6">Many people assume that if water looks clean, it is safe to drink. However, microscopic pathogens and dissolved impurities like lead, arsenic, and mercury can be present even in clear water. Long-term consumption of such water can lead to serious health issues.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">How RO Purification Works</h2>
      <p class="mb-6">Reverse Osmosis (RO) is one of the most effective technologies for water purification. It works by forcing water through a semi-permeable membrane that traps contaminants while allowing pure water molecules to pass through. Combined with UV (Ultraviolet) and UF (Ultrafiltration) technologies, it ensures complete protection.</p>
      
      <blockquote class="border-l-4 border-[#00C4CC] pl-6 italic text-gray-600 mb-6 bg-gray-50 p-4 rounded-r-lg">
        "Investing in a good water purifier is not just a luxury, it's a necessity for safeguarding your family's health in the long run."
      </blockquote>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">Benefits of Anant Pure Purifiers</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>Multi-stage Purification:</strong> Ensures every drop is safe.</li>
        <li><strong>Mineral Guard:</strong> Retains essential minerals like Calcium and Magnesium.</li>
        <li><strong>Smart Alerts:</strong> Lets you know when it's time to change filters.</li>
      </ul>
      
      <p>Choosing the right water purifier depends on your water source and quality. We recommend getting your water tested to determine the best solution for your home.</p>
    `,
        main_image_pc_url: 'https://images.unsplash.com/photo-1544198841-10f34f31f8dd?auto=format&fit=crop&q=80&w=800',
        main_image_mobile_url: 'https://images.unsplash.com/photo-1544198841-10f34f31f8dd?auto=format&fit=crop&q=80&w=400',
        category: 'Health & Wellness',
        author: 'Dr. Sarah Johnson',
        tags: ['Water Safety', 'Health', 'Technology', 'RO Purification'],
        meta_title: 'Water Purification for Your Health | Anant',
        meta_description: 'Discover the hidden dangers in tap water and how a good purifier can protect your family from waterborne diseases.',
        status: 'public' as const,
        published_at: new Date('2024-12-15'),
        views_count: 1245,
    },
    {
        slug: 'understanding-tds-levels',
        title: 'Understanding TDS Levels: What is Safe Drinking Water?',
        description: 'TDS stands for Total Dissolved Solids. Learn what the numbers mean and how to choose the right purifier based on your water source.',
        quote: 'Understanding your water\'s TDS level is the first step towards making an informed decision about water purification.',
        content: `
      <p class="mb-6 text-lg">TDS, or Total Dissolved Solids, is a measure of all the organic and inorganic substances dissolved in water. This includes minerals, salts, metals, and even some organic matter.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">What Does TDS Mean?</h2>
      <p class="mb-6">TDS is measured in parts per million (ppm) or milligrams per liter (mg/L). The higher the TDS, the more dissolved substances are present in the water. While some dissolved minerals are beneficial, excessively high TDS can indicate contamination.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">TDS Levels and What They Mean</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>Less than 300 ppm:</strong> Excellent - Ideal for drinking</li>
        <li><strong>300-600 ppm:</strong> Good - Acceptable for consumption</li>
        <li><strong>600-900 ppm:</strong> Fair - Consider a water purifier</li>
        <li><strong>900-1200 ppm:</strong> Poor - Water purification recommended</li>
        <li><strong>Above 1200 ppm:</strong> Unacceptable - Do not consume without treatment</li>
      </ul>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">Choosing the Right Purifier Based on TDS</h2>
      <p class="mb-6">For water with TDS below 500 ppm, a UV or UF purifier may suffice. However, for TDS levels above 500 ppm, an RO purifier is recommended to effectively remove dissolved impurities.</p>
      
      <blockquote class="border-l-4 border-[#00C4CC] pl-6 italic text-gray-600 mb-6 bg-gray-50 p-4 rounded-r-lg">
        "Understanding your water's TDS level is the first step towards making an informed decision about water purification."
      </blockquote>
      
      <p>Get your water tested today to know its TDS level and choose the most suitable purification solution for your home.</p>
    `,
        main_image_pc_url: 'https://images.unsplash.com/photo-1625093440280-42de742a496d?auto=format&fit=crop&q=80&w=800',
        main_image_mobile_url: 'https://images.unsplash.com/photo-1625093440280-42de742a496d?auto=format&fit=crop&q=80&w=400',
        category: 'Guides',
        author: 'Rahul Sharma',
        tags: ['TDS', 'Water Quality', 'Guides', 'Water Testing'],
        meta_title: 'Understanding TDS Levels | Safe Drinking Water',
        meta_description: 'Learn what TDS numbers mean and how to choose the right purifier based on your water source.',
        status: 'public' as const,
        published_at: new Date('2024-12-10'),
        views_count: 892,
    },
    {
        slug: 'maintenance-tips-for-ro-purifiers',
        title: '5 Maintenance Tips to Extend Your RO Purifier\'s Life',
        description: 'Regular maintenance is key to ensuring your water purifier works efficiently for years. Specialized tips from our experts.',
        quote: 'A well-maintained purifier not only lasts longer but also ensures you get the purest water every time.',
        content: `
      <p class="mb-6 text-lg">Your RO water purifier is an investment in your family's health. Like any appliance, it requires regular maintenance to function at its best. Here are five essential tips to keep your purifier running smoothly for years.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">1. Replace Filters on Time</h2>
      <p class="mb-6">Filters are the heart of your RO system. Over time, they become clogged with impurities and lose their effectiveness. Follow the manufacturer's guidelines for filter replacement - typically every 6-12 months depending on usage and water quality.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">2. Sanitize the Storage Tank</h2>
      <p class="mb-6">The storage tank can harbor bacteria if not cleaned regularly. Drain and sanitize the tank every 3-4 months to ensure the stored water remains pure.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">3. Check for Leaks</h2>
      <p class="mb-6">Regularly inspect all connections and tubing for leaks. Even small leaks can lead to water wastage and damage to the purifier's components.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">4. Annual Servicing</h2>
      <p class="mb-6">Schedule an annual service with a certified technician. They can check the RO membrane, electrical components, and overall system health.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">5. Use Quality Replacement Parts</h2>
      <p class="mb-6">Always use genuine replacement parts. Cheap alternatives may seem economical but can damage your purifier and compromise water quality.</p>
      
      <blockquote class="border-l-4 border-[#00C4CC] pl-6 italic text-gray-600 mb-6 bg-gray-50 p-4 rounded-r-lg">
        "A well-maintained purifier not only lasts longer but also ensures you get the purest water every time."
      </blockquote>
      
      <p>Contact Anant Enterprises for professional AMC (Annual Maintenance Contract) services to keep your purifier in top condition.</p>
    `,
        main_image_pc_url: 'https://images.unsplash.com/photo-1662647344062-b0cdb1ed7227?auto=format&fit=crop&q=80&w=800',
        main_image_mobile_url: 'https://images.unsplash.com/photo-1662647344062-b0cdb1ed7227?auto=format&fit=crop&q=80&w=400',
        category: 'Maintenance',
        author: 'Anant Tech Team',
        tags: ['Maintenance', 'RO Purifier', 'Tips', 'AMC'],
        meta_title: '5 Maintenance Tips for RO Purifiers | Anant',
        meta_description: 'Regular maintenance keeps your water purifier working efficiently for years. Expert tips from Anant Enterprises.',
        status: 'public' as const,
        published_at: new Date('2024-12-05'),
        views_count: 567,
    },
    {
        slug: 'alkaline-water-benefits',
        title: 'The Truth About Alkaline Water: Benefits and Myths',
        description: 'Is alkaline water really better for you? We debunk common myths and explore the scientifically proven benefits.',
        quote: 'While alkaline water has some benefits, it\'s not a magic solution. The key is balanced hydration with clean, purified water.',
        content: `
      <p class="mb-6 text-lg">Alkaline water has become a popular health trend, with claims ranging from improved hydration to cancer prevention. But what does science actually say? Let's separate fact from fiction.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">What is Alkaline Water?</h2>
      <p class="mb-6">Alkaline water has a higher pH level than regular drinking water. Normal drinking water typically has a pH of 7 (neutral), while alkaline water has a pH of 8 or 9. Some alkaline waters also contain minerals like calcium, potassium, and magnesium.</p>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">Proven Benefits</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>May help with acid reflux:</strong> Studies suggest alkaline water can help neutralize stomach acid</li>
        <li><strong>Better hydration:</strong> Some research indicates improved hydration after exercise</li>
        <li><strong>Contains beneficial minerals:</strong> Naturally alkaline water often has essential minerals</li>
      </ul>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">Common Myths Debunked</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>Myth: It cures cancer</strong> - No scientific evidence supports this claim</li>
        <li><strong>Myth: It dramatically changes body pH</strong> - Your body maintains pH balance regardless of what you drink</li>
        <li><strong>Myth: Everyone needs it</strong> - For most people, regular purified water is perfectly adequate</li>
      </ul>
      
      <blockquote class="border-l-4 border-[#00C4CC] pl-6 italic text-gray-600 mb-6 bg-gray-50 p-4 rounded-r-lg">
        "While alkaline water has some benefits, it's not a magic solution. The key is balanced hydration with clean, purified water."
      </blockquote>
      
      <h2 class="text-2xl font-bold text-[#0B1F51] mb-4">The Bottom Line</h2>
      <p>The most important factor is drinking clean, purified water. Whether you choose alkaline or regular purified water, ensure it comes from a reliable purification system. Anant Enterprises offers purifiers with optional alkaline boost technology for those who prefer it.</p>
    `,
        main_image_pc_url: 'https://images.unsplash.com/photo-1549839731-9652aa56a8cb?auto=format&fit=crop&q=80&w=800',
        main_image_mobile_url: 'https://images.unsplash.com/photo-1549839731-9652aa56a8cb?auto=format&fit=crop&q=80&w=400',
        category: 'Health & Wellness',
        author: 'Dr. Sarah Johnson',
        tags: ['Alkaline Water', 'Health', 'Myths', 'Science'],
        meta_title: 'Alkaline Water: Benefits and Myths | Anant',
        meta_description: 'Is alkaline water really better for you? We debunk common myths and explore the scientifically proven benefits.',
        status: 'public' as const,
        published_at: new Date('2024-11-28'),
        views_count: 1102,
    },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedBlogs() {
    console.log('🌱 Starting blog seed...\n');

    try {
        // ============================================
        // STEP 1: CLEANUP OLD TEST DATA
        // ============================================
        console.log('🧹 Step 1: Cleaning up existing blog data with matching slugs...');

        const deletedBlogs = await db
            .delete(blogs)
            .where(inArray(blogs.slug, BLOG_SLUGS))
            .returning();

        console.log(`   ✅ Deleted ${deletedBlogs.length} existing blogs\n`);

        // ============================================
        // STEP 2: INSERT NEW BLOGS
        // ============================================
        console.log('📝 Step 2: Inserting blog posts...');

        const insertedBlogs = await db.insert(blogs).values(blogData).returning();

        console.log(`   ✅ Inserted ${insertedBlogs.length} blogs:`);
        insertedBlogs.forEach((blog, index) => {
            console.log(`      ${index + 1}. ${blog.title} (${blog.slug})`);
        });

        console.log('\n🎉 Blog seed complete!');

    } catch (error) {
        console.error('❌ Error seeding blogs:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedBlogs();
