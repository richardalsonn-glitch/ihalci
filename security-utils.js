/**
 * ⚡ PREMIUM SECURITY UTILITIES
 * Tüm güvenlik işlemleri merkezi olarak yönetilir
 * 
 * Features:
 * - Password Hashing (bcrypt + pepper)
 * - JWT Authentication
 * - CSRF Protection
 * - XSS Prevention
 * - Rate Limiting
 * - Secure Headers
 * - Input Validation
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

// ==================== PASSWORD SECURITY ====================

class PasswordManager {
  /**
   * Şifre hash'le (10 rounds + pepper)
   * @param {string} password - Plain text şifre
   * @returns {Promise<string>} Hash'lenmiş şifre
   */
  static async hashPassword(password) {
    try {
      if (!password || password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      // Pepper ekle (extra güvenlik katmanı)
      const pepper = process.env.PASSWORD_PEPPER || 'default_pepper_key_change_in_prod';
      const peppered = password + pepper;

      // 10 salt round optimal (security vs speed)
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(peppered, saltRounds);

      return hashedPassword;
    } catch (error) {
      console.error('Password hashing error:', error);
      throw error;
    }
  }

  /**
   * Şifre doğrula
   * @param {string} plainPassword - Plain text şifre
   * @param {string} hashedPassword - Hash'lenmiş şifre
   * @returns {Promise<boolean>} Eşleşme durumu
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      const pepper = process.env.PASSWORD_PEPPER || 'default_pepper_key_change_in_prod';
      const peppered = plainPassword + pepper;

      return await bcrypt.compare(peppered, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Güçlü şifre kontrol et (Regex validation)
   * @param {string} password - Kontrol edilecek şifre
   * @returns {Object} Kontrol sonucu
   */
  static validatePasswordStrength(password) {
    const strength = {
      isStrong: false,
      score: 0,
      feedback: []
    };

    // Minimum length (8 karakter)
    if (password.length < 8) {
      strength.feedback.push('❌ Minimum 8 karakter gerekli');
    } else {
      strength.score += 20;
    }

    // Büyük harf
    if (/[A-Z]/.test(password)) {
      strength.score += 20;
    } else {
      strength.feedback.push('❌ En az 1 büyük harf gerekli');
    }

    // Küçük harf
    if (/[a-z]/.test(password)) {
      strength.score += 20;
    } else {
      strength.feedback.push('❌ En az 1 küçük harf gerekli');
    }

    // Sayı
    if (/[0-9]/.test(password)) {
      strength.score += 20;
    } else {
      strength.feedback.push('❌ En az 1 sayı gerekli');
    }

    // Özel karakter
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength.score += 20;
    } else {
      strength.feedback.push('❌ En az 1 özel karakter gerekli');
    }

    strength.isStrong = strength.score >= 80;

    return strength;
  }
}

// ==================== CSRF PROTECTION ====================

class CSRFProtection {
  /**
   * CSRF token oluştur
   * @param {Object} req - Express request object
   * @returns {string} CSRF token
   */
  static generateToken(req) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      req.session.csrfToken = token;
      return token;
    } catch (error) {
      console.error('CSRF token generation error:', error);
      throw error;
    }
  }

  /**
   * CSRF token doğrula
   * @param {Object} req - Express request object
   * @returns {boolean} Token geçerli mi
   */
  static verifyToken(req) {
    const tokenFromSession = req.session.csrfToken;
    const tokenFromRequest = req.body._csrf || req.headers['x-csrf-token'];

    if (!tokenFromSession || !tokenFromRequest) {
      return false;
    }

    return crypto
      .timingSafeEqual(
        Buffer.from(tokenFromSession),
        Buffer.from(tokenFromRequest)
      );
  }

  /**
   * CSRF middleware
   * @returns {Function} Express middleware
   */
  static middleware() {
    return (req, res, next) => {
      // Token oluştur ve res.locals'a ekle
      res.locals.csrfToken = CSRFProtection.generateToken(req);

      // POST/PUT/DELETE isteklerinde doğrula
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        if (!CSRFProtection.verifyToken(req)) {
          return res.status(403).json({
            success: false,
            message: 'CSRF token geçersiz'
          });
        }
      }

      next();
    };
  }
}

