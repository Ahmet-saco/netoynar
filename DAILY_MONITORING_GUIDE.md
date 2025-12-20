# 📊 Net Oynar - Günlük Takip Rehberi

## 🎯 Günlük Kontrol Noktaları (5-10 dakika)

### 1. Vercel Dashboard (2 dakika)
**URL:** https://vercel.com/dashboard

**Kontrol Et:**
- ✅ Son deployment başarılı mı? (yeşil tik)
- ✅ Build hatası var mı? (kırmızı X)
- ✅ Site açılıyor mu? (Visit butonuna tıkla)
- ✅ Domain çalışıyor mu? (`netoynar.com`)

**Nerede:**
- Dashboard → Projen → **Deployments** sekmesi
- En son deployment'ı kontrol et

**Sorun Varsa:**
- Build Logs'a bak
- Runtime Logs'a bak
- Hata mesajını oku

---

### 2. Firebase Console (3 dakika)
**URL:** https://console.firebase.google.com/project/netoynar-d0b41

#### 2.1 Firestore Database
**Nerede:** Firestore Database → **Data** sekmesi

**Kontrol Et:**
- ✅ Yeni başvurular geliyor mu? (`submissions` koleksiyonu)
- ✅ Error status'lu kayıt var mı? (varsa sorun var)
- ✅ Kayıt sayısı normal mi? (anormal artış spam olabilir)

**Ne Yapmalı:**
- Error status'lu kayıt varsa → Functions Logs'a bak
- Çok fazla kayıt varsa → Spam kontrolü yap

#### 2.2 Storage
**Nerede:** Storage → **Files** sekmesi

**Kontrol Et:**
- ✅ Video yüklemeleri çalışıyor mu? (`submissions` klasörü)
- ✅ Storage kullanımı normal mi? (anormal artış sorun olabilir)

**Ne Yapmalı:**
- Video yüklenmiyorsa → Functions Logs'a bak
- Storage doluyorsa → Eski videoları temizle (Drive'a aktarıldıysa)

#### 2.3 Functions (Cloud Functions)
**Nerede:** Functions → **Logs** sekmesi

**Kontrol Et:**
- ✅ Function çalışıyor mu? (yeni başvurularda tetikleniyor mu?)
- ✅ Hata var mı? (kırmızı hata mesajları)
- ✅ Başarılı işlemler var mı? (yeşil loglar)

**Ne Yapmalı:**
- Hata varsa → Hata mesajını oku
- Function çalışmıyorsa → Deploy kontrolü yap

---

### 3. Google Drive (2 dakika)
**URL:** Google Drive klasörüne git

**Kontrol Et:**
- ✅ Yeni başvurular geliyor mu? (yeni klasörler oluşuyor mu?)
- ✅ Video dosyaları var mı?
- ✅ JSON dosyaları var mı? (başvuru bilgileri)

**Ne Yapmalı:**
- Yeni başvuru yoksa → Firebase Console'da kontrol et
- Video yoksa → Functions Logs'a bak

---

### 4. Canlı Site Testi (2 dakika)
**URL:** https://netoynar.com

**Kontrol Et:**
- ✅ Site açılıyor mu?
- ✅ Form çalışıyor mu?
- ✅ Mobilde düzgün görünüyor mu?
- ✅ Browser console'da hata var mı? (F12 → Console)

**Ne Yapmalı:**
- Site açılmıyorsa → Vercel Dashboard'a bak
- Form çalışmıyorsa → Browser console'a bak
- Hata varsa → Firebase Console'a bak

---

## 🚨 Acil Durum Kontrolleri

### Site Açılmıyor
1. Vercel Dashboard → Deployments → Son deployment'ı kontrol et
2. Build hatası var mı?
3. Domain çalışıyor mu? (DNS kontrolü)

### Form Çalışmıyor
1. Browser console'u aç (F12 → Console)
2. Firebase hatası var mı?
3. Firebase Console → Firestore Rules kontrol et

### Başvurular Gelmiyor
1. Firebase Console → Firestore → submissions koleksiyonu
2. Yeni kayıt var mı?
3. Functions Logs'a bak (function çalışıyor mu?)

### Video Drive'a Gitmiyor
1. Firebase Console → Functions → Logs
2. Function tetikleniyor mu?
3. Hata mesajı var mı?
4. Google Drive klasörüne bak

---

## 📈 Haftalık Kontroller (10-15 dakika)

### 1. Analytics (Opsiyonel)
- Vercel Analytics açık mı?
- Kullanıcı sayısı normal mi?
- Hangi sayfalar daha çok ziyaret ediliyor?

### 2. Storage Kullanımı
- Firebase Storage kullanımı normal mi?
- Google Drive klasörü doluyor mu?
- Eski videoları temizlemek gerekir mi?

### 3. Firestore Kullanımı
- Kayıt sayısı normal mi?
- Error status'lu kayıt var mı?
- Temizlik yapmak gerekir mi?

---

## 🔧 Sorun Giderme Hızlı Rehberi

### Problem: Site Açılmıyor
**Çözüm:**
1. Vercel Dashboard → Deployments → Son deployment'ı kontrol et
2. Build hatası varsa → Build Logs'a bak
3. Domain sorunu varsa → DNS kontrolü yap

### Problem: Form Çalışmıyor
**Çözüm:**
1. Browser console'u aç (F12 → Console)
2. Firebase hatası var mı kontrol et
3. Environment Variables doğru mu kontrol et (Vercel Dashboard)

### Problem: Başvurular Drive'a Gitmiyor
**Çözüm:**
1. Firebase Console → Functions → Logs
2. Function tetikleniyor mu?
3. Hata mesajı var mı?
4. Cloud Function'ı redeploy et

### Problem: Duplicate Başvurular
**Çözüm:**
1. Frontend'de duplicate submit kontrolü var mı?
2. Cloud Function'da idempotency kontrolü çalışıyor mu?
3. Functions Logs'a bak

---

## 📱 Mobil Kontrol

### Haftada Bir Kez
- Telefonda site açılıyor mu?
- Form çalışıyor mu?
- Video yükleniyor mu?
- Tüm sayfalar düzgün görünüyor mu?

---

## 🎯 Önemli Linkler

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com/project/netoynar-d0b41
- **Canlı Site:** https://netoynar.com
- **DNS Checker:** https://dnschecker.org

---

## ✅ Günlük Checklist (5 dakika)

- [ ] Vercel Dashboard → Son deployment başarılı mı?
- [ ] Firebase Console → Firestore → Yeni başvurular var mı?
- [ ] Firebase Console → Functions → Logs → Hata var mı?
- [ ] Google Drive → Yeni başvurular geliyor mu?
- [ ] Canlı site → Site açılıyor mu? (https://netoynar.com)

**Tüm checklist'ler ✅ ise → Her şey normal! 🎉**

---

## 🆘 Acil Durum İletişim

Eğer ciddi bir sorun varsa:
1. Vercel Dashboard → Support
2. Firebase Console → Support
3. Hata mesajlarını kaydet
4. Screenshot al

---

## 📊 Monitoring Araçları (Opsiyonel - İleride)

### Vercel Analytics
- Kullanıcı sayısı
- Sayfa görüntüleme
- Hata oranları

### Firebase Analytics
- Kullanıcı davranışları
- Form tamamlama oranları
- Hata takibi

### Sentry (Opsiyonel)
- Frontend hata takibi
- Detaylı hata raporları

---

**Not:** Bu rehberi günlük olarak takip edersen, sorunları erken tespit edebilirsin! 🚀

