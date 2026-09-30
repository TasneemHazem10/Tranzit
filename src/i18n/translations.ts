export type Language = 'ar' | 'en';

export type TranslationKeys = {
  // Common
  appName: string;
  loading: string;

  // Onboarding
  onboardingSlide1Title: string;
  onboardingSlide1Sub: string;
  onboardingSlide2Title: string;
  onboardingSlide2Sub: string;
  onboardingSlide3Title: string;
  onboardingSlide3Sub: string;
  onboardingNext: string;
  onboardingFinish: string;
  onboardingSkip: string;

  // Auth
  loginTitle: string;
  loginSubtitle: string;
  phonePlaceholder: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  loginBtn: string;
  orDivider: string;
  googleSignIn: string;
  noAccount: string;
  createAccount: string;
  hasAccount: string;
  loginLink: string;

  // Signup
  signupTitle: string;
  signupSubtitle: string;
  signupStep1: string;
  signupStep2: string;
  signupNext: string;
  signupBack: string;
  namePlaceholder: string;
  phoneMobilePlaceholder: string;
  confirmPasswordPlaceholder: string;
  termsAgree: string;
  termsRead: string;
  termsTitle: string;
  termsSubtitle: string;
  termsUpdated: string;
  termsDone: string;
  termsBack: string;
  signupBtn: string;

  // OTP
  otpTitle: string;
  otpSubtitle1: string;
  otpSubtitle2: string;
  otpCodeLabel: string;
  devCodeLabel: string;
  resendAfter: string;
  resendCode: string;
  sending: string;
  confirmCode: string;

  // Forgot Password
  forgotTitle: string;
  forgotSubtitle: string;
  forgotBtn: string;

  // Reset Password
  resetTitle: string;
  resetSubtitle: string;
  resetBtn: string;

  // Home
  activeChipSub: string;
  navHome: string;
  driverLabel: string;
  homeSheetTitle: string;
  pickupLabel: string;
  inTransitTitle: string;
  inTransitSub: string;
  cancelRequest: string;
  cancelRequestNote: string;
  cancelRequestSuccess: string;
  homeLocDetecting: string;
  homeLocRelocate: string;
  homeLocLive: string;

  // History
  historyTitle: string;
  historyCompleted: string;
  historyActive: string;
  historyCanceled: string;
  historyEmpty: string;
  historyEmptySub: string;
  historyViewInfo: string;

  // Call
  callConnecting: string;
  callInProgress: string;
  muteBtn: string;
  speakerBtn: string;
  videoBtn: string;
  endCall: string;

  // Booking
  bookingNewTitle: string;
  pickupTitle: string;
  pickupPlaceholder: string;
  dropoffTitle: string;
  dropoffPlaceholder: string;
  notes: string;
  next: string;
  egp: string;
  vehicleTitle: string;
  vehicleTricycle: string;
  vehicleMini: string;
  vehicleHalfLoad: string;
  vehicleQuarterLoad: string;
  packageTypeLabel: string;
  estTimeLabel: string;
  estTimeFallback: string;
  min: string;
  requestDriver: string;
  tripRequested: string;
  searchingDriverTitle: string;
  searchingDriverSub: string;

  // Package types
  packageSmall: string;
  packageMedium: string;
  packageLarge: string;

  // Fare / offers / bidding
  distanceLabel: string;
  waitingForDrivers: string;
  driverOffers: string;
  noOffersYet: string;
  simulateDriverOffer: string;
  offerDriverName: string;
  offerAmount: string;
  acceptOffer: string;
  declineOffer: string;
  offerAccepted: string;
  offerDeclined: string;
  offerAcceptedMsg: string;
  offerDeclinedMsg: string;
  bidYourPrice: string;
  bidOriginal: string;
  bidDecreaseLeft: string;
  bidDecrease: string;
  bidIncrease: string;
  waitingTimer: string;
  raiseFarePrompt: string;
  raiseFareAsk: string;
  raiseFareYes: string;
  raiseFareNo: string;
  raiseFareDone: string;
  km: string;

  // Track
  trackBack: string;
  orderId: string;
  now: string;
  confirmDelivery: string;
  rateShipment: string;
  viewDetails: string;
  simulateDev: string;

  // Status labels
  statusPending: string;
  statusAssigned: string;
  statusPickedUp: string;
  statusInTransit: string;
  statusDelivered: string;
  statusCanceled: string;

  // Timeline
  timelinePending: string;
  timelineAssigned: string;
  timelinePickedUp: string;
  timelineInTransit: string;
  timelineDelivered: string;
  timelineCanceled: string;

  // Confirm Delivery
  confirmDeliveryTitle: string;
  proofTitle: string;
  proofCapture: string;
  signatureTitle: string;
  signatureTap: string;
  signatureModalTitle: string;
  signaturePadText: string;
  signatureClear: string;
  signatureConfirm: string;
  submitDelivery: string;

  // Success
  successTitle: string;
  successTime: string;
  successTotal: string;
  successDriver: string;
  rateTitle: string;
  rateSub: string;
  rateThanks: string;
  rateBtn: string;
  homeBtn: string;

  // Wallet/online-payment keys removed — cash only
  cancel: string;

  // Location Picker
  locationPickerSearch: string;
  locationPickerNoResults: string;
  locationPickerSearchError: string;
  locationPickerMyLocation: string;
  locationPickerPermissionNeeded: string;
  locationPickerCurrentError: string;
  locationPickerSelected: string;
  locationPickerTapHint: string;
  confirmLocation: string;
  geocodingLoading: string;
  alertMapSelectFirst: string;

  // Alerts
  alertWarning: string;
  alertSuccess: string;
  alertErrorGeneric: string;
  alertServerConnection: string;
  alertOtpSent: string;
  alertOtpResent: string;
  alertResendFailed: string;
  alertCodeEmpty: string;
  alertTermsRequired: string;
  alertPhonePasswordWrong: string;
  alertNoAccount: string;
  alertGoogleFailed: string;
  alertInvalidPhone: string;
  alertFieldsEmpty: string;
  alertPickupDropoff: string;
  alertShipmentCreated: string;
  alertTrackNow: string;
  alertOk: string;
  alertYes: string;
  alertNo: string;
  logoutConfirm: string;
  alertEmailInvalid: string;
  alertDeliveryConfirm: string;
  alertSignatureEmpty: string;
  alertPermissionCamera: string;
  alertPermissionMedia: string;
  alertShipmentLoadError: string;
  alertAdvanceError: string;
  alertGoogleLoginFail: string;
  alertGoogleSignupFail: string;
  alertVerificationFailed: string;
  alertPasswordChanged: string;
  alertForgotError: string;
  alertResetError: string;
  alertOtpVerifyError: string;
  alertPhoneRequired: string;
  alertPhoneInvalid: string;
  alertPasswordRequired: string;
  alertPasswordMin: string;
  alertConfirmRequired: string;
  alertPasswordMismatch: string;
  alertNameRequired: string;
  alertNameShort: string;
  alertPhoneRequiredSignup: string;
  alertPhoneInvalidSignup: string;
  alertVerificationCodeRequired: string;

  // Profile
  profileTitle: string;
  profileAccountSection: string;
  profileSecuritySection: string;
  profileEditData: string;
  profileEditDataSub: string;
  profileChangePasswordSub: string;
  profileLanguage: string;
  profileLanguageSub: string;
  logout: string;
  editProfileTitle: string;
  changePasswordTitle: string;
  currentPasswordPlaceholder: string;
  newPasswordPlaceholder: string;
  confirmNewPasswordPlaceholder: string;
  saveBtn: string;
  profileSaved: string;
  passwordChanged: string;
  profileItem: string;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  profileChangePassword: string;
  profileCurrentPassword: string;
  profileNewPassword: string;
  profileConfirmPassword: string;
  profileSaveChanges: string;
  profilePasswordChanged: string;
  profileUpdated: string;
  profileCurrentPasswordWrong: string;

  // Menu
  menuHome: string;
  menuTrips: string;
  menuProfile: string;
  menuSettings: string;

  // Settings
  settingsTitle: string;
  settingsBack: string;
  settingsSectionGeneral: string;
  settingsDarkMode: string;
  settingsDarkModeSub: string;
  settingsLanguage: string;
  settingsLanguageSub: string;
  settingsNotifications: string;
  settingsNotificationsSub: string;
  settingsLangAr: string;
  settingsLangEn: string;

  // Cancel
  cancelShipment: string;
  cancelConfirm: string;
  cancelShipmentSuccess: string;
  cancelShipmentError: string;

  // Language
  languageToggle: string;
};

