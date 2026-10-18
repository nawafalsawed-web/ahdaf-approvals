# منصة التعميد · أهداف

صفحة لكل حملة: المحتوى كما يظهر على المنصات، والاعتماد والملاحظات تنحفظ في Firestore (`ahdaf-influencers`, collection `approvals`, id `<slug>__<item>`).

- `index.html` الحملات الحالية والسابقة (من `campaigns.json`)
- `campaign.html?c=<slug>` صفحة التعميد
- `approved.html?c=<slug>` المعتمد فقط مع نسخ الكابشن والتحميل والتعميد النهائي
- `campaigns/<slug>/campaign.json` بيانات الحملة: المنصات، المقاطع، المنشورات، الجدول

## حملة جديدة

من المنصة: `admin.html` (إدارة الحملات). يحتاج مفتاح GitHub بصلاحية Contents على هذا الريبو، ينحفظ في المتصفح. المقاطع تتصغّر لـ720p في المتصفح (mediabunny) وكل الحفظ commit واحد عبر Git Data API.

أو من الجهاز:

    python3 tools/new_campaign.py SLUG "العنوان" ~/path/to/finals --platforms tt,ig,snap --client "العميل" --date "نوفمبر 2026"

بعدها عدّل الكابشنات (`t`) في `campaign.json` وادفع. المنصات: `tt` `ig` `snap` `x` `li`.
لنقل حملة للسابقة غيّر `status` إلى `archived` في `campaigns.json` و`campaign.json`.
