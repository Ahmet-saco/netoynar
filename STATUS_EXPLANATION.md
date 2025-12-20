# 📊 Status Alanları Açıklaması

## 🔄 Status Akışı

### 1. **`pending`** (Beklemede)
**Ne zaman oluşur:**
- Frontend'den form gönderildiğinde
- Firestore'a yeni document oluşturulduğunda

**Ne anlama gelir:**
- Başvuru henüz işlenmeye başlanmadı
- Cloud Function henüz tetiklenmedi veya henüz işleme başlamadı

**Durum:**
```javascript
{
  status: 'pending',
  createdAt: timestamp,
  videoStoragePath: 'submissions/...',
  driveVideoLink: null
}
```

---

### 2. **`processing`** (İşleniyor) ⚠️
**Ne zaman oluşur:**
- Cloud Function başladığında
- Transaction ile güvenli şekilde `pending` → `processing` olarak güncellenir

**Ne anlama gelir:**
- Cloud Function şu anda çalışıyor
- Video Storage'dan indiriliyor
- Klasör oluşturuluyor
- JSON dosyası kaydediliyor
- Video Drive'a yükleniyor
- **İŞLEM DEVAM EDİYOR**

**Durum:**
```javascript
{
  status: 'processing',
  processingStartedAt: timestamp,
  createdAt: timestamp,
  videoStoragePath: 'submissions/...',
  driveVideoLink: null  // Henüz yüklenmedi
}
```

**⚠️ ÖNEMLİ:**
- Status `processing` olarak kalıyorsa = Cloud Function çalışıyor ama tamamlanmadı
- Bu durumda:
  - ✅ Normal: İşlem devam ediyor, biraz bekle
  - ❌ Sorun: İşlem takıldı (timeout, hata, vs.)

---

### 3. **`uploaded`** (Yüklendi - Başarılı) ✅
**Ne zaman oluşur:**
- Video başarıyla Drive'a yüklendikten sonra
- Tüm işlemler başarılı olduktan sonra

**Ne anlama gelir:**
- ✅ Video Drive'a yüklendi
- ✅ JSON dosyası Drive'da
- ✅ Klasör oluşturuldu
- ✅ Tüm bilgiler Drive'da güvende

**Durum:**
```javascript
{
  status: 'uploaded',
  driveVideoLink: 'https://drive.google.com/file/d/...',
  driveFolderLink: 'https://drive.google.com/drive/folders/...',
  driveFileId: '...',
  driveFolderId: '...',
  driveInfoFileId: '...',
  transferredAt: timestamp
}
```

**Sonra ne olur:**
- Document Firestore'dan silinir (veriler Drive'da güvende)

---

### 4. **`error`** (Hata) ❌
**Ne zaman oluşur:**
- Video yükleme başarısız olduğunda
- Herhangi bir işlem başarısız olduğunda
- Hata yakalandığında

**Ne anlama gelir:**
- ❌ İşlem başarısız oldu
- ❌ Video Drive'a gitmedi (veya klasör/JSON silindi)
- ❌ Hata mesajı kaydedildi

**Durum:**
```javascript
{
  status: 'error',
  errorMessage: 'Video upload failed: ...',
  errorOccurredAt: timestamp,
  errorStack: '...'  // (varsa)
}
```

**Ne yapılmalı:**
- Hata mesajını kontrol et
- Manuel retry yap veya sorunu çöz

---

## 🔍 Status `processing` Olarak Kalıyorsa

### Olası Nedenler:

1. **Normal Durum** ⏳
   - İşlem devam ediyor
   - Video yükleniyor
   - Biraz bekle, tamamlanacak

2. **Timeout** ⚠️
   - Video çok büyük
   - İşlem çok uzun sürdü
   - Function timeout oldu (540 saniye = 9 dakika)

3. **Hata Oluştu Ama Yakalanmadı** ❌
   - Exception throw edildi ama catch bloğu çalışmadı
   - Status güncellenemedi
   - Function crash oldu

4. **Duplicate Trigger** ⚠️
   - Aynı document için birden fazla function çalıştı
   - Transaction koruması çalıştı ama status güncellenemedi

---

## 🔧 Ne Yapmalı?

### Status `processing` Kaldığında:

1. **Firebase Functions Logs Kontrol Et**
   ```
   Firebase Console → Functions → Logs
   → transferVideoToDrive function'ını filtrele
   → Hata mesajları var mı kontrol et
   ```

2. **Manuel Retry Yap**
   - Status'u `pending` yap
   - Function tekrar çalışacak

3. **Hata Varsa**
   - Status'u `error` yap
   - Hata mesajını ekle
   - Manuel olarak düzelt

---

## 📋 Özet

| Status | Anlamı | Drive'da Veri Var mı? | Ne Yapılmalı? |
|--------|--------|----------------------|---------------|
| `pending` | Beklemede | ❌ Hayır | Bekle, function başlayacak |
| `processing` | İşleniyor | ❓ Belirsiz | Logları kontrol et, bekle |
| `uploaded` | Başarılı | ✅ Evet | ✅ Her şey tamam |
| `error` | Hata | ❌ Hayır (veya eksik) | Hata mesajını kontrol et, retry yap |

---

## ⚡ Hızlı Kontrol

**Status `processing` görüyorsan:**
1. ✅ Normal: Function çalışıyor, bekle (max 9 dakika)
2. ⚠️ Sorun: 10 dakikadan fazla `processing` → Logları kontrol et
3. ❌ Hata: `error` status'üne çevir, retry yap

---

**Status `processing` = Cloud Function şu anda çalışıyor, işlem devam ediyor!** 🔄

