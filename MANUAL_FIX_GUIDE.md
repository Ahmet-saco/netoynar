# 🔧 Manuel Sorun Giderme Rehberi

## 📊 Mevcut Durum

- **Firestore'da:** 5-6 başvuru var
- **Drive'da:** 3 kullanıcı gelmiş
- **Sorunlar:**
  1. Bazı kayıtların `driveVideoLink` null (klasör var ama video yok)
  2. Bazı kayıtların status'u "processing" (Drive'a hiç düşmemiş)

---

## 🔍 Adım 1: Firestore Console'da Durumu Kontrol Et

1. **Firebase Console** → **Firestore Database** → **submissions** koleksiyonu
2. Her dökümanı kontrol et:
   - **status** alanı ne? (`pending`, `processing`, `uploaded`, `error`)
   - **driveVideoLink** var mı? (null mu?)
   - **driveFolderLink** var mı?
   - **errorMessage** var mı? (varsa oku)

### Durum Analizi:

**Status: "processing"** → Function timeout olmuş veya hata vermiş
**Status: "error"** → Hata mesajını kontrol et
**driveVideoLink: null** → Video yükleme başarısız olmuş ama klasör var
**driveFolderLink: null** → Hiç Drive'a gitmemiş

---

## 🔧 Adım 2: Cloud Functions Logs Kontrolü

1. **Firebase Console** → **Functions** → **Logs**
2. Her başvuru için logları kontrol et:
   - Hata mesajları var mı?
   - Timeout hataları var mı?
   - "Error transferring video to Drive" mesajları var mı?

### Log Mesajları:

```
Error transferring video to Drive: [hata mesajı]
Video upload failed: [hata mesajı]
```

---

## 🔧 Adım 3: Google Drive Kontrolü

