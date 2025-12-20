# 🔒 Firebase Security Rules - Adım Adım Rehber

## 📍 Firebase Console'a Git

1. Tarayıcıda şu adrese git: **https://console.firebase.google.com**
2. Projeyi seç: **netoynar-d0b41**
3. Sol menüden **Firestore Database** veya **Storage** seç

---

## 🔥 1. FIRESTORE SECURITY RULES

### Adımlar:

1. **Firebase Console** → Sol menüden **"Firestore Database"** tıkla
2. Üst menüden **"Rules"** sekmesine tıkla
3. Şu an muhtemelen şöyle bir şey görüyorsun:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

4. **Tümünü sil** ve şunu yapıştır:
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

5. **"Publish"** butonuna tıkla
6. Onay mesajını bekle

### ✅ Kontrol:
- [ ] Rules güncellendi mi?
- [ ] "Publish" butonuna basıldı mı?
- [ ] Başarı mesajı göründü mü?

---

## 📦 2. STORAGE SECURITY RULES

### Adımlar:

1. **Firebase Console** → Sol menüden **"Storage"** tıkla
2. Üst menüden **"Rules"** sekmesine tıkla
3. Şu an muhtemelen şöyle bir şey görüyorsun:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if false;
       }
     }
   }
   ```

4. **Tümünü sil** ve şunu yapıştır:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /submissions/{allPaths=**} {
         // Sadece video yükleme izni (70MB limit)
         allow write: if request.resource.size < 70 * 1024 * 1024;
         // Videolar public değil (okuma izni yok)
         allow read: if false;
       }
     }
   }
   ```

5. **"Publish"** butonuna tıkla
6. Onay mesajını bekle

### ✅ Kontrol:
- [ ] Rules güncellendi mi?
- [ ] "Publish" butonuna basıldı mı?
- [ ] Başarı mesajı göründü mü?

---

## 🧪 3. TEST ET

### Firestore Testi:

1. Web uygulamasından bir test başvurusu gönder
2. **Firebase Console** → **Firestore Database** → **"Data"** sekmesine git
3. **"submissions"** koleksiyonunu kontrol et
4. Yeni bir kayıt oluştu mu? ✅

### Storage Testi:

1. Web uygulamasından video ile bir test başvurusu gönder
2. **Firebase Console** → **Storage** → **"Files"** sekmesine git
3. **"submissions"** klasörünü kontrol et
4. Video yüklendi mi? ✅

### ❌ Hata Alırsan:

**"Permission denied" hatası:**
- Rules'ları tekrar kontrol et
- "Publish" butonuna bastın mı?
- Tarayıcıyı yenile (F5)

**"Size limit exceeded" hatası:**
- Video 70MB'dan büyük mü?
- Storage rules'da limit doğru mu? (70 * 1024 * 1024)

---

## 📝 ÖNEMLİ NOTLAR

### Bu Rules Ne Yapıyor?

**Firestore:**
- ✅ Kullanıcılar yeni başvuru oluşturabilir (`create`)
- ❌ Kimse başvuruları okuyamaz (`read: false`)
- ❌ Kimse başvuruları güncelleyemez (`update: false`)
- ❌ Kimse başvuruları silemez (`delete: false`)

**Storage:**
- ✅ Kullanıcılar video yükleyebilir (`write`)
- ✅ Video boyutu 70MB'dan küçük olmalı
- ❌ Kimse videoları indiremez (`read: false`)

### Güvenlik:
- ✅ Sadece yeni kayıt oluşturulabilir
- ✅ Videolar public değil
- ✅ Kimse verileri okuyamaz/güncelleyemez/silemez
- ✅ Cloud Function'lar admin yetkisiyle çalışır (rules'dan etkilenmez)

---

## ✅ TAMAMLANDI!

Eğer:
- [x] Firestore rules güncellendi
- [x] Storage rules güncellendi
- [x] Test başvurusu gönderildi
- [x] Firestore'da kayıt oluştu
- [x] Storage'da video yüklendi

**O zaman hazırsın! 🚀**

Artık Vercel deployment'a geçebilirsin.

