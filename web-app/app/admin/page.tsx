'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface Submission {
  id: string;
  fullName: string;
  age: number;
  birthDate?: string;
  position: string;
  dominantFoot: string;
  team: string;
  city: string;
  instagram: string;
  phone?: string;
  league?: string;
  uCategory?: string;
  status: 'pending' | 'processing' | 'uploaded' | 'approved' | 'rejected' | 'error';
  driveVideoLink?: string;
  driveFolderLink?: string;
  videoStoragePath: string;
  height?: number;
  weight?: number;
  goals?: number;
  assists?: number;
  matchesPlayed?: number;
  concededGoals?: number;
  cleanSheets?: number;
  season?: string;
  instagramVideoLink?: string;
  bio?: string;
  rating?: number;
  createdAt?: any;
  reviewedAt?: string;
  oldTeam?: string;
  newTeam?: string;
  oldTeamLeague?: string;
  newTeamLeague?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'İnceleme Bekliyor',  color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  processing: { label: 'İşleniyor',  color: '#00F5FF', bg: 'rgba(0,245,255,0.12)' },
  uploaded:   { label: 'İnceleme Bekliyor',   color: '#A0A0A0', bg: 'rgba(160,160,160,0.12)' },
  approved:   { label: 'Onaylı ✓',  color: '#C1FF00', bg: 'rgba(193,255,0,0.12)' },
  rejected:   { label: 'Reddedildi', color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
  error:      { label: 'Hata',       color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
};

const POSITION_ICONS: Record<string, string> = {
  'Kaleci': '🧤',
  'Defans': '🛡️',
  'Bek': '🏃',
  'Orta Saha': '⚙️',
  'Forvet': '⚡',
  'Kanat': '🌪️',
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
  
  // Legacy (Eski Kayıt) Mantığı
  if (player.age) {
    const legacyBaseDate = new Date('2026-03-12'); 
    const today = new Date();
    let yearsSinceSetup = today.getFullYear() - legacyBaseDate.getFullYear();
    const m = today.getMonth() - legacyBaseDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < legacyBaseDate.getDate())) {
      yearsSinceSetup--;
    }
    return player.age + Math.max(0, yearsSinceSetup);
  }
  
  return '-';
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, legacy: 0 });
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Düzenleme Modalı State'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Bilgi Ekle Modalı State'leri
  const [isAddInfoModalOpen, setIsAddInfoModalOpen] = useState(false);
  const [infoData, setInfoData] = useState({ id: '', bio: '', instagramVideoLink: '' });

  // Reyting Modalı State'leri
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingData, setRatingData] = useState({ id: '', rating: 0 });

  // Transfer Modalı State'leri
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ id: '', oldTeam: '', newTeam: '', oldTeamLeague: '', newTeamLeague: '' });

  const handleViewVideo = async (path: string) => {
    try {
      if (!path) return;
      const url = await getDownloadURL(ref(storage, path));
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Video error:', error);
      alert('Video açılamadı: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Şifre doğrulama
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setAdminToken(password);
        localStorage.setItem('netoynar_admin_token', password);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Hatalı şifre');
      }
    } catch {
      setAuthError('Bağlantı hatası');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('netoynar_admin_token');
    if (savedToken) {
      fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedToken }),
      }).then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
          setAdminToken(savedToken);
        } else {
          localStorage.removeItem('netoynar_admin_token');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'submissions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: Submission[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Submission));

      // Sıralama: Önce inceleme bekleyenler, sonra onaylılar. Kendi içlerinde en yeni önce.
      subs.sort((a, b) => {
        const isApprovedA = a.status === 'approved';
        const isApprovedB = b.status === 'approved';
        
        if (isApprovedA !== isApprovedB) {
          return isApprovedA ? 1 : -1; // Approved olanlar sona
        }

        const dateA = a.createdAt?.seconds ?? 0;
        const dateB = b.createdAt?.seconds ?? 0;
        return dateB - dateA;
      });

      setSubmissions(subs);
      setStats({
        total: subs.length,
        pending: subs.filter(s => s.status !== 'approved').length,
        approved: subs.filter(s => s.status === 'approved').length,
        legacy: subs.filter(s => !s.birthDate && s.age).length,
      });
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  // Yeni Professional API Tabanlı Onay/Red İşlemi
  const handleReview = useCallback(async (submissionId: string, status: 'approved' | 'rejected') => {
    const submission = submissions.find(s => s.id === submissionId);
    
    if (status === 'rejected') {
      const confirmDelete = window.confirm(`${submission?.fullName} isimli başvuruyu kalıcı olarak SİLMEK istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve tüm veriler (video dahil) sunucudan temizlenir.`);
      if (!confirmDelete) return;
    }

    setLoadingIds(prev => new Set(prev).add(submissionId));

    try {
      // Tamamen server-side API üzerinden işlem yapıyoruz (Firebase Admin SDK)
      const res = await fetch('/api/admin/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          status,
          adminToken
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'İşlem başarısız');
      }

      // Başarılı işlem bildirimi (isteğe bağlı)
      console.log('Action successful:', data.message);
      
    } catch (error: any) {
      console.error('Review error:', error);
      alert(`Hata: ${error.message}\n\nLütfen admin şifresinin doğru olduğunu ve sunucu bağlantısını kontrol edin.`);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    }
  }, [submissions, adminToken]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;

    setUpdateLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: editingSubmission.id,
          updatedData: editingSubmission,
          adminToken
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        // UI onSnapshot üzerinden zaten güncellenecek, ama ek kontrol gerekebilir
      } else {
        const data = await res.json();
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openEditModal = (sub: Submission) => {
    setEditingSubmission({ ...sub });
    setIsEditModalOpen(true);
  };

  const openAddInfoModal = (sub: Submission) => {
    setInfoData({ 
      id: sub.id, 
      bio: sub.bio || '', 
      instagramVideoLink: sub.instagramVideoLink || '' 
    });
    setIsAddInfoModalOpen(true);
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: infoData.id,
          updatedData: {
            bio: infoData.bio,
            instagramVideoLink: infoData.instagramVideoLink
          },
          adminToken
        })
      });

      if (res.ok) {
        setIsAddInfoModalOpen(false);
      } else {
        const data = await res.json();
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openRatingModal = (sub: Submission) => {
    setRatingData({ id: sub.id, rating: sub.rating || 0 });
    setIsRatingModalOpen(true);
  };

  const handleUpdateRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: ratingData.id,
          updatedData: { rating: ratingData.rating },
          adminToken
        })
      });

      if (res.ok) {
        setIsRatingModalOpen(false);
      } else {
        const data = await res.json();
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openTransferModal = (sub: Submission) => {
    setTransferData({ 
      id: sub.id, 
      oldTeam: sub.oldTeam || '', 
      newTeam: sub.newTeam || '',
      oldTeamLeague: sub.oldTeamLeague || '',
      newTeamLeague: sub.newTeamLeague || ''
    });
    setIsTransferModalOpen(true);
  };

  const handleUpdateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: transferData.id,
          updatedData: { 
            oldTeam: transferData.oldTeam, 
            newTeam: transferData.newTeam,
            oldTeamLeague: transferData.oldTeamLeague,
            newTeamLeague: transferData.newTeamLeague
          },
          adminToken
        })
      });

      if (res.ok) {
        setIsTransferModalOpen(false);
      } else {
        const data = await res.json();
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (stats.legacy === 0) return;
    const confirmMigrate = window.confirm(`${stats.legacy} adet eski kaydı yeni dinamik yaş sistemine senkronize etmek istediğinize emin misiniz?\n\nBu işlem, eski kayıtların dökümanlarına doğum tarihi ekleyerek seneye bugün yaşlarının otomatik artmasını sağlayacaktır.`);
    if (!confirmMigrate) return;

    setIsMigrating(true);
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('netoynar_admin_token');
    setIsAuthenticated(false);
    setAdminToken('');
  };

  const filtered = submissions.filter(s => {
    // Statü filtresi
    const matchesStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'uploaded' 
        ? s.status !== 'approved' 
        : s.status === filterStatus;
    
    // Arama filtresi
    const matchesSearch = searchTerm === '' 
      ? true 
      : (s.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.team?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
    return matchesStatus && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#051A18] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C1FF00]/10 border border-[#C1FF00]/20 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.7H21l-5.4 3.9L17.8 20 12 15.8 6.2 20l2.2-7.4L3 8.7h6.8L12 2Z" stroke="#C1FF00" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Net Oynar</h1>
            <p className="text-sm text-white/40 font-medium mt-1 uppercase tracking-widest">Admin Paneli (Secure)</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Admin Şifresi</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" className="w-full px-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#C1FF00]/50 transition-all" autoFocus />
              </div>
              {authError && <div className="text-red-400 text-sm font-medium flex items-center gap-2">⚠️ {authError}</div>}
              <button type="submit" disabled={authLoading || !password} className="w-full py-4 bg-[#C1FF00] text-black rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#d4ff33] transition-all disabled:opacity-40">
                {authLoading ? 'Doğrulanıyor...' : 'Güvenli Giriş'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051A18] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#051A18]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C1FF00]/10 border border-[#C1FF00]/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.7H21l-5.4 3.9L17.8 20 12 15.8 6.2 20l2.2-7.4L3 8.7h6.8L12 2Z" stroke="#C1FF00" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="font-black text-sm tracking-tight uppercase">Başvuru Yönetim Paneli</div>
            </div>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 text-[10px] font-black text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl uppercase tracking-widest transition-all">Güvenli Çıkış</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Başvuru', value: stats.total, color: '#C1FF00' },
            { label: 'İşlem Bekleyen', value: stats.pending, color: '#FFB800' },
            { label: 'Onaylanan', value: stats.approved, color: '#C1FF00' },
            { label: 'Eski Veri', value: stats.legacy, color: '#FF4444' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 relative overflow-hidden group">
              <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">{stat.label}</div>
              
              {stat.label === 'Eski Veri' && stats.legacy > 0 && (
                <button
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="absolute inset-0 bg-red-500/10 hover:bg-red-500/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-red-500/20"
                >
                  <span className="text-[9px] font-black uppercase text-red-500">{isMigrating ? 'Senkronize Ediliyor...' : 'Şimdi Düzenle'}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {stats.legacy > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 text-xl">⚠️</div>
              <div>
                <p className="text-xs font-black text-red-400 uppercase tracking-wider">Veri Senkronizasyonu Gerekli</p>
                <p className="text-[10px] text-red-400/60 font-medium">Sistemde yeni dinamik yaş yapısına uygun olmayan {stats.legacy} eski kayıt bulundu.</p>
              </div>
            </div>
            <button 
              onClick={handleMigrate}
              disabled={isMigrating}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-40"
            >
              {isMigrating ? 'İşleniyor...' : 'Tümünü Senkronize Et'}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'uploaded', label: 'İnceleme Bekliyor' },
              { key: 'approved', label: 'Onaylılar' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${filterStatus === f.key ? 'bg-[#C1FF00] text-black border-[#C1FF00]' : 'bg-white/[0.03] text-white/50 border-white/8 hover:border-white/20'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
            <input
              type="text"
              placeholder="İsim, Şehir veya Takım Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/[0.03] border border-white/8 rounded-xl text-xs font-medium placeholder:text-white/20 focus:outline-none focus:border-[#C1FF00]/40 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-white/30 uppercase tracking-widest text-xs font-black">Başvuru Bulunamadı</div>
            ) : (
              filtered.map((sub, index) => {
                const isLoading = loadingIds.has(sub.id);

                return (
                  <motion.div key={sub.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:bg-white/[0.05] transition-colors">
                    <div className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
                          <span className="font-black text-white text-base md:text-lg truncate">{sub.fullName}</span>
                          {sub.status === 'approved' ? (
                            <span className="inline-flex w-fit text-[#C1FF00] text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#C1FF00]/10 rounded-full border border-[#C1FF00]/20">Onaylı ✓</span>
                          ) : (
                            <span className="inline-flex w-fit text-[#FFB800] text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#FFB800]/10 rounded-full border border-[#FFB800]/20">İnceleme Bekliyor</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 md:gap-5 mt-3 md:mt-2 overflow-x-auto no-scrollbar w-full pb-1 md:pb-0">
                          <div className="flex flex-col flex-shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Pozisyon</span>
                            <span className="text-xs text-white/70 font-bold">{sub.position}</span>
                          </div>
                          <div className="w-px h-6 bg-white/5 flex-shrink-0" />
                          <div className="flex flex-col flex-shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Yaş</span>
                            <span className="text-xs text-white/70 font-bold">{getPlayerAge(sub)}</span>
                          </div>
                          <div className="w-px h-6 bg-white/5 flex-shrink-0" />
                          <div className="flex flex-col flex-shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Şehir</span>
                            <span className="text-xs text-white/70 font-bold">{sub.city}</span>
                          </div>
                          <div className="w-px h-6 bg-white/5 flex-shrink-0" />
                          <div className="flex flex-col flex-shrink-0 pr-4 md:pr-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Takım</span>
                            <span className="text-xs text-white/70 font-bold">{sub.team || '-'}</span>
                          </div>
                        </div>
                      </div>
                        {/* Aksiyon Butonları */}
                         <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
                           <button 
                             onClick={() => openEditModal(sub)}
                             className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-black hover:bg-blue-500 hover:text-white transition-all"
                           >
                             Düzenle
                           </button>
                           <button 
                             onClick={() => openAddInfoModal(sub)}
                             className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-black hover:bg-purple-500 hover:text-white transition-all"
                           >
                             Bilgi Ekle
                           </button>
                           <button 
                             onClick={() => openRatingModal(sub)}
                             className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-black hover:bg-amber-500 hover:text-white transition-all"
                           >
                             Reyting
                           </button>
                           <button 
                             onClick={() => openTransferModal(sub)}
                             className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-500 text-xs font-black hover:bg-orange-500 hover:text-white transition-all"
                           >
                             Transfer B.
                           </button>
                           {/* Onayla */}
                           {sub.status !== 'approved' && (
                           <button onClick={() => handleReview(sub.id, 'approved')} disabled={isLoading} className="px-3 py-2 rounded-xl bg-[#C1FF00]/10 border border-[#C1FF00]/25 text-[#C1FF00] text-xs font-black hover:bg-[#C1FF00] hover:text-black transition-all disabled:opacity-30">
                             {isLoading ? '...' : 'Onayla'}
                           </button>
                         )}
                         <button onClick={() => handleReview(sub.id, 'rejected')} disabled={isLoading} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-black hover:bg-red-500 hover:text-white transition-all disabled:opacity-30">
                           {isLoading ? '...' : 'Reddet / Sil'}
                         </button>
                       </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* DÜZENLEME MODALI */}
      <AnimatePresence>
        {isEditModalOpen && editingSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a2320] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-xl font-black uppercase tracking-tight">Oyuncu Düzenle</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="edit-form" onSubmit={handleUpdate} className="space-y-8">
                  {/* Temel Bilgiler */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#C1FF00] uppercase tracking-widest border-b border-[#C1FF00]/20 pb-2">Temel Bilgiler</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Tam Ad</label>
                        <input value={editingSubmission.fullName} onChange={e => setEditingSubmission({...editingSubmission, fullName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Doğum Tarihi</label>
                        <input type="date" value={editingSubmission.birthDate || ''} onChange={e => setEditingSubmission({...editingSubmission, birthDate: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none text-white [color-scheme:dark]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Mevki</label>
                        <input value={editingSubmission.position} onChange={e => setEditingSubmission({...editingSubmission, position: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Şehir</label>
                        <input value={editingSubmission.city} onChange={e => setEditingSubmission({...editingSubmission, city: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Futbol Bilgileri */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#C1FF00] uppercase tracking-widest border-b border-[#C1FF00]/20 pb-2">Futbol Bilgileri</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Takım</label>
                        <input value={editingSubmission.team} onChange={e => setEditingSubmission({...editingSubmission, team: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Lig</label>
                        <input value={editingSubmission.league || ''} onChange={e => setEditingSubmission({...editingSubmission, league: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">U Kategorisi</label>
                        <input value={editingSubmission.uCategory || ''} onChange={e => setEditingSubmission({...editingSubmission, uCategory: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" placeholder="Örn: U19" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Baskın Ayak</label>
                        <select value={editingSubmission.dominantFoot} onChange={e => setEditingSubmission({...editingSubmission, dominantFoot: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none appearance-none">
                          <option value="Sağ">Sağ</option>
                          <option value="Sol">Sol</option>
                          <option value="Her İkisi">Her İkisi</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Sezon</label>
                        <input value={editingSubmission.season || ''} onChange={e => setEditingSubmission({...editingSubmission, season: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* İstatistikler */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[#C1FF00] uppercase tracking-widest border-b border-[#C1FF00]/20 pb-2">İstatistikler</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Maç</label>
                        <input type="number" value={editingSubmission.matchesPlayed || 0} onChange={e => setEditingSubmission({...editingSubmission, matchesPlayed: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Gol</label>
                        <input type="number" value={editingSubmission.goals || 0} onChange={e => setEditingSubmission({...editingSubmission, goals: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Asist</label>
                        <input type="number" value={editingSubmission.assists || 0} onChange={e => setEditingSubmission({...editingSubmission, assists: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Yenilen Gol</label>
                        <input type="number" value={editingSubmission.concededGoals || 0} onChange={e => setEditingSubmission({...editingSubmission, concededGoals: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Gole Kapama</label>
                        <input type="number" value={editingSubmission.cleanSheets || 0} onChange={e => setEditingSubmission({...editingSubmission, cleanSheets: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Fiziksel & İletişim */}
                  <div className="space-y-4 pb-4">
                    <h3 className="text-xs font-black text-[#C1FF00] uppercase tracking-widest border-b border-[#C1FF00]/20 pb-2">Fiziksel & İletişim</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Boy (cm)</label>
                        <input type="number" value={editingSubmission.height || 0} onChange={e => setEditingSubmission({...editingSubmission, height: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Kilo (kg)</label>
                        <input type="number" value={editingSubmission.weight || 0} onChange={e => setEditingSubmission({...editingSubmission, weight: parseInt(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Instagram</label>
                        <input value={editingSubmission.instagram} onChange={e => setEditingSubmission({...editingSubmission, instagram: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Telefon</label>
                        <input value={editingSubmission.phone || ''} onChange={e => setEditingSubmission({...editingSubmission, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex items-center justify-end gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">İptal</button>
                <button form="edit-form" type="submit" disabled={updateLoading} className="px-8 py-3 bg-[#C1FF00] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#d4ff33] transition-all disabled:opacity-50">
                  {updateLoading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BİLGİ EKLE MODALI */}
      <AnimatePresence>
        {isAddInfoModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddInfoModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a2320] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-xl font-black uppercase tracking-tight">Özgeçmiş & Video Ekle</h2>
                <button onClick={() => setIsAddInfoModalOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
              </div>

              <form onSubmit={handleUpdateInfo} className="p-6 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/30 ml-1">Özgeçmiş / Başarılar</label>
                  <textarea 
                    value={infoData.bio} 
                    onChange={e => setInfoData({...infoData, bio: e.target.value})} 
                    placeholder="Oynadığı takımlar, başarılar, fiziksel özellikler vb. detaylı bilgi..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none h-40 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/30 ml-1">Instagram Reels URL</label>
                  <input 
                    type="url"
                    value={infoData.instagramVideoLink} 
                    onChange={e => setInfoData({...infoData, instagramVideoLink: e.target.value})} 
                    placeholder="https://www.instagram.com/reels/..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none" 
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddInfoModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">İptal</button>
                  <button type="submit" disabled={updateLoading} className="px-8 py-3 bg-[#C1FF00] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#d4ff33] transition-all disabled:opacity-50">
                    {updateLoading ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSFER BİLGİSİ MODALI */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a2320] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-xl font-black uppercase tracking-tight">Transfer Bilgisi</h2>
                <button onClick={() => setIsTransferModalOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
              </div>

              <form onSubmit={handleUpdateTransfer} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-white/30 ml-1">Eski Takımı</label>
                      <input 
                        value={transferData.oldTeam} 
                        onChange={e => setTransferData({...transferData, oldTeam: e.target.value})} 
                        placeholder="Örn: Galatasaray U17"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-white/30 ml-1">Eski Ligi</label>
                      <input 
                        value={transferData.oldTeamLeague} 
                        onChange={e => setTransferData({...transferData, oldTeamLeague: e.target.value})} 
                        placeholder="Gelişim / BAL vb."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none uppercase"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center -my-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C1FF00]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-[#C1FF00]/60 ml-1">Yeni Takımı</label>
                      <input 
                        value={transferData.newTeam} 
                        onChange={e => setTransferData({...transferData, newTeam: e.target.value})} 
                        placeholder="Örn: Real Madrid"
                        className="w-full bg-[#C1FF00]/5 border border-[#C1FF00]/20 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none uppercase font-bold text-[#C1FF00] placeholder:text-[#C1FF00]/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-[#C1FF00]/60 ml-1">Yeni Ligi</label>
                      <input 
                        value={transferData.newTeamLeague} 
                        onChange={e => setTransferData({...transferData, newTeamLeague: e.target.value})} 
                        placeholder="La Liga"
                        className="w-full bg-[#C1FF00]/5 border border-[#C1FF00]/20 rounded-xl px-4 py-3 text-sm focus:border-[#C1FF00]/50 outline-none uppercase font-bold text-[#C1FF00] placeholder:text-[#C1FF00]/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-4">
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">İptal</button>
                  <button type="submit" disabled={updateLoading} className="px-8 py-3 bg-[#C1FF00] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#d4ff33] transition-all disabled:opacity-50">
                    {updateLoading ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REYTING MODALI */}
      <AnimatePresence>
        {isRatingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsRatingModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a2320] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-xl font-black uppercase tracking-tight text-amber-500">Reyting Ver</h2>
                <button onClick={() => setIsRatingModalOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
              </div>

              <form onSubmit={handleUpdateRating} className="p-8 space-y-8">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-black text-[#C1FF00] drop-shadow-[0_0_20px_rgba(193,255,0,0.3)]">
                    {ratingData.rating}
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={ratingData.rating} 
                    onChange={e => setRatingData({...ratingData, rating: parseInt(e.target.value)})}
                    className="w-full accent-[#C1FF00] cursor-pointer"
                  />
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">0 ile 100 arasında bir not verin</p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsRatingModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white/50">İptal</button>
                  <button type="submit" disabled={updateLoading} className="px-8 py-3 bg-[#C1FF00] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#d4ff33] transition-all disabled:opacity-50">
                    {updateLoading ? '...' : 'Puanı Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