const ar: TranslationKeys = {
  appName: 'ترانزيت',
  loading: 'جارٍ التحميل...',

  onboardingSlide1Title: 'اطلب شحنتك في دقائق',
  onboardingSlide1Sub: 'حدد موقعك، استلم، واشحن طردك للمناسبة بسهولة.',
  onboardingSlide2Title: 'تتبع شحنتك لحظة بلحظة',
  onboardingSlide2Sub: 'توقع مكان شحنتك على الخريطة واستلم إشعارات بالتحديثات.',
  onboardingSlide3Title: 'ادفع نقداً عند الاستلام',
  onboardingSlide3Sub: 'ادفع كاش عند وصول شحنتك — بسيطة وسريعة بدون تعقيدات.',
  onboardingNext: 'استكمال',
  onboardingFinish: 'إبدأ الآن',
  onboardingSkip: 'تخطي',

  loginTitle: 'تسجيل دخول',
  loginSubtitle: 'سجل دخولك الآن وابدأ رحلتك',
  phonePlaceholder: 'رقم الهاتف',
  passwordPlaceholder: 'كلمة المرور',
  forgotPassword: 'نسيت كلمة المرور؟',
  loginBtn: 'تسجيل دخول',
  orDivider: 'أو',
  googleSignIn: 'التسجيل بواسطة جوجل',
  noAccount: 'ليس لديك حساب؟ ',
  createAccount: 'إنشاء حساب',
  hasAccount: 'لديك حساب بالفعل؟ ',
  loginLink: 'تسجيل دخول',

  signupTitle: 'أنشئ حسابك في ترانزيت',
  signupSubtitle: 'خطوة واحدة تفصلك عن طلب شحنتك',
  signupStep1: 'البيانات الشخصية',
  signupStep2: 'كلمة المرور',
  signupNext: 'متابعة',
  signupBack: 'رجوع',
  namePlaceholder: 'الاسم',
  phoneMobilePlaceholder: 'رقم الموبايل',
  confirmPasswordPlaceholder: 'تأكيد كلمة المرور',
  termsAgree: 'أوافق على الشروط والأحكام',
  termsRead: 'اقرأ كامل الشروط والأحكام',
  termsTitle: 'شروط وأحكام الاستخدام',
  termsSubtitle: 'وثيقة شروط وأحكام استخدام العميل لمنصة "ترانزيت"',
  termsUpdated: 'نسخة سارية اعتباراً من',
  termsDone: 'تمت القراءة',
  termsBack: 'رجوع',
  signupBtn: 'إنشاء حساب',

  otpTitle: 'أدخل كود التحقق',
  otpSubtitle1: 'تم إرسال كود مكوّن من 4 أرقام إلى رقم',
  otpSubtitle2: '',
  otpCodeLabel: 'الكود',
  devCodeLabel: 'كود التطوير:',
  resendAfter: 'إعادة الإرسال بعد 00:',
  resendCode: 'إعادة إرسال الكود',
  sending: 'جارٍ الإرسال...',
  confirmCode: 'تأكيد الكود',

  forgotTitle: 'نسيت كلمة المرور',
  forgotSubtitle: 'ما تقلقش، هستعدك ترجع حسابك في خطوات بسيطة.',
  forgotBtn: 'التالي',

  resetTitle: 'أنشئ حسابك في ترانزيت',
  resetSubtitle: 'اختر كلمة مرور جديدة لحسابك',
  resetBtn: 'التالي',

  activeChipSub: 'طلب #',
  navHome: 'الرئيسية',
  driverLabel: 'السائق',
  homeSheetTitle: 'اطلب شحنة جديدة',
  pickupLabel: 'نقطة الاستلام',
  inTransitTitle: 'شحنة قيد التنفيذ',
  inTransitSub: 'تابع شحنتك مع السائق',
  cancelRequest: 'إلغاء الطلب',
  cancelRequestNote: 'هل أنت متأكد من إلغاء الطلب؟',
  cancelRequestSuccess: 'تم إلغاء الطلب بنجاح.',
  homeLocDetecting: 'جاري تحديد موقعك...',
  homeLocRelocate: 'تحديد موقعي',
  homeLocLive: 'مباشر',

  historyTitle: 'سجل الطلبات',
  historyCompleted: 'مكتملة',
  historyActive: 'قيد التنفيذ',
  historyCanceled: 'ملغية',
  historyEmpty: 'لا توجد طلبات هنا بعد',
  historyEmptySub: 'ستظهر طلباتك هنا عندما تبدأ الشحن.',
  historyViewInfo: 'عرض التفاصيل',

  callConnecting: 'يتم الاتصال...',
  callInProgress: 'أثناء المكالمة',
  muteBtn: 'كتم',
  speakerBtn: 'مكبر الصوت',
  videoBtn: 'فيديو',
  endCall: 'إنهاء المكالمة',

bookingNewTitle: 'إنشاء شحنة جديدة',
  pickupTitle: 'نقطة الاستلام',
  pickupPlaceholder: 'اضغط لتحديد موقع الاستلام على الخريطة',
  dropoffTitle: 'نقطة التسليم',
  dropoffPlaceholder: 'اضغط لتحديد موقع التسليم على الخريطة',
  notes: 'ملاحظات (اختياري)',
  next: 'التالي',
  egp: 'جنيه',
  vehicleTitle: 'اختر المركبة',
  vehicleTricycle: 'تروسكل',
  vehicleMini: 'عربية تمنينة',
  vehicleHalfLoad: 'عربية نص نقل',
  vehicleQuarterLoad: 'عربية ربع نقل',
  packageTypeLabel: 'نوع الطرد',
  estTimeLabel: 'الزمن المتوقع',
  estTimeFallback: 'تقدير تقريبي',
  min: 'دقيقة',
  requestDriver: 'اطلب سائق',
  tripRequested: 'تم إرسال طلبك',
  searchingDriverTitle: 'جارٍ البحث عن سائق قريب',
  searchingDriverSub: 'نبحث عن أفضل سائق متاح على مسارك الآن',

  packageSmall: 'صغيرة',
  packageMedium: 'متوسطة',
  packageLarge: 'كبيرة',

  distanceLabel: 'المسافة',
  waitingForDrivers: 'جارٍ البحث عن سائق لتقديم عرض سعر…',
  driverOffers: 'عروض الأسعار',
  noOffersYet: 'لا توجد عروض بعد. بانتظار سائق.',
  simulateDriverOffer: 'محاكاة عرض سائق (تطوير)',
  offerDriverName: 'السائق',
  offerAmount: 'السعر المقترح',
  acceptOffer: 'قبول العرض',
  declineOffer: 'رفض العرض',
  offerAccepted: 'تم قبول العرض',
  offerAcceptedMsg: 'تم تعيين السائق. يمكنك الآن تتبع شحنتك.',
  offerDeclined: 'تم رفض العرض',
  offerDeclinedMsg: 'سيتم البحث عن سائق آخر لإرسال عرض جديد.',
  bidYourPrice: 'سعرك المقترح',
  bidOriginal: 'السعر الأصلي',
  bidDecreaseLeft: 'الخفض المتاح',
  bidDecrease: 'خفض',
  bidIncrease: 'رفع',
  waitingTimer: 'الوقت المتبقي للبحث',
  raiseFarePrompt: 'لم يصل عرض بعد. ارفع سعرك 4% لزيادة فرصة العثور على سائق.',
  raiseFareAsk: 'لم يصل عرض بعد. هل تريد رفع سعرك 4% لزيادة فرصة العثور على سائق؟',
  raiseFareYes: 'نعم، ارفع 4%',
  raiseFareNo: 'متابعة البحث',
  raiseFareDone: 'تم رفع السعر 4%',
  km: 'كم',
  trackBack: 'رجوع',
  orderId: 'رقم الطلب',
  now: 'الآن',
  confirmDelivery: 'تأكيد التسليم',
  rateShipment: 'تقييم الشحنة',
  viewDetails: 'عرض التفاصيل',
  simulateDev: 'محاكاة تقدم الشحنة (تطوير)',

  statusPending: 'بانتظار التأكيد',
  statusAssigned: 'تم تعيين السائق',
  statusPickedUp: 'تم استلام الشحنة',
  statusInTransit: 'في الطريق إليك',
  statusDelivered: 'تم التسليم',
  statusCanceled: 'ملغي',

  timelinePending: 'تم إنشاء الطلب',
  timelineAssigned: 'تم تعيين السائق',
  timelinePickedUp: 'تم استلام الشحنة',
  timelineInTransit: 'في الطريق إلى الوجهة',
  timelineDelivered: 'تم تسليم الشحنة',
  timelineCanceled: 'تم إلغاء الشحنة',

  confirmDeliveryTitle: 'تأكيد التسليم',
  proofTitle: 'إثبات التسليم',
  proofCapture: 'اضغط لتصوير الشحنة المُسلَّمة',
  signatureTitle: 'الحصول على توقيع',
  signatureTap: 'اضغط للحصول على توقيع المستلم',
  signatureModalTitle: 'توقيع المستلم',
  signaturePadText: 'وقّع داخل الإطار',
  signatureClear: 'مسح',
  signatureConfirm: 'تأكيد',
  submitDelivery: 'تأكيد التسليم',

  successTitle: 'تم التسليم بنجاح',
  successTime: 'الوقت',
  successTotal: 'الإجمالي',
  successDriver: 'السائق',
  rateTitle: 'تقييم السائق',
  rateSub: 'كيف كانت تجربتك مع',
  rateThanks: 'شكراً لتقييمك!',
  rateBtn: 'تقييم السائق',
  homeBtn: 'العودة الرئيسية',

  cancel: 'إلغاء',

  locationPickerSearch: 'ابحث عن عنوان أو منطقة...',
  locationPickerNoResults: 'لم نجد نتائج لهذا العنوان، جرّب وصفاً آخر.',
  locationPickerSearchError: 'تعذر البحث عن العنوان.',
  locationPickerMyLocation: 'اسمح للتطبيق بالوصول لموقعك أولاً.',
  locationPickerPermissionNeeded: 'اسمح للتطبيق بالوصول لموقعك أولاً.',
  locationPickerCurrentError: 'تعذر تحديد موقعك الحالي.',
  locationPickerSelected: 'الموقع المحدد',
  locationPickerTapHint: 'اضغط على الخريطة لتحديد الموقع',
  confirmLocation: 'تأكيد الموقع',
  geocodingLoading: 'جارٍ تحديد العنوان...',
  alertMapSelectFirst: 'حدد الموقع على الخريطة أولاً.',

  alertWarning: 'تنبيه',
  alertSuccess: 'تم',
  alertErrorGeneric: 'حدث خطأ، حاول مرة أخرى.',
  alertServerConnection: 'تعذر الاتصال بالسيرفر. تأكد أن XAMPP وسيرفر Laravel يعملان.',
  alertOtpSent: 'تم إرسال كود التحقق إلى رقمك.',
  alertOtpResent: 'تم إعادة إرسال الكود.',
  alertResendFailed: 'تعذر إعادة الإرسال.',
  alertCodeEmpty: 'أدخل الكود المكوّن من 4 أرقام.',
  alertTermsRequired: 'يجب الموافقة على الشروط والأحكام أولاً.',
  alertPhonePasswordWrong: 'رقم الهاتف أو كلمة المرور غير صحيحة.',
  alertNoAccount: 'لا يوجد حساب بهذا الرقم.',
  alertGoogleFailed: 'تعذر تسجيل الدخول بجوجل.',
  alertInvalidPhone: 'رقم هاتف غير صالح',
  alertFieldsEmpty: 'حدث خطأ، حاول مرة أخرى.',
  alertPickupDropoff: 'حدد موقع الاستلام وموقع التسليم من الخريطة.',
  alertShipmentCreated: 'تم الحجز ✅',
  alertTrackNow: 'تتبع الآن',
  alertOk: 'حسناً',
  alertYes: 'نعم',
  alertNo: 'لا',
  logoutConfirm: 'هل تريد تسجيل الخروج؟',
  alertEmailInvalid: 'أدخل بريداً إلكترونياً صحيحاً',
  alertDeliveryConfirm: 'تأكيد التسليم',
  alertSignatureEmpty: 'لم تقم بالتوقيع بعد.',
  alertPermissionCamera: 'نحتاج إذن الكاميرا لالتقاط الصور.',
  alertPermissionMedia: 'نحتاج إذن الوصول للصور لرفع الملفات.',
  alertShipmentLoadError: 'تعذر تحميل الشحنة.',
  alertAdvanceError: 'تعذر التحديث.',
  alertGoogleLoginFail: 'تعذر تسجيل الدخول بجوجل.',
  alertGoogleSignupFail: 'تعذر التسجيل بجوجل.',
  alertVerificationFailed: 'الكود غير صحيح أو منتهي الصلاحية.',
  alertPasswordChanged: 'تم تغيير كلمة المرور، سجل دخولك الآن.',
  alertForgotError: 'حدث خطأ، حاول مرة أخرى.',
  alertResetError: 'حدث خطأ، حاول مرة أخرى.',
  alertOtpVerifyError: 'حدث خطأ، حاول مرة أخرى.',
  alertPhoneRequired: 'أدخل رقم الهاتف',
  alertPhoneInvalid: 'رقم هاتف غير صالح',
  alertPasswordRequired: 'أدخل كلمة المرور',
  alertPasswordMin: '6 أحرف على الأقل',
  alertConfirmRequired: 'أعد كتابة كلمة المرور',
  alertPasswordMismatch: 'كلمتا المرور غير متطابقتين',
  alertNameRequired: 'أدخل اسمك',
  alertNameShort: 'الاسم قصير جداً',
  alertPhoneRequiredSignup: 'أدخل رقم الموبايل',
  alertPhoneInvalidSignup: 'رقم غير صالح',
  alertVerificationCodeRequired: 'أدخل الكود المكوّن من 4 أرقام.',

  // Profile
  profileTitle: 'الملف الشخصي',
  profileAccountSection: 'الحساب',
  profileSecuritySection: 'الأمان',
  profileEditData: 'تعديل البيانات',
  profileEditDataSub: 'الاسم والبريد الإلكتروني',
  profileChangePasswordSub: 'كلمة مرور قوية تحمي حسابك',
  profileLanguage: 'اللغة',
  profileLanguageSub: 'العربية / English',
  logout: 'تسجيل الخروج',
  editProfileTitle: 'تعديل البيانات',
  changePasswordTitle: 'تغيير كلمة المرور',
  currentPasswordPlaceholder: 'كلمة المرور الحالية',
  newPasswordPlaceholder: 'كلمة المرور الجديدة',
  confirmNewPasswordPlaceholder: 'تأكيد كلمة المرور الجديدة',
  saveBtn: 'حفظ',
  profileSaved: 'تم حفظ التغييرات بنجاح.',
  passwordChanged: 'تم تغيير كلمة المرور بنجاح.',
  profileItem: 'عنصر',
  profileName: 'الاسم',
  profileEmail: 'البريد الإلكتروني',
  profilePhone: 'رقم الهاتف',
  profileChangePassword: 'تغيير كلمة المرور',
  profileCurrentPassword: 'كلمة المرور الحالية',
  profileNewPassword: 'كلمة المرور الجديدة',
  profileConfirmPassword: 'تأكيد كلمة المرور الجديدة',
  profileSaveChanges: 'حفظ التغييرات',
  profilePasswordChanged: 'تم تغيير كلمة المرور بنجاح.',
  profileUpdated: 'تم تحديث الملف الشخصي.',
  profileCurrentPasswordWrong: 'كلمة المرور الحالية غير صحيحة.',

  // Menu
  menuHome: 'الرئيسية',
  menuTrips: 'رحلاتي',
  menuProfile: 'حسابي',
  menuSettings: 'الإعدادات',

  // Settings
  settingsTitle: 'الإعدادات',
  settingsBack: 'رجوع',
  settingsSectionGeneral: 'العامة',
  settingsDarkMode: 'الوضع الليلي',
  settingsDarkModeSub: 'ألوان داكنة مريحة للعين',
  settingsLanguage: 'اللغة',
  settingsLanguageSub: 'اختر لغة التطبيق',
  settingsNotifications: 'الإشعارات',
  settingsNotificationsSub: 'تحديثات الشحنات وعروض الأسعار',
  settingsLangAr: 'عربي',
  settingsLangEn: 'English',

  // Cancel
  cancelShipment: 'إلغاء الشحنة',
  cancelConfirm: 'هل أنت متأكد من إلغاء هذه الشحنة؟ لا يمكن التراجع عن هذا الإجراء.',
  cancelShipmentSuccess: 'تم إلغاء الشحنة.',
  cancelShipmentError: 'لا يمكن إلغاء الشحنة في هذه المرحلة.',

  languageToggle: 'English',
};

