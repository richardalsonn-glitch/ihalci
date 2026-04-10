/**
 * Ana Router — tüm route'ları buradan bağla
 */
const ayarlar = require('./home/functions');

module.exports = function (app) {

    // Ana route dosyaları
    app.use('/', require('./home/index'));
    app.use('/', require('./admin/index'));

    // ── İHALE SAYFALAR ──────────────────────────────────────────

    app.get('/ihaleler', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const urunler = await urunModel.find({ ihaledurumu: true }).sort({ ihaleeklemetarihi: -1 });
            res.render('home/pages/ihaleler', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler, site: sites, anasayfa: ozellikler, baslik: 'Tüm İhaleler'
            });
        } catch (err) { console.error(err); res.redirect('/'); }
    });

    app.get('/canli-ihaleler', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const simdikiZaman = new Date();
            const urunler = await urunModel.find({
                ihaledurumu: true, ihaleBasladi: true,
                ihalebaslangictarihi: { $lte: simdikiZaman },
                ihalebitistarihi: { $gte: simdikiZaman }
            }).sort({ ihalebitistarihi: 1 });
            res.render('home/pages/canli-ihaleler', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler, site: sites, anasayfa: ozellikler, baslik: '🔴 Canlı İhaleler'
            });
        } catch (err) { console.error(err); res.redirect('/'); }
    });

    app.get('/yaklasan-ihaleler', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const simdikiZaman = new Date();
            const urunler = await urunModel.find({
                ihaledurumu: true, ihalebaslangictarihi: { $gt: simdikiZaman }
            }).sort({ ihalebaslangictarihi: 1 });
            res.render('home/pages/yaklasan-ihaleler', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler, site: sites, anasayfa: ozellikler, baslik: '⏳ Yaklaşan İhaleler'
            });
        } catch (err) { console.error(err); res.redirect('/'); }
    });

    app.get('/biten-ihaleler', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const urunler = await urunModel.find({ ihaledurumu: false })
                .populate('kazananUyeId', 'uyeadi uyesoyad').sort({ ihalebitistarihi: -1 }).limit(50);
            res.render('home/pages/biten-ihaleler', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler, site: sites, anasayfa: ozellikler, baslik: '✅ Biten İhaleler'
            });
        } catch (err) { console.error(err); res.redirect('/'); }
    });

    app.get('/kazananlar', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const urunler = await urunModel.find({ ihaledurumu: false, kazananUyeId: { $ne: null } })
                .populate('kazananUyeId', 'uyeadi uyesoyad').sort({ ihalebitistarihi: -1 }).limit(20);
            res.render('home/pages/kazananlar', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler, site: sites, anasayfa: ozellikler
            });
        } catch (err) { console.error(err); res.redirect('/'); }
    });

    app.get('/ihale/:url', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            const urunModel = require('../database/urunler');
            const teklifModel = require('../database/teklifler');
            const uyelerModel = require('../database/uyeler');

            const urun = await urunModel.findOne({ ihaleurl: req.params.url });
            if (!urun) return res.redirect('/404');

            const teklifler = await teklifModel.find({ urunId: urun._id })
                .populate('uyeId', 'uyeadi uyesoyad').sort({ eklenmetarihi: -1 }).limit(20);
            const sonTeklif = teklifler.length > 0 ? teklifler[0] : null;
            const teklifSayisi = await teklifModel.countDocuments({ urunId: urun._id });
            const katilimciSayisi = urun.katilimcilar ? urun.katilimcilar.length : 0;
            const simdikiZaman = new Date();
            const ihaleBitti = urun.ihalebitistarihi < simdikiZaman || !urun.ihaledurumu;
            const ihaleBaslamadi = !urun.ihaleBasladi && katilimciSayisi < (urun.minKatilimci || 10);

            let kazananUyeAdi = '';
            if (ihaleBitti && urun.kazananUyeId) {
                const kaz = await uyelerModel.findById(urun.kazananUyeId);
                if (kaz) kazananUyeAdi = kaz.uyeadi + ' ' + kaz.uyesoyad;
            }

            res.render('home/pages/ihale-detay', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urun, teklifler,
                sonTeklif, teklifSayisi, katilimciSayisi, ihaleBitti, ihaleBaslamadi,
                kazananUyeAdi, site: sites, anasayfa: ozellikler
            });
        } catch (err) { console.error(err); res.redirect('/404'); }
    });

    // ── JETON PAKETLERİ ─────────────────────────────────────────
    app.get('/jeton-paketleri', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            res.render('home/pages/jeton-paketleri', {
                user: req.user || null, cuzdan: cuzdan || null,
                kategoriler: kategorilerListesi || [], altkategoriler: altKategorilerListesi || [],
                site: sites, anasayfa: ozellikler
            });
        } catch (err) { res.redirect('/'); }
    });
    app.get('/jeton-paketleri/250-jeton', (req, res) => res.redirect('/bakiye?paket=250&jeton=250&fiyat=149.90'));
    app.get('/jeton-paketleri/500-jeton', (req, res) => res.redirect('/bakiye?paket=500&jeton=500&fiyat=249.90'));
    app.get('/jeton-paketleri/900-jeton', (req, res) => res.redirect('/bakiye?paket=900&jeton=900&fiyat=399.90'));

    // ── ÜRÜNLER ─────────────────────────────────────────────────
    app.get('/urunler', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler, urunler } = await ayarlar.tumfonksiyonlar(req);
            res.render('home/pages/ihaleler', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, urunler,
                site: sites, anasayfa: ozellikler, baslik: 'Tüm Ürünler'
            });
        } catch (err) { res.redirect('/'); }
    });

    // ── YARDIMCI SAYFALAR ────────────────────────────────────────
    app.get('/hakkimizda', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            res.render('home/pages/hakkimizda', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, site: sites, anasayfa: ozellikler
            });
        } catch (err) { res.redirect('/'); }
    });

    app.get('/iletisim', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            res.render('home/pages/iletisim', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, site: sites, anasayfa: ozellikler
            });
        } catch (err) { res.redirect('/'); }
    });

    app.get('/blog', async (req, res) => {
        try {
            const { kategorilerListesi, altKategorilerListesi, cuzdan, sites, ozellikler } = await ayarlar.tumfonksiyonlar(req);
            res.render('home/pages/blog', {
                user: req.user, kategoriler: kategorilerListesi,
                altkategoriler: altKategorilerListesi, cuzdan, site: sites, anasayfa: ozellikler
            });
        } catch (err) { res.redirect('/'); }
    });

    // ── API ENDPOİNTLERİ ─────────────────────────────────────────

    app.get('/api/jeton', async (req, res) => {
        try {
            const uyelerModel = require('../database/uyeler');
            if (!req.user || !req.user.id) return res.json({ success: true, bakiye: 0, jeton: 0 });
            const kullanici = await uyelerModel.findById(req.user.id).lean();
            if (!kullanici) return res.json({ success: true, bakiye: 0, jeton: 0 });
            return res.json({ success: true, bakiye: kullanici.uyebakiye || 0, jeton: kullanici.jeton || 0 });
        } catch (err) {
            return res.status(500).json({ success: false, bakiye: 0, jeton: 0 });
        }
    });

    // Canlı ihale polling API
    app.get('/api/ihale/:id', async (req, res) => {
        try {
            const urunModel = require('../database/urunler');
            const teklifModel = require('../database/teklifler');
            const urun = await urunModel.findById(req.params.id);
            if (!urun) return res.status(404).json({ success: false });

            const sonTeklif = await teklifModel.findOne({ urunId: urun._id, teklifdurum: true })
                .sort({ teklif: -1 }).populate('uyeId', 'uyeadi');
            const teklifSayisi = await teklifModel.countDocuments({ urunId: urun._id });
            const katilimciSayisi = urun.katilimcilar ? urun.katilimcilar.length : 0;
            const kalanSure = Math.max(0, new Date(urun.ihalebitistarihi) - new Date());

            res.json({
                success: true,
                anlikFiyat: urun.anlikFiyat || urun.baslangicfiyati || 1,
                sonTeklif: sonTeklif ? {
                    teklif: sonTeklif.teklif,
                    jetonMiktari: sonTeklif.jetonMiktari,
                    uyeAdi: sonTeklif.uyeId ? (sonTeklif.uyeId.uyeadi.substring(0, 3) + '***') : '---'
                } : null,
                teklifSayisi,
                katilimciSayisi,
                minKatilimci: urun.minKatilimci || 10,
                ihaleBasladi: urun.ihaleBasladi || false,
                kalanSure,
                ihaledurumu: urun.ihaledurumu
            });
        } catch (err) { res.status(500).json({ success: false }); }
    });

    // İhaleye katıl (giriş ücreti jeton öde)
    app.post('/api/ihale-katil', async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ errors: ['Giriş yapmanız gerekiyor'] });
            const urunModel = require('../database/urunler');
            const uyelerModel = require('../database/uyeler');
            const { urunId } = req.body;
            const uyeId = req.user.id;

            const urun = await urunModel.findById(urunId);
            if (!urun) return res.status(404).json({ errors: ['Ürün bulunamadı'] });
            if (!urun.ihaledurumu) return res.status(400).json({ errors: ['Bu ihale aktif değil'] });

            // Zaten katılmış mı?
            if (urun.katilimcilar && urun.katilimcilar.map(k => k.toString()).includes(uyeId.toString())) {
                return res.json({ success: true, message: 'Zaten katılımcısınız' });
            }

            // Jeton kontrolü
            const kullanici = await uyelerModel.findById(uyeId);
            const minJeton = urun.minimumJeton || 300;
            if (!kullanici || kullanici.jeton < minJeton) {
                return res.status(400).json({ errors: [`Bu ihaleye giriş için en az ${minJeton} jeton gerekiyor. Jetonunuz: ${kullanici ? kullanici.jeton : 0}`] });
            }

            // Jetonu düş, katılımcıya ekle
            await uyelerModel.findByIdAndUpdate(uyeId, { $inc: { jeton: -minJeton } });
            await urunModel.findByIdAndUpdate(urunId, { $addToSet: { katilimcilar: uyeId } });

            // 10 kişi doldu mu?
            const guncelUrun = await urunModel.findById(urunId);
            if (!guncelUrun.ihaleBasladi && guncelUrun.katilimcilar.length >= (guncelUrun.minKatilimci || 10)) {
                await urunModel.findByIdAndUpdate(urunId, { ihaleBasladi: true });
            }

            const guncelKullanici = await uyelerModel.findById(uyeId);
            res.json({
                success: true,
                message: `İhaleye katıldınız! ${minJeton} jeton harcandı. Kalan: ${guncelKullanici.jeton}`,
                kalanJeton: guncelKullanici.jeton,
                katilimciSayisi: guncelUrun.katilimcilar.length,
                ihaleBasladi: guncelUrun.ihaleBasladi
            });
        } catch (err) { console.error(err); res.status(500).json({ errors: ['Sunucu hatası'] }); }
    });

    // Teklif ver (jetonla)
    app.post('/api/teklif-ver', async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ errors: ['Giriş yapmanız gerekiyor'] });
            const urunModel = require('../database/urunler');
            const teklifModel = require('../database/teklifler');
            const uyelerModel = require('../database/uyeler');
            const { urunId, jetonMiktari } = req.body;
            const uyeId = req.user.id;

            const jeton = parseInt(jetonMiktari);
            if (!jeton || isNaN(jeton) || jeton < 1) return res.status(400).json({ errors: ['Geçerli jeton miktarı giriniz'] });

            const urun = await urunModel.findById(urunId);
            if (!urun) return res.status(404).json({ errors: ['Ürün bulunamadı'] });
            if (!urun.ihaledurumu) return res.status(400).json({ errors: ['İhale aktif değil'] });

            const simdikiZaman = new Date();
            if (new Date(urun.ihalebitistarihi) < simdikiZaman) return res.status(400).json({ errors: ['İhale sona erdi'] });
            if (!urun.ihaleBasladi) return res.status(400).json({ errors: [`İhale henüz başlamadı. En az ${urun.minKatilimci || 10} katılımcı gerekiyor.`] });

            // Katılımcı mı?
            if (!urun.katilimcilar || !urun.katilimcilar.map(k => k.toString()).includes(uyeId.toString())) {
                return res.status(400).json({ errors: ['Önce ihaleye katılmanız gerekiyor'] });
            }

            const kullanici = await uyelerModel.findById(uyeId);
            if (!kullanici || kullanici.jeton < jeton) {
                return res.status(400).json({ errors: [`Yetersiz jeton. Mevcut: ${kullanici ? kullanici.jeton : 0}`] });
            }

            const sonTeklif = await teklifModel.findOne({ urunId, teklifdurum: true }).sort({ teklif: -1 });

            if (sonTeklif && sonTeklif.uyeId.toString() === uyeId.toString()) {
                return res.status(400).json({ errors: ['Başkası teklif vermeden tekrar teklif veremezsiniz'] });
            }
            if (sonTeklif && jeton <= sonTeklif.jetonMiktari) {
                return res.status(400).json({ errors: [`Teklifiniz mevcut en yüksek tekliften (${sonTeklif.jetonMiktari} jeton) yüksek olmalı`] });
            }

            // Fiyat hesapla: her teklif max +10 TL
            const maxArtis = urun.maxFiyatArtis || 10;
            const eskiFiyat = urun.anlikFiyat || urun.baslangicfiyati || 1;
            const yeniFiyat = eskiFiyat + maxArtis;

            // Eski teklifçiye jetonu geri ver
            if (sonTeklif) {
                await uyelerModel.findByIdAndUpdate(sonTeklif.uyeId, { $inc: { jeton: sonTeklif.jetonMiktari } });
                await teklifModel.findByIdAndUpdate(sonTeklif._id, { teklifdurum: false });
            }

            // Jetondan düş
            await uyelerModel.findByIdAndUpdate(uyeId, { $inc: { jeton: -jeton } });

            // Teklif kaydet
            const yeniTeklif = new teklifModel({
                teklif: yeniFiyat, jetonMiktari: jeton,
                uyeId, urunId, teklifdurum: true, tekrarteklif: true
            });
            await yeniTeklif.save();

            // Fiyatı güncelle, son 10 saniye uzatma
            const updateData = { anlikFiyat: yeniFiyat };
            const kalanSure = new Date(urun.ihalebitistarihi) - simdikiZaman;
            if (kalanSure <= 10000) {
                updateData.ihalebitistarihi = new Date(new Date(urun.ihalebitistarihi).getTime() + 10000);
            }
            await urunModel.findByIdAndUpdate(urunId, updateData);

            const guncelKullanici = await uyelerModel.findById(uyeId);
            res.json({
                success: true,
                message: `Teklif verildi! Yeni fiyat: ${yeniFiyat} TL`,
                yeniFiyat, kalanJeton: guncelKullanici.jeton
            });
        } catch (err) { console.error(err); res.status(500).json({ errors: ['Sunucu hatası'] }); }
    });

};