1. **Google Drive** → Ana klasörü aç
2. Klasörleri kontrol et:
   - Kaç klasör var? (Firestore'daki kayıt sayısı ile karşılaştır)
   - Her klasörde **JSON dosyası** var mı?
   - Her klasörde **video dosyası** var mı?

### Eksik Video Durumu:

**Klasör var + JSON var + Video yok** → Video yükleme başarısız olmuş
**Klasör yok** → Function hiç çalışmamış veya klasör oluşturma başarısız

---

## 🛠️ Adım 4: Sorunları Düzelt

### Çözüm 1: Status "processing" Olanları Retry Et

#### Yöntem A: Manuel Status Değiştirme (Hızlı)

1. **Firestore Console** → **submissions** koleksiyonu
2. Status "processing" olan dökümanı bul
3. **Edit document** → **status** alanını `pending` olarak değiştir
4. **Update** → Function otomatik olarak tekrar çalışacak

#### Yöntem B: Retry Function Kullanma (Otomatik)

**Function deploy edildikten sonra:**

```bash
# Function URL'ini al (Firebase Console → Functions → retrySubmission)
https://[region]-[project-id].cloudfunctions.net/retrySubmission?submissionId=[submission-id]
```

**Örnek:**
```
https://us-central1-netoynar.cloudfunctions.net/retrySubmission?submissionId=abc123
```

**Tarayıcıda aç veya curl ile çağır:**
```bash
curl "https://us-central1-netoynar.cloudfunctions.net/retrySubmission?submissionId=abc123"
```

---

### Çözüm 2: driveVideoLink null Olanları Düzelt

**Durum:** Klasör var, JSON var, ama video yok

#### Seçenek 1: Storage'dan Video'yu Manuel Yükle

1. **Firebase Console** → **Storage** → Video dosyasını bul
2. Video'yu indir (büyükse zaman alabilir)
3. **Google Drive** → İlgili klasöre git
4. Video'yu manuel olarak yükle
5. **Firestore Console** → Dökümanı bul
6. `driveVideoLink` alanını güncelle:
   - Drive'da video'ya sağ tıkla → **Get link** → **Anyone with the link can view**
   - Link'i kopyala
   - Firestore'da `driveVideoLink` alanına yapıştır
   - Status'u `uploaded` olarak değiştir

#### Seçenek 2: Retry Function ile Tekrar Dene

1. Status'u `pending` yap (yukarıdaki Çözüm 1)
2. Function tekrar çalışacak
3. Bu sefer video yüklenebilir

---

### Çözüm 3: Hiç Drive'a Düşmeyenleri Retry Et

**Durum:** Status "processing", hiç Drive'a gitmemiş

1. **Firestore Console** → Dökümanı bul
2. **Storage'da video var mı kontrol et:**
   - Firebase Console → Storage → `videoStoragePath` alanındaki yolu kontrol et
   - Video yoksa → Kullanıcıdan tekrar göndermesini iste
   - Video varsa → Retry et (Çözüm 1)

3. **Status'u `pending` yap**
4. Function tekrar çalışacak

---

## 📋 Adım 5: Yeni Düzeltilmiş Kodu Deploy Et

**ÖNEMLİ:** Önce yeni kodu deploy et, sonra retry yap!

```bash
cd netoynar-functions
firebase deploy --only functions
```

**Deploy sonrası:**
- Function timeout süresi artırıldı (540 saniye = 9 dakika)
- Video yükleme ayrı try-catch ile korunuyor
- Daha detaylı hata loglama var
- Retry function eklendi

---

## 🔄 Adım 6: Retry İşlemi (Yeni Kod Deploy Edildikten Sonra)

### Senaryo 1: Status "processing" Olanlar

1. **Firestore Console** → Status "processing" olanları bul
2. Her birini retry et:
   - Status'u `pending` yap VEYA
   - Retry function'ı kullan
3. **Functions → Logs** kontrol et
4. Başarılı olup olmadığını kontrol et

### Senaryo 2: driveVideoLink null Olanlar

1. **Drive'da klasör var mı kontrol et**
2. **Storage'da video var mı kontrol et**
3. Status'u `pending` yap
4. Function tekrar çalışacak, bu sefer video yüklenebilir

---

## ✅ Başarı Kriterleri

**Her başvuru için:**
- ✅ Drive'da klasör var
- ✅ Klasörde JSON dosyası var
- ✅ Klasörde video dosyası var
- ✅ Firestore'da status "uploaded" veya silinmiş
- ✅ driveVideoLink null değil

---

## 🚨 Hala Çalışmıyorsa

### 1. Function Logs Detaylı İnceleme

```bash
# Firebase CLI ile logs
firebase functions:log --only transferVideoToDrive
```

### 2. Video Storage Kontrolü

- Video dosyası Storage'da var mı?
- Dosya bozuk mu?
- Dosya çok büyük mü? (70MB limit)

### 3. Google Drive API Kontrolü

- OAuth token geçerli mi?
- Refresh token geçerli mi?
- Drive API quota aşıldı mı?

### 4. Manuel İşlem

- Video'yu Storage'dan indir
- Drive'a manuel yükle
- Firestore'u güncelle

---

## 📊 Monitoring Checklist

**Günlük kontrol:**
- [ ] Firestore'da "processing" status'ünde kayıt var mı?
- [ ] Firestore'da "error" status'ünde kayıt var mı?
- [ ] Drive'da eksik video var mı?
- [ ] Function logs'da hata var mı?

**Haftalık kontrol:**
- [ ] Drive klasör sayısı = Başvuru sayısı mı?
- [ ] Tüm klasörlerde video var mı?
- [ ] Tüm klasörlerde JSON dosyası var mı?

---

## 🔐 Güvenlik Notu

**Retry Function:** Production'da authentication eklemelisiniz!

Şu anki hali güvensizdir, herkes çağırabilir. Production'da:

```javascript
// Örnek: API Key ile koruma
if (req.query.apiKey !== process.env.RETRY_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

VEYA

```javascript
// Firebase Auth ile koruma
const token = req.headers.authorization?.split('Bearer ')[1];
if (!token) {
  return res.status(401).json({ error: 'Unauthorized' });
}
// Token'ı verify et...
```

---

**ÖNEMLİ:** Yeni kodu deploy etmeden retry yapma! Önce deploy, sonra retry! 🚀

