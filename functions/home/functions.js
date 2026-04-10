const { validationResult } = require("express-validator");
require('../home/passport')(passport);
const uyelik = require('../../database/uyeler');
const fs = require('fs');
const Cuzdan = require('../../database/cuzdan');
const Teklif = require('../../database/teklifler');
const urunler = require('../../database/urunler');
const yorum = require('../../database/yorumlar');
const ayarlar = require('../../routers/home/functions');

function startAuctionTimer() { 
  setInterval(async () => { 
    try {
      const suankiZaman = new Date();
      // Süresi dolmuş ve hâlâ aktif olan ihaleleri bul
      const ihaleDevamEdenUrunler = await urunler.find({ 
        ihalebitistarihi: { $lt: suankiZaman }, 
        ihaledurumu: true 
      });
      
      for (let i = 0; i < ihaleDevamEdenUrunler.length; i++) {
        const urun = ihaleDevamEdenUrunler[i];

        // En yüksek jeton teklifini bul (jetonMiktari alanına göre)
        const enYuksekTeklif = await Teklif.findOne({ urunId: urun._id, teklifdurum: true })
          .sort({ jetonMiktari: -1 })
          .exec();

        if (enYuksekTeklif) {
          await urunler.findByIdAndUpdate(urun._id, {
            kazananUyeId: enYuksekTeklif.uyeId,
            ihaledurumu: false
          }).exec();
          console.log('✅ İhale tamamlandı. Kazanan:', enYuksekTeklif.uyeId, '| Fiyat:', urun.anlikFiyat || urun.baslangicfiyati);
        } else {
          // Teklif gelmedi, ihaleyi kapat
          await urunler.findByIdAndUpdate(urun._id, { ihaledurumu: false }).exec();
          console.log('⚠️ İhale teklif gelmeden kapandı:', urun.urunadi);
        }
      }
    } catch (err) {
      console.log('Timer hatası:', err);
    }
  }, 5000); // 5 saniyede bir kontrol et (performans için 1000'den arttırıldı)
}

// İhale sürelerini kontrol etmek için zamanlayıcıyı başlat
startAuctionTimer();

let spamkontrol = {};

exports.yorumekle = async (req,res) =>{
  errors = validationResult(req);
  if(!errors.isEmpty()){
    const errormessage = errors.array().map(error => error.msg);
    return res.status(400).json({errors : errormessage});
  } 
  const kullanıcıId = req.body.uyeId;
  const urunId = req.body.urunId;

  if (spamkontrol[urunId] && spamkontrol[urunId].includes(kullanıcıId)) {
    return res.status(400).json({ message: 'Bu ürün için zaten bir değerlendirme yaptınız.' });
  }


  try{
    const existingYorum = await yorum.findOne({ uyeId: req.user.id, urunId: urunId });
    if (existingYorum) {
      return res.status(400).json({ errors: ['Bu ürün için zaten bir değerlendirme yaptınız.'] });
    }
     urundegerlendirme = new yorum({
      uyeyorum:req.body.yorumbilgisi,
      urunId:req.body.urunId,
      uyeId:req.user.id,
      degerlendirme:req.body.yildizbilgisi
     });
     
     await urundegerlendirme.save();
     
     res.status(200).json({success: ["Değerlendirme Başarıyla Eklendi"]});
  }catch(err){
    console.log(err);
  }
}


// Teklif ver — artık /api/teklif-ver endpoint'i kullanılıyor (routers.js içinde)
// Bu fonksiyon geriye dönük uyumluluk için burada bırakıldı
exports.teklifver = async (req, res) => {
    return res.status(400).json({ errors: ['Lütfen /api/teklif-ver endpoint\'ini kullanınız'] });
};


exports.urunkaydet = async (req,res,next) => {
    errors = validationResult(req);
 
    if(!errors.isEmpty()){
        const errormessage = errors.array().map(error => error.msg);
        res.status(400).json({erorrs: errormessage});
        return;
    };

    _urunbul = await urunler.findOne({urunadi:req.body.urunadi});

    if(_urunbul){
        res.status(400).json({errors: ["Bu Ürün Daha Önce Girilmiş İsmini Değiştirin Lütfen."]})
    }
    

    try{
  
                            let urunAdi = req.body.urunadi;

                    // Türkçe karakterleri silme
                    let url = urunAdi.replace(/ğ/g, 'g')
                    .replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u')
                    .replace(/Ü/g, 'U')
                    .replace(/ş/g, 's')
                    .replace(/Ş/g, 'S')
                    .replace(/ı/g, 'i')
                    .replace(/İ/g, 'I')
                    .replace(/ö/g, 'o')
                    .replace(/Ö/g, 'O')
                    .replace(/ç/g, 'c')
                    .replace(/Ç/g, 'C')
                    .replace(/[,\.]/g, ''); // Virgül ve noktaları silme

                    // Boşlukları tireye dönüştürme ve tüm karakterleri küçük harfe çevirme
                    url = url.replace(/\s+/g, '-')
                            .toLowerCase();

                    const urunlerim = new  urunler({
                        urunadi:req.body.urunadi,
                        kategoriId:req.body.urunkategori,
                        urunaciklamasi:req.body.urunaciklamasi,
                        urunetiketleri:req.body.urunanahtarkelimesi,
                        urunfiyati:req.body.urunfiyati,
                        baslangicfiyati:req.body.ihaleBaslangicFiyati,
                        hemenalfiyati:req.body.hemenalfiyati,
                        ihalebaslangictarihi:req.body.ihaleBaslangicTarihi,
                        ihalebitistarihi:req.body.ihaleBitisTarihi,
                        ihaleurl:url,
                        uyeId:req.body.kullaniciId
                       
                    }); 

        
        if (req.files && req.files.urungorsel) {
            const urungorselDosyaları = req.files.urungorsel;
            const urungorselSayısı = urungorselDosyaları.length;
          
            for (let i = 0; i < urungorselSayısı; i++) {
              const fieldName = `urungorsel${i + 1}`;
              const dosyaAdı = urungorselDosyaları[i].filename;
              urunlerim[fieldName] = dosyaAdı;
            }
          }

     await urunlerim.save();
     res.status(200).json({success: ["Ürün Başarıyla Kayıt Edilmiştir."]});
    }catch(err){ 
       console.log(err)
    }
}

