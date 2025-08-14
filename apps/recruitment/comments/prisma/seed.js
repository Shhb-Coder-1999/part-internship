import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User'
    }
  });

  console.log('✅ User created:', user.email);

  // Create initial comments
  const comment1 = await prisma.comment.create({
    data: {
      userId: user.id,
      text: 'مقاله فوق‌العاده‌ای بود! تحلیل‌های شما درباره آینده هوش مصنوعی بسیار روشنگر بود و دیدگاه‌های جدیدی به من داد. بی‌صبرانه منتظر مقالات بعدی شما هستم.',
      likes: 5,
      dislikes: 2
    }
  });

  const comment2 = await prisma.comment.create({
    data: {
      userId: user.id,
      text: 'کاملاً موافقم! خصوصاً بخشی که به چالش‌های اخلاقی AI اشاره کردید، بسیار عمیق و به‌موقع بود. فکر می‌کنم این بحث‌ها باید بیشتر مطرح شوند.',
      likes: 3,
      dislikes: 0,
      parentId: comment1.id
    }
  });

  const comment3 = await prisma.comment.create({
    data: {
      userId: user.id,
      text: 'تحلیل‌ها عالی بود، اما ای کاش در مورد تأثیرات بلندمدت اقتصادی هوش مصنوعی بر بازار کار هم بیشتر توضیح می‌دادید. این جنبه برای من خیلی مهم است.',
      likes: 1,
      dislikes: 1,
      parentId: comment1.id
    }
  });

  const comment4 = await prisma.comment.create({
    data: {
      userId: user.id,
      text: 'از زمانی که این مقاله را خواندم، دیدگاهم نسبت به فناوری بلاک‌چین کاملاً عوض شد. آیا برنامه‌ای برای مقالات عمیق‌تر در این زمینه دارید؟ مشتاقانه منتظرم!',
      likes: 10,
      dislikes: 0
    }
  });

  const comment5 = await prisma.comment.create({
    data: {
      userId: user.id,
      text: 'متن بسیار روان و جذابی داشت. اطلاعات ارائه شده کاملاً کاربردی و قابل فهم بود, حتی برای کسانی که در این زمینه تخصص ندارند. دست مریزاد!',
      likes: 7,
      dislikes: 1
    }
  });

  console.log('✅ Comments created:');
  console.log(`   - ${comment1.text.substring(0, 50)}...`);
  console.log(`   - ${comment2.text.substring(0, 50)}...`);
  console.log(`   - ${comment3.text.substring(0, 50)}...`);
  console.log(`   - ${comment4.text.substring(0, 50)}...`);
  console.log(`   - ${comment5.text.substring(0, 50)}...`);

  console.log('\n🎉 Database seeded successfully!');
  console.log(`📊 Total users: 1`);
  console.log(`📝 Total comments: 5`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
