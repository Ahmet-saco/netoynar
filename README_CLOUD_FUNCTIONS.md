# Firebase Cloud Functions - Google Drive Entegrasyonu

Bu dokümantasyon, başvuru videolarını Firebase Storage'dan Google Drive'a aktaran Cloud Function'ı kurmak için gereken adımları açıklar.

## Gereksinimler

1. Firebase CLI kurulumu
2. Google Cloud Console erişimi
3. Google Drive API aktif
4. Service Account oluşturulması

## Kurulum Adımları

### 1. Firebase CLI Kurulumu

```bash
npm install -g firebase-tools
firebase login
```

### 2. Firebase Functions Klasörünü Başlat

```bash
cd functions
npm install
```

### 3. Google Cloud Console Ayarları

#### a) Google Drive API'yi Aktif Et
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Projenizi seçin: **netoynar-d0b41**
3. **APIs & Services** → **Library**
4. "Google Drive API" arayın ve **Enable** edin

#### b) Service Account Oluştur
1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **Service Account**
3. Service account adı: `drive-transfer-service`
4. **Create and Continue**
5. Role: **Editor** (veya **Storage Admin**)
6. **Done**

#### c) Service Account Key İndir
1. Oluşturduğunuz service account'a tıklayın
2. **Keys** sekmesi → **Add Key** → **Create new key**
3. **JSON** formatını seçin
4. İndirilen JSON dosyasını `functions/service-account-key.json` olarak kaydedin

#### d) Google Drive Klasörü Oluştur
1. Google Drive'da bir klasör oluşturun (örn: "Net Oynar Başvurular")
2. Klasöre sağ tıklayın → **Share**
3. Service account email'ini ekleyin (JSON dosyasındaki `client_email`)
4. **Editor** yetkisi verin
5. Klasör ID'sini alın (URL'den: `https://drive.google.com/drive/folders/FOLDER_ID`)

### 4. Environment Variables

`functions/.env` dosyası oluşturun (veya Firebase Functions config kullanın):

```bash
# Google Drive klasör ID'si
DRIVE_FOLDER_ID=your_folder_id_here
```

Veya Firebase config ile:

```bash
firebase functions:config:set drive.folder_id="your_folder_id_here"
```

### 5. Cloud Function'ı Deploy Et

```bash
firebase deploy --only functions
```

## Çalışma Mantığı

1. Kullanıcı formu doldurur ve video yükler
2. Video Firebase Storage'a kaydedilir
3. Firestore'a başvuru kaydı eklenir
4. Cloud Function otomatik tetiklenir (`onCreate` trigger)
5. Function:
   - Storage'dan videoyu indirir
   - Google Drive'a yükler
   - Drive linkini Firestore'a yazar
   - Status'u `uploaded` yapar

## Firestore Veri Yapısı

```javascript
{
  fullName: "string",
  age: number,
  position: "string",
  dominantFoot: "string",
  team: "string",
  city: "string",
  instagram: "string",
  videoStoragePath: "string",
  driveVideoLink: "string | null", // Cloud Function tarafından eklenir
  driveFileId: "string | null",    // Cloud Function tarafından eklenir
  status: "pending | processing | uploaded | error",
  createdAt: "timestamp",
  transferredAt: "timestamp | null" // Cloud Function tarafından eklenir
}
```

## Test Etme

1. Web uygulamasından bir başvuru gönderin
2. Firebase Console → Functions → Logs'u kontrol edin
3. Firestore'da `driveVideoLink` alanının doldurulduğunu kontrol edin
4. Google Drive klasöründe videoyu kontrol edin

## Sorun Giderme

### "Permission denied" hatası
- Service account'un Drive API erişimi olduğundan emin olun
- Klasör paylaşımında service account email'inin olduğunu kontrol edin

### "API not enabled" hatası
- Google Drive API'nin aktif olduğunu kontrol edin

### Function çalışmıyor
- Firebase Console → Functions → Logs'u kontrol edin
- Firestore trigger'ın doğru çalıştığını kontrol edin

