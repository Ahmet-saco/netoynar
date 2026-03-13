import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, isConfigured } from '@/lib/firebase-admin';

export async function PATCH(req: NextRequest) {
  try {
    const { submissionId, status, adminToken } = await req.json();

    // 0. Konfigürasyon Kontrolü
    if (!isConfigured || !adminDb || !adminStorage) {
      return NextResponse.json({ 
        error: 'Sunucu yapılandırması eksik. Lütfen .env.local dosyasına FIREBASE_CLIENT_EMAIL ve FIREBASE_PRIVATE_KEY ekleyin.' 
      }, { status: 500 });
    }

    // 1. Yetki Kontrolü
    if (!adminToken || adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (!submissionId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const docRef = adminDb.collection('submissions').doc(submissionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    const data = docSnap.data();

    // 2. RED İşlemi: Tamamen Silme
    if (status === 'rejected') {
      // Storage'dan videoyu sil (admin yetkisiyle)
      if (data?.videoStoragePath) {
        try {
          const bucket = adminStorage.bucket();
          const file = bucket.file(data.videoStoragePath);
          await file.delete();
          console.log(`Video deleted: ${data.videoStoragePath}`);
        } catch (storageErr) {
          // Video bulunamazsa veya silinemezse dökümanı silmeye devam et
          console.error('Storage deletion error:', storageErr);
        }
      }

      // Firestore'dan dökümanı sil (admin yetkisiyle)
      await docRef.delete();
      return NextResponse.json({ success: true, message: 'Başvuru ve video tamamen silindi' });
    }

    // 3. ONAY İşlemi: Statü Güncelleme
    if (status === 'approved') {
      await docRef.update({
        status: 'approved',
        reviewedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Başvuru onaylandı' });
    }

    return NextResponse.json({ error: 'Bilinmeyen hata' }, { status: 500 });

  } catch (error: any) {
    console.error('Admin review API error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
