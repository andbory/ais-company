# AIS COMPANY — PHASE 2 DATABASE

## النتيجة

تم إنشاء مخطط PostgreSQL عبر Prisma وتطبيق Migration:

`0002_ais_foundation`

حالة Prisma: `Database schema is up to date`.

## الجداول الجديدة

لأن قاعدة البيانات الحالية تحتوي جداول قديمة بأسماء عامة وغير متوافقة، تم عزل جداول AIS بأسماء تبدأ بـ `ais_` بدون حذف أو تعديل البيانات القديمة:

- `ais_users`
- `ais_devices`
- `ais_parties`
- `ais_person_profiles`
- `ais_office_profiles`
- `ais_company_profiles`
- `ais_opening_balances`
- `ais_transfers`
- `ais_settlements`
- `ais_ledger_effects`
- `ais_audit_logs`
- `ais_sync_mutations`
- `ais_number_blocks`
- `ais_backup_metadata`
- `ais_system_settings`

أسماء النماذج داخل Prisma بقيت واضحة مثل `User` و`Party` و`Transfer`، بينما يتم العزل في PostgreSQL عبر `@@map`.

## القيود المهمة

- UUID كمفتاح تقني.
- business number فريد للحوالات والتسويات.
- Decimal/Numeric بدقة مالية.
- `transfer.total = amount + commission` داخل PostgreSQL.
- منع amount وsettlement من الصفر أو القيم السالبة.
- عزل العملات عبر enum.
- Foreign keys مع `RESTRICT` للتاريخ المالي.
- `SET NULL` للمراجع غير الجوهرية مثل الجهاز والمستخدم.
- فهارس للبحث بالجهة والتاريخ والعملة والحالة.
- mutationId فريد لمنع التكرار في المزامنة.

## ملاحظة الانتقال

النماذج القديمة `Invoice` و`InvoiceItem` بقيت مؤقتاً حتى استبدال API القديم في مرحلة لاحقة. لا تستخدمها مكونات AIS الجديدة، وسيتم إنشاء Migration تنظيف منفصلة بعد اكتمال ترحيل الخادم القديم.

## الاختبارات المنفذة

- Prisma format: ناجح.
- Prisma validate: ناجح.
- Prisma generate: ناجح.
- Prisma migrate deploy: ناجح.
- Prisma migrate status: المخطط محدث.
- فحص الجداول الجديدة من PostgreSQL: ناجح.
- `npm run build`: ناجح.
- TypeScript server check: ناجح.

## خارج نطاق Phase 2

- لا يوجد seed للمستخدمين.
- لا يوجد API للحوالات.
- لا يوجد financial engine.
- لا يوجد authentication.
- لا يوجد IndexedDB أو sync worker.

