module.exports = function () {

    require('../functions/middleware')(this);

    app.use('/', require('../routers/home/index'));
    app.use('/', require('../routers/admin/index'));

    app.get('/jeton-paketleri', async (req, res) => {
        res.render('home/pages/jeton-paketleri', {
            site: typeof site !== 'undefined' ? site : {
                site: {
                    baslik: 'İhale Sende',
                    aciklama: '',
                    anahtar: '',
                    favicon: ''
                }
            },
            user: typeof req.user !== 'undefined' ? req.user : null,
            cuzdan: typeof cuzdan !== 'undefined' ? cuzdan : null,
            kategoriler: typeof kategoriler !== 'undefined' ? kategoriler : [],
            altkategoriler: typeof altkategoriler !== 'undefined' ? altkategoriler : []
        });
    });

    app.get('/jeton-paketleri/250-jeton', async (req, res) => {
        res.redirect('/bakiye?paket=250&jeton=250&fiyat=149.90');
    });

    app.get('/jeton-paketleri/500-jeton', async (req, res) => {
        res.redirect('/bakiye?paket=500&jeton=500&fiyat=249.90');
    });

    app.get('/jeton-paketleri/900-jeton', async (req, res) => {
        res.redirect('/bakiye?paket=900&jeton=900&fiyat=399.90');
    });

    app.get('/api/jeton', async (req, res) => {
        try {
            let aktifKullanici = null;

            const sessionUserId =
                req.session?.userId ||
                req.session?.userid ||
                req.session?.uyeid ||
                req.session?.user?._id ||
                null;

            const sessionEmail =
                req.session?.uyemail ||
                req.session?.email ||
                req.session?.user?.uyemail ||
                req.session?.user?.email ||
                null;

            if (sessionUserId) {
                aktifKullanici = await uyelerModel.findById(sessionUserId).lean();
            }

            if (!aktifKullanici && sessionEmail) {
                aktifKullanici = await uyelerModel.findOne({ uyemail: sessionEmail }).lean();
            }

            if (!aktifKullanici && req.user && req.user._id) {
                aktifKullanici = await uyelerModel.findById(req.user._id).lean();
            }

            if (!aktifKullanici) {
                return res.json({
                    success: true,
                    bakiye: 0,
                    jeton: 0
                });
            }

            return res.json({
                success: true,
                bakiye: aktifKullanici.uyebakiye || 0,
                jeton: aktifKullanici.jeton || 0
            });

        } catch (err) {
            console.log('API JETON HATASI:', err);
            return res.status(500).json({
                success: false,
                bakiye: 0,
                jeton: 0
            });
        }
    });

}
