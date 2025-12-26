'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
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
              Gizlilik Politikası
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
              Bu Gizlilik Politikası, Net Oynar platformunu ziyaret eden ve kullanan kullanıcıların kişisel verilerinin hangi kapsamda toplandığını, işlendiğini, kullanıldığını ve korunduğunu açıklamak amacıyla hazırlanmıştır.
            </p>

            <div className="space-y-6">
              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  1. Veri Sorumlusu
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  Net Oynar, kullanıcıların kişisel verilerinin işlenmesi bakımından veri sorumlusu sıfatına sahiptir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  2. Toplanan Kişisel Veriler
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Net Oynar platformu üzerinden aşağıdaki kişisel veriler toplanabilmektedir:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Ad ve soyad</li>
                  <li>Yaş bilgisi</li>
                  <li>Instagram kullanıcı adı</li>
                  <li>Telefon numarası (isteğe bağlı)</li>
                  <li>30–60 saniye aralığında yüklenen maç / performans videoları</li>
                  <li>Futbol bilgileri (oynadığı takım, pozisyon, baskın ayak vb.)</li>
                  <li>IP adresi, cihaz ve kullanım bilgileri</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  3. Kişisel Verilerin Toplanma Yöntemi
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Kişisel verileriniz;
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Kullanıcı kayıt formları,</li>
                  <li>Video yükleme alanları,</li>
                  <li>Profil oluşturma bölümleri,</li>
                  <li>Platform kullanımı sırasında sağlanan bilgiler</li>
                </ul>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mt-3">
                  aracılığıyla elektronik ortamda toplanmaktadır.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  4. Kişisel Verilerin İşlenme Amaçları
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Toplanan kişisel veriler aşağıdaki amaçlarla işlenmektedir:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Kullanıcı profillerinin oluşturulması ve yönetilmesi</li>
                  <li>Futbolcu performans videolarının platformda paylaşılması</li>
                  <li>Scout ve değerlendirme ekiplerinin oyuncu analizlerini yapabilmesi</li>
                  <li>Video içeriklerinde seslendirme ve tanıtım metinlerinin hazırlanması</li>
                  <li>Kullanıcı ile geri iletişim kurulabilmesi (Instagram veya telefon aracılığıyla)</li>
                  <li>Platform güvenliğinin sağlanması ve hizmet kalitesinin artırılması</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  5. Kişisel Verilerin Aktarılması
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-3">
                  Kişisel verileriniz;
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm sm:text-base leading-relaxed ml-4">
                  <li>Scout ve değerlendirme süreçlerinde görev alan yetkili kişilerle,</li>
                  <li>Teknik altyapı, barındırma ve video hizmeti sağlayıcılarıyla,</li>
                  <li>Yasal yükümlülükler kapsamında yetkili kamu kurum ve kuruluşlarıyla</li>
                </ul>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mt-3">
                  hukuka uygun şekilde ve gerekli güvenlik önlemleri alınarak paylaşılabilir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  6. Kişisel Verilerin Saklanma Süresi
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  Kişisel veriler, işlenme amaçlarının gerektirdiği süre boyunca saklanmakta; ilgili mevzuatta öngörülen sürelerin sona ermesi veya işleme amacının ortadan kalkması hâlinde silinmekte, yok edilmekte veya anonim hale getirilmektedir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  7. Veri Güvenliği
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  Net Oynar, kişisel verilerin gizliliğini ve güvenliğini sağlamak amacıyla gerekli teknik ve idari tedbirleri almaktadır. Yetkisiz erişim, veri kaybı ve hukuka aykırı kullanım risklerine karşı güvenlik önlemleri uygulanmaktadır.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  8. Çerezler (Cookies)
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  Web sitemizde kullanıcı deneyimini geliştirmek ve hizmetlerin daha verimli sunulabilmesi amacıyla çerezler kullanılmaktadır. Kullanıcılar, çerez tercihlerini tarayıcı ayarları üzerinden yönetebilir.
                </p>
              </section>

              <section>
                <h2 className="text-[#C1FF00] font-black text-base sm:text-lg uppercase tracking-wider mb-4">
                  9. Politika Güncellemeleri
                </h2>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  Bu Gizlilik Politikası, gerekli görüldüğü durumlarda güncellenebilir. Güncel metin, web sitesinde yayımlandığı tarihten itibaren geçerli kabul edilir.
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

