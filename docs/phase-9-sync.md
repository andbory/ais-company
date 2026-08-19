# Phase 9 — أساس المزامنة

## النطاق المنفذ

تم إنشاء طبقة الخادم الخاصة بالمزامنة:

- التحقق من mutations والكيانات والعمليات.
- دفعات push بحد أقصى 50 mutation.
- `mutationId` فريد لمنع التكرار عند إعادة الإرسال.
- حالات `PENDING` و`PROCESSING` و`ACKNOWLEDGED` و`FAILED` محفوظة في PostgreSQL.
- pull باستخدام cursor زمني وبحد أقصى 100 نتيجة.
- acknowledge مقيّد بالمستخدم صاحب الـ mutation.
- صلاحيات `sync:read` و`sync:write` على الخادم.

المسارات:

- `POST /api/sync/push`
- `GET /api/sync/pull?cursor=...`
- `POST /api/sync/acknowledge`

## قرار معماري

ينفذ الخادم mutations المعروفة للجهات والحوالات والتسويات، ويستخدم UUID الخاص بالكيان و`mutationId` لمنع التكرار. فشل التطبيق يحفظ في `FAILED` مع رسالة مختصرة ومحاولة جديدة تعيد المعالجة بدلاً من إنشاء mutation جديدة.

لم تُضف بعد قاعدة IndexedDB أو Service Worker؛ وسيكون ذلك ضمن شريحة PWA/العميل اللاحقة.

لا يدّعي النظام مزامنة خلفية مستمرة على iOS.
