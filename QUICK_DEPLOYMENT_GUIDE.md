# 🚀 Net Oynar - Hızlı Canlıya Çıkış Rehberi

## ✅ ADIM 1: Build Testi (5 dakika)

Terminal'de şunu çalıştır:
```bash
cd web-app
npm run build
```

**Kontrol:**
- [ ] Build başarılı mı? (Hata yoksa ✅)
- [ ] `.next` klasörü oluştu mu?

**Eğer hata varsa:** Hata mesajını gönder, düzeltelim.

---

## 🌐 ADIM 2: Vercel Deployment (30-45 dakika)

### 2.1 Vercel Hesabı Oluştur
1. https://vercel.com → **Sign Up**
2. GitHub hesabınla giriş yap (önerilir) veya email ile kayıt ol
3. Hesap oluşturuldu mu? ✅

### 2.2 Projeyi Vercel'e Bağla

**Yöntem A: GitHub ile (Önerilen - Daha kolay)**
1. Projeyi GitHub'a push et (eğer yoksa):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <github-repo-url>
   git push -u origin main
   ```
2. Vercel Dashboard → **"Add New Project"**
3. GitHub repo'yu seç
4. **Root Directory:** `web-app` seç (ÇOK ÖNEMLİ!)
5. Framework: Next.js (otomatik algılanır)
6. **"Deploy"** butonuna bas

**Yöntem B: Manuel Upload (GitHub yoksa)**
1. Vercel Dashboard → **"Add New Project"**
2. **"Upload"** seç
3. `web-app` klasörünü zip'le ve yükle
4. Root Directory: `web-app` seç
5. **"Deploy"** butonuna bas

- [ ] Proje Vercel'e bağlandı mı?

### 2.3 Environment Variables Ekle
Vercel Dashboard → Project → **Settings** → **Environment Variables**

**Şunları ekle (her biri için Production, Preview, Development işaretle):**

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_sQgcGOVJpqmMAJT5g1teW3qWpOCu3VY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=netoynar-d0b41.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=netoynar-d0b41
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=netoynar-d0b41.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816503665102
NEXT_PUBLIC_FIREBASE_APP_ID=1:816503665102:web:c8704de4f6e4930640fb9f
```

**ÖNEMLİ:** Her variable ekledikten sonra:
- ✅ Production
- ✅ Preview  
- ✅ Development

Hepsini işaretle!

- [ ] Tüm 6 environment variable eklendi mi?
- [ ] Her biri için 3 environment (Production, Preview, Development) işaretlendi mi?

### 2.4 İlk Deploy
1. Environment variables eklendikten sonra
2. **"Redeploy"** butonuna bas (veya otomatik deploy olur)
3. Build'in başarılı olmasını bekle (2-3 dakika)
4. Test URL'i al: `https://netoynar-xxxxx.vercel.app`

**Kontrol:**
- [ ] Build başarılı mı? (Vercel dashboard'da yeşil ✅)
- [ ] Site açılıyor mu? (Test URL'ine git)
- [ ] Browser console'da Firebase hatası var mı? (F12 → Console, hata yoksa ✅)

---

## 🔗 ADIM 3: Domain Bağlama (15-30 dakika)

### 3.1 Vercel'de Domain Ekle
1. Vercel Dashboard → Project → **Settings** → **Domains**
2. **"Add Domain"** butonuna tıkla
3. `netoynar.com` yaz
4. Vercel size DNS ayarlarını gösterecek

- [ ] Domain eklendi mi?

### 3.2 DNS Ayarları
Domain sağlayıcına git (GoDaddy, Namecheap, vs.)

**Vercel'in önerdiği kayıtları ekle:**
- Genelde şöyle olur:
  - **A Record:** `@` → `76.76.21.21` (Vercel'in verdiği IP)
  - **CNAME:** `www` → `cname.vercel-dns.com`
- Veya Vercel'in verdiği özel kayıtları kullan

**ÖNEMLİ:** Vercel'in gösterdiği DNS kayıtlarını kullan!

- [ ] DNS ayarları yapıldı mı?
- [ ] 10-15 dakika bekle (DNS yayılımı)
- [ ] https://netoynar.com açılıyor mu?
- [ ] SSL aktif mi? (Kilit ikonu görünüyor mu?)

---

## 🧪 ADIM 4: Production Testleri (30 dakika)

### Test Senaryoları

**1. Ana Sayfa:**
- [ ] https://netoynar.com açılıyor mu?
- [ ] Tüm bölümler görünüyor mu?
- [ ] Mobilde düzgün görünüyor mu?
- [ ] Desktop'ta düzgün görünüyor mu?

**2. Form Testi:**
- [ ] Form açılıyor mu?
- [ ] Video seçilebiliyor mu?
- [ ] Video yükleniyor mu?
- [ ] Tüm alanlar çalışıyor mu?
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
- Browser console'da hata var mı bak (F12 → Console)
- Firebase Console'da rules doğru mu kontrol et

### Video Upload Hatası
- Storage rules kontrol et (70MB limit)
- Video boyutu 70MB'dan küçük mü?
- Browser console'da hata var mı?

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

---

## 📞 HIZLI YARDIM

**Vercel Dashboard:** https://vercel.com/dashboard
**Firebase Console:** https://console.firebase.google.com/project/netoynar-d0b41
**DNS Checker:** https://dnschecker.org

