# Deployment Rehberi - Net Oynar Başvuru Sistemi

## Domain
- **Domain:** netoynar.com
- **Başvuru URL:** https://netoynar.com/basvur

## Deployment Adımları

### 1. Vercel Hesabı ve Proje Hazırlığı

#### a) Vercel Hesabı Oluştur
1. [Vercel](https://vercel.com) → Sign Up
2. GitHub/GitLab/Bitbucket ile giriş yap (önerilir)

#### b) Vercel CLI Kurulumu (Opsiyonel)
```bash
npm install -g vercel
vercel login
```

### 2. Projeyi Vercel'e Deploy Et

#### Yöntem 1: Vercel Dashboard (Önerilen)
1. [Vercel Dashboard](https://vercel.com/dashboard) → "Add New Project"
2. GitHub repo'yu bağla (veya manuel upload)
3. **Root Directory:** `web-app` seç
4. **Framework Preset:** Next.js
5. **Build Command:** `npm run build` (otomatik)
6. **Output Directory:** `.next` (otomatik)

#### Yöntem 2: Vercel CLI
```bash
cd web-app
vercel
```

### 3. Environment Variables Ekleme

Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_sQgcGOVJpqmMAJT5g1teW3qWpOCu3VY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=netoynar-d0b41.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=netoynar-d0b41
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=netoynar-d0b41.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=816503665102
NEXT_PUBLIC_FIREBASE_APP_ID=1:816503665102:web:c8704de4f6e4930640fb9f
```

**Önemli:** Her environment variable için "Production", "Preview", "Development" seçeneklerini işaretle.

### 4. Domain Bağlama

#### a) Vercel Dashboard'da
1. Project → Settings → Domains
2. "Add Domain" butonuna tıkla
3. `netoynar.com` yaz
4. Vercel size DNS ayarlarını gösterecek

#### b) DNS Ayarları (Domain sağlayıcınızda)
Domain sağlayıcınızın DNS ayarlarına gidin ve şunları ekleyin:

**A Record:**
- Type: A
- Name: @ (veya boş)
- Value: Vercel'in verdiği IP adresi (genelde 76.76.21.21)

**CNAME Record (www için):**
- Type: CNAME
- Name: www
- Value: cname.vercel-dns.com

**Veya Vercel'in önerdiği DNS kayıtlarını kullanın**

### 5. SSL Sertifikası
- Vercel otomatik olarak SSL sertifikası sağlar (Let's Encrypt)
- Domain bağlandıktan sonra birkaç dakika içinde aktif olur

### 6. Production Test

#### Kontrol Listesi:
- [ ] https://netoynar.com açılıyor mu?
- [ ] https://netoynar.com/basvur açılıyor mu?
- [ ] Form çalışıyor mu?
- [ ] Video upload çalışıyor mu?
- [ ] Firebase bağlantısı çalışıyor mu?
- [ ] Cloud Function tetikleniyor mu?
- [ ] Google Drive'a aktarım yapılıyor mu?

### 7. Firebase Hosting (Opsiyonel - Alternatif)

Eğer Vercel yerine Firebase Hosting kullanmak isterseniz:

```bash
cd web-app
npm run build
firebase init hosting
firebase deploy --only hosting
```

## Önemli Notlar

### Firebase Rules Kontrolü
Production'da Firestore ve Storage rules'larını kontrol edin:
- Firestore: `allow create: if true` (başvuru için yeterli)
- Storage: `allow write: if true` (video upload için yeterli)

### Cloud Functions
Cloud Functions zaten deploy edilmiş durumda. Production'da da çalışmaya devam edecek.

### Monitoring
- Vercel Analytics (opsiyonel)
- Firebase Console → Functions → Logs
- Firebase Console → Firestore → Usage

## Sorun Giderme

### Domain çalışmıyor
- DNS ayarlarının yayılması 24-48 saat sürebilir
- DNS checker tool kullanın: https://dnschecker.org

### Environment variables çalışmıyor
- Vercel Dashboard'da "Redeploy" yapın
- Environment variables'ların doğru olduğundan emin olun

### Build hatası
- Vercel Dashboard → Deployments → Logs'u kontrol edin
- Local'de `npm run build` çalıştırıp hataları kontrol edin

