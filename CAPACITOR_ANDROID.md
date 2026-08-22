# غلاف Android البعيد لـ N&A HUB

يحمّل التطبيق `https://na-hub.online` مباشرة من خلال `server.url` في
`capacitor.config.ts`. مجلد `capacitor-shell/` لا يحتوي نسخة من React؛ يحتوي فقط
صفحة محلية صغيرة تظهر عند تعذر الاتصال.

## الأوامر

من جذر المشروع:

```powershell
# 1) تثبيت الاعتماديات
npm install

# 2) إضافة Android لأول مرة فقط (المجلد موجود حاليًا، فلا تكرر هذا الأمر)
npm run cap:add:android

# بعد أي تعديل في إعداد Capacitor أو الإضافات الأصلية
npm run cap:sync

# 3) فتح المشروع في Android Studio
npm run cap:open

# 4) APK تجريبي قابل للتثبيت اليدوي
npm run android:apk:debug
```

مسار الناتج التجريبي:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

للتوزيع الحقيقي، استخدم مفتاح توقيع ثابت من Android Studio:
`Build > Generate Signed App Bundle or APK > APK`. لا تفقد المفتاح؛ أي تحديث APK
لاحق يجب توقيعه بالمفتاح نفسه كي يقبله Android كتحديث للتطبيق المثبت.

يمكن أيضًا إنشاء release غير موقع/بحسب إعداد التوقيع الحالي بالأمر:

```powershell
npm run android:apk:release
```

## تحديث واجهة React

ابنِ وانشر الموقع كالمعتاد:

```powershell
npm run build
```

لا يلزم `cap sync` ولا APK جديد لتعديلات React المنشورة على النطاق. يلزم APK جديد
عند تغيير كود Android أو قائمة الإضافات/الصلاحيات أو `capacitor.config.ts`.

## واجهة JavaScript إلى Native

عند التشغيل داخل APK فقط، تتوفر `window.NAHubNative` وفيها:

- `pickImage({ source: 'prompt' | 'camera' | 'photos' })`
- `getCurrentPosition(options)`
- `requestNotificationPermission()`
- `scheduleLocalNotification(notification)`
- `registerPushNotifications()`
- `openExternalUrl(url)`

لا تُطلب الصلاحيات عند فتح التطبيق؛ تُطلب فقط عند استدعاء الميزة. تصل أحداث push
إلى الصفحة بالأسماء التالية:

```text
nahub:native:push-registration
nahub:native:push-error
nahub:native:push-received
nahub:native:push-action
```

رفع الصور الحالي باستخدام `<input type="file">` بقي كما هو ويستخدم Android Photo
Picker. لا توجد صلاحية تخزين عامة، ولا تُحفظ صور الكاميرا في المعرض تلقائيًا.

## إعداد App Links للمصادقة

المشروع يعلن `https://na-hub.online/*` كـAndroid App Link كي تعود روابط تسجيل
الدخول من المتصفح إلى التطبيق. لإتمام التحقق بعد توقيع release:

1. احصل على SHA-256 لشهادة التوقيع:

   ```powershell
   keytool -list -v -keystore PATH_TO_RELEASE_KEYSTORE -alias YOUR_ALIAS
   ```

2. انسخ `android/app-links/assetlinks.json.example` إلى الموقع بهذا المسار:
   `https://na-hub.online/.well-known/assetlinks.json`.
3. استبدل القيمة المؤقتة ببصمة SHA-256 ثم تأكد أن الملف يُخدم مباشرة عبر HTTPS
   بنوع محتوى JSON ومن دون تحويل نطاق.

من دون هذا الملف سيبقى الموقع يعمل داخل الغلاف، لكن عودة OAuth من متصفح النظام
إلى التطبيق ليست مضمونة على Android الحديث.

## إشعارات Push

الإضافة الأصلية جاهزة، لكن استقبال Push يتطلب إعداد Firebase خاص بالمشروع:

1. أنشئ تطبيق Android بالمعرّف `online.nahub.app` في Firebase.
2. ضع `google-services.json` في `android/app/google-services.json`.
3. عند وصول حدث `nahub:native:push-registration`، أرسل `event.detail.value` إلى
   backend واحفظه للمستخدم، ثم أرسل الإشعارات من backend عبر FCM.

لا يمكن للـAPK اختراع إعداد Firebase أو مسار backend لتخزين token؛ لذلك التسجيل
لا يبدأ تلقائيًا ولا تظهر نافذة صلاحية بلا طلب صريح من الواجهة.

## ملاحظات الأمان والتوافق

- Capacitor نفسه يصف `server.url` بأنه مخصص أساسًا للـlive reload وليس خيار الإنتاج
  الموصى به. هذا المشروع يستخدمه عمدًا لتحقيق بنية الغلاف البعيد المطلوبة.
- أي اختراق/XSS في الموقع البعيد قد يحاول استدعاء الإضافات الأصلية. لذلك القائمة
  محصورة، والاتصال HTTPS فقط، وmixed content والـlegacy bridge وتعطيل فحص WebView
  في release غير مفعلة.
- يجب أن تبقى JavaScript المنشورة متوافقة مع إصدار الإضافات داخل أقدم APK ما زال
  لدى المستخدمين. إضافة plugin جديد أو تغيير native API يتطلب APK جديدًا.
- لا يعمل التطبيق بلا إنترنت لأن React ليست مضمّنة؛ تظهر فقط صفحة إعادة المحاولة.
