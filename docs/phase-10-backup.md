# Phase 10 — النسخ الاحتياطي

## النطاق المنفذ

تمت إضافة خدمة نسخ احتياطي PostgreSQL باستخدام `pg_dump`، مع حفظ metadata في `ais_backup_metadata`.

المسارات:

- `GET /api/backups`: عرض آخر 50 نسخة للمدير.
- `POST /api/backups`: إنشاء نسخة PostgreSQL للمدير.

## الضوابط

- الإخراج بصيغة PostgreSQL custom dump.
- اسم الملف يُولّد من UUID ولا يقبل مساراً من المستخدم.
- مجلد الحفظ يحدد عبر `BACKUP_DIRECTORY`.
- يمكن تحديد مسار `pg_dump` عبر `PG_DUMP_PATH`.
- كلمة مرور PostgreSQL لا تُمرر ضمن arguments؛ تُمرر إلى العملية عبر `PGPASSWORD` ولا تُسجل.
- يتم حفظ الحجم وSHA-256 checksum وحالة `RUNNING` أو `COMPLETED` أو `FAILED`.
- كل محاولة تسجل في `AuditLog`.
- لا توجد عملية حذف تلقائي أو استعادة تلقائية في هذه المرحلة.

إذا لم يكن `pg_dump` مثبتاً أو غير موجود في PATH، تسجل العملية كـ `FAILED` برسالة واضحة ولا تُعتبر النسخة ناجحة.
