# PRD — Biz Net Oynar Oyuncu Başvuru Akışı

## 1. Product Overview

Biz Net Oynar, amatör liglerde oynayan yetenekli futbolcuları keşfetmeye odaklanan bir futbol medya platformudur.
Bu proje, futbolcuların video ve bilgilerini profesyonel, akıcı ve güven veren bir deneyimle gönderebilecekleri web tabanlı bir başvuru akışı oluşturmayı amaçlar.

**Hedef deneyim:**

"Bir form dolduruyorum" değil,
"Bir platforma başvuruyorum" hissi.

## 2. Goals (Amaçlar)

- Kullanıcıya mobil uygulama hissi veren akış
- Video upload sürecinin net, hızlı ve güvenli olması
- Başvurunun sonunda tatmin edici bir teşekkür deneyimi
- Teknik olarak sade, sürdürülebilir ve ölçeklenebilir yapı

## 3. Target Users

- 15–35 yaş arası amatör futbolcular
- Mobil cihazdan giriş yapan kullanıcılar (öncelik)
- Teknik bilgisi olmayan kullanıcılar

## 4. Tech Stack (Varsayılan)

- **Frontend:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Backend:** Firebase
  - Firestore (metadata)
  - Firebase Storage (video upload – geçici)
- **Permanent Storage:** Google Drive (Cloud Function ile aktarım)
- **Deployment:** Vercel
- **Domain:** biznetoynar.co

## 5. User Flow (Kritik Kısım)

### 5.1 Entry

Kullanıcı `biznetoynar.co/basvur` adresine gelir

### 5.2 Splash / Welcome Screen

- Net Oynar logosu ortada
- Hafif fade / scale animasyonu
- Kısa metin:
  - "Amatörde parlayan yetenekleri keşfediyoruz"
- CTA Button:
  - "Başvur"

### 5.3 Application Form Screen

Tek sayfa, kart tasarım.

**Form Alanları (sırayla):**

1. Ad Soyad
2. Yaş
3. Pozisyon (dropdown)
4. Baskın Ayağın (Sağ / Sol / Her İkisi)
5. Takım Adı
6. Şehir
7. Instagram Kullanıcı Adı
8. Video Upload
   - Toplam ~40 saniye
   - Video formatı
   - Upload progress bar
9. Paylaşım ve kullanım izni (zorunlu checkbox)

**UX Gereksinimleri:**

- Boş alanlar submit edilememeli
- Upload sırasında yüzde (%) gösterilmeli
- Submit sırasında buton disable + loading state

### 5.4 Submission Flow

Submit'e basılınca:

- Metadata → Firestore
- Video → Firebase Storage

**UI state:**

- "Videon yükleniyor…"
- "Başvurun alınıyor…"

### 5.5 Success / Thank You Screen

- Animasyonlu geçiş
- Onay ikonu (check)
- Metin:
  - "Başvurun başarıyla alındı"
  - "Videon inceleme sırasına eklendi"
- Ekstra:
  - "Biz Net Oynar" logosu
  - Kullanıcıya güven veren kısa kapanış

## 6. Data Model

### Firestore — submissions collection

```json
{
  "fullName": "string",
  "age": number,
  "position": "string",
  "dominantFoot": "string",
  "team": "string",
  "city": "string",
  "instagram": "string",
  "videoStoragePath": "string",
  "driveVideoLink": "string | null",
  "status": "pending | processing | uploaded",
  "createdAt": "timestamp"
}
```

## 7. File Handling Logic

1. Video ilk olarak Firebase Storage'a yüklenir
2. Cloud Function tetiklenir:
   - Video → Google Drive klasörüne kopyalanır
   - Drive linki Firestore'a yazılır
   - (Opsiyonel) Firebase Storage'daki geçici dosya silinir

## 8. Non-Goals (Bu versiyonda yapılmayacaklar)

- Kullanıcı login / auth sistemi
- Admin panel
- Video preview / edit
- Push notification
- Analytics detayları

*(Bunlar future scope)*

## 9. Design Principles

- Minimal
- Koyu tema
- Dikkati dağıtmayan animasyonlar
- Futbol / saha hissi
- "Kurumsal ama samimi" ton

## 10. Success Criteria

- Kullanıcı başvuruyu terk etmeden tamamlayabilmeli
- Mobilde akıcı çalışmalı
- Video upload sorunsuz olmalı
- Kullanıcı sonunda "tamamlandı" hissini net almalı

## 11. Future Enhancements (Not for now)

- Admin dashboard
- Başvuru durumu takibi
- Oyuncu profil sayfaları
- Scout / menajer erişimi

