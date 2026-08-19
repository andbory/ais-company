# AIS COMPANY — CORRECTED MASTER SPECIFICATION

## المرجعية

هذا المستند هو النسخة المصححة مبدئياً من نقطة 1 بعد تطبيق متطلبات المراجعة في نقطة 3. أي تغيير لاحق في قواعد مالية أو مزامنة يجب أن يوثق كقرار معماري ولا يطبق بصمت.

## القواعد غير القابلة للتغيير

1. النظام لإدارة وتوثيق الحوالات والحسابات والتسويات، وليس شبكة تحويل مصرفية.
2. الكيانات التجارية ثلاثة فقط: PERSON وOFFICE وCOMPANY.
3. كل جهة لها حساب واحد، والعملات مستقلة تماماً.
4. العملات الأولية فقط: USD، IQD، IRR/Toman، EUR، SAR.
5. لا تحويل عملات ولا أسعار صرف ولا جمع إجمالي بين عملات مختلفة.
6. كل حوالة تحتوي amount وcommission وtotal، وtotal يساوي مجموعهما.
7. الأرصدة مشتقة من opening balances والعمليات المسجلة، وليست أرقاماً قابلة للكتابة اليدوية.
8. كل نتيجة مالية قابلة للتتبع عبر كشف الحساب وسجل العمليات.
9. PostgreSQL هو المصدر المركزي، وIndexedDB هو المصدر المحلي المؤقت عند Offline.
10. المستخدمون الثابتون AIS وUser فقط، مع فرض الصلاحيات في الخادم.

## العمليات

الحوالة المرسلة تزيد `نطلبه`. الحوالة المستلمة تزيد `يطلبنا`. التسوية التي تدفعها الجهة إلى AIS تقلل `نطلبه`، والتسوية التي تدفعها AIS إلى الجهة تقلل `يطلبنا`. الزيادة عن الاتجاه الحالي تعكس الاتجاه تلقائياً.

## الهوية والأرقام

كل سجل يستخدم UUID داخلياً. business numbers هي P-، O-، C-، وS- مع unique constraints. الأرقام Offline تعتمد على NumberBlock محجوز مسبقاً من الخادم.

## دورة السجل المالي

إنشاء العملية يحسب الأثر داخل transaction. تعديل العملية يعيد حساب الأثر ويحفظ before/after. حذف العملية يكون soft delete مع reason ويخرجها من الحسابات النشطة ويحفظ AuditLog.

## Offline

IndexedDB، outbox، mutationId idempotency، retry/backoff، pull cursor، وacknowledgment. يبدأ sync تلقائياً عند عودة الاتصال أو فتح التطبيق أو بقاء التطبيق نشطاً. لا يدّعي النظام مزامنة غير محدودة في خلفية iOS.

## الحماية

Passwords hashed server-side، secrets في environment، HTTPS في الإنتاج، validation في الخادم، authorization لكل route، وrate limiting مناسب لتسجيل الدخول.

## الواجهة

واجهة AIS ذات التصميم الداكن Liquid Glass هي طبقة العرض الموحدة. التنقل الإداري: Dashboard، Transfers، Settlements، People، Offices، Companies، Reports، Settings. واجهة User تعرض Transfers وPeople وOffices وCompanies فقط. على الهاتف يتحول التنقل إلى bottom navigation، والجداول إلى قوائم بطاقات.

## مراحل التنفيذ

0. Requirements Freeze.
1. Foundation and contracts.
2. PostgreSQL schema and migrations.
3. Financial engine.
4. Authentication and authorization.
5. Party management.
6. Transfers.
7. Settlements.
8. Statements.
9. Reports.
10. Printing/export.
11. Offline local database.
12. Synchronization.
13. PWA.
14. Backups.
15. Security hardening.
16. Responsive QA.
17. Full testing.
18. Production deployment.

كل مرحلة لها عقد قبول، اختبارات، تقرير، وتوقف إلزامي قبل المرحلة التالية.

