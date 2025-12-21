# 🔧 Vercel Build Hatası Çözümü

## ❌ Hata

```
Error: > Couldn't find any `pages` or `app` directory. Please create one under the project root
```

## 🔍 Sorun

Vercel root dizinde `app` klasörünü arıyor, ama `app` klasörü `web-app` içinde.

## ✅ Çözüm: Root Directory Ayarı

Vercel Dashboard'da:

1. **Settings** → **General** sekmesine git
2. **Root Directory** bölümünü bul
3. **Edit** butonuna tıkla
4. **Root Directory** alanına `web-app` yaz
5. **Save** tıkla
6. Yeni bir **Deploy** başlat

## 📋 Alternatif: vercel.json

Ya da projenin root'una `vercel.json` dosyası ekleyebilirsin:

```json
{
  "buildCommand": "cd web-app && npm run build",
  "outputDirectory": "web-app/.next",
  "installCommand": "cd web-app && npm install",
  "framework": "nextjs",
  "rootDirectory": "web-app"
}
```

Ama en kolay yol Vercel Dashboard'dan Root Directory ayarını yapmak.

