# Phase 12 — النشر

## أوامر الإنتاج

1. تثبيت الاعتماديات:

```bash
npm ci
```

2. تطبيق migrations:

```bash
npm run prisma:deploy
```

3. بناء الواجهة والخادم:

```bash
npm run build:all
```

4. تشغيل الخادم الإنتاجي:

```bash
npm start
```

الخادم يخدم واجهة `dist` وAPI على المنفذ الموجود في `PORT`، والافتراضي `3001`.

## متطلبات التشغيل

- Node.js متوافق مع المشروع.
- PostgreSQL متاح عبر `DATABASE_URL`.
- ملف `.env` حقيقي مبني على `.env.example`، ولا يُحفظ في المستودع.
- `pg_dump` مطلوب فقط عند استخدام النسخ الاحتياطي.

## نتيجة التحقق

- `npm run build:all` ناجح.
- Prisma runtime يُنسخ إلى `dist-server` تلقائياً.
- تشغيل الخادم الإنتاجي ناجح.
- طلب الواجهة من `http://localhost:3001/` أعاد HTTP 200.
- طلب API من الخادم الإنتاجي أعاد HTTP 200.
- لا يعتمد التشغيل الإنتاجي على Vite Development Server.

لم يتم إنشاء EXE أو Installer؛ هذه المرحلة جهزت نسخة الويب الإنتاجية الحالية فقط.
