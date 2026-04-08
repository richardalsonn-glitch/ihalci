/**
 * ⚡ İHALCİ - PREMIUM SECURE APPLICATION
 * Güvenlik birinci sırada tutulmuş modern Node.js uygulaması
 */

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const flash = require('connect-flash');
const moment = require('moment');

// 🔐 Security imports
const {
  PasswordManager,
  CSRFProtection,
  XSSProtection,
  RateLimiter,
  SecureHeaders,
  InputValidator,
  SessionSecurity,
  AuditLogger
} = require('./security-utils');

// ==================== GLOBAL SETUP ====================

global.mongoose = mongoose;
global.express = express;
global.ejs = require('ejs');
global.flash = flash;
global.passport = passport;
global.session = session;
global.moment = moment;
global.bcrypt = require('bcrypt');
global.multer = require('multer');
global.path = require('path');
global.crypto = require('crypto');
global.axios = require('axios');

// Security utilities globally available
global.PasswordManager = PasswordManager;
global.CSRFProtection = CSRFProtection;
global.XSSProtection = XSSProtection;
global.InputValidator = InputValidator;
global.AuditLogger = AuditLogger;

// ==================== EXPRESS APP ====================

global.app = express();

// ==================== DATABASE CONNECTION ====================

global.mongoDB = mongoose.createConnection(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/ihalci',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

global.mongoDB
  .on('connected', () => {
    console.log('✅ MongoDB Bağlantısı Başarılı');
  })
  .on('disconnected', () => {
    console.log('❌ MongoDB Bağlantısı Kapandı');
  })
  .on('error', (err) => {
    console.error(`❌ MongoDB Hata: ${err}`);
  });

global.Schema = mongoose.Schema;

// ==================== SECURITY MIDDLEWARE ====================

// 1. Helmet - Secure headers
app.use(SecureHeaders.middleware());

// 2. Body parser
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// 3. Data sanitization - MongoDB injection koruması
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());

// 4. XSS Protection - Input sanitization
app.use(XSSProtection.middleware());

// 5. Rate limiting
app.use('/api/', RateLimiter.general()); // Genel API rate limit
app.use('/login', RateLimiter.login()); // Login brute force koruması
app.use('/nadminpanel/nadminlogin', RateLimiter.login()); // Admin login koruması

// ==================== SESSION SETUP ====================

const sessionStore = new MongoStore({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ihalci',
  collection: 'sessions'
});

app.use(
  session({
    ...SessionSecurity.getConfig(),
    store: sessionStore
  })
);

// ==================== CSRF & FLASH MIDDLEWARE ====================

app.use(CSRFProtection.middleware());
app.use(flash());

// ==================== PASSPORT SETUP ====================

app.use(passport.initialize());
app.use(passport.session());

// ==================== VIEW ENGINE ====================

app.set('view engine', 'ejs');
app.set('views', 'www');

// ==================== STATIC FILES ====================

app.use('/home', express.static('www/home/assets'));
app.use('/admin', express.static('www/admin/assets'));
app.use('/uploads', express.static('www/admin/uploads'));
app.use('/slider', express.static('www/home/slider'));
app.use('/ajax', express.static('www/admin/ajax'));
app.use('/ajaxs', express.static('www/home/ajax'));
app.use('/urungorselleri', express.static('www/home/urungorselleri'));

// ==================== DATABASE MODELS ====================

global.siteModel = require('./database/site');
global.uyelerModel = require('./database/uyeler');
global.anasayfaModel = require('./database/anasayfa');
global.kategorilerModel = require('./database/kategoriler');
global.sliderModel = require('./database/slider');

// ==================== INITIALIZATION ====================

