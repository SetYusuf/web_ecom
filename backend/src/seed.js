require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

async function seed() {
  console.log('Starting database seed...');

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@webcloth.com' },
      update: {},
      create: {
        email: 'admin@webcloth.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
      },
    });

    console.log('Created admin user:', admin.email);

    // Create categories
    const menCategory = await prisma.category.upsert({
      where: { slug: 'men' },
      update: {},
      create: {
        name: 'Men',
        slug: 'men',
        description: 'Clothing for men',
      },
    });

    const womenCategory = await prisma.category.upsert({
      where: { slug: 'women' },
      update: {},
      create: {
        name: 'Women',
        slug: 'women',
        description: 'Clothing for women',
      },
    });

    const kidsCategory = await prisma.category.upsert({
      where: { slug: 'kids' },
      update: {},
      create: {
        name: 'Kids',
        slug: 'kids',
        description: 'Clothing for kids',
      },
    });

    // Subcategories for Men
    const menTops = await prisma.category.upsert({
      where: { slug: 'men-tops' },
      update: {},
      create: {
        name: 'Tops',
        slug: 'men-tops',
        parentId: menCategory.id,
        description: 'Men\'s shirts, t-shirts, and tops',
      },
    });

    const menBottoms = await prisma.category.upsert({
      where: { slug: 'men-bottoms' },
      update: {},
      create: {
        name: 'Bottoms',
        slug: 'men-bottoms',
        parentId: menCategory.id,
        description: 'Men\'s pants, jeans, and shorts',
      },
    });

    // Subcategories for Women
    const womenDresses = await prisma.category.upsert({
      where: { slug: 'women-dresses' },
      update: {},
      create: {
        name: 'Dresses',
        slug: 'women-dresses',
        parentId: womenCategory.id,
        description: 'Women\'s dresses for all occasions',
      },
    });

    const womenTops = await prisma.category.upsert({
      where: { slug: 'women-tops' },
      update: {},
      create: {
        name: 'Tops',
        slug: 'women-tops',
        parentId: womenCategory.id,
        description: 'Women\'s blouses, t-shirts, and tops',
      },
    });

    // Subcategories for Kids
    const kidsTops = await prisma.category.upsert({
      where: { slug: 'kids-tops' },
      update: {},
      create: {
        name: 'Tops',
        slug: 'kids-tops',
        parentId: kidsCategory.id,
        description: 'Kids\' shirts and tops',
        ageGroup: 'Kids',
      },
    });

    const kidsBottoms = await prisma.category.upsert({
      where: { slug: 'kids-bottoms' },
      update: {},
      create: {
        name: 'Bottoms',
        slug: 'kids-bottoms',
        parentId: kidsCategory.id,
        description: 'Kids\' pants and shorts',
        ageGroup: 'Kids',
      },
    });

    console.log('Created categories');

    // Create sample products
    const products = [
      {
        name: 'Classic Cotton T-Shirt',
        slug: 'classic-cotton-tshirt',
        description: 'A comfortable everyday cotton t-shirt with a classic fit.',
        shortDescription: 'Comfortable everyday cotton t-shirt',
        price: 29.99,
        sku: 'MEN-TS-001',
        categoryId: menTops.id,
        brand: 'WebCloth',
        stock: 100,
        isFeatured: true,
        tags: JSON.stringify(['casual', 'cotton', 'basics']),
        materials: JSON.stringify(['100% Cotton']),
        careInstructions: 'Machine wash cold, tumble dry low',
        fitType: 'Regular',
        images: [
          { url: '/images/products/tshirt-1.jpg', altText: 'Classic Cotton T-Shirt Front', isPrimary: true },
          { url: '/images/products/tshirt-2.jpg', altText: 'Classic Cotton T-Shirt Back' },
        ],
        variants: [
          { sku: 'MEN-TS-001-S-BLK', size: 'S', color: 'Black', stock: 20 },
          { sku: 'MEN-TS-001-M-BLK', size: 'M', color: 'Black', stock: 25 },
          { sku: 'MEN-TS-001-L-BLK', size: 'L', color: 'Black', stock: 25 },
          { sku: 'MEN-TS-001-XL-BLK', size: 'XL', color: 'Black', stock: 15 },
          { sku: 'MEN-TS-001-S-WHT', size: 'S', color: 'White', stock: 15 },
          { sku: 'MEN-TS-001-M-WHT', size: 'M', color: 'White', stock: 20 },
        ],
      },
      {
        name: 'Slim Fit Chino Pants',
        slug: 'slim-fit-chino-pants',
        description: 'Modern slim fit chino pants perfect for casual and semi-formal occasions.',
        shortDescription: 'Modern slim fit chino pants',
        price: 59.99,
        sku: 'MEN-PT-001',
        categoryId: menBottoms.id,
        brand: 'WebCloth',
        stock: 75,
        tags: JSON.stringify(['casual', 'semi-formal', 'chino']),
        materials: JSON.stringify(['98% Cotton', '2% Elastane']),
        careInstructions: 'Machine wash cold, hang dry',
        fitType: 'Slim',
        images: [
          { url: '/images/products/chino-1.jpg', altText: 'Slim Fit Chino Pants', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-PT-001-30-KHK', size: '30', color: 'Khaki', stock: 15 },
          { sku: 'MEN-PT-001-32-KHK', size: '32', color: 'Khaki', stock: 20 },
          { sku: 'MEN-PT-001-34-KHK', size: '34', color: 'Khaki', stock: 15 },
          { sku: 'MEN-PT-001-32-NVY', size: '32', color: 'Navy', stock: 15 },
        ],
      },
      {
        name: 'Floral Summer Dress',
        slug: 'floral-summer-dress',
        description: 'A beautiful floral print summer dress, perfect for warm days.',
        shortDescription: 'Beautiful floral summer dress',
        price: 79.99,
        salePrice: 59.99,
        sku: 'WMN-DR-001',
        categoryId: womenDresses.id,
        brand: 'WebCloth',
        stock: 50,
        isFeatured: true,
        tags: JSON.stringify(['floral', 'summer', 'casual']),
        materials: JSON.stringify(['100% Viscose']),
        careInstructions: 'Hand wash cold, do not tumble dry',
        fitType: 'Regular',
        occasion: 'Casual',
        images: [
          { url: '/images/products/dress-1.jpg', altText: 'Floral Summer Dress', isPrimary: true },
          { url: '/images/products/dress-2.jpg', altText: 'Floral Summer Dress Detail' },
        ],
        variants: [
          { sku: 'WMN-DR-001-XS-FLR', size: 'XS', color: 'Floral', stock: 10 },
          { sku: 'WMN-DR-001-S-FLR', size: 'S', color: 'Floral', stock: 15 },
          { sku: 'WMN-DR-001-M-FLR', size: 'M', color: 'Floral', stock: 15 },
          { sku: 'WMN-DR-001-L-FLR', size: 'L', color: 'Floral', stock: 10 },
        ],
      },
      {
        name: 'Silk Blend Blouse',
        slug: 'silk-blend-blouse',
        description: 'Elegant silk blend blouse for a sophisticated look.',
        shortDescription: 'Elegant silk blend blouse',
        price: 89.99,
        sku: 'WMN-TP-001',
        categoryId: womenTops.id,
        brand: 'WebCloth',
        stock: 40,
        tags: JSON.stringify(['silk', 'elegant', 'formal']),
        materials: JSON.stringify(['70% Silk', '30% Polyester']),
        careInstructions: 'Dry clean only',
        fitType: 'Regular',
        occasion: 'Formal',
        images: [
          { url: '/images/products/blouse-1.jpg', altText: 'Silk Blend Blouse', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-TP-001-XS-IVR', size: 'XS', color: 'Ivory', stock: 10 },
          { sku: 'WMN-TP-001-S-IVR', size: 'S', color: 'Ivory', stock: 10 },
          { sku: 'WMN-TP-001-M-IVR', size: 'M', color: 'Ivory', stock: 10 },
          { sku: 'WMN-TP-001-XS-BLK', size: 'XS', color: 'Black', stock: 10 },
        ],
      },
      {
        name: 'Kids Graphic T-Shirt',
        slug: 'kids-graphic-tshirt',
        description: 'Fun graphic t-shirt for kids with colorful prints.',
        shortDescription: 'Fun graphic t-shirt for kids',
        price: 19.99,
        sku: 'KID-TS-001',
        categoryId: kidsTops.id,
        brand: 'WebCloth',
        stock: 80,
        ageGroup: 'Kids',
        tags: JSON.stringify(['kids', 'graphic', 'casual']),
        materials: JSON.stringify(['100% Cotton']),
        careInstructions: 'Machine wash cold, tumble dry low',
        fitType: 'Regular',
        images: [
          { url: '/images/products/kids-tshirt-1.jpg', altText: 'Kids Graphic T-Shirt', isPrimary: true },
        ],
        variants: [
          { sku: 'KID-TS-001-4-BLU', size: '4Y', color: 'Blue', stock: 20 },
          { sku: 'KID-TS-001-6-BLU', size: '6Y', color: 'Blue', stock: 20 },
          { sku: 'KID-TS-001-8-BLU', size: '8Y', color: 'Blue', stock: 20 },
          { sku: 'KID-TS-001-10-BLU', size: '10Y', color: 'Blue', stock: 20 },
        ],
      },
      {
        name: 'Kids Denim Shorts',
        slug: 'kids-denim-shorts',
        description: 'Classic denim shorts for kids, durable and comfortable.',
        shortDescription: 'Classic denim shorts for kids',
        price: 24.99,
        sku: 'KID-SH-001',
        categoryId: kidsBottoms.id,
        brand: 'WebCloth',
        stock: 60,
        ageGroup: 'Kids',
        tags: JSON.stringify(['kids', 'denim', 'summer']),
        materials: JSON.stringify(['100% Cotton Denim']),
        careInstructions: 'Machine wash cold, tumble dry low',
        fitType: 'Regular',
        images: [
          { url: '/images/products/kids-shorts-1.jpg', altText: 'Kids Denim Shorts', isPrimary: true },
        ],
        variants: [
          { sku: 'KID-SH-001-4-DNM', size: '4Y', color: 'Denim', stock: 15 },
          { sku: 'KID-SH-001-6-DNM', size: '6Y', color: 'Denim', stock: 15 },
          { sku: 'KID-SH-001-8-DNM', size: '8Y', color: 'Denim', stock: 15 },
          { sku: 'KID-SH-001-10-DNM', size: '10Y', color: 'Denim', stock: 15 },
        ],
      },
    ];

    // Create products
    for (const productData of products) {
      const { images, variants, ...productInfo } = productData;

      const product = await prisma.product.create({
        data: {
          ...productInfo,
          images: {
            create: images.map((img, idx) => ({
              url: img.url,
              altText: img.altText,
              position: idx,
              isPrimary: img.isPrimary || idx === 0,
            })),
          },
          variants: {
            create: variants.map(v => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              stock: v.stock,
            })),
          },
        },
      });

      console.log(`Created product: ${product.name}`);
    }

    // Create sample coupon
    await prisma.coupon.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: {
        code: 'WELCOME10',
        description: 'Welcome discount for new customers',
        type: 'PERCENTAGE',
        value: 10,
        minOrderAmount: 50,
        maxDiscount: 20,
        usageLimit: 1000,
        isActive: true,
      },
    });

    await prisma.coupon.upsert({
      where: { code: 'FREESHIP' },
      update: {},
      create: {
        code: 'FREESHIP',
        description: 'Free shipping on orders over $75',
        type: 'FREE_SHIPPING',
        value: 0,
        minOrderAmount: 75,
        isActive: true,
      },
    });

    console.log('Created sample coupons');

    // Create static pages
    const pages = [
      {
        title: 'About Us',
        slug: 'about-us',
        content: '<h1>About WebCloth</h1><p>WebCloth is your destination for quality clothing for the whole family.</p>',
        excerpt: 'Learn about WebCloth and our mission.',
      },
      {
        title: 'Contact Us',
        slug: 'contact-us',
        content: '<h1>Contact Us</h1><p>Email: support@webcloth.com</p><p>Phone: 1-800-WEBCLOTH</p>',
        excerpt: 'Get in touch with our customer support team.',
      },
      {
        title: 'Size Guide',
        slug: 'size-guide',
        content: '<h1>Size Guide</h1><p>Find your perfect fit with our comprehensive size guide.</p>',
        excerpt: 'Find your perfect size.',
      },
      {
        title: 'Return Policy',
        slug: 'return-policy',
        content: '<h1>Return Policy</h1><p>We offer 30-day returns on all unworn items with tags attached.</p>',
        excerpt: 'Learn about our return policy.',
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>',
        excerpt: 'Our commitment to your privacy.',
      },
    ];

    for (const page of pages) {
      await prisma.page.upsert({
        where: { slug: page.slug },
        update: {},
        create: page,
      });
    }

    console.log('Created static pages');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();