const en: TranslationKeys = {
  appName: 'Tranzet',
  loading: 'Loading...',

  onboardingSlide1Title: 'Request your shipment in minutes',
  onboardingSlide1Sub: 'Set your location, pick up, and ship your package with ease.',
  onboardingSlide2Title: 'Track your shipment in real-time',
  onboardingSlide2Sub: 'See your shipment location on the map and receive update notifications.',
  onboardingSlide3Title: 'Pay cash on delivery',
  onboardingSlide3Sub: 'Pay in cash when your shipment arrives — simple and hassle-free.',
  onboardingNext: 'Continue',
  onboardingFinish: 'Start Now',
  onboardingSkip: 'Skip',

  loginTitle: 'Log In',
  loginSubtitle: 'Log in now and start your journey',
  phonePlaceholder: 'Phone number',
  passwordPlaceholder: 'Password',
  forgotPassword: 'Forgot password?',
  loginBtn: 'Log In',
  orDivider: 'OR',
  googleSignIn: 'Sign in with Google',
  noAccount: "Don't have an account? ",
  createAccount: 'Create Account',
  hasAccount: 'Already have an account? ',
loginLink: 'Log In',

  signupTitle: 'Create your Tranzet account',
  signupSubtitle: 'One step away from requesting your shipment',
  signupStep1: 'Personal info',
  signupStep2: 'Password',
  signupNext: 'Continue',
  signupBack: 'Back',
  namePlaceholder: 'Full Name',
  phoneMobilePlaceholder: 'Mobile number',
  confirmPasswordPlaceholder: 'Confirm password',
  termsAgree: 'I agree to the Terms & Conditions',
  termsRead: 'Read the full Terms & Conditions',
  termsTitle: 'Terms & Conditions',
  termsSubtitle: 'Customer Terms of Service for the Tranzet platform',
  termsUpdated: 'Version effective as of',
  termsDone: 'Done reading',
  termsBack: 'Back',
  signupBtn: 'Create Account',

  otpTitle: 'Enter verification code',
  otpSubtitle1: 'A 4-digit code has been sent to',
  otpSubtitle2: '',
  otpCodeLabel: 'Code',
  devCodeLabel: 'Dev code:',
  resendAfter: 'Resend in 00:',
  resendCode: 'Resend Code',
  sending: 'Sending...',
  confirmCode: 'Confirm Code',

  forgotTitle: 'Forgot Password',
  forgotSubtitle: "Don't worry, we'll help you recover your account in simple steps.",
  forgotBtn: 'Next',

  resetTitle: 'Reset Your Password',
  resetSubtitle: 'Choose a new password for your account',
  resetBtn: 'Reset Password',

  activeChipSub: 'Order #',
  navHome: 'Home',
  driverLabel: 'Driver',
  homeSheetTitle: 'Request a new shipment',
  pickupLabel: 'Pickup point',
  inTransitTitle: 'Shipment in transit',
  inTransitSub: 'Follow your shipment with the driver',
  cancelRequest: 'Cancel',
  cancelRequestNote: 'Are you sure you want to cancel this request?',
  cancelRequestSuccess: 'Request cancelled successfully.',
  homeLocDetecting: 'Locating you...',
  homeLocRelocate: 'Locate me',
  homeLocLive: 'Live',

  historyTitle: 'Order History',
  historyCompleted: 'Completed',
  historyActive: 'In progress',
  historyCanceled: 'Cancelled',
  historyEmpty: 'No orders here yet',
  historyEmptySub: 'Your orders will appear here once you start shipping.',
  historyViewInfo: 'View details',

  callConnecting: 'Calling...',
  callInProgress: 'In call',
  muteBtn: 'Mute',
  speakerBtn: 'Speaker',
  videoBtn: 'Video',
  endCall: 'End call',

  bookingNewTitle: 'New Shipment',
  pickupTitle: 'Pickup Location',
  pickupPlaceholder: 'Tap to select pickup location on the map',
  dropoffTitle: 'Delivery Location',
  dropoffPlaceholder: 'Tap to select delivery location on the map',
  notes: 'Notes (optional)',
  next: 'Next',
  egp: 'EGP',
  vehicleTitle: 'Choose vehicle',
  vehicleTricycle: 'Motor tricycle',
  vehicleMini: 'Mini pickup',
  vehicleHalfLoad: 'Half-load truck',
  vehicleQuarterLoad: 'Quarter-load pickup',
  packageTypeLabel: 'Package type',
  estTimeLabel: 'Estimated time',
  estTimeFallback: 'Rough estimate',
  min: 'min',
  requestDriver: 'Request Driver',
  tripRequested: 'Your request has been sent',
  searchingDriverTitle: 'Finding a nearby driver',
  searchingDriverSub: 'We are matching you with the best driver on your route',

  packageSmall: 'Small',
  packageMedium: 'Medium',
  packageLarge: 'Large',

  distanceLabel: 'Distance',
  waitingForDrivers: 'Searching for a driver to quote a fare…',
  driverOffers: 'Fare Offers',
  noOffersYet: 'No offers yet. Waiting for a driver.',
  simulateDriverOffer: 'Simulate a driver offer (dev)',
  offerDriverName: 'Driver',
  offerAmount: 'Proposed fare',
  acceptOffer: 'Accept Offer',
  declineOffer: 'Decline Offer',
  offerAccepted: 'Offer accepted',
  offerAcceptedMsg: 'Driver assigned. You can now track your shipment.',
  offerDeclined: 'Offer declined',
  offerDeclinedMsg: 'Searching for another driver to send a new offer.',
  bidYourPrice: 'Your proposed price',
  bidOriginal: 'Original price',
  bidDecreaseLeft: 'Decrease left',
  bidDecrease: 'Lower',
  bidIncrease: 'Raise',
  waitingTimer: 'Time left to find a driver',
  raiseFarePrompt: 'No offer yet. Raise your fare by 4% to improve your chances.',
  raiseFareAsk: 'No offer yet. Would you like to raise your fare by 4% to find a driver faster?',
  raiseFareYes: 'Yes, raise 4%',
  raiseFareNo: 'Keep searching',
  raiseFareDone: 'Price raised by 4%',
  km: 'km',

  trackBack: 'Back',
  orderId: 'Order #',
  now: 'Now',
  confirmDelivery: 'Confirm Delivery',
  rateShipment: 'Rate Shipment',
  viewDetails: 'View Details',
  simulateDev: 'Simulate progress (dev)',

  statusPending: 'Pending',
  statusAssigned: 'Driver Assigned',
  statusPickedUp: 'Picked Up',
  statusInTransit: 'In Transit',
  statusDelivered: 'Delivered',
  statusCanceled: 'Canceled',

  timelinePending: 'Order Created',
  timelineAssigned: 'Driver Assigned',
  timelinePickedUp: 'Package Picked Up',
  timelineInTransit: 'In Transit to Destination',
  timelineDelivered: 'Package Delivered',
  timelineCanceled: 'Shipment Canceled',

  confirmDeliveryTitle: 'Confirm Delivery',
  proofTitle: 'Proof of Delivery',
  proofCapture: 'Tap to photograph the delivered package',
  signatureTitle: 'Get Signature',
  signatureTap: "Tap to get recipient's signature",
  signatureModalTitle: "Recipient's Signature",
  signaturePadText: 'Sign within the frame',
  signatureClear: 'Clear',
  signatureConfirm: 'Confirm',
  submitDelivery: 'Confirm Delivery',

  successTitle: 'Delivered Successfully',
  successTime: 'Time',
  successTotal: 'Total',
  successDriver: 'Driver',
  rateTitle: 'Rate Driver',
  rateSub: 'How was your experience with',
  rateThanks: 'Thank you for your rating!',
  rateBtn: 'Rate Driver',
  homeBtn: 'Back to Home',

  cancel: 'Cancel',

  locationPickerSearch: 'Search for an address or area...',
  locationPickerNoResults: 'No results found, try a different description.',
  locationPickerSearchError: 'Could not search for the address.',
  locationPickerMyLocation: 'Please allow location access first.',
  locationPickerPermissionNeeded: 'Please allow location access first.',
  locationPickerCurrentError: 'Could not determine your current location.',
  locationPickerSelected: 'Selected Location',
  locationPickerTapHint: 'Tap on the map to select location',
  confirmLocation: 'Confirm Location',
  geocodingLoading: 'Locating...',
  alertMapSelectFirst: 'Select the location on the map first.',

  alertWarning: 'Warning',
  alertSuccess: 'Done',
  alertErrorGeneric: 'An error occurred, please try again.',
  alertServerConnection: 'Could not connect to server. Make sure XAMPP and Laravel are running.',
  alertOtpSent: 'Verification code has been sent to your number.',
  alertOtpResent: 'Verification code resent.',
  alertResendFailed: 'Could not resend code.',
  alertCodeEmpty: 'Enter the 4-digit code.',
  alertTermsRequired: 'You must agree to the Terms & Conditions first.',
  alertPhonePasswordWrong: 'Invalid phone number or password.',
  alertNoAccount: 'No account found with this number.',
  alertGoogleFailed: 'Google sign-in failed.',
  alertInvalidPhone: 'Invalid phone number',
  alertFieldsEmpty: 'An error occurred, please try again.',
  alertPickupDropoff: 'Select both pickup and delivery locations on the map.',
  alertShipmentCreated: 'Booked Successfully',
  alertTrackNow: 'Track Now',
  alertOk: 'OK',
  alertYes: 'Yes',
  alertNo: 'No',
  logoutConfirm: 'Are you sure you want to log out?',
  alertEmailInvalid: 'Enter a valid email address',
  alertDeliveryConfirm: 'Confirm Delivery',
  alertSignatureEmpty: 'You have not signed yet.',
  alertPermissionCamera: 'Camera permission is needed to take photos.',
  alertPermissionMedia: 'Media access permission is needed to upload files.',
  alertShipmentLoadError: 'Could not load shipment.',
  alertAdvanceError: 'Could not update.',
  alertGoogleLoginFail: 'Google sign-in failed.',
  alertGoogleSignupFail: 'Google sign-up failed.',
  alertVerificationFailed: 'Invalid or expired verification code.',
  alertPasswordChanged: 'Password changed successfully, please log in.',
  alertForgotError: 'An error occurred, please try again.',
  alertResetError: 'An error occurred, please try again.',
  alertOtpVerifyError: 'An error occurred, please try again.',
  alertPhoneRequired: 'Enter phone number',
  alertPhoneInvalid: 'Invalid phone number',
  alertPasswordRequired: 'Enter password',
  alertPasswordMin: 'At least 6 characters',
  alertConfirmRequired: 'Re-enter password',
  alertPasswordMismatch: 'Passwords do not match',
  alertNameRequired: 'Enter your name',
  alertNameShort: 'Name is too short',
  alertPhoneRequiredSignup: 'Enter mobile number',
  alertPhoneInvalidSignup: 'Invalid number',
  alertVerificationCodeRequired: 'Enter the 4-digit code.',

  // Profile
  profileTitle: 'Profile',
  profileAccountSection: 'Account',
  profileSecuritySection: 'Security',
  profileEditData: 'Edit profile',
  profileEditDataSub: 'Name and email',
  profileChangePasswordSub: 'A strong password keeps your account safe',
  profileLanguage: 'Language',
  profileLanguageSub: 'العربية / English',
  logout: 'Log out',
  editProfileTitle: 'Edit profile',
  changePasswordTitle: 'Change password',
  currentPasswordPlaceholder: 'Current password',
  newPasswordPlaceholder: 'New password',
  confirmNewPasswordPlaceholder: 'Confirm new password',
  saveBtn: 'Save',
  profileSaved: 'Changes saved successfully.',
  passwordChanged: 'Password changed successfully.',
  profileItem: 'Item',
  profileName: 'Name',
  profileEmail: 'Email',
  profilePhone: 'Phone',
  profileChangePassword: 'Change Password',
  profileCurrentPassword: 'Current Password',
  profileNewPassword: 'New Password',
  profileConfirmPassword: 'Confirm New Password',
  profileSaveChanges: 'Save Changes',
  profilePasswordChanged: 'Password changed successfully.',
  profileUpdated: 'Profile updated.',
  profileCurrentPasswordWrong: 'Current password is incorrect.',

  // Menu
  menuHome: 'Home',
  menuTrips: 'My Trips',
  menuProfile: 'My Account',
  menuSettings: 'Settings',

  // Settings
  settingsTitle: 'Settings',
  settingsBack: 'Back',
  settingsSectionGeneral: 'General',
  settingsDarkMode: 'Dark mode',
  settingsDarkModeSub: 'Comfortable low-light colors',
  settingsLanguage: 'Language',
  settingsLanguageSub: 'Choose your app language',
  settingsNotifications: 'Notifications',
  settingsNotificationsSub: 'Shipment updates and fare offers',
  settingsLangAr: 'عربي',
  settingsLangEn: 'English',

  // Cancel
  cancelShipment: 'Cancel Shipment',
  cancelConfirm: 'Are you sure you want to cancel this shipment? This action cannot be undone.',
  cancelShipmentSuccess: 'Shipment cancelled.',
  cancelShipmentError: 'Cannot cancel shipment at this stage.',

  languageToggle: 'عربي',
};

export const translations: Record<Language, TranslationKeys> = { ar, en };
