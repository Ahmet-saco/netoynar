'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface FormData {
  fullName: string;
  birthDate: string;
  position: string;
  dominantFoot: string;
  team: string;
  city: string;
  instagram: string;
  videoFile: File | null;
  consent: boolean;
  matchesPlayed: string;
  goals: string;
  assists: string;
  concededGoals: string;
  nationalTeam: string[];
  league: string;
  subPositions: string[];
  uCategory: string;
}

const NATIONAL_TEAMS = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21'];
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

const POSITIONS = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet', 'Kanat'];
const SUB_POSITIONS: Record<string, string[]> = {
  'Defans': ['Sağ Bek', 'Sol Bek', 'Sağ Stoper', 'Sol Stoper'],
  'Orta Saha': ['6 numara', '8 numara', '10 numara'],
  'Kanat': ['Sağ Açık', 'Sol Açık']
};

const U_CATEGORIES = ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'A Takım'];

const DOMINANT_FEET = ['Sağ', 'Sol', 'Her İkisi'];

export default function BasvurPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    birthDate: '',
    position: '',
    dominantFoot: '',
    team: '',
    city: '',
    instagram: '',
    videoFile: null,
    consent: false,
    matchesPlayed: '',
    goals: '',
    assists: '',
    concededGoals: '',
    nationalTeam: [],
    league: '',
    subPositions: [],
    uCategory: '',
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const hasSubmittedRef = useRef(false);

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

  // Pozisyon değiştiğinde ilgisiz verileri temizle (Profesyonel Veri Temizliği)
  useEffect(() => {
    if (formData.position === 'Kaleci') {
      setFormData(prev => ({ ...prev, goals: '0', assists: '0', subPositions: [] }));
    } else if (formData.position) {
      setFormData(prev => ({ ...prev, concededGoals: '0' }));
      // Mevcut alt pozisyonları seçilen ana pozisyona göre filtrele
      const allowedSubs = SUB_POSITIONS[formData.position] || [];
      if (allowedSubs.length > 0) {
        // Eğer seçilen pozisyon Forvet ise subPositions'ı temizleyebiliriz 
        // ama kullanıcı birden fazla ana pozisyon da seçebilmeli dediği için 
        // mantığı biraz daha esnek kurmalıyız.
      }
    }
  }, [formData.position]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Eğer lig Elit veya Gelişim değilse U kategorisini temizle
      if (name === 'league' && !['Gelişim Altyapısı', 'Elit Altyapı'].includes(value)) {
        newData.uCategory = '';
      }
      return newData;
    });
    setError('');
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, consent: e.target.checked }));
    setError('');
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Video format kontrolü
      if (!file.type.startsWith('video/')) {
        setError('Lütfen geçerli bir video dosyası seçin');
        return;
      }
      
      // Video süresi kontrolü (yaklaşık 40 saniye)
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (duration > 60) {
          setError('Video süresi 60 saniyeyi geçmemelidir');
          return;
        }
      };
      video.src = URL.createObjectURL(file);
      
      setFormData(prev => ({ ...prev, videoFile: file }));
      setError('');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Ad Soyad gereklidir');
      return false;
    }
    if (!formData.birthDate) {
      setError('Doğum tarihi gereklidir');
      return false;
    }
    
    // Yaş hesaplama ve kontrol (15-35)
    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    if (calculatedAge < 15 || calculatedAge > 35) {
      setError('Yaşınız 15-35 arasında olmalıdır');
      return false;
    }
    if (!formData.position) {
      setError('Ana pozisyon seçiniz');
      return false;
    }
    if (SUB_POSITIONS[formData.position] && formData.subPositions.length === 0) {
      setError('En az bir alt mevki seçmelisiniz');
      return false;
    }
    if (['Gelişim Altyapısı', 'Elit Altyapı'].includes(formData.league) && !formData.uCategory) {
      setError('U kategorisi seçiniz');
      return false;
    }
    if (!formData.dominantFoot) {
      setError('Baskın ayağınızı seçiniz');
      return false;
    }
    if (!formData.team.trim()) {
      setError('Takım adı gereklidir');
      return false;
    }
    if (!formData.city.trim()) {
      setError('Şehir gereklidir');
      return false;
    }
    if (!formData.instagram.trim()) {
      setError('Instagram kullanıcı adı gereklidir');
      return false;
    }
    if (!formData.matchesPlayed) {
      setError('Oynadığınız maç sayısını girmelisiniz');
      return false;
    }
    if (formData.position === 'Kaleci') {
      if (!formData.concededGoals) {
        setError('Yediğiniz gol sayısını girmelisiniz');
        return false;
      }
    } else if (formData.position) {
      if (!formData.goals) {
        setError('Gol sayısını girmelisiniz');
        return false;
      }
      if (!formData.assists) {
        setError('Asist sayısını girmelisiniz');
        return false;
      }
    }
    if (!formData.videoFile) {
      setError('Video yüklemelisiniz');
      return false;
    }
    if (!formData.consent) {
      setError('Paylaşım ve kullanım iznini onaylamalısınız');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setIsSubmitting(true);
    setError('');
    setSubmitStatus('uploading');
    console.log('--- SUBMISSION VERSION 4: STARTING ---');
    console.log('FullName:', formData.fullName);

    try {
      // 1. Video'yu Firebase Storage'a yükle (İsim ve Timestamp ile)
      const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
      };
      const cleanName = formData.fullName
        .replace(/[çğıöşüÇĞİÖŞÜ]/g, (m) => trMap[m])
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      
      const fileExtension = formData.videoFile!.name.split('.').pop() || 'mp4';
      const videoRef = ref(storage, `submissions/${cleanName}_${Date.now()}.${fileExtension}`);
      const uploadTask = uploadBytesResumable(videoRef, formData.videoFile!);

      // Upload progress takibi
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          setError('Video yükleme hatası: ' + error.message);
          setIsSubmitting(false);
          setSubmitStatus('error');
        },
        async () => {
          try {
            // Upload tamamlandı
            setSubmitStatus('saving');
            console.log('Video uploaded successfully, path:', uploadTask.snapshot.ref.fullPath);

            // 2. Metadata'yı Firestore'a kaydet
            const submissionData = {
              fullName: formData.fullName.trim(),
              birthDate: formData.birthDate,
              position: formData.subPositions.length > 0 
                ? (formData.subPositions.join(' - ') + (formData.position === 'Forvet' ? ' + Forvet' : ''))
                : formData.position,
              dominantFoot: formData.dominantFoot,
              team: formData.team.trim(),
              city: formData.city.trim(),
              instagram: formData.instagram.trim(),
              matchesPlayed: parseInt(formData.matchesPlayed) || 0,
              goals: formData.position === 'Kaleci' ? 0 : (parseInt(formData.goals) || 0),
              assists: formData.position === 'Kaleci' ? 0 : (parseInt(formData.assists) || 0),
              concededGoals: formData.position === 'Kaleci' ? (parseInt(formData.concededGoals) || 0) : 0,
              nationalTeam: formData.nationalTeam.length > 0 ? formData.nationalTeam : null,
              league: formData.league,
              uCategory: (formData.league === 'Gelişim Altyapısı' || formData.league === 'Elit Altyapı') ? formData.uCategory : null,
              videoStoragePath: uploadTask.snapshot.ref.fullPath,
              driveVideoLink: null,
              status: 'pending',
              createdAt: serverTimestamp(),
            };

            console.log('Saving to Firestore:', submissionData);
            const docRef = await addDoc(collection(db, 'submissions'), submissionData);
            console.log('Document written with ID:', docRef.id);

            // 3. Success sayfasına yönlendir
            setSubmitStatus('success');
            setTimeout(() => {
              router.push('/basvur/basarili');
            }, 1500);
          } catch (error: any) {
            console.error('Firestore error:', error);
            setError('Veri kaydedilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
            setIsSubmitting(false);
            setSubmitStatus('error');
            hasSubmittedRef.current = false;
          }
        }
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      setError('Bir hata oluştu: ' + error.message);
      setIsSubmitting(false);
      setSubmitStatus('error');
      hasSubmittedRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Başvuru Formu</h1>
            <p className="text-sm sm:text-base text-gray-400">Bilgilerinizi doldurun ve videonuzu yükleyin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Ad Soyad & Yaş */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.fullName ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                  placeholder="Adınız ve soyadınız"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="birthDate" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                  Doğum Tarihi *
                </label>
                <FormDateInput
                  label="Doğum Tarihi"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  min={new Date(new Date().getFullYear() - 35, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  max={new Date(new Date().getFullYear() - 15, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Futbol Bilgileri Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
              {/* Sol Sütun: Takım, Lig, Mevki */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="team" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                    Takım Adı *
                  </label>
                  <input
                    type="text"
                    id="team"
                    name="team"
                    value={formData.team}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.team ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                    placeholder="Takımınızın adı"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="league" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                    Lig *
                  </label>
                  <select
                    id="league"
                    name="league"
                    value={formData.league}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.league ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                    disabled={isSubmitting}
                  >
                    <option value="">Lig seviyesi seçiniz</option>
                    {LEAGUES.map(league => (
                      <option key={league} value={league}>{league}</option>
                    ))}
                  </select>
                </div>
                
                {['Gelişim Altyapısı', 'Elit Altyapı'].includes(formData.league) && (
                  <motion.div
                    key="uCategory-div"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    <label htmlFor="uCategory" className="block text-sm sm:text-base font-medium mb-2.5 text-[#C1FF00]/80 uppercase tracking-widest text-[10px]">
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
                          disabled={isSubmitting}
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

                <div className="space-y-6">
                  <label className="block text-sm sm:text-base font-medium mb-4 text-white/40 uppercase tracking-widest text-[10px]">
                    Ana Pozisyon *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, position: pos, subPositions: [] }));
                        }}
                        disabled={isSubmitting}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          formData.position === pos
                            ? 'bg-[#C1FF00] text-[#051A18] border-[#C1FF00] shadow-[0_0_20px_rgba(193,255,0,0.3)]'
                            : 'bg-[#0A2E2A] text-white/40 border-white/5 hover:border-white/20'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Alt Mevkiler (Dinamik) */}
                  <AnimatePresence mode="wait">
                    {formData.position && SUB_POSITIONS[formData.position] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-3 overflow-hidden"
                      >
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#C1FF00]/60 ml-1">
                          {formData.position} Alt Mevkileri *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {SUB_POSITIONS[formData.position].map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleSubPosition(sub)}
                              disabled={isSubmitting}
                              className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-between ${
                                formData.subPositions.includes(sub)
                                  ? 'bg-[#C1FF00]/10 text-[#C1FF00] border-[#C1FF00]/40'
                                  : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'
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
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sağ Sütun: Baskın Ayak, Milli Takım Geçmişi */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="dominantFoot" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                    Baskın Ayağın *
                  </label>
                  <select
                    id="dominantFoot"
                    name="dominantFoot"
                    value={formData.dominantFoot}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.dominantFoot ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                    disabled={isSubmitting}
                  >
                    <option value="">Seçiniz</option>
                    {DOMINANT_FEET.map(foot => (
                      <option key={foot} value={foot}>{foot}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium mb-3 text-white/40 uppercase tracking-widest text-[10px]">
                    Milli Takım Geçmişi (Opsiyonel)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {NATIONAL_TEAMS.map(team => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => toggleNationalTeam(team)}
                        disabled={isSubmitting}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
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

            {/* Şehir */}
            <div>
              <label htmlFor="city" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                Şehir *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.city ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                placeholder="Şehir"
                disabled={isSubmitting}
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm sm:text-base font-medium mb-2.5 text-white/40 uppercase tracking-widest text-[10px]">
                Instagram Kullanıcı Adı *
              </label>
              <div className="flex items-center">
                <span className={`mr-2 font-bold ${formData.instagram ? 'text-[#C1FF00]' : 'text-gray-500'}`}>@</span>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  className={`flex-1 px-5 py-4 bg-[#0A2E2A] border ${formData.instagram ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                  placeholder="kullaniciadi"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Sezon İstatistikleri Section (Sadece Pozisyon Seçilince Görünür) */}
            {formData.position && (
              <div className="pt-6 border-t border-gray-800">
                <h3 className="text-lg font-bold mb-5 text-[#C1FF00] flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#C1FF00] rounded-full" />
                  Sezon İstatistikleri
                </h3>
                <div className={`grid grid-cols-1 ${formData.position === 'Kaleci' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-5`}>
                  {/* Maç Sayısı (Tüm Pozisyonlar) */}
                  <div>
                    <label htmlFor="matchesPlayed" className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2.5 ml-1">
                      Oynanan Maç Sayısı *
                    </label>
                    <input
                      type="number"
                      id="matchesPlayed"
                      name="matchesPlayed"
                      value={formData.matchesPlayed}
                      onChange={handleInputChange}
                      className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.matchesPlayed ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                      placeholder="0"
                      disabled={isSubmitting}
                    />
                  </div>

                  {formData.position === 'Kaleci' ? (
                    /* Kaleci İçin: Yenilen Gol (Gol/Asist Alanları Kalkar) */
                    <div>
                      <label htmlFor="concededGoals" className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2.5 ml-1">
                        Yenilen Gol *
                      </label>
                      <input
                        type="number"
                        id="concededGoals"
                        name="concededGoals"
                        value={formData.concededGoals}
                        onChange={handleInputChange}
                        className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.concededGoals ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                        placeholder="0"
                        disabled={isSubmitting}
                      />
                    </div>
                  ) : (
                    /* Diğer Pozisyonlar İçin: Gol ve Asist */
                    <>
                      <div>
                        <label htmlFor="goals" className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2.5 ml-1">
                          Gol Sayısı *
                        </label>
                        <input
                          type="number"
                          id="goals"
                          name="goals"
                          value={formData.goals}
                          onChange={handleInputChange}
                          className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.goals ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                          placeholder="0"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label htmlFor="assists" className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2.5 ml-1">
                          Asist Sayısı *
                        </label>
                        <input
                          type="number"
                          id="assists"
                          name="assists"
                          value={formData.assists}
                          onChange={handleInputChange}
                          className={`w-full px-5 py-4 bg-[#0A2E2A] border ${formData.assists ? 'border-[#C1FF00]/40 text-[#C1FF00]' : 'border-white/5 text-white/70'} rounded-xl focus:border-[#C1FF00] outline-none transition-all text-sm font-black shadow-inner`}
                          placeholder="0"
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Video Upload */}
            <div>
              <label htmlFor="videoFile" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Video (Max 60 saniye) *
              </label>
              <input
                type="file"
                id="videoFile"
                name="videoFile"
                accept="video/*"
                onChange={handleVideoChange}
                className="w-full px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all text-base sm:text-lg file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm sm:file:text-base file:font-semibold file:bg-white file:text-black hover:file:bg-gray-100 active:file:bg-gray-200 file:cursor-pointer cursor-pointer"
                disabled={isSubmitting}
              />
              {formData.videoFile && (
                <p className="mt-2 text-sm text-gray-400">
                  Seçilen dosya: {formData.videoFile.name}
                </p>
              )}
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm sm:text-base mb-3 font-medium">
                    <span className="text-gray-300">Yükleniyor...</span>
                    <span className="text-white font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-white to-gray-200 h-3 rounded-full shadow-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="flex justify-end pt-4">
              <div className="w-full sm:w-auto flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-5 rounded-2xl hover:bg-white/[0.08] transition-colors cursor-pointer group" 
                   onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, consent: !prev.consent }))}>
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  checked={formData.consent}
                  onChange={(e) => { e.stopPropagation(); handleCheckboxChange(e); }}
                  className="w-5 h-5 bg-[#051A18] border-white/20 rounded accent-[#C1FF00] cursor-pointer"
                  disabled={isSubmitting}
                />
                <label htmlFor="consent" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 cursor-pointer select-none group-hover:text-white transition-colors leading-tight">
                  PAYLAŞIM VE KULLANIM İZNİNİ ONAYLIYORUM *
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Status */}
            {submitStatus === 'uploading' && (
              <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-300 text-center">
                Videon yükleniyor... {uploadProgress}%
              </div>
            )}
            {submitStatus === 'saving' && (
              <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-300 text-center">
                Başvurun alınıyor...
              </div>
            )}
            {submitStatus === 'success' && (
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-center">
                Başvurunuz başarıyla gönderildi!
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 sm:py-5 bg-white text-black rounded-xl font-bold text-lg sm:text-xl hover:bg-gray-100 active:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/20 mt-2"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder (v4)'}
            </button>
          </form>
        </motion.div>
      </div>
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
    // Saat farkından kaynaklanan gün kaymasını önlemek için yerel format kullanıyoruz
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
