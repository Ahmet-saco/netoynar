# 🚀 Net Oynar - Canlıya Çıkış Planı
**Hedef:** Pazar gecesine kadar netoynar.com'da canlı olacak

---

## 📋 GENEL DURUM ÖZETİ

✅ **Hazır Olanlar:**
- Web uygulaması (Next.js) - Tasarım ve fonksiyonlar tamam
- Firebase bağlantısı - Firestore ve Storage hazır
- Cloud Functions - Drive'a aktarım sistemi çalışıyor
- Form validasyonu - Tüm kontroller yapılıyor

⚠️ **Yapılması Gerekenler:**
- Production testleri
- Güvenlik kontrolleri
- Deployment (Vercel)
- Domain bağlama
- Son kontroller

---

## 🎯 ADIM ADIM PLAN

### **1. HAZIRLIK AŞAMASI (Bugün - 2 saat)**

#### 1.1 Local Test
```bash
# Terminal'de web-app klasörüne git
cd web-app

# Bağımlılıkları yükle (eğer yapmadıysan)
npm install

# Build testi yap
npm run build

# Eğer hata varsa düzelt, yoksa devam et
```

**Kontrol Listesi:**
- [ ] Build başarılı mı? (Hata yoksa ✅)
- [ ] Tüm sayfalar açılıyor mu?
- [ ] Form çalışıyor mu?
- [ ] Video upload test edildi mi?

#### 1.2 Mobil ve Desktop Test
**Test Etmen Gerekenler:**
- [ ] **Telefonda (Chrome/Safari):**
  - Ana sayfa açılıyor mu?
  - Form doldurulabiliyor mu?
  - Video seçilebiliyor mu?
  - Video yükleniyor mu?
  - Başarı sayfası görünüyor mu?

- [ ] **Bilgisayarda (Chrome/Firefox):**
  - Tüm sayfalar düzgün görünüyor mu?
  - Animasyonlar çalışıyor mu?
  - Form validasyonu çalışıyor mu?

**Test Senaryoları:**
1. **Normal Kullanım:**
   - Formu doldur → Video seç → Gönder
   - Başarı mesajını gör

2. **Hata Senaryoları:**
   - Boş form göndermeyi dene (Hata vermeli)
   - Video seçmeden göndermeyi dene (Hata vermeli)
   - Çok büyük video yüklemeyi dene (70MB limit)

3. **Edge Cases:**
   - Uzun isimler yaz
   - Özel karakterler kullan (@, #, vs.)
   - Video yüklerken iptal et

---

### **2. GÜVENLİK KONTROLLERİ (Bugün - 1 saat)**

#### 2.1 Firebase Security Rules
Firebase Console'a git: https://console.firebase.google.com

**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{submissionId} {
      // Sadece yeni kayıt oluşturulabilir, okuma/yazma yok
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

**Storage Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{allPaths=**} {
      // Sadece video yükleme izni
      allow write: if request.resource.size < 70 * 1024 * 1024; // 70MB limit
      allow read: if false; // Videolar public değil
    }
  }
}
```

**Kontrol:**
- [ ] Firestore rules güncellendi mi?
- [ ] Storage rules güncellendi mi?
- [ ] Test başvurusu gönderildi mi?
- [ ] Firestore'da kayıt oluştu mu?

#### 2.2 Environment Variables Güvenliği
**ÖNEMLİ:** Firebase API key'ler public olabilir (NEXT_PUBLIC_ ile başlıyor), ama yine de:
- [ ] API key'ler doğru mu?
- [ ] Production'da farklı key kullanılıyor mu? (Şu an aynı, sorun yok)

#### 2.3 Rate Limiting (Opsiyonel - İleride)
Şimdilik gerek yok, ama çok fazla başvuru gelirse Firebase otomatik limit koyar.

---

### **3. DEPLOYMENT (Yarın - 2 saat)**

#### 3.1 Vercel Hesabı Oluştur
1. https://vercel.com → Sign Up
2. GitHub hesabınla giriş yap (önerilir)
3. Veya email ile kayıt ol

#### 3.2 Projeyi Vercel'e Bağla

**Yöntem 1: GitHub ile (Önerilen)**
1. Projeyi GitHub'a push et (eğer yoksa)
2. Vercel Dashboard → "Add New Project"
3. GitHub repo'yu seç
4. **Root Directory:** `web-app` seç (ÇOK ÖNEMLİ!)
5. Framework: Next.js (otomatik algılanır)
6. "Deploy" butonuna bas

**Yöntem 2: Manuel Upload**
1. Vercel Dashboard → "Add New Project"
2. "Upload" seç
3. `web-app` klasörünü zip'le ve yükle
4. Root Directory: `web-app` seç

#### 3.3 Environment Variables Ekle
Vercel Dashboard → Project → Settings → Environment Variables

**Şunları ekle:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_sQgcGOVJpqmMAJT5g1teW3qWpOCu3VY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=netoynar-d0b41.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=netoynar-d0b41
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=netoynar-d0b41.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816503665102
NEXT_PUBLIC_FIREBASE_APP_ID=1:816503665102:web:c8704de4f6e4930640fb9f
```