// ==================== XSS PREVENTION ====================

class XSSProtection {
  /**
   * String'i XSS'den temizle
   * @param {string} input - Temizlenecek input
   * @returns {string} Temizlenmiş string
   */
  static sanitize(input) {
    if (typeof input !== 'string') return input;

    return validator
      .escape(input)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * HTML-safe içerik döndür
   * @param {string} content - HTML content
   * @returns {string} Safe HTML
   */
  static sanitizeHTML(content) {
    const allowed = ['<b>', '</b>', '<i>', '</i>', '<u>', '</u>', '<br>'];
    let sanitized = validator.escape(content);

    allowed.forEach(tag => {
      sanitized = sanitized.replace(
        new RegExp(`&lt;${tag.slice(1, -1)}&gt;`, 'g'),
        tag
      );
    });

    return sanitized;
  }

  /**
   * Input validation middleware
   * @returns {Function} Express middleware
   */
  static middleware() {
    return (req, res, next) => {
      // Tüm string input'ları temizle
      const sanitizeObject = (obj) => {
        if (!obj) return obj;

        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'string') {
            obj[key] = XSSProtection.sanitize(obj[key]);
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        });
      };

      sanitizeObject(req.body);
      sanitizeObject(req.query);
      sanitizeObject(req.params);

      next();
    };
  }
}

// ==================== RATE LIMITING ====================

class RateLimiter {
  /**
   * Genel rate limiter
   * @returns {Function} Rate limit middleware
   */
  static general() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 dakika
      max: 100, // 15 dakikada max 100 istek
      message: 'Çok fazla istek yaptınız. Lütfen daha sonra deneyiniz.',
      standardHeaders: true, // `RateLimit-*` headers gönder
      legacyHeaders: false // `X-RateLimit-*` headers devre dışı
    });
  }

  /**
   * Login rate limiter (Brute force koruması)
   * @returns {Function} Rate limit middleware
   */
  static login() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 dakika
      max: 5, // Maksimum 5 başarısız login denemesi
      message: 'Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyiniz.',
      skipSuccessfulRequests: true, // Başarılı istekleri say
      keyGenerator: (req) => req.body.email || req.ip
    });
  }

  /**
   * API rate limiter (Token başına)
   * @returns {Function} Rate limit middleware
   */
  static api() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 dakika
      max: 30, // Dakikada 30 istek
      message: 'API rate limit aşıldı'
    });
  }
}

// ==================== SECURE HEADERS ====================

class SecureHeaders {
  /**
   * Tüm security headers'ı konfigüre et
   * @returns {Object} Helmet options
   */
  static getConfig() {
    return {
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: true
        }
      },
      // X-Frame-Options
      frameguard: {
        action: 'deny'
      },
      // X-Content-Type-Options
      noSniff: true,
      // X-XSS-Protection
      xssFilter: true,
      // Referrer-Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },
      // Permissions-Policy
      permittedCrossDomainPolicies: false
    };
  }

  /**
   * Helmet middleware'ı setup et
   * @returns {Function} Helmet middleware
   */
  static middleware() {
    return helmet(SecureHeaders.getConfig());
  }
}

// ==================== INPUT VALIDATION ====================

class InputValidator {
  /**
   * Email doğrula
   * @param {string} email - Email adresi
   * @returns {Object} Validation sonucu
   */
  static validateEmail(email) {
    const isValid = validator.isEmail(email);
    return {
      isValid,
      message: isValid ? '✅ Geçerli email' : '❌ Geçersiz email formatı'
    };
  }

