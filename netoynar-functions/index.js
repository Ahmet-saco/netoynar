const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

// Google Drive API yapılandırması
// Service Account kullanarak Google Drive'a erişim
const drive = google.drive('v3');

/**
 * Firestore'a yeni başvuru eklendiğinde tetiklenir
 * Video'yu Firebase Storage'dan alıp Google Drive'a yükler
 */
exports.transferVideoToDrive = onDocumentCreated(
  {
    document: 'submissions/{submissionId}',
    timeoutSeconds: 540, // 9 dakika timeout (büyük videolar için)
    memory: '512MiB',
  },
  async (event) => {
    const submissionData = event.data.data();
    const submissionId = event.params.submissionId;

    console.log('Processing submission:', submissionId);
    console.log('Video path:', submissionData.videoStoragePath);
    console.log('Submission data:', JSON.stringify(submissionData, null, 2));

    // Idempotency kontrolü: Eğer zaten işlenmişse (status 'uploaded', 'processing' veya 'error'), tekrar çalıştırma
    if (submissionData.status && submissionData.status !== 'pending') {
      console.log('Submission already processed, skipping:', submissionId, 'Status:', submissionData.status);
      return { success: true, message: 'Already processed' };
    }

    // Transaction ile status'u 'processing' olarak işaretle (duplicate trigger'ları önlemek için)
    const db = admin.firestore();
    try {
      await db.runTransaction(async (transaction) => {
        const docRef = db.collection('submissions').doc(submissionId);
        const doc = await transaction.get(docRef);
        
        if (!doc.exists) {
          throw new Error('Document does not exist');
        }
        
        const currentData = doc.data();
        // Eğer zaten processing veya uploaded ise, işlemi durdur
        if (currentData.status && currentData.status !== 'pending') {
          throw new Error('Already processing or processed');
        }
        
        // Status'u 'processing' olarak güncelle
        transaction.update(docRef, {
          status: 'processing',
          processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error.message === 'Already processing or processed') {
        console.log('Submission already being processed, skipping:', submissionId);
        return { success: true, message: 'Already processing' };
      }
      console.error('Transaction error:', error);
      // Transaction hatası durumunda status'u error olarak işaretle
      try {
        await db.collection('submissions').doc(submissionId).update({
          status: 'error',
          errorMessage: `Transaction failed: ${error.message}`,
          errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        console.error('Failed to update status to error:', updateError);
      }
      return { success: false, error: error.message };
    }

    let submissionFolder = null;
    let infoFile = null;
    let videoStorageFile = null;

    try {
      // 1. Firebase Storage'dan video'yu indir
      console.log('Step 1: Downloading video from Storage...');
      const bucket = admin.storage().bucket();
      videoStorageFile = bucket.file(submissionData.videoStoragePath);
      
      // Video dosyasının var olup olmadığını kontrol et
      const [exists] = await videoStorageFile.exists();
      if (!exists) {
        throw new Error(`Video file not found in Storage: ${submissionData.videoStoragePath}`);
      }

      const [fileBuffer] = await videoStorageFile.download();
      const fileName = submissionData.videoStoragePath.split('/').pop();

      console.log('Video downloaded from Storage, size:', fileBuffer.length, 'bytes');

      // 2. Google Drive'da başvuru klasörü oluştur
      console.log('Step 2: Creating submission folder in Drive...');
      try {
        submissionFolder = await createSubmissionFolder(submissionData, submissionId);
        console.log('Submission folder created:', submissionFolder.id);
      } catch (folderError) {
        console.error('Failed to create folder:', folderError);
        // Status'u error olarak güncelle
        await db.collection('submissions').doc(submissionId).update({
          status: 'error',
          errorMessage: `Failed to create folder: ${folderError.message}`,
          errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw folderError; // Re-throw to be caught by outer catch
      }

      // 3. Başvuru bilgilerini JSON dosyası olarak kaydet
      console.log('Step 3: Saving submission info to Drive...');
      try {
        infoFile = await saveSubmissionInfo(submissionData, submissionFolder.id);
        console.log('Submission info saved:', infoFile.id);
      } catch (infoError) {
        console.error('Failed to save info file:', infoError);
        // Klasörü sil (JSON olmadan klasör anlamsız)
        try {
          const path = require('path');
          const fs = require('fs');
          const oauthCredentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');
          const oauthCredentials = JSON.parse(fs.readFileSync(oauthCredentialsPath, 'utf8'));
          const refreshTokenPath = path.join(__dirname, '.env.refresh-token');
          const refreshTokenContent = fs.readFileSync(refreshTokenPath, 'utf8');
          const refreshToken = refreshTokenContent.split('REFRESH_TOKEN=')[1].trim();
          const { client_secret, client_id, redirect_uris } = oauthCredentials.installed || oauthCredentials.web;
          const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0] || 'http://localhost:8080'
          );
          oAuth2Client.setCredentials({ refresh_token: refreshToken });
          await oAuth2Client.getAccessToken();
          const driveService = google.drive({ version: 'v3', auth: oAuth2Client });
          await driveService.files.delete({ fileId: submissionFolder.id });
          console.log('Folder deleted due to info file save failure');
        } catch (deleteError) {
          console.error('Failed to delete folder:', deleteError);
        }
        // Status'u error olarak güncelle
        await db.collection('submissions').doc(submissionId).update({
          status: 'error',
          errorMessage: `Failed to save info file: ${infoError.message}`,
          errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw infoError; // Re-throw to be caught by outer catch
      }

      // 4. Video'yu klasöre yükle (KRİTİK: Video yüklenemezse klasör ve JSON silinmeli)
      console.log('Step 4: Uploading video to Drive...');
      let driveFile = null;
      let driveLink = null;
      
      try {
        driveFile = await uploadToDrive(
          fileBuffer,
          fileName,
          submissionData,
          submissionFolder.id
        );
        
        // Video yükleme başarı kontrolü
        if (!driveFile || !driveFile.id) {
          throw new Error('Video upload returned invalid response: missing file ID');
        }
        
        driveLink = `https://drive.google.com/file/d/${driveFile.id}/view`;
        console.log('Video uploaded to Drive successfully:', driveFile.id, 'Link:', driveLink);
      } catch (videoError) {
        console.error('Video upload failed:', videoError);
        
        // Video yükleme başarısız oldu - Klasör ve JSON'u sil (profesyonel yaklaşım)
        // Videosuz klasör/JSON Drive'da kalmasın
        console.log('Video upload failed, deleting folder and info file from Drive...');
        
        // Cleanup işlemi - GARANTİ: Mutlaka çalışmalı
        let cleanupSuccess = false;
        try {
          // OAuth client oluştur (silme işlemi için)
          const path = require('path');
          const fs = require('fs');
          const oauthCredentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');
          const oauthCredentials = JSON.parse(fs.readFileSync(oauthCredentialsPath, 'utf8'));
          const refreshTokenPath = path.join(__dirname, '.env.refresh-token');
          const refreshTokenContent = fs.readFileSync(refreshTokenPath, 'utf8');
          const refreshToken = refreshTokenContent.split('REFRESH_TOKEN=')[1].trim();
          const { client_secret, client_id, redirect_uris } = oauthCredentials.installed || oauthCredentials.web;
          const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0] || 'http://localhost:8080'
          );
          oAuth2Client.setCredentials({ refresh_token: refreshToken });
          await oAuth2Client.getAccessToken();
          const driveService = google.drive({ version: 'v3', auth: oAuth2Client });
          
          // Info dosyasını sil (önce JSON, sonra klasör)
          if (infoFile && infoFile.id) {
            try {
              await driveService.files.delete({ fileId: infoFile.id });
              console.log('✅ Info file deleted from Drive:', infoFile.id);
            } catch (deleteError) {
              console.error('❌ Failed to delete info file:', deleteError);
              // Devam et, klasörü silmeye çalış
            }
          }
          
          // Klasörü sil
          if (submissionFolder && submissionFolder.id) {
            try {
              await driveService.files.delete({ fileId: submissionFolder.id });
              console.log('✅ Submission folder deleted from Drive:', submissionFolder.id);
              cleanupSuccess = true;
            } catch (deleteError) {
              console.error('❌ Failed to delete folder:', deleteError);
              // Klasör silinemedi, Drive'da kalacak - status'u error olarak işaretle
            }
          } else {
            cleanupSuccess = true; // Klasör zaten yok
          }
        } catch (cleanupError) {
          console.error('❌ Error during cleanup (deleting folder/info):', cleanupError);
          // Cleanup başarısız - status'u error olarak işaretle, klasör/JSON Drive'da kalacak
        }
        
        // Cleanup başarısız olduysa hata mesajına ekle
        const cleanupMessage = cleanupSuccess 
          ? 'Folder and info file were deleted to maintain data integrity.'
          : 'WARNING: Failed to delete folder/info from Drive. Manual cleanup may be required.';
        
        // Status'u error olarak işaretle
        // GARANTİ: Status mutlaka güncellenmeli
        const errorMessage = `Video upload failed: ${videoError.message}. ${cleanupMessage}`;
        try {
          await db.collection('submissions').doc(submissionId).update({
            status: 'error',
            errorMessage: errorMessage,
            errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('✅ Status updated to error after video upload failure');
        } catch (statusUpdateError) {
          console.error('❌ CRITICAL: Failed to update status to error:', statusUpdateError);
          // Son çare: set() kullan
          try {
            await db.collection('submissions').doc(submissionId).set({
              ...submissionData,
              status: 'error',
              errorMessage: `${errorMessage} Status update also failed: ${statusUpdateError.message}`,
              errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log('✅ Status set to error using merge');
          } catch (setError) {
            console.error('❌ CRITICAL: Failed to set status to error:', setError);
            // Artık yapabileceğimiz bir şey yok, log'da kalacak
          }
        }
        
        // Video Storage'da kalsın (manuel işlem için)
        console.log('Video upload failed. Folder and info file were deleted to maintain data integrity. Video remains in Storage.');
        return { success: false, error: `Video upload failed: ${videoError.message}` };
      }

      // Video link kontrolü - kesinlikle null olmamalı
      if (!driveLink || !driveFile || !driveFile.id) {
        throw new Error('Video link is null or invalid after upload');
      }
      
      const folderLink = `https://drive.google.com/drive/folders/${submissionFolder.id}`;

      // 5. Firestore'u güncelle - Drive linklerini ekle
      console.log('Step 5: Updating Firestore with Drive links...');
      const updateData = {
        driveVideoLink: driveLink,
        driveFolderLink: folderLink,
        driveFolderId: submissionFolder.id,
        driveInfoFileId: infoFile.id,
        status: 'uploaded',
        driveFileId: driveFile.id,
        transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // driveVideoLink null kontrolü - kesinlikle null olmamalı
      if (!updateData.driveVideoLink) {
        throw new Error('driveVideoLink is null - cannot update Firestore');
      }
      
      await db.collection('submissions')
        .doc(submissionId)
        .update(updateData);

      console.log('Video transferred to Drive successfully. driveVideoLink:', driveLink);

      // 6. Firebase Storage'dan video'yu sil (Drive'a aktarıldığı için artık gerekli değil)
      console.log('Step 6: Deleting video from Storage...');
      await videoStorageFile.delete();
      console.log('Video deleted from Storage');

      // 7. Firestore'dan başvuruyu sil (Drive'a aktarıldığı için artık gerekli değil)
      // Veriler Google Drive'da güvende, Firestore'da tutmaya gerek yok
      console.log('Step 7: Deleting submission from Firestore...');
      await db.collection('submissions').doc(submissionId).delete();
      console.log('Submission deleted from Firestore - Data is safe in Google Drive');

      return { success: true, driveLink };
    } catch (error) {
      console.error('Error transferring video to Drive:', error);
      console.error('Error stack:', error.stack);
      
      // Hata durumunda status'u güncelle (document'i silme)
      // Eğer klasör ve info kaydedildiyse onları da ekle
      const updateData = {
        status: 'error',
        errorMessage: error.message,
        errorStack: error.stack ? error.stack.substring(0, 1000) : null, // Stack trace'i kısalt (Firestore limiti)
        errorOccurredAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Eğer klasör oluşturulduysa onu da kaydet
      if (submissionFolder) {
        updateData.driveFolderLink = `https://drive.google.com/drive/folders/${submissionFolder.id}`;
        updateData.driveFolderId = submissionFolder.id;
      }

      // Eğer info dosyası kaydedildiyse onu da ekle
      if (infoFile) {
        updateData.driveInfoFileId = infoFile.id;
      }

      try {
        await db.collection('submissions').doc(submissionId).update(updateData);
        console.log('Status updated to error with details');
      } catch (updateError) {
        console.error('Failed to update status to error:', updateError);
        // Son çare: set() kullan (document varsa günceller, yoksa oluşturur)
        try {
          await db.collection('submissions').doc(submissionId).set({
            ...submissionData,
            ...updateData,
          }, { merge: true });
        } catch (setError) {
          console.error('Failed to set document with error status:', setError);
        }
      }

      // Hata durumunda throw etme - zaten status'u güncelledik
      return { success: false, error: error.message };
    }
  }
);

/**
 * Başvuru için klasör oluşturur
 */
async function createSubmissionFolder(submissionData, submissionId) {
  const path = require('path');
  const fs = require('fs');
  
  // OAuth credentials yükle
  const oauthCredentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');
  const oauthCredentials = JSON.parse(fs.readFileSync(oauthCredentialsPath, 'utf8'));
  
  // Refresh token'ı oku
  const refreshTokenPath = path.join(__dirname, '.env.refresh-token');
  const refreshTokenContent = fs.readFileSync(refreshTokenPath, 'utf8');
  const refreshToken = refreshTokenContent.split('REFRESH_TOKEN=')[1].trim();
  
  // OAuth 2.0 client oluştur
  const { client_secret, client_id, redirect_uris } = oauthCredentials.installed || oauthCredentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] || 'http://localhost:8080'
  );
  
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  await oAuth2Client.getAccessToken();
  
  const driveService = google.drive({ version: 'v3', auth: oAuth2Client });
  
  // Ana klasör ID'si
  const mainFolderId = process.env.DRIVE_FOLDER_ID || '1iZj6-QLJelUxK3eQOxW2WdfBw2Uk4htT';
  
  // Başvuru klasörü adı: Ad Soyad - Tarih
  const date = new Date().toLocaleDateString('tr-TR');
  const folderName = `${submissionData.fullName} - ${date}`;
  
  // Klasör oluştur
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [mainFolderId],
  };
  
  const folder = await driveService.files.create({
    requestBody: folderMetadata,
    fields: 'id, name',
  });
  
  return folder.data;
}

/**
 * Başvuru bilgilerini JSON dosyası olarak kaydeder
 */
async function saveSubmissionInfo(submissionData, folderId) {
  const path = require('path');
  const fs = require('fs');
  
  // OAuth credentials yükle
  const oauthCredentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');
  const oauthCredentials = JSON.parse(fs.readFileSync(oauthCredentialsPath, 'utf8'));
  
  // Refresh token'ı oku
  const refreshTokenPath = path.join(__dirname, '.env.refresh-token');
  const refreshTokenContent = fs.readFileSync(refreshTokenPath, 'utf8');
  const refreshToken = refreshTokenContent.split('REFRESH_TOKEN=')[1].trim();
  
  // OAuth 2.0 client oluştur
  const { client_secret, client_id, redirect_uris } = oauthCredentials.installed || oauthCredentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] || 'http://localhost:8080'
  );
  
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  await oAuth2Client.getAccessToken();
  
  const driveService = google.drive({ version: 'v3', auth: oAuth2Client });
  
  // Başvuru bilgilerini JSON formatında hazırla
  const infoData = {
    fullName: submissionData.fullName,
    age: submissionData.age,
    position: submissionData.position,
    dominantFoot: submissionData.dominantFoot,
    team: submissionData.team,
    city: submissionData.city,
    instagram: submissionData.instagram,
    phone: submissionData.phone || null, // Telefon numarası (opsiyonel)
    submittedAt: new Date().toISOString(),
  };
  
  const infoJson = JSON.stringify(infoData, null, 2);
  const infoBuffer = Buffer.from(infoJson, 'utf8');
  
  // Buffer'ı stream'e dönüştür
  const { Readable } = require('stream');
  const bufferStream = new Readable();
  bufferStream.push(infoBuffer);
  bufferStream.push(null);
  
  // JSON dosyası oluştur
  const fileMetadata = {
    name: `Başvuru Bilgileri - ${submissionData.fullName}.json`,
    parents: [folderId],
  };
  
  const media = {
    mimeType: 'application/json',
    body: bufferStream,
  };
  
  const file = await driveService.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name',
  });
  
  return file.data;
}

/**
 * Google Drive'a dosya yükler
 * OAuth 2.0 kullanarak kullanıcı hesabıyla
 */
async function uploadToDrive(fileBuffer, fileName, submissionData, folderId) {
  // OAuth 2.0 credentials yükle
  const path = require('path');
  const fs = require('fs');
  
  // OAuth client credentials
  const oauthCredentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');
  const oauthCredentials = JSON.parse(fs.readFileSync(oauthCredentialsPath, 'utf8'));
  
  // Refresh token'ı oku
  const refreshTokenPath = path.join(__dirname, '.env.refresh-token');
  const refreshTokenContent = fs.readFileSync(refreshTokenPath, 'utf8');
  const refreshToken = refreshTokenContent.split('REFRESH_TOKEN=')[1].trim();
  
  // OAuth 2.0 client oluştur
  const { client_secret, client_id, redirect_uris } = oauthCredentials.installed || oauthCredentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] || 'http://localhost:8080'
  );
  
  // Refresh token ile access token al
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  // Token'ı yenile (gerekirse)
  await oAuth2Client.getAccessToken();
  
  const driveService = google.drive({ version: 'v3', auth: oAuth2Client });

  // Dosya metadata'sı - Başvuru klasörüne yükle
  const fileMetadata = {
    name: `${submissionData.fullName}_${fileName}`,
    parents: [folderId], // Direkt klasöre yükle
  };

  // Buffer'ı stream'e dönüştür
  const { Readable } = require('stream');
  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null); // Stream'i sonlandır

  const media = {
    mimeType: 'video/mp4',
    body: bufferStream,
  };

  // Dosyayı direkt kullanıcının klasörüne yükle
  // Service Account'un kullanıcının klasörüne yazması için
  // ÖNEMLİ: Klasörün sahibi Service Account olmalı VEYA
  // Service Account'a "Content Manager" yetkisi verilmeli
  console.log('Starting video upload to Drive, folderId:', folderId, 'fileSize:', fileBuffer.length, 'bytes');
  
  // Timeout kontrolü: 8 dakika (function timeout 9 dakika, burada 8 dakika güvenli)
  const uploadTimeout = 8 * 60 * 1000; // 8 dakika
  const uploadStartTime = Date.now();
  
  // Upload işlemini timeout ile sarmala
  const uploadPromise = driveService.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, parents',
    supportsAllDrives: true,
    supportsTeamDrives: true,
  });
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Video upload timeout after ${uploadTimeout / 1000} seconds`));
    }, uploadTimeout);
  });
  
  let response;
  try {
    response = await Promise.race([uploadPromise, timeoutPromise]);
  } catch (uploadError) {
    const elapsedTime = (Date.now() - uploadStartTime) / 1000;
    console.error(`Video upload failed after ${elapsedTime} seconds:`, uploadError);
    throw new Error(`Video upload failed: ${uploadError.message} (after ${elapsedTime}s)`);
  }

  // Response kontrolü
  if (!response || !response.data || !response.data.id) {
    throw new Error('Video upload failed: Invalid response from Google Drive API');
  }

  const elapsedTime = (Date.now() - uploadStartTime) / 1000;
  console.log(`File uploaded to Drive successfully in ${elapsedTime}s. File ID:`, response.data.id, 'Name:', response.data.name);
  return response.data;
}

/**
 * Manuel retry function - Status "processing" veya "error" olan başvuruları tekrar işlemek için
 * Kullanım: https://[region]-[project-id].cloudfunctions.net/retrySubmission?submissionId=[id]
 * 
 * Güvenlik: Production'da authentication eklemelisiniz!
 */
exports.retrySubmission = onRequest(
  {
    timeoutSeconds: 540,
    memory: '512MiB',
    cors: true,
  },
  async (req, res) => {
    const submissionId = req.query.submissionId;
    
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId parameter is required' });
    }

    console.log('Manual retry requested for submission:', submissionId);

    try {
      const db = admin.firestore();
      const docRef = db.collection('submissions').doc(submissionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const submissionData = doc.data();

      // Status'u "pending" olarak değiştir - bu sayede onDocumentCreated trigger'ı tekrar çalışacak
      await docRef.update({
        status: 'pending',
        retryAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        previousStatus: submissionData.status,
      });

      return res.json({ 
        success: true, 
        message: 'Submission status set to pending. The transfer function will be triggered automatically.',
        submissionId: submissionId,
      });
    } catch (error) {
      console.error('Retry error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
);
