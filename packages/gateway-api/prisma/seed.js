import { PrismaClient } from '@prisma/client';
import { passwordService } from '@shared/core/auth';

const prisma = new PrismaClient();

// Persian names for generating realistic user data
const persianFirstNames = [
  'احمد', 'علی', 'محمد', 'حسن', 'حسین', 'رضا', 'مهدی', 'امیر', 'محسن', 'داود',
  'فریدون', 'کیوان', 'بهرام', 'آرش', 'سینا', 'پویا', 'سعید', 'مسعود', 'ناصر', 'فرهاد',
  'مریم', 'فاطمه', 'زهرا', 'عایشه', 'سمیرا', 'نسیم', 'نرگس', 'شیرین', 'پروین', 'گلناز',
  'سارا', 'نیلوفر', 'مینا', 'رویا', 'لیلا', 'نازنین', 'مهناز', 'فریبا', 'سوسن', 'نگار',
  'اصغر', 'اکبر', 'عباس', 'ابراهیم', 'اسماعیل', 'یوسف', 'موسی', 'عیسی', 'سلیمان', 'ایوب',
  'خدیجه', 'رقیه', 'ام کلثوم', 'زینب', 'معصومه', 'طاهره', 'صدیقه', 'کریمه', 'بتول', 'سکینه'
];

const persianLastNames = [
  'احمدی', 'محمدی', 'علی‌زاده', 'حسینی', 'رضایی', 'مرادی', 'کریمی', 'جعفری', 'نوری', 'صالحی',
  'قاسمی', 'حسن‌زاده', 'محمودی', 'سعیدی', 'ملکی', 'شریفی', 'طاهری', 'نظری', 'فتحی', 'باقری',
  'زارعی', 'کاظمی', 'ابراهیمی', 'یوسفی', 'مولایی', 'فراهانی', 'اصفهانی', 'تهرانی', 'شیرازی', 'تبریزی',
  'خسروی', 'هاشمی', 'موسوی', 'جوادی', 'سجادی', 'رضوی', 'علوی', 'فاطمی', 'کاشانی', 'یزدی',
  'مشهدی', 'کرمانی', 'گیلانی', 'مازندرانی', 'خوزستانی', 'فارسی', 'لرستانی', 'همدانی', 'زنجانی', 'قزوینی'
];

const iranianStreetNames = [
  'خیابان ولیعصر', 'خیابان انقلاب', 'خیابان آزادی', 'خیابان امام خمینی', 'خیابان شهید بهشتی',
  'خیابان مطهری', 'خیابان کریمخان زند', 'خیابان فردوسی', 'خیابان حافظ', 'خیابان سعدی',
  'خیابان مولوی', 'خیابان دکتر شریعتی', 'خیابان دماوند', 'خیابان ستارخان', 'خیابان میرداماد',
  'خیابان نیاوران', 'خیابان پاسداران', 'خیابان شهید چمران', 'خیابان جمهوری', 'خیابان آپادانا'
];

const iranianCities = [
  'تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم', 'کرمانشاه', 'ارومیه',
  'زاهدان', 'رشت', 'کرمان', 'همدان', 'یزد', 'اردبیل', 'بندرعباس', 'اراک', 'ایلام', 'قزوین',
  'زنجان', 'گرگان', 'ساری', 'خرم‌آباد', 'سنندج', 'بیرجند', 'بوشهر', 'سمنان', 'یاسوج', 'شهرکرد'
];

const iranianProvinces = [
  'تهران', 'خراسان رضوی', 'اصفهان', 'فارس', 'آذربایجان شرقی', 'البرز', 'خوزستان', 'قم', 'کرمانشاه', 'آذربایجان غربی',
  'سیستان و بلوچستان', 'گیلان', 'کرمان', 'همدان', 'یزد', 'اردبیل', 'هرمزگان', 'مرکزی', 'ایلام', 'قزوین',
  'زنجان', 'گلستان', 'مازندران', 'لرستان', 'کردستان', 'خراسان جنوبی', 'بوشهر', 'سمنان', 'کهگیلویه و بویراحمد', 'چهارمحال و بختیاری'
];

const genders = ['مرد', 'زن', 'ترجیح می‌دهم نگویم'];

// Helper functions
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomAge() {
  return Math.floor(Math.random() * (65 - 18 + 1)) + 18; // Age between 18-65
}

function getRandomPhoneNumber() {
  // Iranian phone number format
  const operators = ['091', '092', '093', '094', '099', '090'];
  const operator = getRandomItem(operators);
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `+98${operator}${number}`;
}

function getRandomBirthday(age) {
  // Use Persian calendar year approximation
  const currentYear = 1403; // Current Persian year (approximate)
  const birthYear = currentYear - age;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  
  // Convert to Gregorian date (approximate conversion)
  const gregorianYear = birthYear + 621;
  return new Date(gregorianYear, month - 1, day);
}

