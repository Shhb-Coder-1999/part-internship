# صفحه‌بندی API کاربران (Users Pagination)

## بله! API دریافت کاربران دارای صفحه‌بندی کامل است ✅

### ویژگی‌های صفحه‌بندی

#### 1. پارامترهای صفحه‌بندی اصلی
- `page` - شماره صفحه (پیش‌فرض: 1)
- `limit` - تعداد کاربران در هر صفحه (پیش‌فرض: 20، حداکثر: 100)

#### 2. فیلترهای جستجو
- `search` - جستجو در نام، نام خانوادگی و ایمیل
- `isActive` - فیلتر بر اساس وضعیت فعال بودن
- `isVerified` - فیلتر بر اساس وضعیت تایید شده

## نمونه‌های استفاده

### 1. دریافت صفحه اول (20 کاربر)
```bash
GET /api/users
Authorization: Bearer <token>
```

### 2. دریافت صفحه دوم با 10 کاربر
```bash
GET /api/users?page=2&limit=10
Authorization: Bearer <token>
```

### 3. جستجو کاربران با نام "احمد"
```bash
GET /api/users?search=احمد&page=1&limit=5
Authorization: Bearer <token>
```

### 4. فیلتر کاربران فعال و تایید شده
```bash
GET /api/users?isActive=true&isVerified=true&limit=15
Authorization: Bearer <token>
```

### 5. ترکیب همه فیلترها
```bash
GET /api/users?page=3&limit=8&search=محمد&isActive=true
Authorization: Bearer <token>
```

## ساختار پاسخ

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "cm5j8k9l0m1n2o3p4q5r6s7t",
        "email": "mohammad.ahmadi1234@example.com",
        "firstName": "محمد",
        "lastName": "احمدی",
        "phoneNumber": "+9809123456789",
        "age": 28,
        "gender": "مرد",
        "address": "خیابان ولیعصر، پلاک 123، تهران، تهران، کد پستی: 12345",
        "birthday": "1995-03-15T00:00:00.000Z",
        "isActive": true,
        "isVerified": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
      // ... سایر کاربران
    ],
    "pagination": {
      "page": 2,           // صفحه فعلی
      "limit": 10,         // تعداد آیتم در صفحه
      "total": 400,        // تعداد کل کاربران
      "totalPages": 40     // تعداد کل صفحات
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## جزئیات پیاده‌سازی

### منطق صفحه‌بندی
- `skip = (page - 1) * limit` - تعداد رکوردهای رد شده
- `totalPages = Math.ceil(total / limit)` - محاسبه تعداد کل صفحات

### قابلیت‌های جستجو
- جستجو در سه فیلد: `firstName`, `lastName`, `email`
- جستجو case-insensitive (حساس به کوچک/بزرگ نیست)
- از عملگر `OR` استفاده می‌کند (در هر یک از فیلدها پیدا کند)

### محدودیت‌ها
- حداکثر 100 کاربر در هر صفحه
- حداقل صفحه: 1

## نمونه کد تست

```javascript
// تست صفحه‌بندی ساده
const response = await fetch('/api/users?page=1&limit=5', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(`صفحه ${data.data.pagination.page} از ${data.data.pagination.totalPages}`);
console.log(`${data.data.pagination.total} کاربر یافت شد`);

// تست جستجو
const searchResponse = await fetch('/api/users?search=علی&limit=3', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
});
```

## مثال کامل با cURL

```bash
# دریافت صفحه سوم با 5 کاربر فعال
curl -X GET "http://localhost:3000/api/users?page=3&limit=5&isActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# جستجوی کاربران با نام "فاطمه"
curl -X GET "http://localhost:3000/api/users?search=فاطمه&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## مزایای صفحه‌بندی پیاده‌سازی شده

✅ **کارایی بالا** - تنها داده‌های مورد نیاز لود می‌شود  
✅ **جستجوی قدرتمند** - در نام‌های فارسی و ایمیل  
✅ **فیلترهای مفید** - وضعیت فعال و تایید شده  
✅ **اطلاعات کامل** - شامل تعداد کل و صفحات  
✅ **محدودیت امن** - حداکثر 100 آیتم در صفحه  
✅ **پشتیبانی فارسی** - جستجو در نام‌های فارسی کار می‌کند

## دسترسی امنیتی

- تمام endpoint ها نیاز به احراز هویت دارند
- کاربران با نقش 'user' می‌توانند تمام کاربران را مشاهده کنند
- کاربران فقط پروفایل خودشان را می‌توانند ویرایش کنند (مگر ادمین)