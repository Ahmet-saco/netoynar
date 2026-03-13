import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isConfigured } from '@/lib/firebase-admin';

export async function PATCH(req: NextRequest) {
  try {
    const { submissionId, updatedData, adminToken } = await req.json();

    // 0. Konfigürasyon Kontrolü
    if (!isConfigured || !adminDb) {
      return NextResponse.json({ 
        error: 'Sunucu yapılandırması eksik.' 
      }, { status: 500 });
    }

    // 1. Yetki Kontrolü
    if (!adminToken || adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    if (!submissionId || !updatedData) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const docRef = adminDb.collection('submissions').doc(submissionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    // Güncelleme işlemi
    await docRef.update({
      ...updatedData,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Bilgiler güncellendi' });

  } catch (error: any) {
    console.error('Admin update API error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
