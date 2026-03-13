'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Player {
  id: string;
  fullName: string;
  age: number;
  birthDate?: string;
  position: string;
  dominantFoot: string;
  team: string;
  city: string;
  instagram: string;
  league: string;
  uCategory?: string;
  height?: number;
  weight?: number;
  goals?: number;
  assists?: number;
  matchesPlayed?: number;
  concededGoals?: number;
  cleanSheets?: number;
  season?: string;
  driveVideoLink?: string;
  instagramVideoLink?: string;
  bio?: string;
  rating?: number;
  reviewedAt?: string;
  oldTeam?: string;
  newTeam?: string;
  oldTeamLeague?: string;
  newTeamLeague?: string;
  nationalTeam?: string[];
}

const POS_CONFIG: Record<string, { color: string; glow: string; accent: string }> = {
  'Kaleci': { color: '#818CF8', glow: '#818CF840', accent: '#1e1b4b' },
  'Defans': { color: '#34D399', glow: '#34D39940', accent: '#064e3b' },
  'Orta Saha': { color: '#FB923C', glow: '#FB923C40', accent: '#431407' },
  'Forvet': { color: '#FBBF24', glow: '#FBBF2440', accent: '#451a03' },
  'Kanat': { color: '#22D3EE', glow: '#22D3EE40', accent: '#164e63' },
};
const DEFAULT_POS = { color: '#C1FF00', glow: '#C1FF0040', accent: '#1a2e05' };

const FOOT_MAP: Record<string, string> = {
  'Sağ': 'SAĞ', 'Sol': 'SOL', 'Her İkisi': 'İKİ AYAK',
};

// Dinamik Yaş Hesaplama Fonksiyonu
function getPlayerAge(player: any) {
  if (player.birthDate) {
    const birthDate = new Date(player.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  
  // Legacy (Eski Kayıt) Mantığı:
  // Kullanıcı "seneye bugün artsın" dediği için, 
  // bugünkü tarihten yaşını çıkartıp hayali bir doğum tarihi gibi davranıyoruz.
  // Yaşı statik olandan alıyoruz ama seneye bugün (+1 gün geçtiğinde) artmış olacak.
  if (player.age) {
    const legacyBaseDate = new Date('2026-03-12'); // Sistemin kurulduğu tarih (Bugün)
    const today = new Date();
    
    // Yıl farkı (Kaç yıl geçti sistem kurulduğundan beri?)
    let yearsSinceSetup = today.getFullYear() - legacyBaseDate.getFullYear();
    const m = today.getMonth() - legacyBaseDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < legacyBaseDate.getDate())) {
      yearsSinceSetup--;
    }
    
    return player.age + Math.max(0, yearsSinceSetup);
  }
  
  return '-';
}

/* ─── Zengin ve Modern Oyuncu Kartı (Step 163 Style) ─── */
function PlayerCardComponent({ player, index, onShowBio, onShowTransfer }: { player: Player; index: number; onShowBio: (p: Player) => void; onShowTransfer: (p: Player) => void }) {
  const cfg = useMemo(() => {
    const pos = player.position.toLowerCase();
    if (pos.includes('kaleci')) return POS_CONFIG['Kaleci'];
    if (pos.includes('stoper') || pos.includes('bek') || pos.includes('defans')) return POS_CONFIG['Defans'];
    if (pos.includes('numara') || pos.includes('orta saha')) return POS_CONFIG['Orta Saha'];
    if (pos.includes('açık') || pos.includes('kanat')) return POS_CONFIG['Kanat'];
    if (pos.includes('forvet')) return POS_CONFIG['Forvet'];
    return POS_CONFIG[player.position] ?? DEFAULT_POS;
  }, [player.position]);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, transition: { duration: 0.3, ease: "easeOut", delay: 0 } }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-2xl sm:rounded-[1.75rem] cursor-default h-full"
        style={{
          transition: 'transform 0.15s ease',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.35) 100%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.3) inset',
          border: '1px solid rgba(255,255,255,0.07)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* İç Katman: Arka plan efektlerini clip eder */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-[1.75rem] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at 50% -20%, ${cfg.accent} 0%, transparent 65%)` }} />
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${cfg.color} 40%, ${cfg.color} 60%, transparent 100%)` }} />
        </div>

        {/* Instagram Butonu - Her zaman kartın içinde, mobilde daha küçük */}
        {player.instagram && (
          <a href={`https://instagram.com/${player.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
            className="absolute top-3 right-3 sm:top-5 sm:right-5 flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] transition-all duration-300 group z-50 hover:scale-110 active:scale-95 border border-white/40"
            style={{ transform: 'translateZ(20px)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-300">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                fill="currentColor"
              />
            </svg>
          </a>
        )}

        <div className="p-3 sm:p-5 flex flex-col h-full space-y-4 sm:space-y-6">
          <div className="flex-1 space-y-4 sm:space-y-6">
            <div className="flex items-start justify-between gap-2 relative">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-xl font-black tracking-tight leading-tight text-white truncate pr-7 sm:pr-9">{player.fullName}</h3>
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="flex items-center gap-1.5 w-full overflow-hidden">
                  {player.team && (
                    <span 
                      className={`text-white/45 font-bold whitespace-nowrap sm:text-[12px] ${player.team.length > 20 ? 'text-[7px]' : player.team.length > 14 ? 'text-[8.5px]' : 'text-[10px]'}`}
                    >
                      {player.team}
                    </span>
                  )}
                  {player.team && player.city && <span className="text-white/20 text-[8px] sm:text-[10px] flex-shrink-0">·</span>}
                  <span 
                    className={`text-white/35 font-medium whitespace-nowrap sm:text-[12px] ${player.city.length > 12 ? 'text-[8px]' : 'text-[10px]'}`}
                  >
                    {player.city}
                  </span>
                </div>
                {player.league && (
                  <div className="flex items-center gap-1.5 mt-0.5 w-full overflow-hidden">
                    <span className="text-[7.5px] sm:text-[10px] font-black text-[#C1FF00]/60 uppercase tracking-widest whitespace-nowrap flex-shrink-0">
                      {(() => {
                        let leagueText = player.league
                          .replace(/Süper Amatör.*/i, 'SAL')
                          .replace(/Bölgesel Amatör.*/i, 'BAL')
                          .replace(/1\. Amatör.*/i, '1. AMATÖR')
                          .replace(/2\. Amatör.*/i, '2. AMATÖR')
                          .replace(/Gelişim Altyapısı/i, 'GELİŞİM')
                          .replace(/Elit Altyapı/i, 'ELİT ALTYAPI');
                        
                        const isAltyapi = leagueText === 'GELİŞİM' || leagueText === 'ELİT ALTYAPI';

                        if (player.uCategory) {
                          if (isAltyapi) {
                            return `${player.uCategory} ${leagueText}`;
                          }
                          return `${leagueText} · ${player.uCategory}`;
                        }
                        return leagueText;
                      })()}
                    </span>
                    <span className="text-[#C1FF00] text-[6px] sm:text-[10px] flex-shrink-0 drop-shadow-[0_0_5px_rgba(193,255,0,0.8)] opacity-60">·</span>
                    {(() => {
                      let posText = player.position;
                      if (/numara/i.test(posText)) {
                        posText = posText.replace(/numara/gi, '').replace(/\s+/g, ' ').replace(/\s*-\s*$/g, '').trim() + ' NUMARA';
                      }

                      // Mobilde çok uzun mevkileri kısaltalım
                      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                      if (isMobile) {
                        posText = posText
                          .replace(/Kaleci/g, 'KL')
                          .replace(/Defans/g, 'DEF')
                          .replace(/Orta Saha/g, 'OS')
                          .replace(/Forvet/g, 'FV')
                          .replace(/Kanat/g, 'KNT')
                          .replace(/Stoper/g, 'STP')
                          .replace(/Sol Bek/g, 'SLB')
                          .replace(/Sağ Bek/g, 'SGB')
                          .replace(/Sol Açık/g, 'SLA')
                          .replace(/Sağ Açık/g, 'SGA');
                      }

                      const isVeryLong = posText.length > 18;
                      const isLong = posText.length > 13;
                      
                      return (
                        <span 
                          className={`font-black uppercase whitespace-nowrap sm:text-[10px] sm:tracking-widest ${isVeryLong ? 'text-[5.5px] tracking-tight' : isLong ? 'text-[6.5px] tracking-tight' : 'text-[7.5px] tracking-wider'}`} 
                          style={{ color: cfg.color }}
                        >
                          {posText}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TRANSFER BANNER (EN İYİ REKLAM) */}
          {player.oldTeam && player.newTeam && (
            <div className="relative mt-4 group cursor-pointer" onClick={() => onShowTransfer(player)}>
              {/* Floating Label (TextField style) */}
              <div className="absolute -top-2 left-1 z-20 bg-[#C1FF00] text-[#0A2E2A] text-[5.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(193,255,0,0.4)]">
                TRANSFER
              </div>
              
              <div 
                className="relative -mx-3 sm:-mx-5 px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-[#C1FF00]/20 via-[#C1FF00]/5 to-transparent border-y border-[#C1FF00]/30 flex items-center justify-between gap-1 sm:gap-3 overflow-hidden transition-all duration-300 group-hover:bg-white/[0.04]"
              >
                 {/* Parlama Efekti */}
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C1FF00]/20 to-transparent transform -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C1FF00] shadow-[1px_0_15px_rgba(193,255,0,0.8)]" />
                 
                 <div className="flex flex-1 items-center gap-1 sm:gap-3 overflow-hidden min-w-0 pr-1 sm:pr-2">
                   <div className="flex flex-1 items-center gap-0.5 sm:gap-2 overflow-hidden min-w-0">
                     <span className="text-[7.5px] sm:text-[12px] font-bold text-white/50 uppercase tracking-wider sm:tracking-widest truncate">{player.oldTeam}</span>
                     <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#C1FF00" strokeWidth="3" className="flex-shrink-0 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] sm:w-[14px] sm:h-[14px]"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                     <span className="text-[8.5px] sm:text-[14px] font-black text-[#C1FF00] uppercase tracking-wider sm:tracking-widest truncate drop-shadow-[0_0_8px_rgba(193,255,0,0.4)]">{player.newTeam}</span>
                   </div>
                 </div>

                 <div className="flex-shrink-0 text-[#C1FF00]/40 group-hover:text-[#C1FF00] group-hover:scale-110 transition-all">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[16px] sm:h-[16px]"><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path></svg>
                 </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-0 divide-x divide-white/[0.06] bg-white/[0.03] py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-white/[0.05]">
            <div className="text-center px-0.5">
              <div className="text-xs sm:text-sm font-black text-white leading-none">{getPlayerAge(player)}</div>
              <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-white/30 mt-1">Yaş</div>
            </div>
            <div className="text-center px-0.5">
              <div className="text-[8px] sm:text-[10px] font-black leading-tight" style={{ color: cfg.color }}>{FOOT_MAP[player.dominantFoot] ?? player.dominantFoot}</div>
              <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-white/30 mt-1">Ayak</div>
            </div>
            <div className="text-center px-0.5">
              <div className="text-[8px] sm:text-[10px] font-black text-white/70 leading-tight uppercase">
                {player.height ? `${player.height} CM` : '-'}
              </div>
              <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-white/30 mt-1">Boy</div>
            </div>
          </div>

          <div className="space-y-3 px-1">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
              <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                <span>Sezon Verileri</span>
                {player.season && (
                  <span className="text-[#C1FF00]/40 text-[7px] sm:text-[8px] tracking-normal">
                    ({player.season.replace(/20/g, '')})
                  </span>
                )}
              </div>
              <div className="h-px flex-1 mx-3 bg-white/5" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Maç Sayısı - Herkes için */}
              <div className="bg-white/[0.02] sm:bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
                <span className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Maç</span>
                <span className="text-xs sm:text-sm font-black text-white/90">{player.matchesPlayed || 0}</span>
              </div>

              {player.position?.includes('Kaleci') ? (
                /* Kaleci İçin: Yenilen Gol ve Clean Sheets */
                <>
                  <div className="bg-white/[0.02] sm:bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Yenilen</span>
                    <span className="text-xs sm:text-sm font-black text-red-400">{player.concededGoals || 0}</span>
                  </div>
                  <div className="bg-white/[0.02] sm:bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Kapama</span>
                    <span className="text-xs sm:text-sm font-black text-green-400">{player.cleanSheets || 0}</span>
                  </div>
                </>
              ) : (
                /* Diğerleri İçin: Gol ve Asist */
                <>
                  <div className="bg-white/[0.02] sm:bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Gol</span>
                    <span className="text-xs sm:text-sm font-black text-[#C1FF00]">{player.goals || 0}</span>
                  </div>
                  <div className="bg-white/[0.02] sm:bg-white/[0.03] border border-white/[0.05] rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
                    <span className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Asist</span>
                    <span className="text-xs sm:text-sm font-black text-cyan-400">{player.assists || 0}</span>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Butonlar */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onShowBio(player)}
                className={`w-full rounded-lg py-1.5 sm:py-2 text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all bg-white/5 border border-white/10 hover:border-white/20 text-white`}
              >
                Özgeçmiş
              </button>
              
              <button 
                onClick={() => {
                  const videoUrl = player.instagramVideoLink || player.driveVideoLink;
                  if (videoUrl) window.open(videoUrl, '_blank');
                }}
                className={`w-full ${player.instagramVideoLink || player.driveVideoLink ? 'bg-[#C1FF00] text-black hover:shadow-[0_0_20px_rgba(193,255,0,0.3)]' : 'bg-white/5 text-white/20 cursor-not-allowed'} rounded-lg py-1.5 sm:py-2 text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all`}
              >
                İzle
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
const PlayerCard = memo(PlayerCardComponent);

/* ─── Hero Visual ─── */
function VitrinHeroVisual({ count }: { count: number }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center will-change-contents transform-gpu">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-full border border-white/5 rounded-full will-change-transform transform-gpu"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-[70%] h-[70%] border border-[#C1FF00]/20 rounded-full border-dashed will-change-transform transform-gpu"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      />

      {/* Orbiting avatars */}
      <div className="absolute inset-0">
        <div className="absolute inset-[10%] rounded-full border border-white/5" />

        <motion.div
          className="absolute inset-0 will-change-transform transform-gpu"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: '50% 50%', backfaceVisibility: 'hidden' }}
        >
          {[
            { img: 'man1.jpg', pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', delay: 0.2 },
            { img: 'man2.jpg', pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', delay: 0.4 },
            { img: 'man3.jpg', pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', delay: 0.6 },
            { img: 'man4.jpg', pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', delay: 0.8 },
          ].map((avatar, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: avatar.delay, duration: 0.5, ease: "easeOut" }}
              className={`absolute ${avatar.pos} w-14 h-14 lg:w-20 lg:h-20`}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                whileHover="hovered"
                initial="initial"
                className="w-full h-full relative group cursor-pointer will-change-transform transform-gpu"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Glow Effect */}
                <div className="absolute -inset-1.5 bg-[#C1FF00]/25 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="w-full h-full rounded-full border-[2px] lg:border-[3px] border-white/10 overflow-hidden bg-[#0A2E2A] relative z-10 shadow-2xl">
                  <Image
                    src={`/assets/${avatar.img}`}
                    alt="Scouted Player"
                    fill
                    sizes="(max-width: 1024px) 56px, 80px"
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-125"
                  />
                  {/* Overlay for better integration */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#051A18]/40 to-transparent mix-blend-multiply" />
                </div>

                {/* Premium Star Icon instead of dot */}
                <motion.div
                  variants={{
                    initial: { rotate: 0, scale: 1 },
                    hovered: { rotate: 180, scale: 1.15 }
                  }}
                  transition={{
                    rotate: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] },
                    scale: { duration: 0.4 }
                  }}
                  className="absolute -bottom-0.5 -right-0.5 lg:-bottom-1 lg:-right-1 w-5 h-5 lg:w-7 lg:h-7 bg-[#C1FF00] rounded-md lg:rounded-lg z-20 shadow-[0_0_15px_rgba(193,255,0,0.5)] flex items-center justify-center overflow-hidden"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#051A18" className="lg:w-[12px] lg:h-[12px]">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="text-center z-10 flex flex-col items-center select-none">
        <motion.h2
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [1, 1.05, 1], opacity: 1 }}
          transition={{
            scale: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 },
            opacity: { duration: 0.5, delay: 1 }
          }}
          className="text-6xl lg:text-8xl font-black text-[#C1FF00] italic"
        >
          {count > 0 ? `${count}+` : '0'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-[#C1FF00] font-black tracking-[0.4em] uppercase text-[10px] lg:text-xs mt-1 lg:mt-2 opacity-80"
        >
          Seçkin Oyuncu
        </motion.p>
      </div>
    </div>
  );
}

/* ─── Hero Banner ─── */
function HeroBanner({ count }: { count: number }) {
  return (
    <div className="relative overflow-hidden flex-grow flex flex-col will-change-transform">
      <div className="grid lg:grid-cols-2 gap-0 lg:gap-8 items-center py-4 lg:py-0 flex-grow">
        {/* Sağ Görsel Alanı - Mobilde Üstte */}
        <div className="order-1 lg:order-2 relative flex justify-center items-center h-full min-h-[320px] lg:min-h-[420px] lg:-translate-y-2 lg:translate-x-16 -translate-y-12">
          <div className="relative w-[75vw] sm:w-full max-w-[260px] sm:max-w-md lg:max-w-lg aspect-square">
            <VitrinHeroVisual count={count} />
          </div>
        </div>

        {/* Sol İçerik - Mobilde Altta */}
        <div className="order-2 lg:order-1 space-y-8 lg:mt-6 -mt-44 lg:mt-0 relative z-10 flex flex-col items-center lg:items-start">
          <motion.div
            variants={{ initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#C1FF00]/20 bg-[#C1FF00]/5"
          >
            <span className="w-2 h-2 bg-[#C1FF00] rounded-full animate-pulse shadow-[0_0_8px_#C1FF00]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C1FF00]">Canlı Yetenek Vitrini</span>
          </motion.div>

          <motion.h1
            variants={{ initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-7xl lg:text-[96px] font-black leading-[0.92] tracking-tight italic uppercase text-center lg:text-left"
          >
            <span className="block text-white">NET OYNAR</span>
            <span className="inline-block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-[#C1FF00] to-[#00F5FF] px-6 lg:-mx-6 py-4">VİTRİN</span>
          </motion.h1>

          <motion.p
            variants={{ initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block text-xl text-[#8A9A98] max-w-lg leading-relaxed font-medium border-l border-white/10 pl-5 -ml-5"
          >
            Scout ekibimiz tarafından titizlikle incelenmiş ve onaylanmış yetenekler. Türkiye&apos;nin gelecekteki yıldızlarını keşfedin.
          </motion.p>

          <div className="hidden lg:flex gap-6 pt-4">
            <Link href="/?scene=apply"
              className="px-10 py-5 bg-[#C1FF00] text-[#051A18] rounded-2xl font-black text-lg md:text-xl uppercase tracking-tight hover:-translate-y-1 transition-all text-center">
              Şimdi Başvur
            </Link>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-10 md:bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer z-20 group"
        onClick={() => { document.getElementById('vitrin-content')?.scrollIntoView({ behavior: 'smooth' }); }}
      >
        <div className="flex flex-col items-center gap-3 px-8 py-4 transition-all duration-500">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#C1FF00] transition-colors text-center whitespace-nowrap drop-shadow-[0_0_10px_rgba(193,255,0,0.3)]">Oyuncu havuzunu keşfet</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="text-[#C1FF00]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Ana Sayfa ─── */
export default function VitrinPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ position: 'all', dominantFoot: 'all', league: 'all', minHeight: '', maxHeight: '' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Özgeçmiş Modalı State'leri
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [selectedBioPlayer, setSelectedBioPlayer] = useState<Player | null>(null);

  const handleShowBio = useCallback((p: Player) => {
    setSelectedBioPlayer(p);
    setIsBioModalOpen(true);
  }, []);

  // Transfer Detay Modalı State'leri
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Player | null>(null);

  const handleShowTransfer = useCallback((p: Player) => {
    setSelectedTransfer(p);
    setIsTransferModalOpen(true);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), where('status', '==', 'approved'));
    const unsub = onSnapshot(q, snap => {
      const list: Player[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      
      // Sıralama Mantığı:
      // 1. Önce reytinge göre (Yüksekten düşüğe)
      // 2. Reytingler eşitse tarihe göre (En yeni önce)
      list.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }

        const dateA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
        const dateB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
        return dateB - dateA;
      });

      setPlayers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const availablePositions = ['all', 'Kaleci', 'Defans', 'Bek', 'Orta Saha', 'Forvet', 'Kanat'];
  const availableFeets = ['all', ...Array.from(new Set(players.map(p => p.dominantFoot)))];
  const BASE_LEAGUES = [
    'Gelişim Altyapısı',
    'Elit Altyapı',
    '2. Amatör',
    '1. Amatör',
    'SAL',
    'BAL',
    '3. Lig',
    '2. Lig',
    '1. Lig'
  ];
  const availableLeagues = ['all', ...BASE_LEAGUES];

  const filtered = useMemo(() => players.filter(p => {
    let matchPos = filters.position === 'all';
    if (!matchPos) {
      const pos = p.position.toLowerCase();
      if (filters.position === 'Kaleci') matchPos = pos.includes('kaleci');
      else if (filters.position === 'Defans') matchPos = pos.includes('stoper') || pos.includes('defans');
      else if (filters.position === 'Bek') matchPos = pos.includes('bek');
      else if (filters.position === 'Orta Saha') matchPos = pos.includes('numara') || pos.includes('orta saha');
      else if (filters.position === 'Forvet') matchPos = pos.includes('forvet') && !pos.includes('açık');
      else if (filters.position === 'Kanat') matchPos = pos.includes('açık') || pos.includes('kanat');
      else matchPos = p.position === filters.position;
    }
    
    const matchFoot = filters.dominantFoot === 'all' || p.dominantFoot === filters.dominantFoot;
    const matchLeague = (() => {
      if (filters.league === 'all') return true;
      const pl = (p.league || '').toLowerCase();
      const fl = filters.league.toLowerCase();
      
      if (fl.includes('gelişim')) return pl.includes('gelişim');
      if (fl.includes('elit')) return pl.includes('elit');
      if (fl.includes('2. amatör')) return pl.includes('2. amatör') || pl.includes('2.amatör');
      if (fl.includes('1. amatör')) return pl.includes('1. amatör') || pl.includes('1.amatör');
      if (fl === 'sal') return pl.includes('sal') || pl.includes('süper amatör');
      if (fl === 'bal') return pl.includes('bal') || pl.includes('bölgesel amatör');
      if (fl.includes('3. lig')) return pl.includes('3. lig') || pl.includes('3.lig');
      if (fl.includes('2. lig')) return pl.includes('2. lig') || pl.includes('2.lig');
      if (fl.includes('1. lig')) return pl.includes('1. lig') || pl.includes('1.lig');
      
      return pl.includes(fl) || pl === fl;
    })();
    const ph = p.height ?? 0;
    const minH = filters.minHeight === '' ? 0 : parseInt(filters.minHeight);
    const maxH = filters.maxHeight === '' ? 999 : parseInt(filters.maxHeight);
    const matchHeight = ph >= minH && ph <= maxH;
    return matchPos && matchFoot && matchLeague && matchHeight;
  }), [players, filters]);

  const hasActiveFilters = filters.position !== 'all' || filters.dominantFoot !== 'all' || filters.league !== 'all' || filters.minHeight !== '' || filters.maxHeight !== '';

  return (
    <div className="relative min-h-screen bg-[#051A18] text-[#E0E7E6] selection:bg-[#C1FF00]/30 overflow-x-hidden font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className="relative z-10 h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth no-scrollbar will-change-scroll">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
          }}
          className="will-change-transform transform-gpu"
        >
          <section className="min-h-screen snap-start flex flex-col pt-4 pb-12 overflow-hidden relative">
            <div className="container mx-auto px-4 sm:px-6 flex flex-col h-full flex-grow">
              <header className="py-6 flex items-center justify-between bg-transparent border-none shadow-none">
                <div className="flex items-center gap-3 md:gap-6">
                  <Link href="/" className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white/40 hover:text-[#C1FF00] transition-colors">Net Oynar <span className="hidden sm:inline font-normal text-white/30">· Başvuru</span></Link>
                  <span className="flex items-center gap-1.5 text-[10px] md:text-sm font-black uppercase tracking-widest text-[#C1FF00]/80">
                    <span className="w-1 h-1 rounded-full bg-[#C1FF00] animate-pulse" />
                    <span className="italic px-1">VİTRİN</span>
                  </span>
                </div>
                <nav className="hidden md:flex items-center gap-10">
                  {[
                    { label: 'Nasıl İşler?', scene: 'process' },
                    { label: 'Video Rehberi', scene: 'guide' },
                    { label: 'SSS', scene: 'faq' }
                  ].map(l => (
                    <Link
                      key={l.label}
                      href={`/?scene=${l.scene}`}
                      className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#C1FF00] transition-all duration-300 hover:tracking-[0.3em]"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
                <Link href="/?scene=apply" className="md:hidden flex items-center px-5 py-2.5 bg-[#C1FF00] text-[#051A18] rounded-full font-black text-[10px] uppercase tracking-wider shadow-[0_10px_20px_rgba(193,255,0,0.2)] hover:scale-105 active:scale-95 transition-all">
                  Başvur
                </Link>
              </header>
              <HeroBanner count={players.length} />
            </div>
          </section>

          <section id="vitrin-content" className="min-h-screen snap-start pt-32 pb-20 bg-gradient-to-b from-transparent to-[#051A18]/50">
            <div className="container mx-auto px-4 sm:px-6 relative">
              <div className="relative flex items-center justify-end mb-20 h-24">

                {/* Restored Step 157 Filter UI Style */}
                <div className="absolute left-0 right-0 md:right-20 flex items-center z-40 h-full">
                  <AnimatePresence mode="wait">
                    {!isFilterOpen ? (
                      <motion.div
                        key="heading"
                        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col gap-2 -translate-y-4 md:translate-y-0"
                      >
                        <div className="flex items-center gap-3"><span className="w-1.5 h-6 bg-[#C1FF00] rounded-full" /><h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#C1FF00]">Yetenek Havuzu</h2></div>
                        <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">Geleceğin <span className="text-white/20">Yıldızları</span></h3>
                      </motion.div>
                    ) : (
                      <div className="w-full flex items-center h-full">
                        <motion.div
                          key="filters"
                          initial={{
                            height: 0,
                            opacity: 0,
                            y: -20
                          }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                            y: 0
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                            y: -20
                          }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-[88px] md:top-0 left-0 right-0 z-50 md:relative md:w-full origin-top-right md:origin-top"
                        >
                          <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] bg-[#0A1A18]/95 md:bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-9 w-full max-w-[1400px]">
                            <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-9 flex-grow">
                              <FilterGroup label="Mevki" options={availablePositions} current={filters.position} onChange={(v: string) => setFilters(f => ({ ...f, position: v }))} />
                              <FilterGroup label="Lig Seviyesi" options={availableLeagues} current={filters.league} onChange={(v: string) => setFilters(f => ({ ...f, league: v }))} />
                              <FilterGroup label="Baskın Ayak" options={availableFeets} current={filters.dominantFoot} onChange={(v: string) => setFilters(f => ({ ...f, dominantFoot: v }))} />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-9 w-full md:w-auto">
                              <div className="flex flex-col gap-2 min-w-[140px] border-t border-white/10 pt-5 md:border-0 md:pt-0 w-full md:w-auto">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 ml-1 whitespace-nowrap">Boy Aralığı</span>
                                <div className="flex items-center gap-2">
                                  <input type="text" inputMode="numeric" placeholder="Min" value={filters.minHeight} onChange={e => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length > 3) val = val.slice(0, 3);
                                    setFilters(f => ({ ...f, minHeight: val }));
                                  }} className="w-full md:w-16 bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] text-white focus:outline-none focus:border-[#C1FF00]/50 text-center [&::-webkit-inner-spin-button]:appearance-none" />
                                  <span className="text-white/20">-</span>
                                  <input type="text" inputMode="numeric" placeholder="Max" value={filters.maxHeight} onChange={e => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length > 3) val = val.slice(0, 3);
                                    setFilters(f => ({ ...f, maxHeight: val }));
                                  }} className="w-full md:w-16 bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] text-white focus:outline-none focus:border-[#C1FF00]/50 text-center [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                              </div>
                              
                              <div className="w-full md:w-auto md:border-l border-white/10 pt-5 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0 md:pl-9 relative z-50">
                                  <button
                                    onClick={() => setFilters({ position: 'all', dominantFoot: 'all', league: 'all', minHeight: '', maxHeight: '' })}
                                    disabled={!hasActiveFilters}
                                    className={`w-full md:w-auto h-12 md:h-[72px] rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 px-6 transition-all border group ${
                                      hasActiveFilters 
                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                                        : 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed opacity-50 hover:bg-white/10'
                                    }`}
                                    title="Filtreleri Temizle"
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`md:w-[22px] md:h-[22px] ${hasActiveFilters ? "group-hover:rotate-180 transition-transform duration-500" : ""}`}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    <span className="text-[10px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Temizle</span>
                                  </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ultra Minimalist Fixed Filter Toggle */}
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`relative z-50 w-16 h-16 rounded-3xl flex flex-col items-center justify-center gap-0.5 transition-all duration-500 flex-shrink-0 ${isFilterOpen ? 'bg-[#C1FF00] shadow-[0_0_40px_rgba(193,255,0,0.4)]' : 'bg-white/[0.03] text-white/70'}`}
                >
                  <div className="relative w-5 h-5 flex flex-col items-center justify-center">
                    <motion.span animate={isFilterOpen ? { rotate: 45, y: 0.5, width: '20px' } : { rotate: 0, y: -4, width: '16px' }} transition={{ duration: 0.4 }} className={`absolute block h-[1.5px] rounded-full transition-colors ${isFilterOpen ? 'bg-black' : 'bg-[#C1FF00]'}`} />
                    <motion.span animate={isFilterOpen ? { opacity: 0, scale: 0, x: 10 } : { opacity: 1, scale: 1, x: 0 }} transition={{ duration: 0.3 }} className="absolute block h-[1.5px] w-10px rounded-full bg-[#C1FF00] -translate-x-1" style={{ width: '10px' }} />
                    <motion.span animate={isFilterOpen ? { rotate: -45, y: 0.5, width: '20px' } : { rotate: 0, y: 4, width: '16px' }} transition={{ duration: 0.4 }} className={`absolute block h-[1.5px] rounded-full transition-colors ${isFilterOpen ? 'bg-black' : 'bg-[#C1FF00]'}`} />
                  </div>
                  {!isFilterOpen && <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 mt-0.5">Filtre</span>}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {loading ? (
                  <div className="col-span-full text-center py-20 text-white/20 uppercase text-xs font-black tracking-widest">Yükleniyor...</div>
                ) : filtered.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-white/10 uppercase text-sm font-black tracking-widest border border-dashed border-white/5 rounded-3xl">Sonuç Bulunamadı</div>
                ) : (
                  <>
                    {filtered.map((player, i) => (
                      <PlayerCard 
                        key={player.id} 
                        player={player} 
                        index={i} 
                        onShowBio={handleShowBio}
                        onShowTransfer={handleShowTransfer}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>
        </motion.div>
      </main>

      {/* ÖZGEÇMİŞ MODALI */}
      <AnimatePresence>
        {isBioModalOpen && selectedBioPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsBioModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-lg bg-[#0a1a18] border border-[#C1FF00]/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C1FF00]/5 blur-3xl -mr-16 -mt-16" />
              
              <div className="p-6 sm:p-8 relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[#C1FF00] text-[10px] font-black uppercase tracking-[0.4em] mb-1">Oyuncu Özgeçmişi</h3>
                    <div className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">{selectedBioPlayer.fullName}</div>
                  </div>
                  <button onClick={() => setIsBioModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-[#C1FF00]/30 transition-all">✕</button>
                </div>

                {/* Milli Takım Badgeleri */}
                {selectedBioPlayer.nationalTeam && selectedBioPlayer.nationalTeam.length > 0 && (
                  <div className="mb-6">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 ml-1">Milli Takım Geçmişi</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedBioPlayer.nationalTeam.map(t => (
                        <div key={t} className="px-3 py-1.5 rounded-lg bg-[#C1FF00]/10 border border-[#C1FF00]/30 flex items-center gap-2 shadow-[0_0_15px_rgba(193,255,0,0.1)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C1FF00] shadow-[0_0_8px_#C1FF00]" />
                          <span className="text-[#C1FF00] text-[10px] sm:text-[11px] font-black tracking-widest">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-6 mb-8 max-h-[60vh] overflow-y-auto no-scrollbar shadow-inner">
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedBioPlayer.bio || 'Bu oyuncu hakkında henüz ek bilgi eklenmemiş.'}
                  </p>
                </div>

                <button 
                  onClick={() => setIsBioModalOpen(false)}
                  className="w-full bg-[#C1FF00] text-black py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-[#d4ff33] transition-all shadow-lg active:scale-95 duration-200"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSFER DETAY MODALI */}
      <AnimatePresence>
        {isTransferModalOpen && selectedTransfer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-300" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[440px] bg-gradient-to-b from-[#0A2320] to-[#04100E] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] will-change-transform"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#C1FF00]/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C1FF00] to-transparent opacity-80" />
              
              <div className="pt-8 px-6 sm:px-8 pb-6 sm:pb-8 relative">
                <div className="flex items-start justify-between mb-8 sm:mb-10">
                  <div className="flex flex-col">
                    <h3 className="text-[#C1FF00] text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(193,255,0,0.3)]">Net Oynar</h3>
                    <h2 className="text-white text-base sm:text-lg font-black uppercase tracking-widest mt-0.5">Transfer Detayı</h2>
                  </div>
                  <button onClick={() => setIsTransferModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mt-0.5">✕</button>
                </div>
                
                <h4 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter text-center mb-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] leading-none italic">
                  {selectedTransfer.fullName}
                </h4>

                <div className="relative rounded-[1.5rem] bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.08] p-6 sm:p-8 flex flex-col items-center justify-center overflow-hidden isolation-auto">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />

                  <div className="flex flex-col items-center text-center relative z-10 w-full mb-1">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-2 sm:mb-3">Eski Takımı</span>
                    <span className="text-xl sm:text-2xl font-black text-white/90 uppercase tracking-tight break-words w-full px-2 leading-tight">{selectedTransfer.oldTeam}</span>
                    {selectedTransfer.oldTeamLeague && (
                      <span className="mt-3 text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">{selectedTransfer.oldTeamLeague}</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center w-full relative z-10 my-4 sm:my-5">
                     <div className="h-4 w-px bg-gradient-to-b from-white/10 to-[#C1FF00]/50" />
                     <div className="w-10 h-10 rounded-full bg-[#C1FF00]/10 border border-[#C1FF00]/30 flex items-center justify-center shadow-[0_0_20px_rgba(193,255,0,0.2)] animate-pulse backdrop-blur-md">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C1FF00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M19 12l-7 7-7-7"></path></svg>
                     </div>
                     <div className="h-4 w-px bg-gradient-to-b from-[#C1FF00]/50 to-[#C1FF00]/10" />
                  </div>

                  <div className="flex flex-col items-center text-center relative z-10 w-full mt-1">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#C1FF00]/50 mb-2 sm:mb-3">Yeni Takımı</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#C1FF00] uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(193,255,0,0.6)] break-words w-full px-2 leading-none italic">{selectedTransfer.newTeam}</span>
                    {selectedTransfer.newTeamLeague && (
                      <div className="mt-4 relative group cursor-default">
                        <div className="absolute inset-0 bg-[#C1FF00] blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                        <span className="relative text-[10px] sm:text-xs font-black text-[#0A2320] uppercase tracking-[0.2em] bg-[#C1FF00] px-4 py-2 rounded-xl border border-[#C1FF00] shadow-[0_5px_15px_rgba(193,255,0,0.2)] block">{selectedTransfer.newTeamLeague}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ label, options, current, onChange }: any) {
  return (
    <div className="flex flex-col gap-2 w-full md:w-auto">
      <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 ml-1">{label}</h3>
      <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap">
        {options.map((opt: string) => (
          <button key={opt} onClick={() => onChange(opt)} className={`px-2 py-3 md:px-3 md:py-1.5 rounded-lg text-[9.5px] md:text-[8.5px] font-black uppercase tracking-wider border transition-all text-center flex items-center justify-center min-h-[40px] md:min-h-0 ${current === opt ? 'bg-[#C1FF00] text-black border-[#C1FF00]' : 'bg-transparent text-white/30 border-white/5 hover:border-white/20'}`}>
            {opt === 'all' ? 'TÜMÜ' : opt}
          </button>
        ))}
      </div>
    </div>
  );
}
