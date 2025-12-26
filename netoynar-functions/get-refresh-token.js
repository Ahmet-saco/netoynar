/**
 * OAuth 2.0 Refresh Token Alma Script'i
 * 
 * Bu script'i çalıştırarak Google Drive için refresh token alabilirsiniz.
 * 
 * Kullanım:
 * 1. OAuth JSON dosyasını bu klasöre kopyalayın (client_secret_*.json)
 * 2. npm install googleapis
 * 3. node get-refresh-token.js
 */

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// OAuth JSON dosyasını yükle
// Dosya adını değiştirin: client_secret_816503665102-xxxxx.apps.googleusercontent.com.json
const credentialsPath = path.join(__dirname, 'client_secret_816503665102-darre5benr2i9gci1086vl60lnipgvqn.apps.googleusercontent.com.json');

if (!fs.existsSync(credentialsPath)) {
  console.error('OAuth JSON dosyası bulunamadı!');
  console.error('Dosya adı:', credentialsPath);
  console.error('Lütfen indirdiğiniz JSON dosyasını bu klasöre kopyalayın.');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
// localhost redirect URI kullan (Console'da tanımlı olan)
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');

// OAuth URL oluştur
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
  ],
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Google Drive erişimi için izin verin:');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(authUrl);
console.log('\n═══════════════════════════════════════════════════════════');
console.log('ADIMLAR:');
console.log('1. Yukarıdaki URL\'yi tarayıcıda açın');
console.log('2. Google hesabınızla giriş yapın');
console.log('3. İzin verin');
console.log('4. Sayfa "localhost bağlanamadı" hatası verecek - NORMAL!');
console.log('5. Tarayıcı adres çubuğuna bakın, URL\'de "code=" ile başlayan');
console.log('   bir kod göreceksiniz (örnek: code=4/0A...).');
console.log('6. Bu kodu kopyalayıp aşağıya yapıştırın');
console.log('═══════════════════════════════════════════════════════════\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Authorization Code (veya tam URL): ', async (input) => {
  rl.close();

  // Eğer URL verilmişse, code'u çıkar
  let code = input.trim();
  if (code.includes('code=')) {
    // URL'den code'u çıkar
    const urlParams = new URLSearchParams(code.split('?')[1] || code);
    code = urlParams.get('code') || code;
    console.log('\n✅ Authorization code URL\'den çıkarıldı:', code.substring(0, 20) + '...');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    console.log('\n✅ Refresh Token başarıyla alındı!');
    console.log('\nRefresh Token:', tokens.refresh_token);
    console.log('\nBu token\'ı güvenli bir yere kaydedin.');
    console.log('Cloud Function\'da kullanmak için .env dosyasına ekleyeceğiz.\n');

    // Refresh token'ı dosyaya kaydet
    const tokenPath = path.join(__dirname, '.env.refresh-token');
    fs.writeFileSync(tokenPath, `REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('Refresh token .env.refresh-token dosyasına kaydedildi.');
    console.log('⚠️  Bu dosyayı güvenli tutun ve Git\'e eklemeyin!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
});

