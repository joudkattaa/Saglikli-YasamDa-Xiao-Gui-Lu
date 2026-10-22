import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'tr' | 'ar' | 'en';

const localeStorageKey = 'denge-locale:anonymous';
const localeTags: Record<Locale, string> = { tr: 'tr-TR', ar: 'ar', en: 'en-US' };
const localeDirections: Record<Locale, 'ltr' | 'rtl'> = { tr: 'ltr', ar: 'rtl', en: 'ltr' };
let activeLocale: Locale = 'tr';

const pairs: Array<[string, string, string]> = [
  ['Dil seç', 'Choose language', 'اختر اللغة'],
  ['Yükleniyor', 'Loading', 'جارٍ التحميل'],
  ['Bir sorun oluştu', 'Something went wrong', 'حدث خطأ ما'],
  ['Uygulamanın bu bölümünde bir hata oluştu. Diğer bölümler çalışmaya devam ediyor.', 'This part of the app hit an error. The rest of the app is still running.', 'حدث خطأ في هذا الجزء من التطبيق، بينما يستمر باقي التطبيق بالعمل.'],
  ['Bilgiler şu an yüklenemedi', 'Your information could not be loaded', 'تعذّر تحميل معلوماتك الآن'],
  ['Bağlantını kontrol edip yeniden deneyebilirsin.', 'Check your connection and try again.', 'تحقّق من اتصالك ثم حاول مجددًا.'],
  ['Yeniden dene', 'Try again', 'حاول مجددًا'],
  ['Genel bakış', 'Overview', 'نظرة عامة'],
  ['Hesabım', 'My account', 'حسابي'],
  ['HESABIM', 'MY ACCOUNT', 'حسابي'],
  ['Hesap bilgilerin.', 'Your account details.', 'تفاصيل حسابك.'],
  ['Profil bilgilerin ve yaş tercihin.', 'Your profile details and age preference.', 'معلومات ملفك الشخصي وتفضيل العمر.'],
  ['Profil bilgileri', 'Profile information', 'معلومات الملف الشخصي'],
  ['Yaş bilgisi', 'Age information', 'معلومات العمر'],
  ['Ad ve e-posta bilgilerin hesabından alınır.', 'Your name and email come from your account.', 'الاسم والبريد الإلكتروني مأخوذان من حسابك.'],
  ['Ad soyad', 'Full name', 'الاسم الكامل'],
  ['E-posta', 'Email', 'البريد الإلكتروني'],
  ['Yaş (yıl)', 'Age (years)', 'العمر (بالسنوات)'],
  ['İsteğe bağlı', 'Optional', 'اختياري'],
  ['Yaşını istediğin zaman silebilirsin.', 'You can remove your age at any time.', 'يمكنك حذف عمرك في أي وقت.'],
  ['Yaşını kaydet', 'Save age', 'حفظ العمر'],
  ['Yaş bilgisi kaydedildi.', 'Age saved.', 'تم حفظ العمر.'],
  ['Yaş bilgisi kaydedilemedi. Yeniden dene.', 'Could not save age. Try again.', 'تعذر حفظ العمر. حاول مجددًا.'],
  ['İsim belirtilmemiş', 'Name not provided', 'لم يُضف الاسم'],
  ['E-posta adresi bulunamadı', 'No email address found', 'لم يُعثر على بريد إلكتروني'],
  ['Beslenme', 'Nutrition', 'التغذية'],
  ['Hareket', 'Movement', 'الحركة'],
  ['Aktivite', 'Activity', 'النشاط'],
  ['Kilo takibi', 'Weight tracking', 'متابعة الوزن'],
  ['Hedefler', 'Goals', 'الأهداف'],
  ['iyi hisset, dengede kal', 'feel well, find your balance', 'اشعر بالراحة وحافظ على توازنك'],
  ['GÜNÜN', 'YOUR DAY', 'يومك'],
  ['Küçük adımlar,', 'Small steps,', 'خطوات صغيرة،'],
  ['iyi alışkanlıklar.', 'better habits.', 'وعادات أفضل.'],
  ['Merhaba', 'Hello', 'مرحبًا'],
  ['Denge hesabın', 'Your Denge account', 'حسابك في Denge'],
  ['Çıkış yap', 'Sign out', 'تسجيل الخروج'],
  ['Menüyü aç veya kapat', 'Open or close menu', 'فتح القائمة أو إغلاقها'],
  ['Bugün kendin için güzel bir gün.', 'Today is a good day for yourself.', 'اليوم فرصة جميلة للاهتمام بنفسك.'],
  ['Denge · Kendine iyi bakmanın sade hâli.', 'Denge · A simpler way to care for yourself.', 'Denge · طريقة أبسط للاهتمام بنفسك.'],
  ['Besin değerleri tahminidir.', 'Nutrition values are estimates.', 'القيم الغذائية تقديرية.'],
  ['Giriş yap', 'Sign in', 'تسجيل الدخول'],
  ['Ücretsiz başla', 'Get started for free', 'ابدأ مجانًا'],
  ['GÜNLÜK İYİLİK HALİNE YER AÇ', 'MAKE ROOM FOR DAILY WELLNESS', 'امنح العافية اليومية مساحة'],
  ['Daha iyi hissetmek,', 'Feel better', 'الشعور بالراحة'],
  ['küçük şeylerle', 'one small step', 'يبدأ بخطوات'],
  ['başlar.', 'at a time.', 'صغيرة.'],
  ['Yediklerini, hareketini ve sana iyi gelen alışkanlıkları tek bir sakin yerde takip et. Denge, kendine ayırdığın küçük bir alan.', 'Keep track of what you eat, how you move, and the habits that help you feel good—all in one calm place. Denge is a little space for yourself.', 'تابع طعامك وحركتك وعاداتك التي تمنحك شعورًا أفضل في مساحة هادئة واحدة. Denge مساحة صغيرة تخصصها لنفسك.'],
  ['Kendi ritmini bul', 'Find your own rhythm', 'اكتشف إيقاعك الخاص'],
  ['Kusursuz olmak zorunda değil.', 'It does not have to be perfect.', 'ليس عليك أن تكون مثاليًا.'],
  ['Günlük denge özeti', 'Daily balance overview', 'ملخص التوازن اليومي'],
  ['Bugün', 'Today', 'اليوم'],
  ['iyi seçimler yaptın', 'you made good choices', 'اخترت ما يناسبك'],
  ['Bir yudum daha', 'One more sip', 'رشفة أخرى'],
  ['Kendine iyi bak', 'Take care of yourself', 'اعتنِ بنفسك'],
  ['her gün, yeniden', 'every day, again', 'كل يوم، من جديد'],
  ['DAHA AZ BASKI, DAHA ÇOK FARKINDALIK', 'LESS PRESSURE, MORE AWARENESS', 'ضغط أقل، ووعي أكبر'],
  ['Rakamların değil,', "Don't follow the numbers,", 'لا تتبع الأرقام،'],
  ['ritminin', 'follow your rhythm', 'اتبع إيقاعك'],
  ['peşinden git.', '.', '.'],
  ['İyi yaşam tek bir ölçüye sığmaz. Günlük kayıtlarını tut, örüntülerini fark et ve sana uygun hedefleri kendi hızında belirle.', 'Wellness cannot be reduced to one number. Keep daily notes, notice patterns, and set goals that suit you at your own pace.', 'العافية لا تختصرها قيمة واحدة. سجّل يومياتك، ولاحظ أنماطك، وحدد أهدافًا تناسبك بإيقاعك الخاص.'],
  ['DENGE GÜNLÜĞÜN', 'YOUR DENGE JOURNAL', 'دفتر Denge الخاص بك'],
  ['İyi hissettiğin', 'Remember', 'تذكّر'],
  ['şeyleri', 'what feels good', 'ما يجعلك'],
  ['hatırla.', 'to you.', 'تشعر بالراحة.'],
  ['Günlük küçük notların zamanla sana büyük resmi gösterir.', 'Small daily notes can reveal the bigger picture over time.', 'ملاحظاتك اليومية الصغيرة تساعدك على رؤية الصورة الأكبر مع الوقت.'],
  ['Öğünlerini kaydet. Besin değerleri tahminiyle genel görünümünü takip et.', 'Log meals and follow your nutrition with estimated values.', 'سجّل وجباتك وتابع تغذيتك باستخدام قيم تقديرية.'],
  ['Adımlarını ve aktivitelerini kendin gir; gününü kendine göre tamamla.', 'Enter your own steps and activities, and shape the day your way.', 'أدخل خطواتك وأنشطتك بنفسك، وأنهِ يومك على طريقتك.'],
  ['İyi yaşam', 'Wellness', 'العافية'],
  ['Su, uyku ve kilo geçmişine tek bakışta, yargısızca göz at.', 'Review your water, sleep, and weight history without judgment.', 'تابع شرب الماء والنوم وسجل الوزن دون أحكام.'],
  ['Bir şeyleri değiştirmek için', 'You do not have to change', 'لإحداث تغيير،'],
  ['bütün hayatını değiştirmek gerekmez.', 'your whole life to change something.', 'ليس عليك تغيير حياتك كلها.'],
  ['Bugün kendin için bir küçük şey seç.', 'Choose one small thing for yourself today.', 'اختر اليوم شيئًا صغيرًا لنفسك.'],
  ["Denge'ye katıl", 'Join Denge', 'انضم إلى Denge'],
  ['Kendine iyi bakmanın sade hâli.', 'A simpler way to care for yourself.', 'طريقة أبسط للاهتمام بنفسك.'],
  ['BUGÜNÜN ÖZETİ', 'TODAY AT A GLANCE', 'ملخص اليوم'],
  ['Merhaba, güzel bir gün.', 'Hello, make today a good day.', 'مرحبًا، اجعل يومك جميلًا.'],
  ['Her küçük seçim, kendine verdiğin bir değer.', 'Every small choice is an act of care for yourself.', 'كل اختيار صغير هو تقدير لنفسك.'],
  ['BESLENME DENGESİ', 'NUTRITION BALANCE', 'توازن التغذية'],
  ['Günlük görünüm', 'Daily view', 'عرض اليوم'],
  ['Bugün aldığın', 'Consumed today', 'ما تناولته اليوم'],
  ['kcal hedefe kalan', 'kcal remaining to goal', 'سعرة حرارية متبقية للهدف'],
  ['Alınan', 'Consumed', 'المتناولة'],
  ['Hedef', 'Goal', 'الهدف'],
  ['Yakılan', 'Burned', 'المحروقة'],
  ['BESİN DAĞILIMI', 'NUTRIENT BREAKDOWN', 'توزيع العناصر الغذائية'],
  ['Makro dengesi', 'Macro balance', 'توازن المغذيات الكبرى'],
  ['Protein', 'Protein', 'البروتين'],
  ['Karbonhidrat', 'Carbohydrates', 'الكربوهيدرات'],
  ['g · Protein', 'g · Protein', 'غ · البروتين'],
  ['g · Karbonhidrat', 'g · Carbohydrates', 'غ · الكربوهيدرات'],
  ['g', 'g', 'غ'],
  ['km', 'km', 'كم'],
  ['dk', 'min', 'دقيقة'],
  ['kcal kaydedildi', 'kcal logged', 'سعرة حرارية مسجلة'],
  ['kcal hedefe kalan', 'kcal remaining to goal', 'سعرة حرارية متبقية للهدف'],
  ['kcal tahmini', 'estimated kcal', 'سعرة حرارية تقديرية'],
  ['Yağ', 'Fat', 'الدهون'],
  ['Besin değerleri tahminidir.', 'Nutrition values are estimates.', 'القيم الغذائية تقديرية.'],
  ['GÜNLÜK RİTMİN', 'YOUR DAILY RHYTHM', 'إيقاعك اليومي'],
  ['Hedefleri düzenle', 'Edit goals', 'تعديل الأهداف'],
  ['Adımlar', 'Steps', 'الخطوات'],
  ['adım', 'step', 'خطوة'],
  ['Su', 'Water', 'الماء'],
  ['Uyku', 'Sleep', 'النوم'],
  ['KÜÇÜK BİR KAYIT', 'A SMALL CHECK-IN', 'تسجيل بسيط'],
  ['Bugün kendine nasıl baktın?', 'How did you care for yourself today?', 'كيف اعتنيت بنفسك اليوم؟'],
  ['Su ve uyku bilgilerini sen girersin. Cihaz takibi yok.', 'Enter your water and sleep yourself. No device tracking.', 'أدخل بيانات الماء والنوم بنفسك. لا يوجد تتبّع من الجهاز.'],
  ['+250 ml su', '+250 ml water', '+250 مل ماء'],
  ['Uyku süreni kaydet', 'Log your sleep duration', 'سجّل مدة نومك'],
  ['dakika', 'minutes', 'دقيقة'],
  ['SON 7 GÜN', 'LAST 7 DAYS', 'آخر 7 أيام'],
  ['Adım ritmin', 'Your step rhythm', 'إيقاع خطواتك'],
  ['Henüz haftalık kayıt yok. İlk adımını bugün ekle.', 'No weekly records yet. Add your first steps today.', 'لا توجد سجلات أسبوعية بعد. أضف خطواتك الأولى اليوم.'],
  ['Adımlarını', 'Your steps', 'خطواتك'],
  ['kendin kaydedebilirsin', 'you can log them yourself', 'يمكنك تسجيلها بنفسك'],
  ['KİLO TAKİBİ', 'WEIGHT TRACKING', 'متابعة الوزن'],
  ['Kendi yolunda', 'Your own journey', 'رحلتك الخاصة'],
  ['Son ölçüm', 'Latest measurement', 'آخر قياس'],
  ['Hedef', 'Goal', 'الهدف'],
  ['Kilo geçmişine git', 'View weight history', 'عرض سجل الوزن'],
  ['Kilo', 'Weight', 'الوزن'],
  ['Kahvaltı', 'Breakfast', 'الفطور'],
  ['Öğle', 'Lunch', 'الغداء'],
  ['Akşam', 'Dinner', 'العشاء'],
  ['Ara öğün', 'Snack', 'وجبة خفيفة'],
  ['Yürüyüş', 'Walking', 'المشي'],
  ['Koşu', 'Running', 'الجري'],
  ['Bisiklet', 'Cycling', 'ركوب الدراجة'],
  ['Antrenman', 'Workout', 'تمرين'],
  ['Diğer', 'Other', 'أخرى'],
  ['KAYDI DÜZENLE', 'EDIT RECORD', 'تعديل السجل'],
  ['YENİ ÖĞÜN', 'NEW MEAL', 'وجبة جديدة'],
  ['Öğününü güncelle', 'Update your meal', 'تعديل وجبتك'],
  ['Ne yedin?', 'What did you eat?', 'ماذا أكلت؟'],
  ['Kapat', 'Close', 'إغلاق'],
  ['Tahmini besin kataloğunda ara', 'Search estimated food catalog', 'ابحث في قائمة الأطعمة التقديرية'],
  ['Besin adı yaz...', 'Enter a food name...', 'اكتب اسم الطعام...'],
  ['Besin kataloğundan seç', 'Choose from food catalog', 'اختر من قائمة الأطعمة'],
  ['Katalogdan seç veya elle gir', 'Choose from catalog or enter manually', 'اختر من القائمة أو أدخل يدويًا'],
  ['Besin adı', 'Food name', 'اسم الطعام'],
  ['Örn. mercimek çorbası', 'E.g. lentil soup', 'مثال: شوربة العدس'],
  ['Öğün', 'Meal', 'الوجبة'],
  ['Porsiyon (g)', 'Portion (g)', 'الحصة (غ)'],
  ['Besin değerleri · tahmini', 'Nutrition values · estimated', 'القيم الغذائية · تقديرية'],
  ['Kalori', 'Calories', 'السعرات الحرارية'],
  ['Vazgeç', 'Cancel', 'إلغاء'],
  ['Kaydet', 'Save', 'حفظ'],
  ['Kaydediliyor…', 'Saving…', 'جارٍ الحفظ…'],
  ['Değişiklikleri kaydet', 'Save changes', 'حفظ التغييرات'],
  ['Öğünü ekle', 'Add meal', 'إضافة وجبة'],
  ['Öğün ekle', 'Add meal', 'إضافة وجبة'],
  ['BESLENME GÜNLÜĞÜ', 'MEAL JOURNAL', 'سجل التغذية'],
  ['Öğünlerine göz at.', 'Review your meals.', 'راجع وجباتك.'],
  ['Besin değerleri tahminidir; amaç farkındalık, kusursuzluk değil.', 'Nutrition values are estimates; the goal is awareness, not perfection.', 'القيم الغذائية تقديرية؛ الهدف هو الوعي، لا الكمال.'],
  ['Bugün', 'Today', 'اليوم'],
  ['kcal kaydedildi', 'kcal logged', 'سعرة حرارية مسجلة'],
  ['Henüz öğün kaydı yok', 'No meals recorded yet', 'لا توجد وجبات مسجلة بعد'],
  ['Bugün yediklerini ekle; günün nasıl geçtiğini birlikte görelim.', 'Log what you ate today and see how your day went.', 'سجّل ما تناولته اليوم لتراجع يومك.'],
  ['İlk öğününü ekle', 'Add your first meal', 'أضف وجبتك الأولى'],
  ['kayıt', 'records', 'سجلات'],
  ['Öğünü düzenle', 'Edit meal', 'تعديل الوجبة'],
  ['Öğünü sil', 'Delete meal', 'حذف الوجبة'],
  ['Besin kataloğundaki değerler porsiyon başına tahminidir. Porsiyon ve değerleri kaydetmeden önce düzenleyebilirsin.', 'Food catalog values are estimates per portion. You can adjust the portion and values before saving.', 'قيم قائمة الطعام تقديرية لكل حصة. يمكنك تعديل الحصة والقيم قبل الحفظ.'],
  ['HAREKET KAYDI', 'ACTIVITY RECORD', 'تسجيل نشاط'],
  ['Hareketini ekle.', 'Log your activity.', 'سجّل نشاطك.'],
  ['Aktivite', 'Activity', 'النشاط'],
  ['Süre (dakika)', 'Duration (minutes)', 'المدة (بالدقائق)'],
  ['Mesafe (km)', 'Distance (km)', 'المسافة (كم)'],
  ['İsteğe bağlı', 'Optional', 'اختياري'],
  ['Yakılan kalori (tahmini)', 'Calories burned (estimated)', 'السعرات المحروقة (تقديري)'],
  ['Kalori tahmini kişiye ve aktivite yoğunluğuna göre değişebilir.', 'Calorie estimates vary by person and activity intensity.', 'تختلف تقديرات السعرات حسب الشخص وشدة النشاط.'],
  ['Aktiviteyi kaydet', 'Save activity', 'حفظ النشاط'],
  ['HAREKET & AKTİVİTE', 'MOVEMENT & ACTIVITY', 'الحركة والنشاط'],
  ['Kendi ritminde hareket.', 'Move at your own pace.', 'تحرّك بإيقاعك الخاص.'],
  ['Adımlarını manuel kaydet; cihaz bağlantısı şu an bulunmuyor.', 'Log your steps manually; device syncing is not available yet.', 'سجّل خطواتك يدويًا؛ مزامنة الأجهزة غير متاحة حاليًا.'],
  ['GÜNLÜK ADIM', 'DAILY STEPS', 'الخطوات اليومية'],
  ['Her adım sayılır.', 'Every step counts.', 'كل خطوة مهمة.'],
  ['Bugünkü adım sayın', 'Your steps today', 'عدد خطواتك اليوم'],
  ['Örn. 4.250', 'E.g. 4,250', 'مثال: ٤٬٢٥٠'],
  ['Adımları kaydet', 'Save steps', 'حفظ الخطوات'],
  ['Adımlar manuel girilir; otomatik cihaz takibi yoktur.', 'Steps are entered manually; there is no automatic device tracking.', 'تُدخل الخطوات يدويًا؛ لا يوجد تتبّع تلقائي من الجهاز.'],
  ['Aktivite özeti', 'Activity summary', 'ملخص النشاط'],
  ['aktivite kaydı', 'activity records', 'أنشطة مسجلة'],
  ['toplam hareket', 'total activity', 'إجمالي الحركة'],
  ['tahmini yakım', 'estimated burn', 'حرق تقديري'],
  ['AKTİVİTELERİN', 'YOUR ACTIVITIES', 'أنشطتك'],
  ['Bugün henüz hareket kaydı yok', 'No activity recorded today', 'لا يوجد نشاط مسجل اليوم'],
  ['Yürüyüşün ya da antrenmanın için küçük bir kayıt ekle.', 'Add a quick record for a walk or workout.', 'أضف سجلًا قصيرًا للمشي أو التمرين.'],
  ['Aktivite ekle', 'Add activity', 'إضافة نشاط'],
  ['Aktiviteyi düzenle', 'Edit activity', 'تعديل النشاط'],
  ['Aktiviteyi sil', 'Delete activity', 'حذف النشاط'],
  ['kcal tahmini', 'estimated kcal', 'سعرة حرارية تقديرية'],
  ['KİLO TAKİBİ', 'WEIGHT TRACKING', 'متابعة الوزن'],
  ['İlerleme, senin tanımınla.', 'Progress, defined by you.', 'التقدم كما تعرّفه أنت.'],
  ['Ölçümlerin yalnızca sana ait bir kayıt; karşılaştırma değil, farkındalık.', 'Your measurements are for your own record—awareness, not comparison.', 'قياساتك لك وحدك؛ للوعي لا للمقارنة.'],
  ['SON ÖLÇÜM', 'LATEST MEASUREMENT', 'آخر قياس'],
  ['İlk ölçümünü eklediğinde burada görünecek.', 'Your latest measurement will appear here.', 'سيظهر هنا بعد إضافة أول قياس.'],
  ['Kilo vermek', 'Lose weight', 'خسارة الوزن'],
  ['Kilo almak', 'Gain weight', 'زيادة الوزن'],
  ['Kilonu korumak', 'Maintain weight', 'الحفاظ على الوزن'],
  ['Hedef yönü', 'Goal direction', 'اتجاه الهدف'],
  ['kendi hedefin doğrultusunda', 'at your own pace', 'وفق هدفك الخاص'],
  ['YENİ ÖLÇÜM', 'NEW MEASUREMENT', 'قياس جديد'],
  ['Kendini nasıl hissediyorsun?', 'How are you feeling?', 'كيف تشعر؟'],
  ['İstersen yeni bir ölçüm kaydet. Bu bir yarış değil.', 'Add a new measurement if you like. This is not a race.', 'أضف قياسًا جديدًا إن رغبت. هذه ليست منافسة.'],
  ['Kilo (kg)', 'Weight (kg)', 'الوزن (كغ)'],
  ['Tarih', 'Date', 'التاريخ'],
  ['Örn. 68,4', 'E.g. 68.4', 'مثال: ٦٨٫٤'],
  ['Ölçümü kaydet', 'Save measurement', 'حفظ القياس'],
  ['ÖLÇÜM GEÇMİŞİ', 'MEASUREMENT HISTORY', 'سجل القياسات'],
  ['Henüz ölçüm yok', 'No measurements yet', 'لا توجد قياسات بعد'],
  ['İlk kaydını eklediğinde burada geçmişini görebilirsin.', 'Your history will appear here after your first entry.', 'سيظهر سجلك هنا بعد إضافة أول قياس.'],
  ['Ölçümü düzenle', 'Edit measurement', 'تعديل القياس'],
  ['Ölçümü sil', 'Delete measurement', 'حذف القياس'],
  ['Her bedenin ve her yolculuğun kendine özgü. Denge, hedeflerini senin belirlediğin şekilde takip etmene yardımcı olur.', 'Every body and every journey is different. Denge helps you track goals on your terms.', 'لكل جسم ورحلة خصوصيتهما. يساعدك Denge على متابعة أهدافك بالطريقة التي تختارها.'],
  ['Hedeflere git', 'Go to goals', 'الانتقال إلى الأهداف'],
  ['ZAMAN İÇİNDE', 'OVER TIME', 'مع مرور الوقت'],
  ['Kilo değişimin', 'Your weight trend', 'تغيّر وزنك'],
  ['Ölçüm eklediğinde kilo değişimin burada görünecek.', 'Your weight trend will appear here after you add measurements.', 'سيظهر تغيّر وزنك هنا بعد إضافة قياسات.'],
  ['Tarihe göre kilo değişimi', 'Weight changes over time', 'تغيّر الوزن حسب التاريخ'],
  ['Sana özel', 'Just for you', 'مخصص لك'],
  ['SANA ÖZEL', 'JUST FOR YOU', 'مخصص لك'],
  ['Hedeflerini belirle.', 'Set your goals.', 'حدّد أهدافك.'],
  ['Bunlar kesin kurallar değil, sana yol gösteren küçük niyetler.', 'These are gentle guideposts, not strict rules.', 'هذه إرشادات لطيفة وليست قواعد صارمة.'],
  ['Günlük beslenme', 'Daily nutrition', 'التغذية اليومية'],
  ['Günün için sana uygun bir hedef belirle.', 'Choose a goal that works for your day.', 'اختر هدفًا يناسب يومك.'],
  ['Kalori hedefi', 'Calorie goal', 'هدف السعرات'],
  ['kcal / gün', 'kcal / day', 'سعرة حرارية / يوم'],
  ['Günlük hareket', 'Daily movement', 'الحركة اليومية'],
  ['Adım hedefini kendi yaşamına göre seç.', 'Set a step goal that fits your life.', 'اختر هدف خطوات يناسب نمط حياتك.'],
  ['Adım hedefi', 'Step goal', 'هدف الخطوات'],
  ['adım / gün', 'steps / day', 'خطوة / يوم'],
  ['Su ve uyku', 'Water and sleep', 'الماء والنوم'],
  ['Dinlenme ve su içme alışkanlığını destekle.', 'Support your rest and hydration habits.', 'ادعم عادات الراحة وشرب الماء.'],
  ['Su hedefi', 'Water goal', 'هدف الماء'],
  ['ml / gün', 'ml / day', 'مل / يوم'],
  ['Uyku hedefi', 'Sleep goal', 'هدف النوم'],
  ['dakika / gün', 'minutes / day', 'دقيقة / يوم'],
  ['Kilo hedefin', 'Your weight goal', 'هدف الوزن'],
  ['İstersen yönünü ve ölçülerini belirtebilirsin.', 'Set a direction and measurements if you like.', 'يمكنك تحديد الاتجاه والقياسات إن رغبت.'],
  ['Vermek', 'Lose', 'خسارة'],
  ['Korumak', 'Maintain', 'الحفاظ'],
  ['Almak', 'Gain', 'زيادة'],
  ['Mevcut kilo', 'Current weight', 'الوزن الحالي'],
  ['kg · isteğe bağlı', 'kg · optional', 'كغ · اختياري'],
  ['Hedef kilo', 'Target weight', 'الوزن المستهدف'],
  ['Senin için,', 'For you,', 'لك،'],
  ['senin hızında.', 'at your own pace.', 'وبإيقاعك الخاص.'],
  ['Hedefler değişebilir. Kendine iyi geleni keşfettikçe güncellemekten çekinme.', 'Goals can change. Update them as you discover what works for you.', 'يمكن أن تتغير الأهداف. حدّثها عندما تكتشف ما يناسبك.'],
  ['Hedefleri kaydet', 'Save goals', 'حفظ الأهداف'],
  ['Hedeflerin kaydedildi.', 'Your goals are saved.', 'تم حفظ أهدافك.'],
  ['Tekrar hoş geldin', 'Welcome back', 'مرحبًا بعودتك'],
  ['Denge hesabına giriş yap.', 'Sign in to your Denge account.', 'سجّل الدخول إلى حسابك في Denge.'],
  ['Şifreni gir', 'Enter your password', 'أدخل كلمة المرور'],
  ['Hesabına devam etmek için şifreni yaz.', 'Enter your password to continue.', 'أدخل كلمة المرور للمتابعة.'],
  ['Denge’ye hoş geldin', 'Welcome to Denge', 'أهلًا بك في Denge'],
  ['Kendine iyi bakmak için başlayalım.', 'Let’s start taking care of you.', 'لنبدأ رحلتك للاهتمام بنفسك.'],
  ['Kendine ayırdığın alana hoş geldin.', 'Welcome to your space.', 'مرحبًا بك في مساحتك الخاصة.'],
  ['İyi hissetmek için küçük bir başlangıç.', 'A small first step toward feeling good.', 'خطوة صغيرة نحو شعور أفضل.'],
  ['"{{name}}" kaydını silmek istiyor musun?', 'Delete the record "{{name}}"?', 'هل تريد حذف السجل "{{name}}"؟'],
  ['Bu aktivite kaydını silmek istiyor musun?', 'Delete this activity record?', 'هل تريد حذف سجل هذا النشاط؟'],
  ['Bu kilo kaydını silmek istiyor musun?', 'Delete this weight record?', 'هل تريد حذف سجل هذا الوزن؟'],
  ['Sayfa bulunamadı', 'Page not found', 'الصفحة غير موجودة'],
  ['Aradığın sayfa burada değil.', 'The page you are looking for is not here.', 'الصفحة التي تبحث عنها غير موجودة هنا.'],
  ['Ana sayfaya dön', 'Back to home', 'العودة إلى الصفحة الرئيسية'],
  ['Yulaf ezmesi', 'Oatmeal', 'الشوفان'],
  ['Yumurta', 'Egg', 'البيض'],
  ['Sade yoğurt', 'Plain yogurt', 'الزبادي السادة'],
  ['Tavuk göğsü', 'Chicken breast', 'صدر الدجاج'],
  ['Pirinç pilavı', 'Rice pilaf', 'أرز مطبوخ'],
  ['Mercimek çorbası', 'Lentil soup', 'شوربة العدس'],
  ['Elma', 'Apple', 'تفاحة'],
  ['Muz', 'Banana', 'موز'],
  ['Beyaz peynir', 'White cheese', 'جبنة بيضاء'],
  ['Bulgur pilavı', 'Bulgur pilaf', 'برغل مطبوخ'],
  ['Tam buğday ekmeği', 'Whole wheat bread', 'خبز القمح الكامل'],
  ['Avokado', 'Avocado', 'أفوكادو'],
];

