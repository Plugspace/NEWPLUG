// ==============================================
// PLUGSPACE.IO TITAN v1.4 - DATABASE SEED
// ==============================================

import { prisma, Role, SubscriptionTier, ProjectStatus } from './client';

async function main() {
  console.info('🌱 Seeding database...');

  // Create master organization
  const masterOrg = await prisma.organization.upsert({
    where: { slug: 'plugspace-master' },
    update: {},
    create: {
      name: 'Plugspace Master',
      slug: 'plugspace-master',
      billingEmail: 'plugspaceapp@gmail.com',
      tier: SubscriptionTier.ENTERPRISE,
      maxProjects: 999999,
      maxUsers: 999999,
      maxStorage: 999999999999,
      maxApiCalls: 999999999,
    },
  });

  console.info(`✅ Created master organization: ${masterOrg.name}`);

  // Create master admin user (will be linked to Firebase on first login)
  const masterAdmin = await prisma.user.upsert({
    where: { email: 'plugspaceapp@gmail.com' },
    update: {},
    create: {
      firebaseUid: 'pending-firebase-uid',
      email: 'plugspaceapp@gmail.com',
      displayName: 'Master Admin',
      role: Role.MASTER_ADMIN,
      organizationId: masterOrg.id,
      subscriptionTier: SubscriptionTier.ENTERPRISE,
      creditsRemaining: 999999,
    },
  });

  console.info(`✅ Created master admin: ${masterAdmin.email}`);

  // Create sample templates
  const templateCategories = [
    'fashion',
    'food',
    'tech',
    'portfolio',
    'ecommerce',
    'blog',
    'agency',
    'saas',
    'restaurant',
    'fitness',
    'education',
    'medical',
  ];

  const templateData = {
    nav: {
      logo: 'Brand',
      links: [
        { text: 'Home', href: '/' },
        { text: 'Products', href: '/products' },
        { text: 'About', href: '/about' },
        { text: 'Contact', href: '/contact' },
      ],
    },
    hero: {
      headline: 'Welcome to Our Store',
      subheadline: 'Discover amazing products',
      cta: { text: 'Shop Now', href: '/products' },
    },
    colors: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#f59e0b',
      background: '#0a0a0a',
      text: '#ffffff',
    },
  };

  for (const category of templateCategories) {
    for (let i = 1; i <= 5; i++) {
      await prisma.template.upsert({
        where: {
          id: `seed-${category}-${i}`,
        },
        update: {},
        create: {
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Template ${i}`,
          category,
          type: i <= 2 ? 'product-grid' : i <= 4 ? 'hero-banner' : 'minimal',
          templateData,
          featured: i === 1,
          downloads: Math.floor(Math.random() * 1000),
          rating: 3.5 + Math.random() * 1.5,
          reviews: Math.floor(Math.random() * 100),
          previewImage: `https://picsum.photos/seed/${category}${i}/800/600`,
          thumbnailImage: `https://picsum.photos/seed/${category}${i}/400/300`,
        },
      });
    }
  }

  console.info(`✅ Created ${templateCategories.length * 5} sample templates`);

  // Create system config
  await prisma.systemConfig.upsert({
    where: { key: 'maintenance_mode' },
    update: {},
    create: {
      key: 'maintenance_mode',
      value: { enabled: false, message: '' },
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'feature_flags' },
    update: {},
    create: {
      key: 'feature_flags',
      value: {
        voice_enabled: true,
        ai_agents_enabled: true,
        multi_tenant: true,
        custom_domains: true,
        analytics_enabled: true,
      },
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'subscription_limits' },
    update: {},
    create: {
      key: 'subscription_limits',
      value: {
        FREE: {
          maxProjects: 3,
          maxUsers: 1,
          maxStorage: 104857600, // 100MB
          maxApiCalls: 100,
          customDomain: false,
        },
        PRO: {
          maxProjects: 25,
          maxUsers: 5,
          maxStorage: 5368709120, // 5GB
          maxApiCalls: 5000,
          customDomain: true,
        },
        ENTERPRISE: {
          maxProjects: 999999,
          maxUsers: 999999,
          maxStorage: 107374182400, // 100GB
          maxApiCalls: 999999,
          customDomain: true,
        },
      },
    },
  });

  console.info('✅ Created system config');

  // Create a sample demo organization and user
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      billingEmail: 'demo@example.com',
      tier: SubscriptionTier.PRO,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      firebaseUid: 'demo-firebase-uid',
      email: 'demo@example.com',
      displayName: 'Demo User',
      role: Role.USER,
      organizationId: demoOrg.id,
      subscriptionTier: SubscriptionTier.PRO,
    },
  });

  // Create sample project for demo
  await prisma.project.upsert({
    where: { subdomain: 'demo-fashion-store' },
    update: {},
    create: {
      name: 'Demo Fashion Store',
      description: 'A sample fashion e-commerce website',
      subdomain: 'demo-fashion-store',
      userId: demoUser.id,
      organizationId: demoOrg.id,
      status: ProjectStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  console.info('✅ Created demo organization and project');

  console.info('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
