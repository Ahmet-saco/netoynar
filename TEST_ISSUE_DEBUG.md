# 🔍 Test Hatası - Debug Rehberi

## 🚨 Durum
- Status: `processing` (takılı kalmış)
- driveVideoLink: `null` (Drive'a gitmemiş)
- Cloud Function başladı ama tamamlanmadı

---

## 📋 Adım 1: Firebase Functions Logs Kontrolü

1. **Firebase Console** → **Functions** → **Logs**
2. Filtrele:
   - **Function:** `transferVideoToDrive`
   - **Time:** Son 1 saat
3. Şunları ara:
   - ❌ "Error transferring video to Drive"
   - ❌ "Video upload failed"
   - ❌ "Error stack"
   - ❌ "Failed to update status to error"

**Önemli:** Logları buraya kopyala!

---

## 📋 Adım 2: Frontend Console Kontrolü

1. **Tarayıcı Console'u aç** (F12)
2. Console sekmesinde şunları ara:
   - ❌ "Drive transfer failed"
   - ❌ "Snapshot listener error"
   - ✅ "Submission created successfully"
   - ✅ "Waiting for Drive transfer..."

**Önemli:** Console loglarını buraya kopyala!

---

## 📋 Adım 3: Google Drive Kontrolü

1. **Google Drive** → Ana klasör
2. Kontrol et:
   - ✅ Klasör oluşturulmuş mu? (ad: "ahmet sacit albayrak - ...")
   - ✅ JSON dosyası var mı?
   - ❌ Video dosyası var mı?

**Durum:**
- Klasör + JSON var, video yok → Video yükleme başarısız
- Hiçbir şey yok → Klasör oluşturma başarısız
- Hepsı var → Status güncelleme başarısız

---

## 🔧 Hızlı Çözüm: Manuel Status Kontrolü

Eğer Cloud Function hata verdi ama status'u güncelleyemediyse:

### Yöntem 1: Status'u "error" yap

1. **Firestore Console** → **submissions** → İlgili document
2. **status** alanını `error` olarak değiştir
3. Frontend hata mesajı gösterecek

### Yöntem 2: Status'u "pending" yap (Retry)

1. **Firestore Console** → **submissions** → İlgili document
2. **status** alanını `pending` olarak değiştir
3. Cloud Function tekrar çalışacak

**⚠️ ÖNEMLİ:** Önce logları kontrol et! Hata nedenini bulmadan retry yapma!

---

## 🔍 Olası Hata Nedenleri

### 1. Google Drive API Hatası
- OAuth token geçersiz
- Refresh token süresi dolmuş
- API quota aşıldı

### 2. Video Yükleme Hatası
- Video dosyası çok büyük
- Network timeout
- Google Drive API timeout

### 3. Status Güncelleme Hatası
- Firestore write permission hatası
- Network hatası
- Document silinmiş

---

## 📊 Log Format Örneği

**Başarılı Log:**
```
Processing submission: abc123
Step 1: Downloading video from Storage...
Video downloaded from Storage, size: 12345678 bytes
Step 2: Creating submission folder in Drive...
Submission folder created: folder123
Step 3: Saving submission info to Drive...
Submission info saved: file123
Step 4: Uploading video to Drive...
Video uploaded to Drive successfully: video123
Step 5: Updating Firestore with Drive links...
Video transferred to Drive successfully
```

**Hatalı Log:**
```
Processing submission: abc123
Step 1: Downloading video from Storage...
Error transferring video to Drive: [hata mesajı]
Error stack: [stack trace]
Failed to update status to error: [hata mesajı]
```

---

## 🚀 Sonraki Adımlar

1. ✅ Logları kontrol et
2. ✅ Hata nedenini bul
3. ✅ Çözümü uygula
4. ✅ Tekrar test et

**Logları paylaş, birlikte çözelim!** 🔧