function normalize(text: string) {
  return text.trim().toLocaleLowerCase('tr-TR');
}

const lookup = {
  en: new Map(pairs.map(([source, english]) => [normalize(source), english])),
  ar: new Map(pairs.map(([source, , arabic]) => [normalize(source), arabic])),
};

const foodNames = pairs.slice(-12);

export function translateText(text: string, locale: Locale, values?: Record<string, string | number>) {
  const interpolate = (value: string) => values
    ? value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(values[key] ?? ''))
    : value;
  if (locale === 'tr') return interpolate(text);
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const trimmed = text.trim();
  let translated = lookup[locale].get(normalize(trimmed));

  const food = foodNames.find(([source]) => normalize(trimmed) === normalize(source) || normalize(trimmed).startsWith(`${normalize(source)} ·`));
  if (!translated && food) {
    const translatedName = lookup[locale].get(normalize(food[0])) ?? food[0];
    translated = `${translatedName}${trimmed.slice(food[0].length)}`;
  }

  const recorded = !translated && trimmed.match(/^(.+?) kcal kaydedildi$/);
  if (recorded) translated = `${recorded[1]} ${locale === 'en' ? 'kcal logged' : 'سعرة حرارية مسجلة'}`;
  const remaining = !translated && trimmed.match(/^(.+?) kcal hedefe kalan$/);
  if (remaining) translated = `${remaining[1]} ${locale === 'en' ? 'kcal remaining to goal' : 'سعرة حرارية متبقية للهدف'}`;
  const portion = !translated && trimmed.match(/^(.+?) g · Protein (.+?) g · Karbonhidrat (.+?) g$/);
  if (portion) translated = `${portion[1]} g · ${locale === 'en' ? 'Protein' : 'البروتين'} ${portion[2]} g · ${locale === 'en' ? 'Carbohydrates' : 'الكربوهيدرات'} ${portion[3]} g`;
  const duration = !translated && trimmed.match(/^(.+?) dakika(?: · (.+?) km)?$/);
  if (duration) {
    const minutes = locale === 'en' ? 'min' : 'دقيقة';
    const distance = duration[2] ? ` · ${duration[2]} ${locale === 'en' ? 'km' : 'كم'}` : '';
    translated = `${duration[1]} ${minutes}${distance}`;
  }
  const count = !translated && trimmed.match(/^(.+?) kayıt$/);
  if (count) translated = `${count[1]} ${locale === 'en' ? 'records' : 'سجلات'}`;
  const distanceOnly = !translated && trimmed.match(/^·\s*(.+?)\s+km$/);
  if (distanceOnly) translated = `· ${distanceOnly[1]} ${locale === 'en' ? 'km' : 'كم'}`;
  const result = translated ? `${leading}${translated}${trailing}` : text;
  return interpolate(result);
}

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === 'tr' || value === 'ar' || value === 'en';
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'tr';
  const queryLocale = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(queryLocale)) return queryLocale;
  const saved = window.localStorage.getItem(localeStorageKey);
  return isLocale(saved) ? saved : 'tr';
}

export function getLocaleTag(locale = activeLocale) {
  return localeTags[locale];
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = initialLocale();
    activeLocale = initial;
    return initial;
  });
  const setLocale = useCallback((next: Locale) => {
    activeLocale = next;
    setLocaleState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeTags[locale];
    document.documentElement.dir = localeDirections[locale];
    document.title = locale === 'ar'
      ? 'Denge — توازن أفضل، بخطوات صغيرة'
      : locale === 'en'
        ? 'Denge — Feel better, one small step at a time'
        : 'Denge — Daha iyi hissetmek, küçük şeylerle başlar';
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useI18n must be used inside LocaleProvider');
  return { ...context, t: (text: string, values?: Record<string, string | number>) => translateText(text, context.locale, values) };
}

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const changeLocale = (value: string) => {
    setLocale(value as Locale);
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(window.history.state, '', url);
    }
  };
  return <label className="locale-switcher">
    <span className="sr-only">{t('Dil seç')}</span>
    <select value={locale} onChange={event => changeLocale(event.target.value)} aria-label={t('Dil seç')}>
      <option value="tr">Türkçe</option>
      <option value="ar">العربية</option>
      <option value="en">English</option>
    </select>
  </label>;
}

const translatableProps = new Set(['aria-label', 'placeholder', 'title', 'alt', 'eyebrow', 'note', 'label', 'unit']);

function translateNode(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === 'string') return translateText(node, locale);
  if (Array.isArray(node)) return Children.map(node, child => translateNode(child, locale));
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) return node;
  if (node.props['data-no-translate']) return node;

  const props: Record<string, unknown> = { ...node.props };
  if (props.children !== undefined) props.children = translateNode(props.children as ReactNode, locale);
  if (props.action !== undefined) props.action = translateNode(props.action as ReactNode, locale);
  for (const key of translatableProps) {
    if (typeof props[key] === 'string') props[key] = translateText(props[key] as string, locale);
  }
  return cloneElement(node, props);
}

export function LocaleText({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <>{Children.map(children, child => translateNode(child, locale))}</>;
}
