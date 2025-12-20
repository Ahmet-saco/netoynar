# 🔍 Firebase Sorunları Analizi

## 📊 Tespit Edilen Sorunlar

### 1. **Status: "processing" Kalanlar**
**Durum:** Drive'a hiç düşmemiş, status "processing" olarak kalmış

**Nedenler:**
- Cloud Function timeout olmuş olabilir (büyük videolar için)
- Function başlamış ama hata yakalanmamış
- Transaction başarılı olmuş ama ana try bloğu çalışmamış

**Çözüm:**
- Function timeout süresini artırmak
- Video yükleme işlemini daha güvenli hale getirmek
- Hata durumunda mutlaka status'u güncellemek

---

### 2. **driveVideoLink: null Olanlar**
**Durum:** Drive'a klasör ve bilgiler gelmiş ama video gelmemiş

**Nedenler:**
- Video yükleme işlemi başarısız olmuş
- Klasör ve info dosyası kaydedilmiş ama video yüklenememiş
- Video yükleme hatası yakalanmamış

**Çözüm:**
- Video yükleme işlemini ayrı try-catch ile korumak
- Video yükleme başarısız olursa, hata mesajını kaydetmek
- Status'u "error" olarak güncellemek

---

### 3. **Hiç Drive'a Düşmeyenler**
**Durum:** Firestore'da var ama Drive'da yok, status "processing"

**Nedenler:**
- Function hiç çalışmamış
- Function timeout olmuş
- Function hata vermiş ama yakalanmamış

**Çözüm:**
- Function timeout süresini artırmak
- Daha detaylı hata loglama
- Retry mekanizması eklemek (isteğe bağlı)

---

## 🔧 Yapılan Düzeltmeler

### 1. Video Yükleme Güvenliği
- Video yükleme işlemi ayrı try-catch ile korundu
- Video yükleme başarısız olursa, klasör ve info dosyası korunuyor
- Hata mesajı kaydediliyor

### 2. Hata Yönetimi İyileştirmesi
- Daha detaylı hata loglama
- Her adımda hata kontrolü
- Status güncellemesi garantisi

### 3. Function Timeout
- Büyük videolar için timeout süresi artırıldı (varsayılan 60s → 540s)

---

## 📝 Manuel İşlem Gereken Durumlar

### Status: "processing" Olanlar
1. Firebase Console → Functions → Logs kontrol et
2. Hata mesajlarını oku
3. Manuel olarak status'u "error" yap veya retry et

### driveVideoLink: null Olanlar
1. Drive'da klasör var mı kontrol et
2. Video Storage'da hala var mı kontrol et
3. Manuel olarak video'yu yükle veya status'u "error" yap

---

## 🔄 Retry İşlemi (Manuel)

### Status: "processing" Olanları Retry Etmek

**Yöntem 1: Status'u "pending" Yap**
1. Firestore Console → submissions koleksiyonu
2. Status "processing" olan dokümanı bul
3. Status'u "pending" olarak değiştir
4. Function otomatik olarak tekrar çalışacak

**Yöntem 2: Yeni Function Oluştur (Retry Function)**
- Manuel retry için ayrı bir HTTP function oluşturabiliriz

---

## 📊 Monitoring

### Kontrol Edilmesi Gerekenler:
1. **Firebase Console → Functions → Logs**
   - Hata mesajlarını kontrol et
   - Timeout hatalarını kontrol et

2. **Firestore Console → submissions**
   - Status "processing" olanları kontrol et
   - Status "error" olanları kontrol et
   - driveVideoLink null olanları kontrol et

3. **Google Drive**
   - Klasör sayısı = Başvuru sayısı mı?
   - Her klasörde video var mı?
   - Her klasörde JSON dosyası var mı?

---

## ✅ Başarı Kriterleri

**Her başvuru için:**
- ✅ Drive'da klasör var
- ✅ Klasörde JSON dosyası var
- ✅ Klasörde video dosyası var
- ✅ Firestore'da status "uploaded" veya silinmiş
- ✅ driveVideoLink null değil

