# AIS COMPANY — REQUIREMENTS TRACEABILITY MATRIX

| ID | المتطلب | المكون | المرحلة | الاختبار |
|---|---|---|---|---|
| REQ-001 | ثلاثة أنواع جهات فقط | Party domain / DB | 2,5 | PARTY-001 |
| REQ-002 | حساب واحد لكل جهة | Party + Account service | 2,5,8 | PARTY-002 |
| REQ-003 | العملات الخمس وعزلها | Financial engine / DB | 2,3 | FIN-011 |
| REQ-004 | amount + commission = total | Transfer service | 3,6 | FIN-002, FIN-014 |
| REQ-005 | أثر sent/received واضح | Ledger effect | 3,6 | FIN-002, FIN-003 |
| REQ-006 | تسويات partial/full/over | Settlement service | 3,7 | FIN-004..FIN-006 |
| REQ-007 | أرصدة مشتقة وقابلة للتتبع | Statement service | 3,8 | FIN-001..FIN-012 |
| REQ-008 | UUID منفصل عن business number | DB / numbering | 2,6,7 | FIN-017 |
| REQ-009 | Offline database | IndexedDB repository | 11 | OFFLINE-001..010 |
| REQ-010 | automatic sync | Sync engine/API | 12 | SYNC-001..008 |
| REQ-011 | no duplicate on retry | Idempotency | 12 | FIN-015 |
| REQ-012 | audit on edit/delete | Audit service | 3,7,15 | FIN-009, FIN-010 |
| REQ-013 | fixed AIS/User roles | Auth/API | 4,15 | SEC-001..006 |
| REQ-014 | reports | Reports API/UI | 9 | REPORT-001..005 |
| REQ-015 | A4/thermal/PDF/Excel | Export layer | 10 | PRINT-001..004 |
| REQ-016 | PWA install/cache | Service worker | 13 | PWA-001..004 |
| REQ-017 | responsive RTL UI | Design system/UI | 16 | UI-001..008 |
| REQ-018 | PostgreSQL backup | Operations | 14,18 | OPS-001..004 |

الحالة الحالية لكل المتطلبات: `Phase 0 — قيد التثبيت`، ولا يعتبر أي متطلب منفذاً قبل اجتياز بوابة مرحلته.

