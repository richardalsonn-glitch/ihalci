module.exports = function () {
    
    require('../functions/middleware')(this); 
    app.use('/', require('../routers/home/index'));
    app.use('/', require('../routers/admin/index'));
}
router.get('/jeton-paketleri', async (req, res) => {
    res.render('home/pages/jeton-paketleri', {
        site,
        user: req.user || null,
        cuzdan: typeof cuzdan !== 'undefined' ? cuzdan : null,
        kategoriler: typeof kategoriler !== 'undefined' ? kategoriler : [],
        altkategoriler: typeof altkategoriler !== 'undefined' ? altkategoriler : []
    });
});

router.get('/jeton-paketleri/250-jeton', async (req, res) => {
    res.redirect('/jeton-paketleri');
});

router.get('/jeton-paketleri/500-jeton', async (req, res) => {
    res.redirect('/jeton-paketleri');
});

router.get('/jeton-paketleri/900-jeton', async (req, res) => {
    res.redirect('/jeton-paketleri');
});