(async () => {
  try {
    console.log('🚀 Uygulama başlatılıyor...');

    // Database collections check & create
    let site = await siteModel.countDocuments();
    let uyelerCount = await uyelerModel.countDocuments();
    let anasayfa = await anasayfaModel.countDocuments();
    let kategoriler = await kategorilerModel.countDocuments();
    let slider = await sliderModel.countDocuments();

    // ==================== DEFAULT ADMIN USER ====================
    
    if (site === 0) {
      console.log('📝 Default site ayarları oluşturuluyor...');
      const defaultSiteData = new siteModel().site;
      const newSite = new siteModel(defaultSiteData);
      await newSite.save();
      console.log('✅ Site ayarları oluşturuldu');
    }

    if (uyelerCount === 0) {
      console.log('📝 Default admin kullanıcı oluşturuluyor...');

      // 🔐 PREMIUM: Şifreyi güvenli şekilde hash'le
      const adminPassword = await PasswordManager.hashPassword(
        process.env.ADMIN_PASSWORD || 'Admin@123456'
      );

      const adminData = {
        uyeadi: 'admin',
        uyesoyad: 'admin',
        uyemail: 'admin@ihalci.local',
        uyecinsiyet: 'Erkek',
        uyebakiye: 0,
        uyeadres: '',
        uyedurum: true,
        uyesifre: adminPassword, // ✅ Hashed password
        uyetel: '',
        uyeadresbasligi: '',
        uyeil: '',
        uyeilce: '',
        postakodu: '',
        admin: true,
        bandurumu: false,
        jeton: 1000, // Admin jeton kredisi
        uyekayittarihi: moment().format('YYYY-MM-DD HH:mm:ss')
      };

      const admin = new uyelerModel(adminData);
      await admin.save();

      console.log('✅ Admin kullanıcı oluşturuldu');
      console.log('📧 Email: admin@ihalci.local');
      console.log('🔐 Şifre: Admin@123456 (güvenli bir şifre ayarla!)');

      // 🔐 Audit log
      await AuditLogger.log({
        event: 'ADMIN_USER_CREATED',
        status: 'SUCCESS',
        details: 'Default admin user created on app startup'
      });
    }

    // Default data setup
    if (anasayfa === 0) {
      console.log('📝 Default anasayfa verisi oluşturuluyor...');
      const anasayfaData = {
        ozellik1: 'Her Gün Yüzlerce İhale',
        ozellik2: 'Güvenli Ödeme',
        ozellik3: '7/24 Destek',
        ozellik4: 'Anında Geri Ödeme',
        ozellik5: 'Hızlı Kargo',
        altozellik1: 'Hemen Teklif Ver',
        altozellik2: '%100 Güvenli Ödeme',
        altozellik3: 'Anında Destek',
        altozellik4: 'Anında Geri Ödeme',
        altozellik5: 'Hızlı Kargo',
        adresbilgileri: 'İzmir, Türkiye 35000',
        copyright: 'Copyright © İhale Pazarı. Tüm Hakları Pazarı İhale Pazarı.',
        magazabilgileri: 'Elektronik endüstrisinde istisnasız olarak mevcut olan mutlak en iyi m…',
        misyonbilgileri: 'İhale Pazarı, şeffaf, adil ve rekabetçi bir ortamda ihale süreçlerini …',
        telefonbilgileri: '5445454545'
      };

      const anasayfakayit = new anasayfaModel(anasayfaData);
      await anasayfakayit.save();
      console.log('✅ Anasayfa verisi oluşturuldu');
    }

    if (kategoriler === 0) {
      console.log('📝 Default kategori oluşturuluyor...');
      const kategorilerData = {
        kategoriadi: 'Kadın',
        kategoriaciklama: 'Kadınlara dair her şey burada',
        kategoriurl: 'kadin',
        kategoridurum: true
      };

      const kategorilerkayit = new kategorilerModel(kategorilerData);
      await kategorilerkayit.save();
      console.log('✅ Kategori oluşturuldu');
    }

    if (slider === 0) {
      console.log('📝 Default slider oluşturuluyor...');
      const sliderData = {
        slideadi: 'slide111',
        slidealtadi: 'demo2',
        slideurunbaslangicfiyati: 120,
        slideindirimlifiyati: 100,
        slideindirimorani: '29',
        slideurunlinki: 'test.com',
        slidegorsel: '461761.jpg',
        eklenmetarihi: moment().format('YYYY-MM-DD HH:mm:ss')
      };

      const slidekayit = new sliderModel(sliderData);
      await slidekayit.save();
      console.log('✅ Slider oluşturuldu');
    }

    console.log('✅ Veritabanı başlatıldı');

  } catch (error) {
    console.error('❌ Başlatma hatası:', error);
  }
})();

// ==================== ROUTERS ====================

require('./routers/routers')(app);

// ==================== GLOBAL ERROR HANDLER ====================

/**
 * 🔐 Premium error handling
 * Hiçbir sensitive bilgi client'e gönderilmez
 */
app.use((err, req, res, next) => {
  // 🔐 Audit logging
  AuditLogger.log({
    event: 'APPLICATION_ERROR',
    userId: req.user?.id,
    userEmail: req.user?.uyemail,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'ERROR',
    details: {
      message: err.message,
      path: req.originalUrl,
      method: req.method
    }
  });

  console.error('🚨 Application Error:', err);

  // Production'da sensitive detayları gizle
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: isProduction ? 'Bir hata oluştu' : err.message,
    ...(isProduction ? {} : { details: err })
  });
});

// ==================== 404 HANDLER ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Sayfa bulunamadı'
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 İHALCİ UYGULAMASI BAŞLATILDI    ║
╚════════════════════════════════════════╝

📌 Port:        ${PORT}
🔒 Environment: ${NODE_ENV}
🌐 URL:         http://localhost:${PORT}
📧 Admin Email: admin@ihalci.local
🔐 Admin Pass:  Admin@123456 (CHANGE THIS!)

🔐 Security Status:
  ✅ Helmet headers enabled
  ✅ CSRF protection active
  ✅ XSS prevention active
  ✅ Rate limiting enabled
  ✅ Session security enabled
  ✅ Password encryption enabled

⚠️  PRODUCTION CHECKLIST:
  □ Change ADMIN_PASSWORD in .env
  □ Set SESSION_SECRET in .env
  □ Set ENCRYPTION_KEY in .env
  □ Enable HTTPS
  □ Set NODE_ENV=production
  □ Configure database credentials

  `);
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM alındı. Uygulama kapatılıyor...');
  mongoDB.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT alındı. Uygulama kapatılıyor...');
  mongoDB.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  AuditLogger.log({
    event: 'UNHANDLED_REJECTION',
    status: 'ERROR',
    details: reason
  });
});

module.exports = app;
