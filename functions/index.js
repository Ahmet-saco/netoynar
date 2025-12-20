const functions = require('firebase-functions');
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
exports.transferVideoToDrive = functions.firestore
  .document('submissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submissionData = snap.data();
    const submissionId = context.params.submissionId;

    console.log('Processing submission:', submissionId);
    console.log('Video path:', submissionData.videoStoragePath);

    try {
      // 1. Firebase Storage'dan video'yu indir
      const bucket = admin.storage().bucket();
      const file = bucket.file(submissionData.videoStoragePath);
      
      const [fileBuffer] = await file.download();
      const fileName = submissionData.videoStoragePath.split('/').pop();

      console.log('Video downloaded from Storage, size:', fileBuffer.length);

      // 2. Google Drive'a yükle
      // NOT: Google Drive API için service account veya OAuth2 gerekli
      // Bu kısım için Google Cloud Console'da Drive API'yi aktif etmeniz ve
      // service account oluşturmanız gerekiyor
      
      const driveFile = await uploadToDrive(
        fileBuffer,
        fileName,
        submissionData
      );

      const driveLink = `https://drive.google.com/file/d/${driveFile.id}/view`;

      // 3. Firestore'u güncelle - Drive linkini ekle
      await admin.firestore()
        .collection('submissions')
        .doc(submissionId)
        .update({
          driveVideoLink: driveLink,
          status: 'uploaded',
          driveFileId: driveFile.id,
          transferredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log('Video transferred to Drive successfully:', driveLink);

      // 4. (Opsiyonel) Firebase Storage'dan sil
      // await file.delete();
      // console.log('Video deleted from Storage');

      return { success: true, driveLink };
    } catch (error) {
      console.error('Error transferring video to Drive:', error);
      
      // Hata durumunda status'u güncelle
      await admin.firestore()
        .collection('submissions')
        .doc(submissionId)
        .update({
          status: 'error',
          errorMessage: error.message,
        });

      throw error;
    }
  });

/**
 * Google Drive'a dosya yükler
 * Service Account kullanarak
 */
async function uploadToDrive(fileBuffer, fileName, submissionData) {
  // Google Drive API için authentication
  // Service Account kullanıyorsanız:
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account-key.json', // Service account JSON dosyası
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const driveService = google.drive({ version: 'v3', auth });

  // Klasör ID'si (Google Drive'da bir klasör oluşturup ID'sini alın)
  const folderId = process.env.DRIVE_FOLDER_ID || '1iZj6-QLJelUxK3eQOxW2WdfBw2Uk4htT';

  // Dosya metadata'sı
  const fileMetadata = {
    name: `${submissionData.fullName}_${fileName}`,
    parents: [folderId],
  };

  const media = {
    mimeType: 'video/mp4',
    body: fileBuffer,
  };

  const response = await driveService.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  });

  console.log('File uploaded to Drive:', response.data.id);
  return response.data;
}

