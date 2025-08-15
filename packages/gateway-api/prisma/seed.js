import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mock data arrays for generating realistic user data
const firstNames = [
  'Alexander', 'Sarah', 'Michael', 'Jessica', 'David', 'Ashley', 'Christopher', 'Amanda', 'Daniel', 'Stephanie',
  'James', 'Melissa', 'Robert', 'Nicole', 'John', 'Elizabeth', 'Joseph', 'Helen', 'Thomas', 'Deborah',
  'William', 'Dorothy', 'Richard', 'Lisa', 'Charles', 'Nancy', 'Matthew', 'Karen', 'Anthony', 'Betty',
  'Mark', 'Sandra', 'Donald', 'Donna', 'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon',
  'Kenneth', 'Michelle', 'Joshua', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const streetNames = [
  'Main Street', 'Oak Avenue', 'Park Road', 'Washington Street', 'Maple Avenue', 'First Street', 'Second Street',
  'Third Street', 'Fourth Street', 'Fifth Street', 'Elm Street', 'Pine Street', 'Cedar Avenue', 'Sunset Boulevard',
  'Lincoln Avenue', 'Jefferson Street', 'Adams Street', 'Madison Avenue', 'Monroe Street', 'Jackson Avenue'
];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
  'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco',
  'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Portland'
];

const states = [
  'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'NC', 'WA', 'CO', 'DC', 'MA', 'MI', 'OR'
];

const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// Helper functions
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomAge() {
  return Math.floor(Math.random() * (65 - 18 + 1)) + 18; // Age between 18-65
}

function getRandomPhoneNumber() {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+1-${areaCode}-${exchange}-${number}`;
}

function getRandomBirthday(age) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid invalid dates
  return new Date(birthYear, month - 1, day);
}

function getRandomAddress() {
  const houseNumber = Math.floor(Math.random() * 9999) + 1;
  const street = getRandomItem(streetNames);
  const city = getRandomItem(cities);
  const state = getRandomItem(states);
  const zipCode = Math.floor(Math.random() * 90000) + 10000;
  return `${houseNumber} ${street}, ${city}, ${state} ${zipCode}`;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // First, create the 'user' role if it doesn't exist
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Standard user role with basic permissions',
      isActive: true,
    },
  });

  console.log('✅ User role created/verified');

  // Generate 400 mock users
  const users = [];
  const emails = new Set(); // To ensure unique emails

  for (let i = 0; i < 400; i++) {
    const firstName = getRandomItem(firstNames);
    const lastName = getRandomItem(lastNames);
    const age = getRandomAge();
    
    // Generate unique email
    let email;
    do {
      const randomNum = Math.floor(Math.random() * 10000);
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`;
    } while (emails.has(email));
    emails.add(email);

    const hashedPassword = await bcrypt.hash('password123', 10); // Default password for all mock users

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

  console.log('📝 Generated 400 mock users data');

  // Insert users in batches to avoid overwhelming the database
  const batchSize = 50;
  const createdUsers = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    console.log(`🔄 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}...`);
    
    for (const userData of batch) {
      const user = await prisma.user.create({
        data: userData,
      });
      createdUsers.push(user);
    }
  }

  console.log('👥 All users created successfully');

  // Assign 'user' role to all created users
  console.log('🔗 Assigning user roles...');
  
  for (const user of createdUsers) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: userRole.id,
      },
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Created ${createdUsers.length} users`);
  console.log(`   - All users assigned 'user' role`);
  console.log(`   - Default password for all users: 'password123'`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });