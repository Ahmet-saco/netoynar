# 🚀 Net Oynar - Canlıya Çıkış Kontrol Listesi

## ✅ ÖN HAZIRLIK (Şimdi - 15 dakika)

### 1. Build Testi
```bash
cd web-app
npm run build
```
- [ ] Build başarılı mı? (Hata yoksa ✅)
- [ ] `.next` klasörü oluştu mu?

### 2. Firebase Security Rules Kontrolü
Firebase Console'a git: https://console.firebase.google.com/project/netoynar-d0b41

**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{submissionId} {
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
      allow write: if request.resource.size < 70 * 1024 * 1024;
      allow read: if false;
    }
  }
}
```

- [ ] Firestore rules güncellendi mi?
- [ ] Storage rules güncellendi mi?

---

## 🌐 VERCEL DEPLOYMENT (30-45 dakika)

### Adım 1: Vercel Hesabı
1. https://vercel.com → Sign Up (GitHub ile önerilir)
2. Hesap oluşturuldu mu? ✅

### Adım 2: Projeyi Bağla

**Yöntem A: GitHub ile (Önerilen)**
1. Projeyi GitHub'a push et (eğer yoksa)
2. Vercel Dashboard → "Add New Project"
3. GitHub repo'yu seç
4. **Root Directory:** `web-app` seç (ÇOK ÖNEMLİ!)
5. Framework: Next.js (otomatik)
6. "Deploy" butonuna bas

**Yöntem B: Manuel Upload**
1. Vercel Dashboard → "Add New Project"
2. "Upload" seç
3. `web-app` klasörünü zip'le ve yükle
4. Root Directory: `web-app` seç

- [ ] Proje Vercel'e bağlandı mı?

### Adım 3: Environment Variables Ekle
Vercel Dashboard → Project → Settings → Environment Variables

**Şunları ekle (Production, Preview, Development için hepsini işaretle):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_sQgcGOVJpqmMAJT5g1teW3qWpOCu3VY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=netoynar-d0b41.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=netoynar-d0b41
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=netoynar-d0b41.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816503665102
NEXT_PUBLIC_FIREBASE_APP_ID=1:816503665102:web:c8704de4f6e4930640fb9f
```

- [ ] Tüm environment variables eklendi mi?
- [ ] Her variable için Production, Preview, Development işaretlendi mi?

### Adım 4: İlk Deploy
1. Environment variables eklendikten sonra
2. "Redeploy" butonuna bas (veya otomatik deploy olur)
3. Build'in başarılı olmasını bekle (2-3 dakika)
4. Test URL'i al: `https://netoynar-xxxxx.vercel.app`

- [ ] Build başarılı mı?
- [ ] Site açılıyor mu?
- [ ] Browser console'da Firebase hatası var mı? (Yoksa ✅)

---

## 🔗 DOMAIN BAĞLAMA (15-30 dakika)

### Adım 1: Vercel'de Domain Ekle
1. Vercel Dashboard → Project → Settings → Domains
2. "Add Domain" butonuna tıkla
3. `netoynar.com` yaz
4. Vercel size DNS ayarlarını gösterecek

- [ ] Domain eklendi mi?

### Adım 2: DNS Ayarları
Domain sağlayıcına git (GoDaddy, Namecheap, vs.)

**Vercel'in önerdiği kayıtları ekle:**
- Genelde şöyle olur:
  - **A Record:** `@` → `76.76.21.21` (Vercel'in verdiği IP)
  - **CNAME:** `www` → `cname.vercel-dns.com`
- Veya Vercel'in verdiği özel kayıtları kullan

- [ ] DNS ayarları yapıldı mı?
- [ ] 10-15 dakika bekle (DNS yayılımı)
- [ ] https://netoynar.com açılıyor mu?
- [ ] SSL aktif mi? (Kilit ikonu görünüyor mu?)

---

## 🧪 PRODUCTION TESTLERİ (30 dakika)

### Test Senaryoları

**1. Ana Sayfa:**
- [ ] https://netoynar.com açılıyor mu?
- [ ] Tüm bölümler görünüyor mu?
- [ ] Mobilde düzgün görünüyor mu?
- [ ] Desktop'ta düzgün görünüyor mu?

**2. Form Testi:**
- [ ] Form açılıyor mu?
- [ ] Tüm alanlar çalışıyor mu?
- [ ] Validasyon çalışıyor mu?
- [ ] Video seçilebiliyor mu?
- [ ] Video yükleniyor mu?
- [ ] Başarı sayfası görünüyor mu?

**3. Backend Testi:**
- [ ] Firestore'da kayıt oluşuyor mu?
  - Firebase Console → Firestore → submissions koleksiyonuna bak
- [ ] Cloud Function tetikleniyor mu?
  - Firebase Console → Functions → Logs'a bak
- [ ] Google Drive'a video gidiyor mu?
  - Google Drive klasörüne bak

**4. Farklı Cihazlarda Test:**
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Desktop (Chrome)
- [ ] Desktop (Firefox)

---

## ✅ SON KONTROL (15 dakika)

### Checklist
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

---

## 🐛 SORUN ÇIKARSA

### Build Hatası
- Local'de `npm run build` çalıştır
- Hata varsa düzelt, sonra tekrar deploy et

### Firebase Bağlantı Hatası
- Environment variables doğru mu kontrol et
- Browser console'da hata var mı bak
- Firebase Console'da rules doğru mu kontrol et

### Video Upload Hatası
- Storage rules kontrol et
- Video boyutu 70MB'dan küçük mü?
- Browser console'da hata var mı?

### Cloud Function Çalışmıyor
- Firebase Console → Functions → Logs
- Hata mesajını oku
- Service account key doğru mu?

### Domain Çalışmıyor
- DNS ayarlarını kontrol et
- 24-48 saat bekle (DNS yayılımı)
- https://dnschecker.org ile kontrol et

---

## 🎉 BAŞARILI!

Eğer tüm checklist'ler ✅ ise:
- ✅ https://netoynar.com canlı!
- ✅ Kullanıcılar başvuru gönderebilir!
- ✅ Her şey çalışıyor!

**Tebrikler! 🚀**

