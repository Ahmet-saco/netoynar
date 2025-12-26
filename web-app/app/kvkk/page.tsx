'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function KVKKPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#051A18] text-[#E0E7E6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#051A18]/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-white/70 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest"
            >
              ← Geri
            </button>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-widest text-[#C1FF00]">
              KVKK Aydınlatma Metni
            </h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-invert max-w-none"
        >
          <div className="bg-white/5 rounded-2xl p-6 sm:p-8 md:p-12 space-y-8">
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Net Oynar tarafından kişisel verilerin işlenmesine ilişkin olarak kullanıcıları bilgilendirmek amacıyla hazırlanmıştır.
            </p>

            <div className="space-y-6">
              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  1. Veri Sorumlusu
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  KVKK kapsamında kişisel verileriniz, veri sorumlusu sıfatıyla Net Oynar tarafından işlenmektedir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  2. İşlenen Kişisel Veriler
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Platform kapsamında aşağıdaki kişisel veriler işlenebilmektedir:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Kimlik bilgileri (ad, soyad, yaş)</li>
                  <li>İletişim bilgileri (Instagram kullanıcı adı, telefon numarası – isteğe bağlı)</li>
                  <li>Görsel ve işitsel veriler (30–60 saniye aralığında yüklenen maç videoları)</li>
                  <li>Sporcu bilgileri (takım, pozisyon, baskın ayak vb.)</li>
                  <li>İşlem güvenliği ve kullanım bilgileri</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  3. Kişisel Verilerin İşlenme Amaçları
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Kullanıcı profili oluşturulması ve yönetilmesi</li>
                  <li>Futbolcu performans videolarının paylaşılması ve değerlendirilmesi</li>
                  <li>Scout ve değerlendirme ekiplerinin analiz süreçlerinin yürütülmesi</li>
                  <li>Video içeriklerinde seslendirme ve tanıtım amaçlı bilgi kullanımı</li>
                  <li>Kullanıcı ile geri iletişim kurulması</li>
                  <li>Platformun güvenli ve etkin şekilde işletilmesi</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  4. Kişisel Verilerin Aktarılması
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Kişisel verileriniz;
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Değerlendirme ve scout süreçlerinde görev alan yetkili kişi ve ekiplerle,</li>
                  <li>Teknik hizmet sağlayıcılarla,</li>
                  <li>Mevzuat gereği yetkili kamu kurum ve kuruluşlarıyla</li>
                </ul>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mt-3">
                  KVKK'nın 8. ve 9. maddelerine uygun olarak paylaşılabilir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  5. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Kişisel verileriniz, web sitesi ve platform üzerinden elektronik ortamda otomatik veya kısmen otomatik yöntemlerle toplanmaktadır.
                </p>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Veriler;
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması,</li>
                  <li>Veri sorumlusunun meşru menfaatleri,</li>
                  <li>Açık rızanın bulunması hâllerine dayanılarak</li>
                </ul>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mt-3">
                  KVKK'nın 5. maddesi kapsamında işlenmektedir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  6. KVKK Kapsamındaki Haklarınız
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  KVKK'nın 11. maddesi uyarınca kullanıcılar;
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Kişisel verilerinin işlenip işlenmediğini öğrenme</li>
                  <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                  <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
                  <li>Aktarıldığı üçüncü kişileri bilme</li>
                  <li>Eksik veya yanlış işlenen verilerin düzeltilmesini isteme</li>
                  <li>Kişisel verilerin silinmesini veya yok edilmesini talep etme</li>
                  <li>Hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
                </ul>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mt-3">
                  haklarına sahiptir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  7. Başvuru Yolu
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  KVKK kapsamındaki taleplerinizi yazılı veya elektronik yollarla Net Oynar'a iletebilirsiniz. Başvurular, ilgili mevzuat çerçevesinde değerlendirilerek yasal süreler içerisinde sonuçlandırılır.
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