**ÖNEMLİ:** Her variable için "Production", "Preview", "Development" seçeneklerini işaretle!

#### 3.4 İlk Deploy
1. Environment variables eklendikten sonra
2. "Redeploy" butonuna bas
3. Build'in başarılı olmasını bekle (2-3 dakika)
4. Test URL'i al: `https://netoynar-xxxxx.vercel.app`

**Kontrol:**
- [ ] Build başarılı mı?
- [ ] Site açılıyor mu?
- [ ] Firebase bağlantısı çalışıyor mu? (Console'da hata var mı kontrol et)

---

### **4. DOMAIN BAĞLAMA (Yarın - 1 saat)**

#### 4.1 Vercel'de Domain Ekle
1. Vercel Dashboard → Project → Settings → Domains
2. "Add Domain" butonuna tıkla
3. `netoynar.com` yaz
4. Vercel size DNS ayarlarını gösterecek

#### 4.2 DNS Ayarları
Domain sağlayıcına git (GoDaddy, Namecheap, vs.)

**Vercel'in önerdiği kayıtları ekle:**
- Genelde şöyle olur:
  - **A Record:** `@` → `76.76.21.21` (Vercel'in verdiği IP)
  - **CNAME:** `www` → `cname.vercel-dns.com`

**Veya Vercel'in verdiği özel kayıtları kullan**

#### 4.3 SSL Sertifikası
- Vercel otomatik SSL sağlar
- Domain bağlandıktan 5-10 dakika sonra aktif olur
- `https://netoynar.com` çalışacak

**Kontrol:**
- [ ] DNS ayarları yapıldı mı?
- [ ] 10-15 dakika bekle (DNS yayılımı)
- [ ] https://netoynar.com açılıyor mu?
- [ ] SSL aktif mi? (Kilit ikonu görünüyor mu?)

---

### **5. PRODUCTION TESTLERİ (Pazar - 2 saat)**

#### 5.1 Canlı Site Testleri

**Test Senaryoları:**
1. **Ana Sayfa:**
   - [ ] https://netoynar.com açılıyor mu?
   - [ ] Tüm bölümler görünüyor mu?
   - [ ] Mobilde düzgün görünüyor mu?

2. **Form Testi:**
   - [ ] Form açılıyor mu?
   - [ ] Tüm alanlar çalışıyor mu?
   - [ ] Validasyon çalışıyor mu?
   - [ ] Video seçilebiliyor mu?
   - [ ] Video yükleniyor mu?
   - [ ] Başarı sayfası görünüyor mu?

3. **Backend Testi:**
   - [ ] Firestore'da kayıt oluşuyor mu?
   - [ ] Cloud Function tetikleniyor mu?
   - [ ] Google Drive'a video gidiyor mu?

**Test Adımları:**
```bash
# 1. Gerçek bir başvuru gönder
# 2. Firebase Console → Firestore → submissions koleksiyonuna bak
# 3. Kayıt var mı? status: "pending" mi?
# 4. Firebase Console → Functions → Logs'a bak
# 5. Function çalıştı mı? Hata var mı?
# 6. Google Drive klasörüne bak
# 7. Video orada mı?
```

#### 5.2 Farklı Cihazlarda Test
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Desktop (Chrome)
- [ ] Desktop (Firefox)
- [ ] Tablet (iPad)

#### 5.3 Performans Testi
- [ ] Sayfa yüklenme hızı (3 saniyeden az olmalı)
- [ ] Video upload hızı (internet hızına bağlı)
- [ ] Animasyonlar akıcı mı?

---

### **6. SON KONTROLLER (Pazar - 1 saat)**

#### 6.1 Checklist
- [ ] Tüm sayfalar çalışıyor mu?
- [ ] Form çalışıyor mu?
- [ ] Video upload çalışıyor mu?
- [ ] Firebase bağlantısı çalışıyor mu?
- [ ] Cloud Function çalışıyor mu?
- [ ] Google Drive'a aktarım yapılıyor mu?
- [ ] Mobilde sorun yok mu?
- [ ] Desktop'ta sorun yok mu?
- [ ] SSL aktif mi?
- [ ] Domain çalışıyor mu?

#### 6.2 Monitoring Kurulumu
**Firebase Console:**
- [ ] Functions → Logs'u kontrol et
- [ ] Firestore → Usage'ı kontrol et
- [ ] Storage → Usage'ı kontrol et

**Vercel Dashboard:**
- [ ] Analytics açık mı? (Opsiyonel)
- [ ] Error tracking var mı?

---

## 🐛 BUG KONTROLÜ

### Olası Sorunlar ve Çözümleri

#### 1. Build Hatası
**Sorun:** Vercel'de build başarısız
**Çözüm:**
```bash
# Local'de test et
cd web-app
npm run build

# Hata varsa düzelt
# Sonra tekrar deploy et
```

#### 2. Firebase Bağlantı Hatası
**Sorun:** Site açılıyor ama form çalışmıyor
**Çözüm:**
- Environment variables doğru mu kontrol et
- Browser console'da hata var mı bak
- Firebase Console'da rules doğru mu kontrol et

#### 3. Video Upload Hatası
**Sorun:** Video yüklenmiyor
**Çözüm:**
- Storage rules kontrol et
- Video boyutu 70MB'dan küçük mü?
- Browser console'da hata var mı?

#### 4. Cloud Function Çalışmıyor
**Sorun:** Video Drive'a gitmiyor
**Çözüm:**
- Firebase Console → Functions → Logs
- Hata mesajını oku
- Service account key doğru mu?
- Google Drive API aktif mi?

#### 5. Domain Çalışmıyor
**Sorun:** netoynar.com açılmıyor
**Çözüm:**
- DNS ayarlarını kontrol et
- 24-48 saat bekle (DNS yayılımı)
- https://dnschecker.org ile kontrol et

---

## 🔒 GÜVENLİK ÖNEMLİ NOTLAR

### ✅ Yapılanlar
- Firebase API key'ler public (NEXT_PUBLIC_) - Bu normal, sorun yok
- Firestore rules: Sadece create izni var
- Storage rules: 70MB limit var
- SSL aktif (Vercel otomatik sağlıyor)

### ⚠️ Dikkat Edilmesi Gerekenler
- **Service Account Key:** `netoynar-functions/service-account-key.json` dosyası GİT'E EKLENMEMELİ (zaten .gitignore'da)
- **Environment Variables:** Vercel'de güvenli saklanıyor ✅
- **Rate Limiting:** Şimdilik yok, ama Firebase otomatik koruma sağlar

### 🔐 İleride Yapılabilecekler
- Rate limiting ekle (çok fazla başvuru gelirse)
- CAPTCHA ekle (spam koruması)
- IP bazlı limit (aynı IP'den çok başvuru)

---

## 📱 KULLANICI DENEYİMİ

### ✅ Hazır Olanlar
- Responsive tasarım (mobil uyumlu)
- Form validasyonu
- Video upload progress
- Başarı/hata mesajları
- Animasyonlar

### ⚠️ Test Edilmesi Gerekenler
- Farklı telefon modellerinde
- Farklı tarayıcılarda
- Yavaş internet bağlantısında
- Büyük video dosyalarında

---

## 🎯 PAZAR GECESİ CHECKLIST

### Son 1 Saat Kontrolü
- [ ] https://netoynar.com açılıyor mu?
- [ ] Form çalışıyor mu?
- [ ] Test başvurusu gönderildi mi?
- [ ] Firestore'da kayıt var mı?
- [ ] Cloud Function çalıştı mı?
- [ ] Google Drive'a video gitti mi?
- [ ] Mobilde test edildi mi?
- [ ] Desktop'ta test edildi mi?

### Acil Durum Planı
Eğer bir sorun çıkarsa:
1. Vercel Dashboard → Deployments → Son deployment'ı kontrol et
2. Firebase Console → Functions → Logs'u kontrol et
3. Browser console'da hata var mı bak
4. Gerekirse eski deployment'a geri dön (Vercel'de rollback yapabilirsin)

---

## 📞 YARDIM KAYNAKLARI

### Dokümantasyon
- Vercel Docs: https://vercel.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Next.js Docs: https://nextjs.org/docs

### Test Araçları
- DNS Checker: https://dnschecker.org
- PageSpeed: https://pagespeed.web.dev
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

---

## ✅ BAŞARILI DEPLOYMENT KRİTERLERİ

Proje başarılı sayılır eğer:
1. ✅ https://netoynar.com açılıyor
2. ✅ Form çalışıyor
3. ✅ Video upload çalışıyor
4. ✅ Firestore'da kayıt oluşuyor
5. ✅ Cloud Function çalışıyor
6. ✅ Google Drive'a video gidiyor
7. ✅ Mobilde sorunsuz çalışıyor
8. ✅ Desktop'ta sorunsuz çalışıyor

---

## 🎉 SONUÇ

Bu planı takip edersen, Pazar gecesine kadar netoynar.com canlı olacak ve gerçek kullanıcılar başvuru gönderebilecek.

**Tahmini Süre:**
- Hazırlık: 2 saat
- Güvenlik: 1 saat
- Deployment: 2 saat
- Domain: 1 saat
- Test: 2 saat
- Son Kontrol: 1 saat
**TOPLAM: ~9 saat** (2-3 güne yayılabilir)

**Önemli:** Her adımı tamamladıktan sonra kontrol listesini işaretle. Bir sorun çıkarsa hemen çöz, sonraki adıma geçme.

Başarılar! 🚀

