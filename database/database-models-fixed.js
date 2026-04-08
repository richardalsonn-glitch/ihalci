/**
 * 🔐 FIXED DATABASE MODELS
 * Proper validation, unique indexes, timestamps
 */

// ==================== UYELER (USERS) ====================

const uyelerSchema = new Schema({
  // Kimlik bilgileri
  uyeadi: { 
    type: String, 
    required: [true, 'Ad gerekli'],
    minlength: [2, 'Ad minimum 2 karakter'],
    maxlength: [50, 'Ad maximum 50 karakter'],
    trim: true
  },
  uyesoyad: { 
    type: String, 
    required: [true, 'Soyad gerekli'],
    minlength: [2, 'Soyad minimum 2 karakter'],
    maxlength: [50, 'Soyad maximum 50 karakter'],
    trim: true
  },
  uyemail: { 
    type: String, 
    required: [true, 'Email gerekli'],
    unique: [true, 'Bu email zaten kayıtlı'],
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli email girin'],
    index: true // Hızlı aramalar için
  },
  uyesifre: { 
    type: String, 
    required: [true, 'Şifre gerekli'],
    minlength: 60, // bcrypt hash length
    select: false // Şifre otomatik load edilmesin
  },
  uyetel: { 
    type: String,
    match: [/^(\+90|0)?5[0-9]{9}$/, 'Geçerli telefon numarası girin'],
    default: ''
  },
  uyecinsiyet: {
    type: String,
    enum: ['Erkek', 'Kadın', 'Belirtmek istemiyorum'],
    default: 'Belirtmek istemiyorum'
  },

  // Adres bilgileri
  uyeadres: { 
    type: String, 
    default: ''
  },
  uyeadresbasligi: { 
    type: String, 
    default: ''
  },
  uyeil: { 
    type: String, 
    default: ''
  },
  uyeilce: { 
    type: String, 
    default: ''
  },
  postakodu: { 
    type: String, 
    default: ''
  },

  // Finansal
  uyebakiye: { 
    type: Number, 
    default: 0,
    min: 0
  },
  jeton: { 
    type: Number, 
    default: 0,
    min: 0
  },

  // Durum
  uyedurum: { 
    type: Boolean, 
    default: false // Email verification gerekli
  },
  bandurumu: { 
    type: Boolean, 
    default: false // Ban durumu
  },
  banSebep: {
    type: String,
    default: ''
  },
  banTarihi: {
    type: Date,
    default: null
  },

  // Roller
  admin: { 
    type: Boolean, 
    default: false,
    select: false // Security: admin flag otomatik load edilmesin
  },
  moderator: {
    type: Boolean,
    default: false,
    select: false
  },

  // Timestamps
  uyekayittarihi: { 
    type: Date, 
    default: Date.now
  },
  sonGiris: {
    type: Date,
    default: null
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },

  // 2FA
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  }
}, { 
  collection: 'uyeler',
  timestamps: { createdAt: 'uyekayittarihi', updatedAt: 'updatedAt' }
});

// Indexes
uyelerSchema.index({ uyemail: 1 });
uyelerSchema.index({ uyekayittarihi: 1 });
uyelerSchema.index({ bandurumu: 1 });

module.exports = mongoDB.model('uyeler', uyelerSchema);

// ==================== TEKLIFLER (BIDS) ====================

const tekliflerSchema = new Schema({
  teklif: { 
    type: Number,
    required: [true, 'Teklif tutarı gerekli'],
    min: [1, 'Teklif minimum 1 TL'],
    index: true
  },
  uyeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'uyeler',
    required: [true, 'Kullanıcı ID gerekli'],
    index: true
  },
  urunId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'urunler',
    required: [true, 'Ürün ID gerekli'],
    index: true
  },
  teklifdurum: { 
    type: Boolean, 
    default: true // Active mi?
  },
  tekrarteklif: { 
    type: Boolean, 
    default: true
  },
  jeton_kullanildi: {
    type: Number,
    default: 0
  },
  eklenmetarihi: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  collection: 'teklifler',
  timestamps: true
});

// Compound index - hızlı sorgu
tekliflerSchema.index({ urunId: 1, teklif: -1 });
tekliflerSchema.index({ uyeId: 1, eklenmetarihi: -1 });

module.exports = mongoDB.model('teklifler', tekliflerSchema);

// ==================== URUNLER (PRODUCTS) ====================

const urunlerSchema = new Schema({
  urunadi: { 
    type: String, 
    required: [true, 'Ürün adı gerekli'],
    unique: true,
    minlength: [5, 'Ürün adı minimum 5 karakter'],
    maxlength: [200, 'Ürün adı maximum 200 karakter'],
    trim: true,
    index: true
  },
  urunaciklamasi: { 
    type: String,
    required: [true, 'Ürün açıklaması gerekli'],
    minlength: [50, 'Açıklama minimum 50 karakter'],
    maxlength: [5000, 'Açıklama maximum 5000 karakter']
  },
  kategoriId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'kategoriler',
    required: [true, 'Kategori seçin'],
    index: true
  },
  altkategoriId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'altkategoriler'
  },
  uyeId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uyeler',
    required: [true, 'Kullanıcı ID gerekli'],
    index: true
  },

  // Fiyat
  baslangicfiyati: { 
    type: Number,
    required: [true, 'Başlangıç fiyatı gerekli'],
    min: [0.01, 'Başlangıç fiyatı 0.01 TL minimum'],
    default: 1
  },
  hemenalfiyati: { 
    type: Number,
    min: [0, 'Hemen al fiyatı 0 minimum']
  },

  // Görsel
  urungorsel1: { type: String, default: '' },
  urungorsel2: { type: String, default: '' },
  urungorsel3: { type: String, default: '' },
  urungorsel4: { type: String, default: '' },
  urungorsel5: { type: String, default: '' },

  // Özellikler (JSON format)
  ozellik1: { type: String, default: '' },
  ozellik2: { type: String, default: '' },
  ozellik3: { type: String, default: '' },
  ozellik4: { type: String, default: '' },
  ozellik5: { type: String, default: '' },
  urunetiketleri: { type: String, default: '' },

  // İhale
  ihalebaslangictarihi: { 
    type: Date,
    required: [true, 'İhale başlangıç tarihi gerekli']
  },
  ihalebitistarihi: { 
    type: Date,
    required: [true, 'İhale bitiş tarihi gerekli'],
    index: true
  },
  ihaledurumu: { 
    type: Boolean, 
    default: true,
    index: true
  },
  ihaleurl: { 
    type: String,
    unique: true,
    index: true
  },

  // Kazanan
  kazananUyeId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uyeler',
    default: null,
    index: true
  },
  kazananFiyat: {
    type: Number,
    default: null
  },

  // Meta
  populerurun: { 
    type: Boolean, 
    default: false,
    index: true
  },
  urunkodu: { 
    type: String, 
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
  },
  
  // Timestamps
  ihaleeklemetarihi: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'urunler',
  timestamps: { createdAt: 'ihaleeklemetarihi', updatedAt: 'updatedAt' }
});

// Indexes
urunlerSchema.index({ kategoriId: 1, ihaledurumu: 1 });
urunlerSchema.index({ uyeId: 1, ihaledurumu: 1 });
urunlerSchema.index({ ihalebitistarihi: 1, ihaledurumu: 1 });
urunlerSchema.index({ populerurun: 1, ihaledurumu: 1 });

module.exports = mongoDB.model('urunler', urunlerSchema);

// ==================== CUZDAN (WALLET) ====================

const cuzdanSchema = new Schema({
  uyeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'uyeler', 
    required: [true, 'Kullanıcı ID gerekli'],
    unique: true,
    index: true
  },
  bakiye: { 
    type: Number, 
    default: 0,
    min: 0
  },
  bakiyetarihi: { 
    type: Date, 
    default: Date.now
  },
  toplam_yatirim: {
    type: Number,
    default: 0
  },
  toplam_cekis: {
    type: Number,
    default: 0
  }
}, { 
  collection: 'cuzdan',
  timestamps: true
});

module.exports = mongoDB.model('cuzdan', cuzdanSchema);

// ==================== BAKIYE ISLEMLERI (WALLET TRANSACTIONS) ====================

const bakiyeIslemiSchema = new Schema({
  uyeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'uyeler',
    required: true,
    index: true
  },
  miktar: { 
    type: Number,
    required: true,
    min: 0.01
  },
  islem_tipi: { 
    type: String,
    enum: ['yatirim', 'cekis', 'teklif_yap', 'teklif_iade', 'kazanc'],
    required: true,
    index: true
  },
  durum: {
    type: String,
    enum: ['beklemede', 'tamamlandi', 'iptal'],
    default: 'tamamlandi',
    index: true
  },
  referans_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // Ürün ID veya İşlem ID
  },
  aciklama: {
    type: String,
    default: ''
  },
  odeme_yontemi: {
    type: String,
    enum: ['kredi_karti', 'banka_havalesi', 'sistem'],
    default: 'sistem'
  },
  tarih: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { 
  collection: 'bakiye_islemleri',
  timestamps: true
});

module.exports = mongoDB.model('bakiye_islemi', bakiyeIslemiSchema);

// ==================== AUDIT LOG ====================

const auditLogSchema = new Schema({
  event: { 
    type: String,
    required: true,
    index: true,
    enum: [
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGE',
      'PROFILE_UPDATE',
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'BID_PLACED',
      'AUCTION_ENDED',
      'PAYMENT_MADE',
      'ADMIN_ACTION',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'USER_BANNED',
      'USER_UNBANNED',
      'ERROR',
      'SECURITY_ALERT'
    ]
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uyeler',
    default: null,
    index: true
  },
  userEmail: {
    type: String,
    default: null,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'ERROR', 'WARNING', 'BLOCKED'],
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // 30 günde otomatik sil
  }
}, { 
  collection: 'audit_logs'
});

module.exports = mongoDB.model('audit_log', auditLogSchema);

// ==================== EXPORTS ====================

console.log('✅ Tüm database models başarıyla yüklendi');
