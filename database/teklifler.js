const teklifler = new Schema({
    teklif:{type:Number},           // TL cinsinden anlık fiyat
    jetonMiktari:{type:Number},     // bu teklifte harcanan jeton
    uyeId: { type: Schema.Types.ObjectId, ref: 'uyeler' },
    urunId:{type:mongoose.Schema.Types.ObjectId, required:true },
    teklifdurum:{type:Boolean, default:true},
    tekrarteklif:{type:Boolean, default:true},
    eklenmetarihi: { type: String, default: moment().format('YYYY-MM-DD HH:mm:ss') }
}, {collection:'teklifler'});

module.exports = mongoDB.model('teklifler', teklifler);