exports.aramayap = async (req, res, next) => {
  try {
 
     const {Urunler, sites, kategorilerListesi, altKategorilerListesi, cuzdan, ozellikler} = await ayarlar.gizlisistem(req)
    // Diğer işlemler ve dönüş değeri
    res.render('home/pages/ara', { site: sites, kategoriler: kategorilerListesi,
      altkategoriler: altKategorilerListesi, cuzdan, Urunler, anasayfa:ozellikler });
  } catch (error) {
    console.error("Arama işlemi sırasında bir hata oluştu:", error);
    res.status(500).json({ error: "Arama işlemi sırasında bir hata oluştu." });
  }
};

exports.hesapdetay = async (req,res,next) => {
  errors = validationResult(req);
  if(!errors.isEmpty()){
    const errormessage = errors.array().map(error => error.msg);
    res.status(400).json({errors: errormessage});
    return
  };

  _kullanicibilgi = await uyelik.findOne({_id:req.user.id});
  _kullanicisifre = await bcrypt.compare(req.body.eskisifre, _kullanicibilgi.uyesifre);

  if(!_kullanicisifre){
    return res.status(400).json({errors: ['Şifreniz Hatalı Lütfen Doğru Şifre Giriniz']});  
    
  }
   let _kullaniciyenisifre = null;

  if(req.body.yenisifretekrar){
     _kullaniciyenisifre = await bcrypt.hash(req.body.yenisifretekrar, 10);

  }else{
     _kullaniciyenisifre = await bcrypt.hash(req.body.eskisifre, 10); 
  }
  const kullaniciguncel = {
    uyeadi:req.body.uyead,
    uyesoyad:req.body.uyesoyad,
    uyetel:req.body.uyetel,
    uyeadres:req.body.adres,
    uyeil:req.body.Iller,
    uyeilce:req.body.Ilceler,
    postakodu:req.body.postakodu,
    uyesifre:_kullaniciyenisifre
    
  }

 await uyelik.findByIdAndUpdate(req.user.id, kullaniciguncel);
 res.status(200).json({ success: "Tebrikler Bilgileriniz Güncellendi" });
}


exports.uyekayit =  async (req,res,next) => {
    errors = validationResult(req);
    if(!errors.isEmpty()){
      const errormessage = errors.array().map(error => error.msg);
      res.status(400).json({erorrs: errormessage});
      return;
        
    };

    try{

        _uyelikontrol = await uyelik.findOne({uyemail:req.body.emails});

        if(_uyelikontrol){
            return res.status(400).json({errors:'Bu Kullanıcı Kayıtlı'});
        }   

        const uyesifre = await bcrypt.hash(req.body.sifres, 10);

        const uyelikler = new  uyelik({
            uyeadi:req.body.ad,
            uyesoyad:req.body.soyad,
            uyemail:req.body.emails,
            uyetel:req.body.tel,
            uyesifre:uyesifre,
            admin:false,
            bandurumu:false
        });

        await uyelikler.save();

        const yeniCuzdan = new Cuzdan({
            uyeId:uyelikler._id,
            bakiye:0
        })

        await yeniCuzdan.save();
        res.status(200).json({success: "Kayıt Başarılı Tebrikler Giriş Yapabilirsiniz.."});

    }catch(err){
        console.log(err);
    }
}

exports.uyegiris = (req, res, next) => {
    errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map(error => error.msg);
        res.status(400).json({ errors: errorMessage });
        return;
    }

    passport.authenticate('local', {failureFlash:true, session:true, cookie:{maxAge:86400}}, function(err,kullanici,info){
        if (err) {
            res.status(400).json({ errors: ["Bir Hata Oluştu"] });
            return;
        }
        if (!kullanici) {

            console.log(kullanici);
            console.log(info.message); // Kullanıcı adı veya şifre hatalı mesajını kontrol et
            res.status(400).json({ errors: ["Kullanıcı Adınız Veya Şifreniz Hatalı"] });
            return;
        }
    
        req.login(kullanici,function(err){
            if(err){return next(err);}
            res.status(200).json({ success: "Giriş Başarılı Tebrikler Yönlendiriliyorsunuz" });
        });
    })(req,res,next);
};
