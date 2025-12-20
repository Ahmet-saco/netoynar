'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Disable swipe on apply and success pages
    if (active === 'apply' || active === 'success') return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    // Disable swipe on apply and success pages
    if (active === 'apply' || active === 'success') return;
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

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
      className="relative min-h-screen bg-[#051A18] text-[#E0E7E6] selection:bg-[#C1FF00]/30 overflow-x-hidden font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dinamik Arka Plan Katmanları */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow-mesh -top-[10%] -left-[10%] opacity-40 animate-pulse" />
        <div className="glow-mesh bottom-0 right-0 opacity-20" style={{ background: 'radial-gradient(circle, #00F5FF 0%, transparent 70%)' }} />
        {/* Saha Çizgileri Dekoru */}
        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" 
             style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
      </div>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 pt-4 pb-20 max-w-full overflow-x-hidden">
      <Header active={active} onChangeScene={handleChangeScene} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -50 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={`grid ${active === 'faq' || active === 'apply' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-16 items-center min-h-[75vh]`}>
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
                  <RightDynamicVisual active={active} applyStep={applyStep} />
                </div>
              )}

              {/* Desktop: tüm sahneler için sağ kolon (FAQ ve Apply hariç) */}
              {active !== 'faq' && active !== 'apply' && (
              <div className="order-1 lg:order-2 relative hidden lg:flex justify-center items-center h-full min-h-[420px]">
                <RightDynamicVisual active={active} applyStep={applyStep} />
              </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- SAĞ KOLON DİNAMİK GÖRSELLERİ ---

function RightDynamicVisual({ active, applyStep }: { active: SceneId; applyStep?: 1 | 2 | 3 }) {
  return (
    <div className="relative w-full max-w-lg aspect-square">
      {/* Ortak Arka Plan Işığı */}
      <div className="absolute inset-0 bg-[#C1FF00]/5 blur-[120px] rounded-full animate-pulse" />

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 1.1, rotate: 5 }}
          className="w-full h-full"
        >
          {/* Hero görseli olduğu gibi kalsın */}
          {active === 'hero' && <HeroVisual />}

          {/* Diğer sahneler: tek bir premium 3D frame içinde */}
          {active !== 'hero' && (
            <RightFrame>
              {active === 'process' && <ProcessVisual />}
              {active === 'guide' && <GuideVisual />}
              {active === 'faq' && <FAQVisual />}
              {active === 'apply' && <ApplyIntakeVisual step={applyStep ?? 1} />}
              {active === 'success' && <SuccessTrophyVisual />}
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
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C1FF00]/80" />
                  50MB limit
                </div>
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
        className="relative rounded-[2.5rem] border border-white/10 bg-[#0A2E2A]/40 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl overflow-hidden"
        style={{
          transform: 'rotateX(8deg) rotateY(-10deg)',
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
function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center will-change-contents">
      <div className="absolute w-full h-full border border-white/5 rounded-full animate-[spin_20s_linear_infinite] will-change-transform" />
      <div className="absolute w-[70%] h-[70%] border border-[#C1FF00]/20 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse] will-change-transform" />

      {/* Orbiting promise bubbles (icon-only, subtle, meaningful) */}
      <div className="absolute inset-0">
        {/* Orbit track */}
        <div className="absolute inset-[12%] rounded-full border border-white/5" />

        {/* Premium bubbles: icon-only (no text) */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 1 }}
          transition={{ 
            rotate: { duration: 44, repeat: Infinity, ease: 'linear', delay: 0.1 },
            opacity: { duration: 0.3, delay: 0.1 }
          }}
          style={{ transformOrigin: '50% 50%', transform: 'translateZ(0)' }}
        >
          {/* KEŞİF */}
          <motion.div
            className="absolute left-1/2 top-[7%] -translate-x-1/2 will-change-transform"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -4, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
              opacity: { duration: 0.3, delay: 0.2 }
            }}
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(193,255,0,0.10)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#C1FF00]">
                <path d="M12 22s8-3.5 8-10V6l-8-3-8 3v6c0 6.5 8 10 8 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M12 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </motion.div>

          {/* İNCELEME */}
          <motion.div
            className="absolute left-[12%] top-1/2 -translate-y-1/2 will-change-transform"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, 3, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 6.1, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
              opacity: { duration: 0.3, delay: 0.3 }
            }}
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_22px_rgba(255,255,255,0.06)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            </div>
          </motion.div>

          {/* ANALİZ */}
          <motion.div
            className="absolute right-[10%] top-[34%] will-change-transform"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -3, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 5.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
              opacity: { duration: 0.3, delay: 0.4 }
            }}
            style={{ transform: 'translateZ(0)' }}
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

          {/* VİTRİN */}
          <motion.div
            className="absolute right-[14%] top-[74%] will-change-transform"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, 4, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 6.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
              opacity: { duration: 0.3, delay: 0.5 }
            }}
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(193,255,0,0.10)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#C1FF00]">
                <path d="M12 2l2.2 6.7H21l-5.4 3.9L17.8 20 12 15.8 6.2 20l2.2-7.4L3 8.7h6.8L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.div>
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
          className="text-8xl font-black text-[#C1FF00] italic drop-shadow-[0_0_30px_rgba(193,255,0,0.5)] will-change-transform"
          style={{ transform: 'translateZ(0)' }}
        >
          2K+
        </motion.h2>
        <p className="text-cyan-400 font-bold tracking-[0.4em] uppercase text-xs">Aktif Yetenek</p>
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
        <div className="absolute top-0 left-0 h-1 w-full bg-[#C1FF00] shadow-[0_0_15px_rgba(193,255,0,0.6)] animate-[scan_3s_ease-in-out_infinite]" />

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

      <style jsx>{` @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } } `}</style>
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
  return (
    <header className="relative w-full py-4 mb-4">
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center w-full">
        <nav className="flex gap-8 items-center">
          {NAV_ITEMS.map(item => (
          <button
              key={item.id} 
              onClick={() => onChangeScene(item.id)}
              className={`text-sm font-bold uppercase tracking-widest transition-all hover:text-[#C1FF00] ${active === item.id ? 'text-[#C1FF00]' : 'text-white/55'}`}
            >
              {item.id === 'hero' ? (
                <>
                  {item.label} <span className="font-normal text-white/40">· Başvuru</span>
                </>
              ) : (
                item.label
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex items-center justify-between w-full gap-2">
        {/* Net Oynar - Left */}
        <button
          onClick={() => onChangeScene('hero')}
          className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:text-[#C1FF00] whitespace-nowrap py-1 ${
            active === 'hero' ? 'text-[#C1FF00]' : 'text-white/55'
          }`}
        >
          Net Oynar <span className="font-normal text-white/40 text-[8px]">· Başvuru</span>
        </button>
        
        {/* Other Navigation - Right */}
        <nav className="flex gap-2 items-center">
          {NAV_ITEMS.filter(item => item.id !== 'hero').map(item => (
              <button
                key={item.id}
                onClick={() => onChangeScene(item.id)}
              className={`text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:text-[#C1FF00] whitespace-nowrap py-1 ${
                active === item.id ? 'text-[#C1FF00]' : 'text-white/55'
                }`}
              >
                {item.label}
              </button>
            ))}
        </nav>
      </div>
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
  age: string;
  position: string;
  dominantFoot: string;
  team: string;
  city: string;
  instagram: string;
  phone: string;
  videoFile: File | null;
  consent: boolean;
}

const POSITIONS = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet', 'Kanat'];
const DOMINANT_FEET = ['Sağ', 'Sol', 'Her İkisi'];

function ApplyForm({
  onSuccess,
  onStepChange,
}: {
  onSuccess: () => void;
  onStepChange?: (s: 1 | 2 | 3) => void;
}) {
  const [formData, setFormData] = useState<ApplyFormData>({
    fullName: '',
    age: '',
    position: '',
    dominantFoot: '',
    team: '',
    city: '',
    instagram: '',
    phone: '',
    videoFile: null,
    consent: false,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTime = useRef<number>(0);
  const lastProgressTime = useRef<number>(0);
  const lastProgressBytes = useRef<number>(0);
  const hasSubmittedRef = useRef<boolean>(false); // Duplicate submit önleme

  // Keep right visual in sync
  const setStepSafe = (s: 1 | 2 | 3, direction: 1 | -1 = 1) => {
    setStepDirection(direction);
    setStep(s);
    onStepChange?.(s);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      const videoRef = ref(storage, `submissions/${Date.now()}_${file.name}`);
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
    
    // File size validation
    if (file.size > 70 * 1024 * 1024) {
      setError('Video 70MB\'dan küçük olmalı');
      e.target.value = ''; // Reset input
      return;
    }
    
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
    // Step 1: video
    if (s === 1) {
      if (!formData.videoFile) return setError('Video seçmelisiniz');
      return true;
    }

    // Step 2: football
    if (s === 2) {
      if (!formData.team.trim()) return setError('Takım bilgisi gerekli');
      if (!formData.position) return setError('Mevki seçiniz');
      if (!formData.dominantFoot) return setError('Baskın ayak seçiniz');
      return true;
    }

    // Step 3: personal
    if (s === 3) {
      if (!formData.fullName.trim()) return setError('Ad Soyad gerekli');
      if (!formData.age.trim()) return setError('Yaş gerekli');
      if (!/^\d{1,2}$/.test(formData.age.trim())) return setError('Yaş geçersiz');
      if (!formData.city.trim()) return setError('Şehir gerekli');
      if (!formData.instagram.trim()) return setError('Instagram gerekli');
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
        age: parseInt(formData.age),
        position: formData.position,
        dominantFoot: formData.dominantFoot,
        team: formData.team.trim(),
        city: formData.city.trim(),
        instagram: formData.instagram.trim(),
        phone: formData.phone.trim() || null,
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

      <form onSubmit={handleSubmit} className="space-y-10">
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
              Video
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Takım" name="team" value={formData.team} onChange={handleInputChange} placeholder="Kulüp / Amatör takım" />
              <FormSelect label="Mevki" name="position" value={formData.position} onChange={handleInputChange} options={POSITIONS} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect label="Baskın Ayak" name="dominantFoot" value={formData.dominantFoot} onChange={handleInputChange} options={DOMINANT_FEET} />
              <div className="hidden md:block" />
            </div>
              </div>
            )}

            {/* STEP 3: Kişisel Bilgiler */}
            {step === 3 && (
              <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
              Kişisel bilgiler
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Ad Soyad" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="İsim Soyisim" />
              <FormInput
                label="Yaş"
                name="age"
                type="text"
                inputMode="numeric"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="18"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Şehir" name="city" value={formData.city} onChange={handleInputChange} placeholder="İstanbul" />
              <FormInput label="Instagram" name="instagram" value={formData.instagram} onChange={handleInputChange} placeholder="@hesabiniz" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Telefon (opsiyonel)"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="5xx xxx xx xx"
                inputMode="tel"
              />
              <div className="hidden md:block" />
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(e) =>
                  setFormData({ ...formData, consent: e.target.checked })
                }
                className="w-5 h-5 accent-[#C1FF00]"
              />
              <label className="text-[10px] text-white/55 font-bold leading-tight uppercase">
                Videomun ve bilgilerimin Net Oynar vitrininde paylaşılmasına izin veriyorum.
              </label>
            </div>

            {/* Video yükleme durumu gösterimi (Step 3'te) */}
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

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
            className="px-6 py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Geri
          </button>

          <div className="flex-1" />

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={isSubmitting || (step === 1 && !formData.videoFile)}
              className="px-8 py-4 rounded-2xl bg-[#C1FF00] text-[#051A18] font-black uppercase tracking-widest text-xs shadow-[0_14px_30px_rgba(193,255,0,0.18)] hover:shadow-[0_18px_40px_rgba(193,255,0,0.28)] transition-all disabled:opacity-50"
            >
              Devam
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || (isUploading && uploadProgress < 100) || !videoStoragePath}
              className="px-10 py-4 rounded-2xl bg-[#C1FF00] text-[#051A18] font-black uppercase tracking-widest text-xs shadow-[0_14px_30px_rgba(193,255,0,0.18)] hover:shadow-[0_18px_40px_rgba(193,255,0,0.28)] transition-all disabled:opacity-50"
            >
              {isUploading && uploadProgress < 100 
                ? `Yükleniyor... ${uploadProgress}%` 
                : isSubmitting 
                  ? 'Gönderiliyor...' 
                  : videoStoragePath 
                    ? 'Başvuruyu Gönder' 
                    : 'Video yükleniyor...'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Yardımcı Form Elemanları
function FormInput({ label, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">{label}</label>
      <input {...props} className="w-full bg-[#0A2E2A] border border-white/5 rounded-xl px-5 py-4 text-sm font-bold focus:border-[#C1FF00] outline-none transition-all" />
    </div>
  );
}

function FormSelect({ label, options, ...props }: any) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">
        {label}
      </label>

      <div className="relative">
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -inset-1 rounded-[0.95rem] bg-[#C1FF00]/10 blur-[10px]"
            />
          )}
        </AnimatePresence>

        <select
          {...props}
          onFocus={(e: any) => {
            setFocused(true);
            props?.onFocus?.(e);
          }}
          onBlur={(e: any) => {
            setFocused(false);
            props?.onBlur?.(e);
          }}
          className="relative w-full bg-[#0A2E2A] border border-white/5 rounded-xl px-5 py-4 text-sm font-bold focus:border-[#C1FF00] outline-none transition-all"
        >
          <option value="">Seç</option>
          {options.map((o: string) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
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
        
        <div className="flex items-center justify-center gap-2 pt-4">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-[#C1FF00]"
          />
          <span className="text-sm text-white/60 font-bold uppercase tracking-widest">
            İnceleme Sürecinde
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <button 
          onClick={onReset} 
          className="text-[#C1FF00] font-black uppercase tracking-widest text-xs hover:underline decoration-2 underline-offset-8 transition-all hover:text-[#00F5FF]"
        >
        Yeni Başvuru veya Ana Sayfa
      </button>
      </motion.div>
    </div>
  );
}