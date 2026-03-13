import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isConfigured } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { adminToken } = await req.json();

    // 1. Yetki Kontrolü
    if (!isConfigured || !adminDb) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik' }, { status: 500 });
    }

    if (!adminToken || adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const submissionsRef = adminDb.collection('submissions');
    const snapshot = await submissionsRef.get();

    let updatedCount = 0;
    const batch = adminDb.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      // Eğer birthDate yoksa ama age varsa (Legacy Kayıt)
      if (!data.birthDate && data.age) {
        const ageNum = parseInt(data.age);
        if (!isNaN(ageNum)) {
          // Sistemin kurulduğu tarih baz alınarak hayali bir doğum tarihi oluşturuluyor (Kullanıcı isteği)
          // 2026 - 20 = 2006-03-12
          const birthYear = 2026 - ageNum;
          const birthDate = `${birthYear}-03-12`;

          batch.update(doc.ref, { birthDate });
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} adet eski kayıt başarıyla dinamik yaş sistemine senkronize edildi.`
    });

  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