function getRandomAddress() {
  const plateNumber = Math.floor(Math.random() * 999) + 1;
  const street = getRandomItem(iranianStreetNames);
  const city = getRandomItem(iranianCities);
  const province = getRandomItem(iranianProvinces);
  const postalCode = Math.floor(Math.random() * 90000) + 10000;
  return `${street}، پلاک ${plateNumber}، ${city}، ${province}، کد پستی: ${postalCode}`;
}

function createPersianEmail(firstName, lastName) {
  // Transliterate Persian names to English for email
  const persianToEnglish = {
    'احمد': 'ahmad', 'علی': 'ali', 'محمد': 'mohammad', 'حسن': 'hasan', 'حسین': 'hossein',
    'رضا': 'reza', 'مهدی': 'mehdi', 'امیر': 'amir', 'محسن': 'mohsen', 'داود': 'davood',
    'فریدون': 'fereydoon', 'کیوان': 'keyvan', 'بهرام': 'bahram', 'آرش': 'arash', 'سینا': 'sina',
    'پویا': 'pooya', 'سعید': 'saeed', 'مسعود': 'masood', 'ناصر': 'naser', 'فرهاد': 'farhad',
    'مریم': 'maryam', 'فاطمه': 'fatemeh', 'زهرا': 'zahra', 'عایشه': 'aysheh', 'سمیرا': 'samira',
    'نسیم': 'nasim', 'نرگس': 'narges', 'شیرین': 'shirin', 'پروین': 'parvin', 'گلناز': 'golnaz',
    'سارا': 'sara', 'نیلوفر': 'niloofar', 'مینا': 'mina', 'رویا': 'roya', 'لیلا': 'leila',
    'نازنین': 'nazanin', 'مهناز': 'mahnaz', 'فریبا': 'fariba', 'سوسن': 'susan', 'نگار': 'negar',
    'احمدی': 'ahmadi', 'محمدی': 'mohammadi', 'علی‌زاده': 'alizadeh', 'حسینی': 'hosseini', 'رضایی': 'rezaei',
    'مرادی': 'moradi', 'کریمی': 'karimi', 'جعفری': 'jafari', 'نوری': 'noori', 'صالحی': 'salehi'
  };
  
  const englishFirst = persianToEnglish[firstName] || firstName.toLowerCase();
  const englishLast = persianToEnglish[lastName] || lastName.toLowerCase();
  const randomNum = Math.floor(Math.random() * 10000);
  
  return `${englishFirst}.${englishLast}${randomNum}@example.com`;
}

async function main() {
  console.log('🌱 شروع پر کردن پایگاه داده با کاربران ایرانی...');

  // First, create the 'user' role if it doesn't exist
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'نقش کاربر عادی با دسترسی‌های پایه',
      isActive: true,
    },
  });

  console.log('✅ نقش کاربر ایجاد/تایید شد');

  // Generate 400 mock Iranian users
  const users = [];
  const emails = new Set(); // To ensure unique emails

  for (let i = 0; i < 400; i++) {
    const firstName = getRandomItem(persianFirstNames);
    const lastName = getRandomItem(persianLastNames);
    const age = getRandomAge();
    
    // Generate unique email
    let email;
    do {
      email = createPersianEmail(firstName, lastName);
    } while (emails.has(email));
    emails.add(email);

    const hashedPassword = await passwordService.hashPassword('password123'); // Default password for all mock users

    users.push({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber: Math.random() > 0.1 ? getRandomPhoneNumber() : null, // 90% have phone numbers
      birthday: Math.random() > 0.2 ? getRandomBirthday(age) : null, // 80% have birthdays
      address: Math.random() > 0.15 ? getRandomAddress() : null, // 85% have addresses
      age,
      gender: Math.random() > 0.1 ? getRandomItem(genders) : null, // 90% specify gender
      isActive: Math.random() > 0.05, // 95% are active
      isVerified: Math.random() > 0.3, // 70% are verified
      lastLogin: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null, // 60% have recent login
    });
  }

  console.log('📝 اطلاعات 400 کاربر ایرانی تولید شد');

  // Insert users in batches to avoid overwhelming the database
  const batchSize = 50;
  const createdUsers = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    console.log(`🔄 درج دسته ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}...`);
    
    for (const userData of batch) {
      const user = await prisma.user.create({
        data: userData,
      });
      createdUsers.push(user);
    }
  }

  console.log('👥 همه کاربران با موفقیت ایجاد شدند');

  // Assign 'user' role to all created users
  console.log('🔗 تخصیص نقش کاربر...');
  
  for (const user of createdUsers) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: userRole.id,
      },
    });
  }

  console.log('✅ پر کردن پایگاه داده با موفقیت تکمیل شد!');
  console.log(`📊 خلاصه:`);
  console.log(`   - ${createdUsers.length} کاربر ایرانی ایجاد شد`);
  console.log(`   - همه کاربران نقش 'user' دریافت کردند`);
  console.log(`   - رمز عبور پیش‌فرض همه کاربران: 'password123'`);
  console.log(`   - شامل نام‌های فارسی، آدرس‌های ایرانی و شماره تلفن‌های ایرانی`);
}

main()
  .catch((e) => {
    console.error('❌ خطا در هنگام پر کردن پایگاه داده:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });