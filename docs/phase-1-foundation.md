# AIS COMPANY — PHASE 1 FOUNDATION

## الهدف

تأسيس حدود واضحة للمشروع قبل إضافة قاعدة البيانات أو المحرك المالي أو المصادقة. هذه المرحلة لا تنشئ جداول PostgreSQL ولا تنفذ أي عملية مالية.

## طبقات المشروع

```text
src/                 واجهة React وطبقة العرض
src/foundation/      ثوابت وحدود تأسيسية مشتركة
server/              API وخدمات الخادم
prisma/              مخطط قاعدة البيانات في Phase 2
docs/                المواصفات والقرارات ومصفوفات الاختبار
```

## قواعد المرحلة

- الواجهة لا تتصل بقاعدة البيانات مباشرة.
- الحسابات المالية لا تكتب داخل مكونات React.
- لا تحفظ أسراراً داخل المستودع.
- لا يتم إنشاء Mock Data كمصدر بيانات.
- كل مرحلة لاحقة تستخدم عقوداً typed ومراجعة قابلة للاختبار.
- التصميم الحالي يبقى Prototype بصرياً حتى ربطه لاحقاً بالـ API.

## ملفات التأسيس

- `src/foundation/runtime.ts`: قراءة الإعدادات العامة غير السرية في الواجهة.
- `server/config/env.ts`: حدود قراءة متغيرات الخادم.
- `src/foundation/navigation.ts`: أسماء مساحات النظام وتهيئتها للصلاحيات لاحقاً.
- `docs/phase-0-review.md`: قرارات Phase 0.

## ما لم يدخل هذه المرحلة

- Prisma schema أو migrations.
- PostgreSQL queries.
- Authentication implementation.
- Financial calculations.
- Offline database.
- Synchronization.

## بوابة قبول Phase 1

- `npm run build` ينجح.
- الواجهة الحالية تفتح بدون أخطاء.
- لا توجد أسرار في ملفات الواجهة.
- حدود frontend/server موثقة.
- إعدادات الخادم تقرأ من environment فقط.
- لا يتم الانتقال إلى Phase 2 قبل تقرير اختبار واعتماد.

