'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface FormData {
  fullName: string;
  age: string;
  position: string;
  dominantFoot: string;
  team: string;
  city: string;
  instagram: string;
  videoFile: File | null;
  consent: boolean;
}

const POSITIONS = [
  'Kaleci',
  'Defans',
  'Orta Saha',
  'Forvet',
  'Kanat',
];

const DOMINANT_FEET = ['Sağ', 'Sol', 'Her İkisi'];

export default function BasvurPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    age: '',
    position: '',
    dominantFoot: '',
    team: '',
    city: '',
    instagram: '',
    videoFile: null,
    consent: false,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!formData.age || parseInt(formData.age) < 15 || parseInt(formData.age) > 35) {
      setError('Yaş 15-35 arasında olmalıdır');
      return false;
    }
    if (!formData.position) {
      setError('Pozisyon seçiniz');
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

    setIsSubmitting(true);
    setError('');
    setSubmitStatus('uploading');

    try {
      // 1. Video'yu Firebase Storage'a yükle
      const videoRef = ref(storage, `submissions/${Date.now()}_${formData.videoFile!.name}`);
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
              age: parseInt(formData.age),
              position: formData.position,
              dominantFoot: formData.dominantFoot,
              team: formData.team.trim(),
              city: formData.city.trim(),
              instagram: formData.instagram.trim(),
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
          }
        }
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      setError('Bir hata oluştu: ' + error.message);
      setIsSubmitting(false);
      setSubmitStatus('error');
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
            {/* Ad Soyad */}
            <div>
              <label htmlFor="fullName" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="Adınız ve soyadınız"
                disabled={isSubmitting}
              />
            </div>

            {/* Yaş */}
            <div>
              <label htmlFor="age" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Yaş *
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                min="15"
                max="35"
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="15-35"
                disabled={isSubmitting}
              />
            </div>

            {/* Pozisyon */}
            <div>
              <label htmlFor="position" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Pozisyon *
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                disabled={isSubmitting}
              >
                <option value="">Pozisyon seçiniz</option>
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Baskın Ayak */}
            <div>
              <label htmlFor="dominantFoot" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Baskın Ayağın *
              </label>
              <select
                id="dominantFoot"
                name="dominantFoot"
                value={formData.dominantFoot}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                disabled={isSubmitting}
              >
                <option value="">Seçiniz</option>
                {DOMINANT_FEET.map(foot => (
                  <option key={foot} value={foot}>{foot}</option>
                ))}
              </select>
            </div>

            {/* Takım Adı */}
            <div>
              <label htmlFor="team" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Takım Adı *
              </label>
              <input
                type="text"
                id="team"
                name="team"
                value={formData.team}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="Takımınızın adı"
                disabled={isSubmitting}
              />
            </div>

            {/* Şehir */}
            <div>
              <label htmlFor="city" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Şehir *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="Şehir"
                disabled={isSubmitting}
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm sm:text-base font-medium mb-2.5 text-gray-200">
                Instagram Kullanıcı Adı *
              </label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">@</span>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3.5 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-base sm:text-lg"
                  placeholder="kullaniciadi"
                  disabled={isSubmitting}
                />
              </div>
            </div>

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
            <div className="flex items-start">
              <input
                type="checkbox"
                id="consent"
                name="consent"
                checked={formData.consent}
                onChange={handleCheckboxChange}
                className="mt-1 mr-3 w-5 h-5 sm:w-6 sm:h-6 bg-gray-900/50 border-2 border-gray-700 rounded focus:ring-2 focus:ring-white cursor-pointer"
                disabled={isSubmitting}
              />
              <label htmlFor="consent" className="text-sm sm:text-base text-gray-300 leading-relaxed cursor-pointer">
                Paylaşım ve kullanım iznini onaylıyorum *
              </label>
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
              {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