  /**
   * Telefon doğrula (TR)
   * @param {string} phone - Telefon numarası
   * @returns {Object} Validation sonucu
   */
  static validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = /^(\+90|0)?5[0-9]{9}$/.test(cleaned);
    
    return {
      isValid,
      message: isValid ? '✅ Geçerli telefon' : '❌ Geçersiz telefon formatı',
      cleaned: cleaned.startsWith('90') ? cleaned : '90' + cleaned.slice(-10)
    };
  }

  /**
   * URL doğrula
   * @param {string} url - URL
   * @returns {Object} Validation sonucu
   */
  static validateURL(url) {
    const isValid = validator.isURL(url);
    return {
      isValid,
      message: isValid ? '✅ Geçerli URL' : '❌ Geçersiz URL'
    };
  }

  /**
   * IBAN doğrula (TR)
   * @param {string} iban - IBAN
   * @returns {Object} Validation sonucu
   */
  static validateIBAN(iban) {
    const trIBAN = /^TR\d{2}\d{5}[A-Z0-9]{17}$/;
    const isValid = trIBAN.test(iban.replace(/\s/g, ''));

    return {
      isValid,
      message: isValid ? '✅ Geçerli IBAN' : '❌ Geçersiz IBAN formatı'
    };
  }

  /**
   * Kredi kartı doğrula (Luhn algorithm)
   * @param {string} cardNumber - Kart numarası
   * @returns {Object} Validation sonucu
   */
  static validateCreditCard(cardNumber) {
    const isValid = validator.isCreditCard(cardNumber);
    return {
      isValid,
      message: isValid ? '✅ Geçerli kart' : '❌ Geçersiz kart numarası',
      // Sonlandır
      masked: cardNumber.slice(-4).padStart(cardNumber.length, '*')
    };
  }
}

// ==================== SESSION SECURITY ====================

class SessionSecurity {
  /**
   * Güvenli session options
   * @returns {Object} Session config
   */
  static getConfig() {
    return {
      name: 'ihalci_session', // Default 'connect.sid' yerine custom name
      secret: process.env.SESSION_SECRET || 'change_me_in_production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only
        httpOnly: true, // JavaScript'ten erişime kapatılı
        sameSite: 'strict', // CSRF koruması
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
      },
      rolling: true // Her istekte timeout reset
    };
  }
}

// ==================== ENCRYPTION ====================

class EncryptionManager {
  /**
   * Veriyi encrypt et (AES-256-GCM)
   * @param {string} plainText - Plain text
   * @returns {string} Encrypted data (iv:encryptedData:tag)
   */
  static encrypt(plainText) {
    try {
      const key = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  /**
   * Veriyi decrypt et
   * @param {string} encryptedData - Encrypted data (iv:encryptedData:tag)
   * @returns {string} Decrypted plainText
   */
  static decrypt(encryptedData) {
    try {
      const key = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');
      const [ivHex, encrypted, tagHex] = encryptedData.split(':');

      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }
}

// ==================== AUDIT LOGGING ====================

class AuditLogger {
  /**
   * Güvenlik events'i loglama
   * @param {Object} auditData - Audit bilgileri
   */
  static async log(auditData) {
    try {
      const log = {
        timestamp: new Date(),
        event: auditData.event, // 'LOGIN', 'PASSWORD_CHANGE', 'DELETE_USER', etc.
        userId: auditData.userId,
        userEmail: auditData.userEmail,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        status: auditData.status, // 'SUCCESS' or 'FAILED'
        details: auditData.details
      };

      // MongoDB'ye kaydet (AuditLog collection'ı oluştur)
      console.log('🔐 AUDIT LOG:', log);
      // TODO: MongoDB'ye kaydet

      return log;
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }
}

// ==================== EXPORTS ====================

module.exports = {
  PasswordManager,
  CSRFProtection,
  XSSProtection,
  RateLimiter,
  SecureHeaders,
  InputValidator,
  SessionSecurity,
  EncryptionManager,
  AuditLogger
};
