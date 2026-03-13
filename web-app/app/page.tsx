'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

type SceneId = 'hero' | 'process' | 'guide' | 'faq' | 'apply' | 'success';

const SCENES: SceneId[] = ['hero', 'process', 'guide', 'faq', 'apply', 'success'];

const NAV_ITEMS: { id: SceneId; label: string }[] = [
  { id: 'hero', label: 'Net Oynar' },
  { id: 'process', label: 'Nasıl İşler?' },
  { id: 'guide', label: 'Video Rehberi' },
  { id: 'faq', label: 'SSS' },
];

export default function Home() {
  const [active, setActive] = useState<SceneId>('hero');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [applyStep, setApplyStep] = useState<1 | 2 | 3>(1);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  
  useEffect(() => {
    // 1. URL'deki scene parametresine göre başlangıç sayfasını ayarla
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scene = params.get('scene') as SceneId;
      if (scene && SCENES.includes(scene)) {
        setActive(scene);
      }
    }

    // 2. Dinamik Oyuncu Sayısı (Base 500 + Toplam Başvuru)
    const unsub = onSnapshot(collection(db, 'submissions'), (snap) => {
      setTotalSubmissions(snap.size);
    });

    return () => unsub();
  }, []);

  const handleChangeScene = (target: SceneId) => {
    const currentIndex = SCENES.indexOf(active);
    const nextIndex = SCENES.indexOf(target);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActive(target);
    if (target !== 'apply') setApplyStep(1);
  };

  // Swipe gesture handlers - only for navigation pages (hero, process, guide, faq)
  const minSwipeDistance = 50;
  const NAVIGATION_SCENES: SceneId[] = ['hero', 'process', 'guide', 'faq'];

  const onTouchStart = (e: React.TouchEvent) => {
    // Disable swipe on apply and success pages
    if (active === 'apply' || active === 'success') return;
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Disable swipe on apply and success pages
    if (active === 'apply' || active === 'success') return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    // Disable swipe on apply and success pages
    if (active === 'apply' || active === 'success') return;
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    
    // Y eksenindeki hareket X ekseninden büyükse, bu muhtemelen yukarı/aşağı bir scroll'dur. Yoksay.
    if (Math.abs(distanceY) > Math.abs(distanceX)) return;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Only navigate between navigation pages
      const currentIndex = NAVIGATION_SCENES.indexOf(active);
      if (currentIndex === -1) return; // Current page is not a navigation page
      
      let nextIndex: number;

      if (isLeftSwipe) {
        // Swipe left = next navigation scene
        nextIndex = currentIndex + 1;
        if (nextIndex >= NAVIGATION_SCENES.length) nextIndex = 0;
      } else {
        // Swipe right = previous navigation scene
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = NAVIGATION_SCENES.length - 1;
      }

      handleChangeScene(NAVIGATION_SCENES[nextIndex]);
    }
  };

  return (
    <div 
      className={`relative min-h-screen bg-[#051A18] text-[#E0E7E6] selection:bg-[#C1FF00]/30 overflow-x-hidden font-sans ${active === 'hero' ? 'lg:h-screen lg:overflow-hidden' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dinamik Arka Plan Katmanları */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Saha Çizgileri Dekoru */}
        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" 
             style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 pt-4 pb-12 lg:pb-0 max-w-full overflow-x-hidden h-full">
      <Header active={active} onChangeScene={handleChangeScene} />
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={active}
            custom={direction}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -50 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="will-change-transform"
            style={{ WebkitBackfaceVisibility: 'hidden', WebkitTransform: 'translate3d(0, 0, 0)' }}
          >
            <div className={`grid ${active === 'faq' || active === 'apply' || active === 'success' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-16 items-center min-h-[75vh]`}>
              {/* Sol İçerik */}
              <div className="order-2 lg:order-1 space-y-8">
                {active === 'hero' && <HeroView onNext={() => handleChangeScene('apply')} />}
                {active === 'process' && <ProcessView />}
                {active === 'guide' && <GuideView />}
                {active === 'faq' && <FAQView />}
                {active === 'apply' && (
                  <ApplyForm
                    onSuccess={() => handleChangeScene('success')}
                    onStepChange={setApplyStep}
                  />
                )}
                {active === 'success' && <SuccessView onReset={() => handleChangeScene('hero')} />}
              </div>

              {/* Sağ Görsel Alanı (Premium) */}
              {/* Mobilde: sadece HERO görseli göster (diğerleri gizli) */}
              {active === 'hero' && (
                <div className="order-1 relative flex justify-center items-center h-full min-h-[320px] lg:hidden">
                  <RightDynamicVisual active={active} applyStep={applyStep} totalSubmissions={totalSubmissions} />
                </div>
              )}

              {/* Desktop: tüm sahneler için sağ kolon (FAQ, Apply ve Success hariç) */}
              {active !== 'faq' && active !== 'apply' && active !== 'success' && (
              <div className="order-1 lg:order-2 relative hidden lg:flex justify-center items-center h-full min-h-[420px] will-change-transform">
                <RightDynamicVisual active={active} applyStep={applyStep} totalSubmissions={totalSubmissions} />
              </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Social Media Links - Relocated to be persistent and non-scrolling */}
      {active !== 'success' && active !== 'apply' && <SocialMediaLinks />}
    </div>
  );
}

// --- SAĞ KOLON DİNAMİK GÖRSELLERİ ---

function RightDynamicVisual({ active, applyStep, totalSubmissions }: { active: SceneId; applyStep?: 1 | 2 | 3; totalSubmissions: number }) {
  return (
    <div className="relative w-full max-w-lg aspect-square will-change-transform">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 1.1, rotate: 5 }}
          className="w-full h-full"
        >
          {/* Hero görseli olduğu gibi kalsın */}
          {active === 'hero' && <HeroVisual totalSubmissions={totalSubmissions} />}

          {/* Diğer sahneler: tek bir premium 3D frame içinde */}
          {active !== 'hero' && active !== 'success' && (
            <RightFrame>
              {active === 'process' && <ProcessVisual />}
              {active === 'guide' && <GuideVisual />}
              {active === 'faq' && <FAQVisual />}
              {active === 'apply' && <ApplyIntakeVisual step={applyStep ?? 1} />}
            </RightFrame>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ApplyIntakeVisual({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          BAŞVURU AKIŞI
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C1FF00]">
          {step === 1 ? 'FUTBOL' : step === 2 ? 'KİŞİSEL' : 'VİDEO'}
        </div>
      </div>

      {/* Borderless, floating info (changes per step) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 space-y-5"
        >
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-3xl font-black italic uppercase tracking-tight text-white/90">
                Net profil, doğru değerlendirme.
              </div>
              <div className="text-sm font-medium leading-relaxed text-white/50">
                Takım + mevki + baskın ayak, videonu izlerken bağlam kurmamızı sağlar.
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/80" />
                Scout ekibi için bağlam
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-3xl font-black italic uppercase tracking-tight text-white/90">
                İletişim net, süreç hızlı.
              </div>
              <div className="text-sm font-medium leading-relaxed text-white/50">
                Şehir ve Instagram, doğru kanal üzerinden dönüş alman için gerekli.
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00F5FF]/80" />
                Telefon opsiyonel
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-3xl font-black italic uppercase tracking-tight text-white/90">
                60 saniye yeter.
              </div>
              <div className="text-sm font-medium leading-relaxed text-white/50">
                En iyi aksiyonların. Efektsiz, net görüntü. İnceleme tamamen manuel.
              </div>
              <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  Güvenli yükleme
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* subtle footer hint */}
      <div className="mt-5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/70" />
          Güvenli gönderim
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00F5FF]/70" />
          Hızlı akış
        </div>
      </div>
    </div>
  );
}

function RightFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-[360px] max-w-full"
      style={{ perspective: 1200 }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-[2.5rem] border border-white/10 bg-[#0A2E2A]/40 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md md:backdrop-blur-xl overflow-hidden will-change-transform transform-gpu"
        style={{
          transform: 'rotateX(8deg) rotateY(-10deg) translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* Üst highlight */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-transparent" />
        {/* Neon edge */}
        <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-[#C1FF00]/15" />
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(193,255,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(193,255,0,0.10) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(circle at 30% 20%, black 0%, rgba(0,0,0,0.7) 40%, transparent 70%)',
          }}
        />
        {/* Light sweep */}
        <motion.div
          className="pointer-events-none absolute -inset-[40%] rotate-12 bg-gradient-to-r from-transparent via-[#00F5FF]/10 to-transparent"
          animate={{ x: ['-30%', '30%', '-30%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Noise (no asset) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.06) 0%, transparent 45%)',
          }}
        />

        {/* İç padding */}
        <div className="relative p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// 1. Hero: Orbital Talent Pool
function HeroVisual({ totalSubmissions }: { totalSubmissions: number }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center will-change-contents transform-gpu">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, rotate: 360 }}
        transition={{ 
          opacity: { duration: 1 },
          scale: { duration: 1 },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute w-full h-full border border-white/5 rounded-full will-change-transform" 
        style={{ transform: 'translateZ(0)' }}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, rotate: -360 }}
        transition={{ 
          opacity: { duration: 1.2 },
          scale: { duration: 1.2 },
          rotate: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
        className="absolute w-[70%] h-[70%] border border-[#C1FF00]/20 rounded-full border-dashed will-change-transform" 
        style={{ transform: 'translateZ(0)' }}
      />

      {/* Orbiting promise bubbles (icon-only, subtle, meaningful) */}
      <div className="absolute inset-0">
        {/* Orbit track */}
        <div className="absolute inset-[12%] rounded-full border border-white/5" />

        {/* Premium bubbles: icon-only (no text) */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={{ rotate: 0, opacity: 0, scale: 0.95 }}
          animate={{ rotate: 360, opacity: 1, scale: 1 }}
          transition={{ 
            rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 0.6 },
            scale: { duration: 0.6 }
          }}
          style={{ transformOrigin: '50% 50%', transform: 'translateZ(0)' }}
        >
          {/* KEŞİF */}
          <div 
            className="absolute left-1/2 top-[12%] z-20"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -4, 0],
                rotate: -360
              }}
              transition={{ 
                y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 }
              }}
              className="will-change-transform transform-gpu"
            >
              <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(193,255,0,0.10)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#C1FF00]">
                  <path d="M12 22s8-3.5 8-10V6l-8-3-8 3v6c0 6.5 8 10 8 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M12 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* İNCELEME */}
          <div 
            className="absolute left-[12%] top-1/2 z-20"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, 3, 0],
                rotate: -360
              }}
              transition={{ 
                y: { duration: 6.1, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 }
              }}
              className="will-change-transform transform-gpu"
            >
              <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_22px_rgba(255,255,255,0.06)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* ANALİZ */}
          <div 
            className="absolute right-[15.5%] top-[34%] z-20"
            style={{ transform: 'translate(50%, -50%)' }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -3, 0],
                rotate: -360
              }}
              transition={{ 
                y: { duration: 5.6, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 }
              }}
              className="will-change-transform transform-gpu"
            >
              <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_22px_rgba(0,245,255,0.12)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#00F5FF]">
                  <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M10 19V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M16 19V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M22 19V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* VİTRİN */}
          <div 
            className="absolute left-1/2 top-[88%] z-20"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, 4, 0],
                rotate: -360
              }}
              transition={{ 
                y: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 }
              }}
              className="will-change-transform transform-gpu"
            >
              <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(193,255,0,0.10)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#C1FF00]">
                  <path d="M12 2l2.2 6.7H21l-5.4 3.9L17.8 20 12 15.8 6.2 20l2.2-7.4L3 8.7h6.8L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="text-center z-10">
        <motion.h2 
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: 1 }}
          transition={{ 
            scale: { repeat: Infinity, duration: 4, delay: 0.6 },
            opacity: { duration: 0.4, delay: 0.6 }
          }}
          className="text-6xl lg:text-8xl font-black text-[#C1FF00] italic drop-shadow-[0_0_30px_rgba(193,255,0,0.5)] will-change-transform"
          style={{ transform: 'translateZ(0)' }}
        >
          {500 + totalSubmissions}
        </motion.h2>
        <p className="text-cyan-400 font-bold tracking-[0.4em] uppercase text-[10px] lg:text-xs mt-1 lg:mt-2">Aktif Oyuncu</p>
      </div>
    </div>
  );
}

// 2. Process: AI Scouting Scan
function ProcessVisual() {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          SCOUTING PIPELINE
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C1FF00]">
          LIVE
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {/* scan line */}
        <div className="absolute top-0 left-0 h-1 w-full bg-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.6)] animate-[scan_3s_ease-in-out_infinite] transform-gpu will-change-transform" />

        <div className="p-5 space-y-6">
          {/* steps */}
          <div className="space-y-3">
            {[
              { t: 'Gönderildi', s: 'Video alındı', pct: 100 },
              { t: 'İzleniyor', s: 'Scouting incelemesi', pct: 68 },
              { t: 'Vitrin', s: 'Onay / yayın planı', pct: 22 },
            ].map((row) => (
              <div key={row.t} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black italic uppercase tracking-tight">
                      {row.t}
                    </div>
                    <div className="text-[11px] text-white/45 font-bold uppercase tracking-widest">
                      {row.s}
                    </div>
                  </div>
                  <div className="text-xs font-black text-white/70">
                    {row.pct}%
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-[#C1FF00]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* divider */}
          <div className="h-px w-full bg-white/10" />

          {/* metrics: floating rows (no card-in-card) */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                Özet Metrikler
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/80" />
            </div>

            <div className="mt-4 space-y-4">
              {[
                { k: 'Tempo', v: 'Yüksek', pct: 78 },
                { k: 'Karar', v: 'Net', pct: 72 },
                { k: 'Oyun Görüşü', v: 'İyi', pct: 66 },
              ].map((m, i) => (
                <div key={m.k}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/70" />
                      <div className="text-xs font-black text-white/80 uppercase tracking-widest">
                        {m.k}
                      </div>
                    </div>
                    <div className="text-xs font-black text-white/60">{m.v}</div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.pct}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(193,255,0,0.95), rgba(0,245,255,0.75))',
                      }}
                    />
                  </div>
                  {i !== 2 && <div className="mt-4 h-px w-full bg-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{` @keyframes scan { 0% { transform: translateY(0); } 50% { transform: translateY(320px); } 100% { transform: translateY(0); } } `}</style>
    </div>
  );
}

// 3. Guide: Tactical Viewfinder
function GuideVisual() {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          VIDEO CHECKLIST
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C1FF00]">
          READY
        </div>
      </div>

      {/* frame */}
      <div className="mt-5 w-full aspect-video rounded-2xl border border-white/10 bg-black/30 overflow-hidden relative">
        {/* HUD */}
        <div className="absolute inset-4 border border-[#C1FF00]/25">
          <div className="absolute left-3 top-3 font-mono text-[10px] text-[#C1FF00]">
            ● REC
          </div>
          <div className="absolute right-3 top-3 font-mono text-[10px] text-[#C1FF00]">
            00:00:42
          </div>
          <div className="absolute left-3 bottom-3 font-mono text-[10px] text-[#C1FF00]">
            4K / 60FPS
          </div>
          <div className="absolute right-3 bottom-3 font-mono text-[10px] text-[#C1FF00]">
            STABLE
          </div>
        </div>

        {/* target */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C1FF00]/40"
        />
      </div>

      {/* checklist */}
      <div className="mt-6 space-y-4">
        {[
          { t: 'Süre', d: '40–60 sn' },
          { t: 'Maç içi aksiyon', d: 'pas/şut/tempo' },
          { t: 'Sen belli misin?', d: 'numara/işaret' },
          { t: 'Efekt yok', d: 'doğal görüntü' },
        ].map((c, i) => (
          <div key={c.t} className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/80" />
                <div className="text-[10px] text-white/45 font-black uppercase tracking-widest">
                  {c.t}
                </div>
              </div>
              <div className="mt-1 text-sm font-bold text-white/80">{c.d}</div>
              {i !== 3 && <div className="mt-4 h-px w-full bg-white/10" />}
            </div>
            <div className="text-[#C1FF00] font-black text-base leading-none pt-1">✓</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. FAQ: Empty (no visual needed)
function FAQVisual() {
  return null;
}

// 5. Apply: TRANSFER SIGNING (Futbolcu İmza Atarken)
function TransferSigningVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Dijital Sözleşme Kartı */}
      <div className="glass-card w-80 h-[480px] rounded-[2.5rem] border-[#C1FF00]/30 p-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C1FF00]/10 to-transparent" />
        
        {/* Oyuncu Silüeti (İmza Atan Figür Temsili) */}
        <div className="h-64 w-full bg-[#0A2E2A] rounded-t-[2rem] relative flex items-end justify-center overflow-hidden">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 0.4 }} 
                      className="text-[12rem] leading-none grayscale select-none">👤</motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A2E2A] to-transparent" />
        </div>

        {/* İmza Alanı */}
        <div className="p-6 space-y-4">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-[#C1FF00] uppercase tracking-tighter">Official Contract</p>
              <h4 className="text-xl font-black italic uppercase">Net Oynar Academy</h4>
           </div>
           
           <div className="h-px w-full bg-white/10" />
           
           <div className="relative py-4">
              <p className="text-[10px] text-white/40 mb-1 uppercase font-bold">Player Signature</p>
              <div className="h-16 w-full border border-dashed border-white/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                 <motion.div initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                             transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                             className="text-2xl font-signature text-[#C1FF00] italic opacity-60">
                    Net Oynar Talent
                 </motion.div>
                 {/* İmza Atan Kalem Efekti */}
                 <motion.div animate={{ x: [-50, 50, -50], y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2 }}
                             className="absolute text-xl pointer-events-none">✍️</motion.div>
              </div>
           </div>
           
           <div className="flex justify-between items-center">
              <div className="text-[10px] font-bold text-white/40 uppercase">Status: <span className="text-[#C1FF00]">Pending</span></div>
              <div className="w-10 h-10 border border-[#C1FF00]/20 rounded-lg flex items-center justify-center text-xs font-black text-[#C1FF00]">2024</div>
           </div>
        </div>
      </div>
    </div>
  );
}

// 6. Success: Golden Trophy
function SuccessTrophyVisual() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      {/* Confetti particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: 0, 
            y: 0, 
            opacity: 1,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            x: (Math.random() - 0.5) * 400,
            y: -600,
            opacity: [1, 1, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: i % 3 === 0 ? '#C1FF00' : i % 3 === 1 ? '#00F5FF' : '#FFFFFF',
            left: `${50 + (Math.random() - 0.5) * 20}%`,
            top: '50%',
          }}
        />
      ))}

      {/* Success Checkmark Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.3
        }}
        className="relative"
      >
        {/* Outer circle glow */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-[#C1FF00]/20 blur-2xl"
        />
        
        {/* Main circle */}
        <div className="relative w-32 h-32 rounded-full border-4 border-[#C1FF00] bg-[#C1FF00]/5 flex items-center justify-center">
          {/* Checkmark SVG */}
          <motion.svg
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.6,
              ease: [0.16, 1, 0.3, 1]
            }}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[#C1FF00]"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            />
          </motion.svg>
        </div>
      </motion.div>

      {/* Success text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-8 text-center space-y-2"
      >
        <div className="text-[#C1FF00] font-black text-xl italic uppercase tracking-tight">
          Başvuru Alındı
        </div>
        <div className="text-white/40 text-xs font-bold uppercase tracking-widest">
          İnceleme Başlatıldı
        </div>
      </motion.div>
    </div>
  );
}

// --- İÇERİK BİLEŞENLERİ (SOL KOLON) ---

function Header({ active, onChangeScene }: { active: SceneId; onChangeScene: (s: SceneId) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative w-full mb-4">
      <div className="py-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Sol: Net Oynar + Vitrin */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onChangeScene('hero')}
              className={`text-sm font-bold uppercase tracking-widest transition-all hover:text-[#C1FF00] ${
                active === 'hero' ? 'text-[#C1FF00]' : 'text-white/55'
              }`}
            >
              Net Oynar <span className="font-normal text-white/40">· Başvuru</span>
            </button>
            <Link
              href="/vitrin"
              className="text-sm font-bold uppercase tracking-widest transition-all hover:text-[#C1FF00] text-white/55 flex items-center gap-1.5"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C1FF00] animate-pulse" />
              Vitrin
            </Link>
          </div>

          {/* Sağ: Nav butonları */}
          <nav className="flex gap-8 items-center">
            {NAV_ITEMS.filter(item => item.id !== 'hero').map(item => (
              <button
                key={item.id}
                onClick={() => onChangeScene(item.id)}
                className={`text-sm font-bold uppercase tracking-widest transition-all hover:text-[#C1FF00] ${
                  active === item.id ? 'text-[#C1FF00]' : 'text-white/55'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center justify-between w-full">
          {/* Sol: Net Oynar + Vitrin */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onChangeScene('hero'); setMobileOpen(false); }}
              className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:text-[#C1FF00] whitespace-nowrap ${
                active === 'hero' ? 'text-[#C1FF00]' : 'text-white/55'
              }`}
            >
              Net Oynar
            </button>
            <Link
              href="/vitrin"
              className="text-[9px] font-black uppercase tracking-[0.1em] text-white/55 hover:text-[#C1FF00] transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <span className="w-1 h-1 rounded-full bg-[#C1FF00] animate-pulse" />
              Vitrin
            </Link>
          </div>

          {/* Sağ: Hamburger */}
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            className="p-2 rounded-xl text-white/60 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            aria-label="Menüyü Aç"
          >
            <motion.div animate={mobileOpen ? 'open' : 'closed'} className="w-5 h-[14px] flex flex-col justify-between">
              <motion.span
                variants={{ open: { rotate: 45, y: 6 }, closed: { rotate: 0, y: 0 } }}
                transition={{ duration: 0.2 }}
                className="block h-0.5 w-full bg-current rounded-full origin-center"
              />
              <motion.span
                variants={{ open: { opacity: 0, x: -8 }, closed: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.15 }}
                className="block h-0.5 w-full bg-current rounded-full"
              />
              <motion.span
                variants={{ open: { rotate: -45, y: -6 }, closed: { rotate: 0, y: 0 } }}
                transition={{ duration: 0.2 }}
                className="block h-0.5 w-full bg-current rounded-full origin-center"
              />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menü */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden absolute left-0 right-0 z-50 rounded-2xl shadow-2xl"
            style={{ background: 'rgba(5,26,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
          >
            <div className="px-2 py-3 flex flex-col gap-1">
              {NAV_ITEMS.filter(item => item.id !== 'hero').map(item => (
                <button
                  key={item.id}
                  onClick={() => { onChangeScene(item.id); setMobileOpen(false); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                    active === item.id
                      ? 'text-[#C1FF00] bg-[#C1FF00]/8'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-white/8 my-1 mx-4" />
              <Link
                href="/vitrin"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-white/60 hover:text-[#C1FF00] hover:bg-[#C1FF00]/5 transition-all flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C1FF00] animate-pulse" />
                Vitrin
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}


function HeroView({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#C1FF00]/20 bg-[#C1FF00]/5">
        <span className="w-2 h-2 bg-[#C1FF00] rounded-full animate-ping" />
        <span className="text-[10px] font-black text-[#C1FF00] uppercase tracking-[0.2em]">Türkiye'nin Dijital Scouting Platformu</span>
      </div>
      <h1 className="text-6xl sm:text-7xl md:text-[96px] font-black leading-[0.92] tracking-tighter italic uppercase max-w-[14ch] md:max-w-[18ch] lg:max-w-[20ch] pr-4 md:pr-12 lg:pr-16 overflow-visible">
        <span className="block">SAHA SENİN</span>
        <span className="inline-block mt-2 pr-4 text-transparent bg-clip-text bg-gradient-to-r from-[#C1FF00] to-[#00F5FF] leading-[1.02] pt-1 pb-1">
          VİTRİN BİZİM
        </span>
          </h1>
      <p className="text-xl text-[#8A9A98] max-w-lg leading-relaxed font-medium">
        Yeteneklerin karanlıkta kalmasın. Videonu yükle, Net Oynar ekibimiz seni vitrine çıkartsın. Artık keşfedilmek tesadüf değil.
      </p>
      <div className="flex gap-6 pt-4">
        <button onClick={onNext}
                className="px-12 py-6 bg-[#C1FF00] text-[#051A18] rounded-2xl font-black text-xl uppercase tracking-tight shadow-[0_20px_40px_rgba(193,255,0,0.2)] hover:shadow-[0_20px_60px_rgba(193,255,0,0.4)] hover:-translate-y-1 transition-all">
          Şimdi Başvur
        </button>
      </div>
    </div>
  );
}

// --- FORM BİLEŞENİ (ALTYAPI KORUNMUŞ) ---

interface ApplyFormData {
  fullName: string;
  birthDate: string;
  positions: string[];
  dominantFoot: string;
  team: string;
  league: string;
  city: string;
  instagram: string;
  phone: string;
  height: string;
  weight: string;
  goals: string;
  assists: string;
  matchesPlayed: string;
  concededGoals: string;
  cleanSheets: string;
  nationalTeam: string[];
  videoFile: File | null;
  consent: boolean;
  subPositions: string[];
  season: string;
  uCategory: string;
}

const NATIONAL_TEAMS = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21'];

const POSITIONS = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet', 'Kanat'];
const SUB_POSITIONS: Record<string, string[]> = {
  'Defans': ['Sağ Bek', 'Sol Bek', 'Sağ Stoper', 'Sol Stoper'],
  'Orta Saha': ['6 numara', '8 numara', '10 numara'],
  'Kanat': ['Sağ Açık', 'Sol Açık']
};
const DOMINANT_FEET = ['Sağ', 'Sol', 'Her İkisi'];
const LEAGUES = [
  'Gelişim Altyapısı',
  'Elit Altyapı',
  '2. Amatör',
  '1. Amatör',
  'SAL',
  'BAL',
  '3. Lig',
  '2. Lig',
  '1. Lig',
];
const U_CATEGORIES = ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'A Takım'];
const SEASONS = ['2025 - 2026', '2024 - 2025', '2023 - 2024'];

function ApplyForm({
  onSuccess,
  onStepChange,
}: {
  onSuccess: () => void;
  onStepChange?: (s: 1 | 2 | 3) => void;
}) {
  const [formData, setFormData] = useState<ApplyFormData>({
    fullName: '',
    birthDate: '',
    positions: [],
    dominantFoot: '',
    team: '',
    league: '',
    city: '',
    instagram: '',
    phone: '',
    height: '',
    weight: '',
    goals: '',
    assists: '',
    matchesPlayed: '',
    concededGoals: '',
    cleanSheets: '',
    nationalTeam: [],
    videoFile: null,
    consent: false,
    subPositions: [],
    season: '2024 - 2025',
    uCategory: '',
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [uploadTask, setUploadTask] = useState<UploadTask | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0); // MB/s
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // seconds
  const [isUploading, setIsUploading] = useState(false);
  const [videoStoragePath, setVideoStoragePath] = useState<string | null>(null);

  const toggleMainPosition = (pos: string) => {
    setFormData(prev => {
      const isSelected = prev.positions.includes(pos);
      const newPositions = isSelected 
        ? prev.positions.filter(p => p !== pos) 
        : [...prev.positions, pos];
      
      let newSubPositions = prev.subPositions;
      if (isSelected) {
        const subsToRemove = SUB_POSITIONS[pos] || [];
        newSubPositions = prev.subPositions.filter(p => !subsToRemove.includes(p));
      }

      return { ...prev, positions: newPositions, subPositions: newSubPositions };
    });
  };
  const [modalType, setModalType] = useState<'privacy' | 'kvkk' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleNationalTeam = (team: string) => {
    setFormData(prev => ({
      ...prev,
      nationalTeam: prev.nationalTeam.includes(team)
        ? prev.nationalTeam.filter(t => t !== team)
        : [...prev.nationalTeam, team]
    }));
  };

  const toggleSubPosition = (subPos: string) => {
    setFormData(prev => ({
      ...prev,
      subPositions: prev.subPositions.includes(subPos)
        ? prev.subPositions.filter(p => p !== subPos)
        : [...prev.subPositions, subPos]
    }));
  };
  const uploadStartTime = useRef<number>(0);
  const lastProgressTime = useRef<number>(0);
  const lastProgressBytes = useRef<number>(0);
  const hasSubmittedRef = useRef<boolean>(false); // Duplicate submit önleme

  // Pozisyon değiştiğinde ilgisiz verileri temizle (Profesyonel Veri Temizliği)
  useEffect(() => {
    if (formData.positions.includes('Kaleci')) {
      // Kaleci seçiliyse istatistikleri ona göre ayarla (ama diğer mevkiler de seçiliyse karmaşıklaşabilir)
      // Şimdilik basitleştirilmiş mantık: Eğer sadece kaleciyse gol/asist temizle
      if (formData.positions.length === 1) {
        setFormData(prev => ({ ...prev, goals: '0', assists: '0' }));
      }
    } else if (formData.positions.length > 0) {
      setFormData(prev => ({ ...prev, concededGoals: '0' }));
    }
  }, [formData.positions]);

  // Keep right visual in sync
  const setStepSafe = (s: 1 | 2 | 3, direction: 1 | -1 = 1) => {
    setStepDirection(direction);
    setStep(s);
    onStepChange?.(s);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Sadece sayı girilmesine izin verilen alanlar
    const numericFields = ['goals', 'assists', 'matchesPlayed', 'concededGoals', 'cleanSheets', 'age', 'height', 'weight'];
    
    if (numericFields.includes(name)) {
      // Sadece rakamları al, harfleri temizle
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError('');
  };

  const startVideoUpload = async (file: File) => {
    // Cancel any ongoing upload
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setTimeRemaining(0);
    setVideoStoragePath(null);
    uploadStartTime.current = Date.now();
    lastProgressTime.current = Date.now();
    lastProgressBytes.current = 0;

    try {
      // 1. Video'yu Firebase Storage'a yükle (İsim ve Timestamp ile)
      const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
      };
      
      const cleanName = (formData.fullName || 'unknown')
        .replace(/[çğıöşüÇĞİÖŞÜ]/g, (m) => trMap[m])
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_');

      const fileExtension = file.name.split('.').pop() || 'mp4';
      const videoRef = ref(storage, `submissions/${cleanName}_${Date.now()}.${fileExtension}`);
      const task = uploadBytesResumable(videoRef, file);
      setUploadTask(task);

      task.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));

          // Calculate upload speed
          const now = Date.now();
          const timeDiff = (now - lastProgressTime.current) / 1000; // seconds
          const bytesDiff = snapshot.bytesTransferred - lastProgressBytes.current;
          
          if (timeDiff > 0.5) { // Update speed every 0.5 seconds
            const speedMBps = (bytesDiff / (1024 * 1024)) / timeDiff;
            setUploadSpeed(speedMBps);
            
            // Calculate time remaining
            const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
            const remainingSeconds = speedMBps > 0 ? remainingBytes / (1024 * 1024) / speedMBps : 0;
            setTimeRemaining(Math.max(0, Math.round(remainingSeconds)));
            
            lastProgressTime.current = now;
            lastProgressBytes.current = snapshot.bytesTransferred;
          }
        },
        (err) => {
          if (err.code === 'storage/canceled') {
            setError('');
            setUploadProgress(0);
            setIsUploading(false);
          } else {
            setError(err.message);
            setIsUploading(false);
          }
          setUploadTask(null);
          setVideoStoragePath(null);
        },
        async () => {
          // Upload completed
          setVideoStoragePath(task.snapshot.ref.fullPath);
          setIsUploading(false);
          // Keep progress at 100% until form is submitted
        }
      );
    } catch (err: any) {
      setError('Video yükleme başlatılamadı: ' + err.message);
      setIsUploading(false);
      setUploadTask(null);
    }
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.fullName.trim()) {
      setError('Lütfen önce adınızı ve soyadınızı girin');
      e.target.value = '';
      return;
    }
    
    // Cancel any ongoing upload
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    
    // Reset states
    setUploadProgress(0);
    setIsUploading(false);
    setVideoStoragePath(null);
    setUploadSpeed(0);
    setTimeRemaining(0);
    
    // Video duration validation (30-60 seconds)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      
      if (duration < 30) {
        setError('Video en az 30 saniye olmalıdır');
        e.target.value = ''; // Reset input
        return;
      }
      
      if (duration > 60) {
        setError('Video en fazla 60 saniye olmalıdır');
        e.target.value = ''; // Reset input
        return;
      }
      
      // Video is valid, proceed with upload
      setFormData(prev => ({ ...prev, videoFile: file }));
      setError('');
      
      // Start upload immediately in background
      startVideoUpload(file);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      setError('Video dosyası okunamadı, lütfen geçerli bir video seçin');
      e.target.value = ''; // Reset input
    };
    
    video.src = URL.createObjectURL(file);
  };

  const handleCancelVideo = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    setFormData(prev => ({ ...prev, videoFile: null }));
    setUploadProgress(0);
    setIsUploading(false);
    setIsSubmitting(false);
    setVideoStoragePath(null);
    setUploadSpeed(0);
    setTimeRemaining(0);
  };

  const handleCancelUploadAndSelectNew = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    setFormData(prev => ({ ...prev, videoFile: null }));
    setUploadProgress(0);
    setIsUploading(false);
    setIsSubmitting(false);
    setVideoStoragePath(null);
    setUploadSpeed(0);
    setTimeRemaining(0);
    // Trigger file input after state update
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const validateStep = (s: 1 | 2 | 3) => {
    // Step 1: video & identity
    if (s === 1) {
      if (!formData.fullName.trim()) return setError('Ad Soyad gerekli');
      if (!formData.videoFile) return setError('Video seçmelisiniz');
      return true;
    }

    // Step 2: football
    if (s === 2) {
      if (!formData.team.trim()) return setError('Takım bilgisi gerekli');
      if (formData.positions.length === 0) return setError('Mevki seçiniz');
      
      // Seçilen ana mevkilerin alt mevkileri varsa kontrol et
      for (const pos of formData.positions) {
        if (SUB_POSITIONS[pos]) {
          const hasSub = SUB_POSITIONS[pos].some(sub => formData.subPositions.includes(sub));
          if (!hasSub) return setError(`${pos} için en az bir alt mevki seçmelisiniz`);
        }
      }
      
      if (['Gelişim Altyapısı', 'Elit Altyapı'].includes(formData.league) && !formData.uCategory) {
        return setError('U Kategorisi seçiniz');
      }
      
      if (!formData.dominantFoot) return setError('Baskın ayak seçiniz');
      if (!formData.league) return setError('Lig seçiniz');
      if (!formData.matchesPlayed) return setError('Oynadığınız maç sayısını girmelisiniz');

      // İstatistik validasyonu (Çoklu mevki uyumlu)
      const isFieldPlayer = formData.positions.length > 1 || !formData.positions.includes('Kaleci');
      const isGoalkeeper = formData.positions.includes('Kaleci');

      if (isGoalkeeper && (!formData.concededGoals || !formData.cleanSheets)) {
        return setError('Yediğiniz gol ve gol yemediğiniz maç sayısını girmelisiniz');
      }
      if (isFieldPlayer && (!formData.goals || !formData.assists)) {
        return setError('Gol ve asist sayılarını girmelisiniz');
      }
      
      return true;
    }

    // Step 3: personal
    if (s === 3) {
      if (!formData.birthDate) return setError('Doğum tarihi gerekli');
      
      // Yaş hesaplama
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      if (calculatedAge < 15 || calculatedAge > 35) return setError('Yaşınız 15-35 arasında olmalıdır');
      if (!formData.city.trim()) return setError('Şehir gerekli');
      if (!formData.instagram.trim()) return setError('Instagram gerekli');
      if (!formData.height.trim()) return setError('Boy bilgisi gerekli');
      if (!formData.weight.trim()) return setError('Kilo bilgisi gerekli');
      if (!formData.consent) return setError('Paylaşım izni gerekli');
      return true;
    }
    return true;
  };

  const goNext = () => {
    setError('');
    if (!validateStep(step)) return;
    setStepSafe(step === 3 ? 3 : ((step + 1) as 1 | 2 | 3), 1);
  };

  const goBack = () => {
    setError('');
    setStepSafe(step === 1 ? 1 : ((step - 1) as 1 | 2 | 3), -1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Duplicate submit kontrolü - hem state hem ref ile
    if (isSubmitting || hasSubmittedRef.current) {
      console.log('Duplicate submit prevented');
      return; // Zaten submit ediliyor veya edildi, tekrar çalıştırma
    }
    
    // Full validation across steps (Step 1: Video, Step 2: Futbol, Step 3: Kişisel)
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    // If video is still uploading, wait for it to complete
    if (isUploading && uploadTask) {
      setError('Video yükleniyor, lütfen bekleyin...');
      return;
    }

    // If video upload is not complete, start it now
    if (!videoStoragePath && formData.videoFile) {
      setIsSubmitting(true);
      await startVideoUpload(formData.videoFile);
      // Wait for upload to complete
      return;
    }

    // If we don't have videoStoragePath, something went wrong
    if (!videoStoragePath) {
      setError('Video yüklenemedi, lütfen tekrar deneyin');
      return;
    }

    // Submit işaretini koy - duplicate'i önlemek için
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    
    try {
      const submissionData = {
        fullName: formData.fullName.trim(),
        birthDate: formData.birthDate,
        position: [
          ...formData.subPositions,
          ...formData.positions.filter(p => !SUB_POSITIONS[p]) // Alt mevkisi olmayan ana mevkiler (Forvet gibi)
        ].join(' - '),
        dominantFoot: formData.dominantFoot,
        team: formData.team.trim(),
        league: formData.league,
        city: formData.city.trim(),
        instagram: formData.instagram.trim(),
        phone: formData.phone.trim() || null,
        height: parseInt(formData.height) || null,
        weight: parseInt(formData.weight) || null,
        goals: formData.positions.includes('Kaleci') && formData.positions.length === 1 ? 0 : (parseInt(formData.goals) || 0),
        assists: formData.positions.includes('Kaleci') && formData.positions.length === 1 ? 0 : (parseInt(formData.assists) || 0),
        matchesPlayed: parseInt(formData.matchesPlayed) || 0,
        concededGoals: formData.positions.includes('Kaleci') ? (parseInt(formData.concededGoals) || 0) : 0,
        cleanSheets: formData.positions.includes('Kaleci') ? (parseInt(formData.cleanSheets) || 0) : 0,
        season: formData.season,
        nationalTeam: formData.nationalTeam.length > 0 ? formData.nationalTeam : null,
        uCategory: (formData.league === 'Gelişim Altyapısı' || formData.league === 'Elit Altyapı') ? formData.uCategory : null,
        videoStoragePath: videoStoragePath,
        driveVideoLink: null,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'submissions'), submissionData);
      console.log('Submission created successfully');
      
      // Reset form state
      setUploadTask(null);
      setVideoStoragePath(null);
      setIsSubmitting(false);
      
      // Direkt success sayfasına git (Cloud Function arka planda çalışacak)
      onSuccess();
    } catch (err: any) {
      console.error('Submission error:', err);
      setError('Bir hata oluştu: ' + err.message);
      setIsSubmitting(false);
      hasSubmittedRef.current = false; // Hata durumunda reset et
    }
  };

  // useEffect'i kaldırdık - duplicate submission'ı önlemek için
  // Artık sadece handleSubmit kullanılıyor

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-5xl font-black italic tracking-tighter uppercase">
          Oyuncu <span className="text-[#C1FF00]">Başvurusu</span>
        </h2>
        </div>

      {/* Progress (minimal) */}
      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
        <div className={step >= 1 ? 'text-[#C1FF00]' : ''}>Video</div>
        <div className="h-px flex-1 bg-white/10" />
        <div className={step >= 2 ? 'text-[#C1FF00]' : ''}>Futbol</div>
        <div className="h-px flex-1 bg-white/10" />
        <div className={step >= 3 ? 'text-[#C1FF00]' : ''}>Kişisel</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait" initial={false} custom={stepDirection}>
          <motion.div
            key={step}
            custom={stepDirection}
            initial={{ opacity: 0, x: stepDirection * 20, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: stepDirection * -20, scale: 0.96 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.3 },
              scale: { duration: 0.4 }
            }}
          >
            {/* STEP 1: Video */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
              Bilgiler & Video
            </div>
            <div className="space-y-4">
              <FormInput 
                label="Ad Soyad" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleInputChange} 
                placeholder="İsim Soyisim" 
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.25em] ml-1">
                Video (30-60 saniye aralığında olmalıdır)
              </label>
              
              {!formData.videoFile ? (
              <label className="flex flex-col items-center justify-center border border-white/10 rounded-2xl py-10 bg-white/5 cursor-pointer hover:bg-white/7 transition-all group">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-white/50 group-hover:text-[#C1FF00] transition-colors group-hover:scale-110 transition-transform">
                    <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M8 12h8M8 9h5M8 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                <span className="text-[10px] font-black text-white/35 uppercase mt-3 tracking-widest">
                  Maç videonu seç
                </span>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </label>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border border-white/10 rounded-2xl p-3 sm:p-4 bg-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#C1FF00] flex-shrink-0 sm:w-6 sm:h-6">
                        <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] sm:text-xs text-[#C1FF00] font-bold truncate">
                          {formData.videoFile.name}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-white/40 font-medium">
                          {(formData.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          {uploadProgress === 100 && videoStoragePath && (
                            <span className="ml-2 text-[#C1FF00]">✓ Yüklendi</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {uploadProgress === 0 && (
                      <button
                        type="button"
                        onClick={handleCancelVideo}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 self-start sm:self-auto"
                      >
                        İptal
                      </button>
                    )}
                  </div>
                  {uploadProgress > 0 ? (
                    <button
                      type="button"
                      onClick={handleCancelUploadAndSelectNew}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current sm:w-4 sm:h-4">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      İptal Et
                    </button>
                  ) : (
                    <label className="flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black text-white/50 uppercase tracking-widest cursor-pointer hover:text-[#C1FF00] transition-colors py-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current sm:w-4 sm:h-4">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Yeni video seç
                      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                    </label>
                  )}
                </div>
              )}
            </div>

            {(uploadProgress > 0 || isUploading) && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50">
                  <span>
                    {uploadProgress === 100 ? 'Yükleme tamamlandı!' : 'Yükleniyor...'}
                    {uploadSpeed > 0 && uploadProgress < 100 && (
                      <span className="ml-2 text-white/40 normal-case">
                        {uploadSpeed.toFixed(1)} MB/s
                        {timeRemaining > 0 && ` · ~${timeRemaining}s`}
                      </span>
                    )}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1 sm:h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-[#C1FF00]"
                />
                </div>
              </div>
            )}
              </div>
            )}

            {/* STEP 2: Futbol Bilgileri */}
            {step === 2 && (
              <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
              Futbol bilgileri
            </div>
            {/* Futbol Bilgileri Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-2">
              {/* Sol Sütun: Takım, Lig, Mevki */}
              <div className="space-y-6">
                <FormInput label="Takım" name="team" value={formData.team} onChange={handleInputChange} placeholder="Kulüp / Amatör takım" />
                <FormSelect label="Lig" name="league" value={formData.league} onChange={handleInputChange} options={LEAGUES} />
                
                {['Gelişim Altyapısı', 'Elit Altyapı'].includes(formData.league) && (
                  <motion.div
                    key="uCategory-div"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <label className="text-[10px] font-black uppercase text-[#C1FF00]/80 tracking-[0.2em] ml-1 mb-3 block">
                      U Kategorisi *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {U_CATEGORIES.map(uc => (
                        <button
                          key={uc}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, uCategory: uc }));
                          }}
                          className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.uCategory === uc
                              ? 'bg-[#C1FF00] text-[#051A18] border-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.2)]'
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                          }`}
                        >
                          {uc}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">
                    Ana Mevki *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => toggleMainPosition(pos)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          formData.positions.includes(pos)
                            ? 'bg-[#C1FF00] text-[#051A18] border-[#C1FF00]'
                            : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {formData.positions.map(pos => SUB_POSITIONS[pos] && (
                      <motion.div
                        key={`sub-${pos}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C1FF00]/60 ml-1">
                          {pos} Alt Mevkileri *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {SUB_POSITIONS[pos].map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleSubPosition(sub)}
                              className={`py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-between ${
                                formData.subPositions.includes(sub)
                                  ? 'bg-[#C1FF00]/10 text-[#C1FF00] border-[#C1FF00]/40'
                                  : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'
                              }`}
                            >
                              {sub}
                              {formData.subPositions.includes(sub) && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                  <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sağ Sütun: Baskın Ayak, Milli Takım Geçmişi */}
              <div className="space-y-6">
                <FormSelect label="Baskın Ayak" name="dominantFoot" value={formData.dominantFoot} onChange={handleInputChange} options={DOMINANT_FEET} />
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">
                    Milli Takım Geçmişi (Opsiyonel)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {NATIONAL_TEAMS.map(team => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => toggleNationalTeam(team)}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                          formData.nationalTeam.includes(team)
                            ? 'bg-[#C1FF00] text-[#051A18] border-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.2)]'
                            : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45 mb-4">
                Sezon İstatistikleri
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <FormInput 
                  label="Maç" 
                  name="matchesPlayed" 
                  type="text" 
                  inputMode="numeric" 
                  value={formData.matchesPlayed} 
                  onChange={handleInputChange} 
                  placeholder="0" 
                />
                
                {formData.positions.includes('Kaleci') && formData.positions.length === 1 ? (
                  <>
                    <FormInput 
                      label="Yenilen Gol" 
                      name="concededGoals" 
                      type="text" 
                      inputMode="numeric" 
                      value={formData.concededGoals} 
                      onChange={handleInputChange} 
                      placeholder="0" 
                    />
                    <FormInput 
                      label="Kaleyi Gole Kapatma" 
                      name="cleanSheets" 
                      type="text" 
                      inputMode="numeric" 
                      value={formData.cleanSheets} 
                      onChange={handleInputChange} 
                      placeholder="0" 
                    />
                  </>
                ) : (
                  <>
                    <FormInput 
                      label="Gol" 
                      name="goals" 
                      type="text" 
                      inputMode="numeric" 
                      value={formData.goals} 
                      onChange={handleInputChange} 
                      placeholder="0" 
                    />
                    <FormInput 
                      label="Asist" 
                      name="assists" 
                      type="text" 
                      inputMode="numeric" 
                      value={formData.assists} 
                      onChange={handleInputChange} 
                      placeholder="0" 
                    />
                    {formData.positions.includes('Kaleci') && (
                      <>
                        <FormInput 
                          label="Yenilen Gol" 
                          name="concededGoals" 
                          type="text" 
                          inputMode="numeric" 
                          value={formData.concededGoals} 
                          onChange={handleInputChange} 
                          placeholder="0" 
                        />
                        <FormInput 
                          label="Kaleyi Gole Kapatma" 
                          name="cleanSheets" 
                          type="text" 
                          inputMode="numeric" 
                          value={formData.cleanSheets} 
                          onChange={handleInputChange} 
                          placeholder="0" 
                        />
                      </>
                    )}
                  </>
                )}
                <FormSelect label="Sezon" name="season" value={formData.season} onChange={handleInputChange} options={SEASONS} />
              </div>
            </div>
              </div>
            )}

            {/* STEP 3: Kişisel Bilgiler */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
                  Kişisel bilgiler
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {/* Sol Kolon: Yaş, Boy, Kilo + Consent */}
                  <div className="space-y-6">
                    <FormDateInput
                      label="Doğum Tarihi"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      min={new Date(new Date().getFullYear() - 35, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                      max={new Date(new Date().getFullYear() - 15, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                    />
                    <FormInput
                      label="Boy (cm)"
                      name="height"
                      type="text"
                      inputMode="numeric"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="Örn: 180"
                    />
                    <FormInput
                      label="Kilo (kg)"
                      name="weight"
                      type="text"
                      inputMode="numeric"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="Örn: 75"
                    />
                    
                    {/* Consent Checkbox (Sol Kolona Taşındı) */}
                    <div className="flex items-center gap-3 bg-white/5 border-l-2 border-[#C1FF00]/40 p-4 rounded-r-xl hover:bg-white/[0.08] transition-all cursor-pointer group"
                         onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, consent: !prev.consent }))}>
                      <input
                        type="checkbox"
                        id="consent-checkbox-dynamic"
                        checked={formData.consent}
                        onChange={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, consent: e.target.checked })); }}
                        className="w-5 h-5 accent-[#C1FF00] flex-shrink-0 cursor-pointer"
                        required
                      />
                      <label 
                        htmlFor="consent-checkbox-dynamic"
                        className="text-[10px] text-white/55 font-black uppercase tracking-widest cursor-pointer select-none group-hover:text-white transition-colors leading-tight"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalType('privacy');
                          }}
                          className="text-[#C1FF00] hover:text-[#C1FF00]/80 underline transition-colors font-black"
                        >
                          GİZLİLİK POLİTİKASI
                        </button>
                        {' VE '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalType('kvkk');
                          }}
                          className="text-[#C1FF00] hover:text-[#C1FF00]/80 underline transition-colors font-black"
                        >
                          KVKK
                        </button>
                        {' METİNLERİNİ ONAYLIYORUM.'}
                      </label>
                    </div>
                  </div>

                  {/* Sağ Kolon: Şehir, Instagram ve Telefon + Gizlilik */}
                  <div className="space-y-6">
                    <FormInput 
                      label="Şehir" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      placeholder="Yaşadığınız şehir" 
                    />
                    <FormInput 
                      label="Instagram" 
                      name="instagram" 
                      value={formData.instagram} 
                      onChange={handleInputChange} 
                      placeholder="@hesabiniz" 
                    />
                    <FormInput
                      label="Telefon (opsiyonel)"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="5xx xxx xx xx"
                      inputMode="tel"
                    />


                  </div>
                </div>

                {/* Video yükleme durumu gösterimi (Geniş alan kaplaması için grid dışına) */}
                {formData.videoFile && (isUploading || uploadProgress < 100) && (
                  <div className="space-y-1.5 sm:space-y-2 bg-white/5 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50">
                      <span>
                        Video yükleniyor...
                        {uploadSpeed > 0 && uploadProgress < 100 && (
                          <span className="ml-2 text-white/40 normal-case">
                            {uploadSpeed.toFixed(1)} MB/s
                            {timeRemaining > 0 && ` · ~${timeRemaining}s`}
                          </span>
                        )}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 sm:h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-[#C1FF00]"
                    />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold uppercase">
            {error}
        </div>
        )}

        {/* Controls Bar - Responsive & Aligned */}
        <div className="grid grid-cols-3 sm:flex sm:flex-row items-stretch sm:items-center sm:justify-between gap-y-6 gap-x-2 sm:gap-6 pt-6 mt-6 border-t border-white/5 w-full">
          {/* Geri Butonu (Hafif Yukarı - Padding Ayarı ile) */}
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
            className="col-span-1 order-1 sm:order-1 w-full sm:w-auto min-h-[50px] sm:min-h-0 sm:h-auto px-2 sm:px-8 py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 flex items-center justify-center"
          >
            Geri
          </button>

          {/* Sosyal Medya (Premium Görünüm - Diğer sayfalarla aynı) */}
          <div className={`col-span-3 sm:col-span-1 order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center gap-5 transition-opacity duration-300 ${modalType ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Instagram */}
            <motion.a
              href="https://www.instagram.com/netoynar"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] shadow-lg"
            >
              <InstagramIcon className="w-5 h-5 text-white" />
            </motion.a>

            {/* TikTok */}
            <motion.a
              href="https://www.tiktok.com/@netoynar"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#000000] border border-white/10 shadow-lg"
            >
              <TikTokIcon className="w-6 h-6 text-white" />
            </motion.a>

            {/* YouTube */}
            <motion.a
              href="https://youtube.com/@netoynar"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FF0000] shadow-lg"
            >
              <YouTubeIcon className="w-5 h-5 text-white" />
            </motion.a>
          </div>

          {/* Gönder/Devam Butonu (Hafif Yukarı) */}
          <div className="col-span-2 sm:col-span-1 order-2 sm:order-3 w-full sm:w-auto">
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isSubmitting || (step === 1 && !formData.videoFile)}
                className="w-full sm:w-auto min-h-[50px] sm:min-h-0 sm:h-auto px-4 sm:px-10 py-4 sm:py-5 rounded-2xl bg-[#C1FF00] text-[#051A18] font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-[0_14px_30px_rgba(193,255,0,0.18)] hover:shadow-[0_18px_40px_rgba(193,255,0,0.28)] transition-all disabled:opacity-50 flex items-center justify-center"
              >
                Devam
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || (isUploading && uploadProgress < 100) || !videoStoragePath}
                className="w-full sm:w-auto min-h-[50px] sm:min-h-0 sm:h-auto px-4 sm:px-12 py-4 sm:py-5 rounded-2xl bg-[#C1FF00] text-[#051A18] font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-[0_14px_30px_rgba(193,255,0,0.18)] hover:shadow-[0_18px_40px_rgba(193,255,0,0.28)] transition-all disabled:opacity-50 flex items-center justify-center text-center leading-tight"
              >
                {isUploading && uploadProgress < 100 
                  ? `Yükleniyor %${uploadProgress}` 
                  : isSubmitting 
                    ? 'Gönderiliyor...' 
                    : videoStoragePath 
                      ? 'Başvuruyu Gönder' 
                      : 'Video Seçiniz'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Privacy/KVKK Modal */}
      {modalType && (
        <PolicyModal
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  );
}

// --- POLICY MODAL ---
function PolicyModal({ type, onClose }: { type: 'privacy' | 'kvkk'; onClose: () => void }) {
  const isPrivacy = type === 'privacy';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#051A18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0A2E2A]/50">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#C1FF00]">
              {isPrivacy ? 'Gizlilik Politikası' : 'KVKK Aydınlatma Metni'}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              aria-label="Kapat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 md:p-12 space-y-8">
              {isPrivacy ? <PrivacyContent /> : <KVKKContent />}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PrivacyContent() {
  return (
    <>
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
    </>
  );
}

function KVKKContent() {
  return (
    <>
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
    </>
  );
}

// Yardımcı Form Elemanları
function FormInput({ label, value, ...props }: any) {
  const hasValue = value !== undefined && value !== null && value !== '';
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">{label}</label>
      <input 
        {...props} 
        value={value}
        className={`w-full bg-[#0A2E2A] border ${hasValue ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl px-5 py-4 text-sm font-black focus:border-[#C1FF00] outline-none transition-all shadow-inner`} 
      />
    </div>
  );
}

// Modern Takvim Bileşeni
function FormDateInput({ label, name, value, onChange, min, max }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) return new Date(value);
    return new Date(2001, 0, 1);
  });

  const years = useMemo(() => {
    const startYear = min ? new Date(min).getFullYear() : 1950;
    const endYear = max ? new Date(max).getFullYear() : new Date().getFullYear();
    const result = [];
    for (let i = endYear; i >= startYear; i--) result.push(i);
    return result;
  }, [min, max]);

  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      } else {
        if (monthRef.current && !monthRef.current.contains(target)) setIsMonthOpen(false);
        if (yearRef.current && !yearRef.current.contains(target)) setIsYearOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleDateSelect = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`;
    onChange({ target: { name, value: dateStr } } as any);
    setIsOpen(false);
  };

  const formatDateLabel = (val: string) => {
    if (!val) return 'Doğum tarihinizi seçin';
    const d = new Date(val);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#0A2E2A] border ${isOpen ? 'border-[#C1FF00]' : 'border-white/5'} rounded-xl px-5 py-4 text-sm font-black transition-all outline-none shadow-inner`}
        >
          <span className={!value ? 'text-white/30' : 'text-[#C1FF00]'}>
            {formatDateLabel(value)}
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`transition-transform duration-300 ${isOpen ? 'text-[#C1FF00]' : 'text-white/20'}`}>
            <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-3 bg-[#0A2E2A] border border-[#C1FF00]/30 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_20px_rgba(193,255,0,0.05)] z-[100] backdrop-blur-2xl"
            >
              {/* Header: Ay ve Yıl Seçimi (Custom) */}
              <div className="flex items-center justify-between mb-5 gap-3">
                {/* Ay Dropdown */}
                <div className="relative flex-1" ref={monthRef}>
                  <button
                    type="button"
                    onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                    className={`w-full flex items-center justify-between bg-white/[0.04] border ${isMonthOpen ? 'border-[#C1FF00]' : 'border-white/10'} rounded-xl px-3 py-2.5 text-[11px] font-black text-white hover:border-[#C1FF00]/40 transition-all`}
                  >
                    <span className="truncate">{months[currentDate.getMonth()]}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isMonthOpen ? 'rotate-180 text-[#C1FF00]' : 'text-white/20'}`}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <AnimatePresence>
                    {isMonthOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-[#051A18] border border-[#C1FF00]/20 rounded-xl overflow-hidden shadow-2xl z-[110] max-h-48 overflow-y-auto no-scrollbar"
                      >
                        {months.map((m, i) => (
                          <button
                            key={m} type="button"
                            onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), i, 1)); setIsMonthOpen(false); }}
                            className={`w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-left transition-colors ${currentDate.getMonth() === i ? 'bg-[#C1FF00] text-[#051A18]' : 'text-white/60 hover:bg-[#C1FF00]/10 hover:text-[#C1FF00]'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Yıl Dropdown */}
                <div className="relative w-28" ref={yearRef}>
                  <button
                    type="button"
                    onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                    className={`w-full flex items-center justify-between bg-white/[0.04] border ${isYearOpen ? 'border-[#C1FF00]' : 'border-white/10'} rounded-xl px-3 py-2.5 text-[11px] font-black text-white hover:border-[#C1FF00]/40 transition-all`}
                  >
                    <span>{currentDate.getFullYear()}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isYearOpen ? 'rotate-180 text-[#C1FF00]' : 'text-white/20'}`}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <AnimatePresence>
                    {isYearOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-[#051A18] border border-[#C1FF00]/20 rounded-xl overflow-hidden shadow-2xl z-[110] max-h-48 overflow-y-auto custom-scrollbar-minimal"
                      >
                        <style jsx>{`
                          .custom-scrollbar-minimal::-webkit-scrollbar { width: 4px; }
                          .custom-scrollbar-minimal::-webkit-scrollbar-thumb { background: rgba(193,255,0,0.3); border-radius: 10px; }
                        `}</style>
                        {years.map((y: number) => (
                          <button
                            key={y} type="button"
                            onClick={() => { setCurrentDate(new Date(y, currentDate.getMonth(), 1)); setIsYearOpen(false); }}
                            className={`w-full px-4 py-2.5 text-[10px] font-black tracking-wider text-center transition-colors ${currentDate.getFullYear() === y ? 'bg-[#C1FF00] text-[#051A18]' : 'text-white/60 hover:bg-[#C1FF00]/10 hover:text-[#C1FF00]'}`}
                          >
                            {y}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Günler Izgarası */}
              <div className="grid grid-cols-7 gap-1 mb-2 border-b border-white/5 pb-2">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                  <div key={d} className="text-[9px] font-black text-white/25 uppercase tracking-tighter text-center">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 place-items-center">
                {Array.from({ length: (firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-9" />
                ))}
                {Array.from({ length: daysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === currentDate.getMonth() && new Date(value).getFullYear() === currentDate.getFullYear();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      className={`h-9 w-9 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                        isSelected 
                        ? 'bg-[#C1FF00] text-[#051A18] shadow-[0_0_15px_rgba(193,255,0,0.3)] scale-110' 
                        : 'text-white/60 hover:bg-[#C1FF00]/10 hover:text-[#C1FF00]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FormSelect({ label, options, name, value, onChange }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange({
      target: { name, value: option }
    } as any);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">
        {label}
      </label>

      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -inset-1 rounded-[1.2rem] bg-[#C1FF00]/10 blur-[10px]"
            />
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-full flex items-center justify-between bg-[#0A2E2A] border ${
            isOpen ? 'border-[#C1FF00]' : 'border-white/5'
          } rounded-xl px-5 py-4 text-sm font-bold transition-all text-left outline-none shadow-lg`}
        >
          <span className={!value ? 'text-white/40' : 'text-[#C1FF00]'}>
            {value || 'Seç'}
          </span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white/40"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-[100] mt-3 w-full bg-[#0D3631] border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-2xl"
            >
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {options.map((option: string) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                      value === option
                        ? 'bg-[#C1FF00] text-[#051A18]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="uppercase tracking-wide">{option}</span>
                    {value === option && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </motion.svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- DİĞER İÇERİK BİLEŞENLERİ ---

function ProcessView() {
  return (
    <div className="space-y-12 pt-4">
      <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-[1.15] overflow-visible">Süreç Nasıl <br /><span className="text-[#C1FF00] mt-2 block">İşler?</span></h2>
      <div className="space-y-8">
        {[
          { t: 'Dijital Başvuru', d: 'Başvuru formunu eksiksiz doldur ve en iyi kesitlerini içeren videonu gönder.' },
          { t: 'Teknik Analiz?', d: 'Gönderdiğin video Net Oynar ekibi tarafından incelenir. İncelenen videolar kategorize edilir.' },
          { t: 'Vitrine Çıkış', d: 'Net oynar ekibi, YILDIZ kategorisine giren futbolcuları özel olarak çekmeye gider. Diğer kategorideki futbolcuların gönderdikleri videolar, Net Oynar vitrininde paylaşılır.' }
        ].map((item, i) => (
          <div key={i} className="flex gap-6 group">
            <div className="w-14 h-14 shrink-0 rounded-2xl border border-[#C1FF00]/30 flex items-center justify-center font-black text-[#C1FF00] text-xl group-hover:bg-[#C1FF00] group-hover:text-[#051A18] transition-all">0{i+1}</div>
            <div>
              <h4 className="font-black text-xl uppercase tracking-tight italic">{item.t}</h4>
              <p className="text-[#8A9A98] font-medium mt-2 max-w-sm leading-relaxed">{item.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideView() {
  return (
    <div className="space-y-12 -mt-20">
      <div className="overflow-visible">
        <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-[1.15]">Kusursuz <br /><span className="text-[#C1FF00] mt-2 block">Video Rehberi</span></h2>
      </div>
      <div className="flex items-start gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-black tracking-[0.1em] text-white/55 break-words">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00] flex-shrink-0 mt-1.5" />
        <div className="flex-1 min-w-0">
          <span className="text-[#C1FF00] uppercase">İpucu:</span> <span className="normal-case">Videonun başına en iyi hareketini koy. İlk 3 saniye kritik.</span>
        </div>
      </div>
      <div className="grid gap-6">
        <div className="space-y-4">
          <div className="text-[#C1FF00] font-black text-xs uppercase tracking-widest">
            Video Kriterleri
          </div>
          <div className="h-px w-full bg-white/10" />
          <ul className="space-y-4">
            <li className="flex gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-[#8A9A98] items-start">
              <span className="w-2 h-2 bg-[#C1FF00] rounded-full flex-shrink-0 mt-1.5" />
              <span className="flex-1 min-w-0 break-words">Videon 40–60 saniye aralığında olsun; 4–5 iyi kesiti arka arkaya birleştir.</span>
            </li>
            <li className="flex gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-[#8A9A98] items-start">
              <span className="w-2 h-2 bg-[#C1FF00] rounded-full flex-shrink-0 mt-1.5" />
              <span className="flex-1 min-w-0 break-words">Savunma, dripling, şut/pas gibi güçlü yanların öne çıksın.</span>
            </li>
            <li className="flex gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-[#8A9A98] items-start">
              <span className="w-2 h-2 bg-[#C1FF00] rounded-full flex-shrink-0 mt-1.5" />
              <span className="flex-1 min-w-0 break-words">Müzik/efekt gerek yok; temiz görüntü ve net aksiyon yeterli.</span>
            </li>
            <li className="flex gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-[#8A9A98] items-start">
              <span className="w-2 h-2 bg-[#C1FF00] rounded-full flex-shrink-0 mt-1.5" />
              <span className="flex-1 min-w-0 break-words">Videoların 9:16 (dikey) formatta olması kaliteyi arttırır.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FAQView() {
  const [open, setOpen] = useState<number>(-1);
  const faqs = [
    { q: 'Başvuru ücretli mi?', a: 'Hayır, Net Oynar yetenek keşfi süreci tamamen ücretsizdir.' },
    { q: 'Hangi yaş grupları başvurabilir?', a: '15-25 yaş arası aktif futbolcular önceliğimizdir.' },
    { q: 'Videom ne zaman yayınlanır?', a: 'Net Oynar ekibinin teknik incelemesi sonrasında videonuz hazırlanır ve yayınlanır. Yoğunluğa göre bu süre değişebilir.' },
    { q: 'Video formatı ve süresi nasıl olmalı?', a: 'Videonuz 40-60 saniye aralığında olmalı ve maç içi aksiyonlarınızı içermelidir. Pas, şut, dripling gibi güçlü yanlarınızı öne çıkarın. Müzik veya efekt eklemeyin, doğal görüntü tercih edilir. 9:16 (dikey) format kaliteyi artırır.' },
    { q: 'Vitrine çıktıktan sonra ne olur?', a: 'Videonuz Net Oynar vitrininde yayınlandıktan sonra, scout\'lar ve kulüp temsilcileri tarafından görüntülenir. Uygun görülen futbolcular için başvuru formunda belirttiğiniz Instagram adresi veya telefon numaranızdan iletişime geçilir.' },
    { q: 'Başvurum reddedilirse ne olur?', a: 'Başvurunuz teknik kriterlere uymadığında veya uygun görülmediğinde, videonuz vitrine çıkmaz. İstediğiniz zaman yeni bir başvuru yapabilirsiniz. Her başvuru manuel olarak insan gözüyle incelenir.' }
  ];

  return (
    <div className="space-y-12 -mt-12">
      <div className="overflow-visible">
      <h2 className="text-5xl font-black italic tracking-tighter uppercase">
        Sık <span className="text-[#C1FF00]">Sorulanlar</span>
      </h2>
      </div>
      <div className="divide-y divide-white/10">
        {faqs.map((f, i) => (
          <div key={i} className="py-4">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full text-left flex justify-between items-center gap-6"
            >
              <span className={`font-black italic uppercase tracking-tight ${open === i ? 'text-[#C1FF00]' : 'text-white'}`}>
                {f.q}
              </span>
              <span className="text-[#C1FF00] text-2xl leading-none">
                {open === i ? '−' : '+'}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 text-[#8A9A98] font-medium text-sm leading-relaxed max-w-xl">
                    {f.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        </div>
    </div>
  );
}

function SuccessView({ onReset }: { onReset: () => void }) {
  const socialLinks = {
    instagram: 'https://www.instagram.com/netoynar?igsh=MWU4ems3NHFua2hhcA==',
    youtube: 'https://youtube.com/@netoynar?si=rBPIHhLOwogZh4I-',
    tiktok: 'https://www.tiktok.com/@netoynar?_r=1&_t=ZS-92XqWg4BsAb',
  };

  return (
    <div className="text-center space-y-10 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter uppercase leading-[1.1]">
          Başvurun <br />
          <span className="text-[#C1FF00]">Alındı!</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <p className="text-xl md:text-2xl text-[#8A9A98] max-w-2xl mx-auto font-medium leading-relaxed">
          Başvurun en kısa zamanda Net Oynar ekibi tarafından değerlendirilecek ve seninle iletişime geçilecek.
        </p>
      </motion.div>

      {/* Kritik Uyarı Bölümü */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto"
      >
        <div className="relative group p-8 rounded-[2rem] bg-red-500/5 border border-red-500/20 shadow-[0_20px_50px_rgba(239,68,68,0.1)] overflow-hidden">
          {/* Arka Plan Dekoru */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-center gap-3 text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-sm font-black uppercase tracking-[0.2em]">Önemli Uyarı</span>
            </div>
            <p className="text-lg md:text-xl text-white font-bold leading-relaxed italic">
              "Sosyal medya hesaplarımızı takip etmediğiniz takdirde başvurunuz <span className="text-red-400 underline decoration-red-400/30 underline-offset-4">incelemeye alınmayacaktır.</span>"
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sosyal Medya Kartları */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Instagram */}
          <motion.a
            href={socialLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-48 group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#833AB4]/50 hover:bg-[#833AB4]/5 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] shadow-lg">
                <InstagramIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Takip Et</span>
                <span className="block text-sm font-bold text-white/80 group-hover:text-white mt-1">Instagram</span>
              </div>
            </div>
          </motion.a>

          {/* TikTok */}
          <motion.a
            href={socialLinks.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-48 group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/50 hover:bg-white/5 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-[4.25rem] h-[4.25rem] flex items-center justify-center rounded-2xl bg-[#000000] shadow-lg">
                <TikTokIcon className="w-9 h-9 text-white" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Takip Et</span>
                <span className="block text-sm font-bold text-white/80 group-hover:text-white mt-1">TikTok</span>
              </div>
            </div>
          </motion.a>

          {/* YouTube */}
          <motion.a
            href={socialLinks.youtube}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-48 group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#FF0000]/50 hover:bg-[#FF0000]/5 transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#FF0000] shadow-lg">
                <YouTubeIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Abone Ol</span>
                <span className="block text-sm font-bold text-white/80 group-hover:text-white mt-1">YouTube</span>
              </div>
            </div>
          </motion.a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="pt-6"
      >
        <button 
          onClick={onReset} 
          className="group flex items-center gap-3 mx-auto px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-[#C1FF00] hover:border-[#C1FF00]/30 transition-all duration-300"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ana Sayfaya Dön</span>
        </button>
      </motion.div>
    </div>
  );
}

// --- SOCIAL MEDIA LINKS ---
function SocialMediaLinks() {
  const socialLinks = {
    instagram: 'https://www.instagram.com/netoynar?igsh=MWU4ems3NHFua2hhcA==',
    youtube: 'https://youtube.com/@netoynar?si=rBPIHhLOwogZh4I-',
    tiktok: 'https://www.tiktok.com/@netoynar?_r=1&_t=ZS-92XqWg4BsAb',
  };

  return (
    <div className="lg:fixed lg:bottom-10 lg:left-1/2 lg:-translate-x-1/2 z-[100] flex items-center justify-center gap-6 py-12 lg:py-0 relative">
      {/* Instagram */}
      <motion.a
        href={socialLinks.instagram}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.15, y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
        aria-label="Instagram"
      >
        <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] shadow-lg hover:shadow-xl transition-all duration-300">
          <InstagramIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </motion.a>

      {/* TikTok */}
      <motion.a
        href={socialLinks.tiktok}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.15, y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
        aria-label="TikTok"
      >
        <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#000000] border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
          <TikTokIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
        </div>
      </motion.a>

      {/* YouTube */}
      <motion.a
        href={socialLinks.youtube}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.15, y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
        aria-label="YouTube"
      >
        <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#FF0000] shadow-lg hover:shadow-xl transition-all duration-300">
          <YouTubeIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
        </div>
      </motion.a>
    </div>
  );
}

// --- SOCIAL MEDIA ICONS (Custom SVG) ---
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        fill="currentColor"
      />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
        fill="currentColor"
      />
    </svg>
  );
}