import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, isConfigured } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { storagePath, adminToken } = await req.json();

    // 1. Konfigürasyon Kontrolü
    if (!isConfigured || !adminStorage) {
      return NextResponse.json({
        error: 'Sunucu yapılandırması eksik.',
      }, { status: 500 });
    }

    // 2. Yetki Kontrolü
    if (!adminToken || adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // 3. Parametre Kontrolü
    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath gerekli' }, { status: 400 });
    }

    // 4. Admin SDK ile imzalı URL üret (1 saat geçerli)
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 saat
    });

    return NextResponse.json({ url: signedUrl });

  } catch (error: any) {
    console.error('Video URL API error:', error);
    return NextResponse.json({
      error: 'Video URL alınamadı: ' + error.message,
    }, { status: 500 });
  }
}
