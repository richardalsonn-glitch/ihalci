/**
 * 🔐 PREMIUM PASSPORT CONFIGURATION
 * Hem admin hem user authentication
 * 
 * Features:
 * - Password hashing
 * - Secure session
 * - Audit logging
 * - Account lockout
 */

const LocalStrategy = require('passport-local').Strategy;
const { PasswordManager, AuditLogger, InputValidator } = require('../security-utils');

// ==================== ACCOUNT LOCKOUT SYSTEM ====================

class AccountLockout {
  constructor() {
    this.lockoutAttempts = {}; // { email: { count, lockedUntil } }
    this.MAX_ATTEMPTS = 5;
    this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 dakika
  }

  isLocked(email) {
    const lockData = this.lockoutAttempts[email];
    if (!lockData) return false;

    if (Date.now() > lockData.lockedUntil) {
      delete this.lockoutAttempts[email];
      return false;
    }

    return true;
  }

  recordFailedAttempt(email) {
    if (!this.lockoutAttempts[email]) {
      this.lockoutAttempts[email] = { count: 0, lockedUntil: 0 };
    }

    this.lockoutAttempts[email].count++;

    if (this.lockoutAttempts[email].count >= this.MAX_ATTEMPTS) {
      this.lockoutAttempts[email].lockedUntil = Date.now() + this.LOCKOUT_TIME;
      return true; // Locked
    }

    return false;
  }

  resetAttempts(email) {
    delete this.lockoutAttempts[email];
  }

  getRemainingTime(email) {
    const lockData = this.lockoutAttempts[email];
    if (!lockData) return 0;

    const remaining = lockData.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }
}

const accountLockout = new AccountLockout();

// ==================== PASSPORT STRATEGIES ====================

module.exports = function(passport) {
  // ==================== LOCAL STRATEGY ====================

  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'sifre',
        passReqToCallback: true // req'i strategy'e gönder
      },
      async (req, uyemail, password, done) => {
        try {
          // 🔐 Input validation
          const emailValidation = InputValidator.validateEmail(uyemail);
          if (!emailValidation.isValid) {
            return done(null, false, {
              message: 'Geçersiz email formatı'
            });
          }

          // 🔐 Account lockout check
          if (accountLockout.isLocked(uyemail)) {
            const remainingTime = accountLockout.getRemainingTime(uyemail);
            return done(null, false, {
              message: `Hesap kilitledi. ${remainingTime} saniye sonra deneyiniz.`
            });
          }

          // User bul
          const _bulunanuser = await uyelerModel.findOne({ uyemail });

          if (!_bulunanuser) {
            // 🔐 Account lockout
            accountLockout.recordFailedAttempt(uyemail);

            // 🔐 Audit log
            await AuditLogger.log({
              event: 'LOGIN_FAILED',
              userEmail: uyemail,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              status: 'FAILED',
              details: 'User not found'
            });

            return done(null, false, {
              message: 'Kullanıcı bulunamadı'
            });
          }

          // 🔐 Ban kontrol
          if (_bulunanuser.bandurumu === true) {
            await AuditLogger.log({
              event: 'LOGIN_BLOCKED',
              userId: _bulunanuser._id,
              userEmail: uyemail,
              ipAddress: req.ip,
              status: 'BLOCKED',
              details: 'User is banned'
            });

            return done(null, false, {
              message: 'Bu hesap kapatılmıştır'
            });
          }

          // Şifre kontrol
          const sifrekontrol = await PasswordManager.verifyPassword(
            password,
            _bulunanuser.uyesifre
          );

          if (!sifrekontrol) {
            // 🔐 Account lockout
            const isNowLocked = accountLockout.recordFailedAttempt(uyemail);

            // 🔐 Audit log
            await AuditLogger.log({
              event: 'LOGIN_FAILED',
              userId: _bulunanuser._id,
              userEmail: uyemail,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              status: 'FAILED',
              details: 'Wrong password'
            });

            return done(null, false, {
              message: isNowLocked
                ? `Çok fazla başarısız deneme. Hesap 15 dakika kilitledi.`
                : 'Şifre hatalı'
            });
          }

          // ✅ Login başarılı
          accountLockout.resetAttempts(uyemail);

          // 🔐 Audit log - success
          await AuditLogger.log({
            event: 'LOGIN_SUCCESS',
            userId: _bulunanuser._id,
            userEmail: uyemail,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            status: 'SUCCESS',
            details: `User logged in from ${req.get('user-agent')}`
          });

          return done(null, _bulunanuser);
        } catch (err) {
          console.error('🔐 Authentication error:', err);
          return done(err);
        }
      }
    )
  );

  // ==================== SERIALIZE USER ====================

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // ==================== DESERIALIZE USER ====================

  passport.deserializeUser(async function(id, done) {
    try {
      const user = await uyelerModel.findById(id).lean();

      if (!user) {
        return done(null, false);
      }

      // 🔐 FIXED: Correct field names
      const userData = {
        id: user._id,
        uyemail: user.uyemail,
        uyeadi: user.uyeadi,
        uyesoyad: user.uyesoyad,
        uyetel: user.uyetel, // ✅ FIXED: Was 'kullanicitel'
        admin: user.admin,
        uyeadres: user.uyeadres,
        uyeil: user.uyeil,
        uyeilce: user.uyeilce,
        postakodu: user.postakodu,
        bandurumu: user.bandurumu,
        uyekayittarihi: user.uyekayittarihi,
        jeton: user.jeton,
        uyebakiye: user.uyebakiye
      };

      done(null, userData);
    } catch (err) {
      console.error('🔐 Deserialization error:', err);
      done(err);
    }
  });
};

// ==================== EXPORT HELPERS ====================

module.exports.accountLockout = accountLockout;
