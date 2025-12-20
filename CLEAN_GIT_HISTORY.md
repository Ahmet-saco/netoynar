# 🔒 Git History'den Secret Dosyasını Temizleme

## 🚨 Sorun

`service-account-key.json` dosyası git history'de kalmış. GitHub secret scanning bunu görüyor ve push'u engelliyor.

## ✅ Çözüm Seçenekleri

### Seçenek 1: Yeni Branch Oluştur (Önerilen - Basit)

```bash
# Yeni bir branch oluştur (temiz)
git checkout --orphan clean-main

# Tüm dosyaları ekle (service-account-key.json hariç)
git add .
git rm --cached netoynar-functions/service-account-key.json

# İlk commit
git commit -m "Initial commit - clean history"

# Eski branch'i sil ve yeni branch'i main yap
git branch -D main
git branch -m main

# Force push (DİKKAT: Bu eski history'yi siler!)
git push -f origin main
```

### Seçenek 2: Git Filter-Branch (Karmaşık)

```bash
# Git filter-branch ile dosyayı history'den sil
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch netoynar-functions/service-account-key.json" --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

### Seçenek 3: BFG Repo-Cleaner (En İyi - Ama ekstra tool gerekir)

```bash
# BFG Repo-Cleaner indir ve kullan
# https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files service-account-key.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

## ⚠️ ÖNEMLİ UYARI

**Force push yaparsan:**
- Eski git history silinir
- Diğer geliştiriciler repo'yu yeniden clone etmeli
- GitHub'da eski commit'ler görünmez olur

**Ama:**
- Secret dosyası tamamen temizlenir
- Yeni push'lar sorunsuz olur

## 🎯 Önerilen Yol

**Seçenek 1** en basit ve güvenli. Eğer tek başına çalışıyorsan (başka developer yoksa), bu yöntemi kullan.

