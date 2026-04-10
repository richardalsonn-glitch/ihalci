const bakiyesiparis = new Schema({
    bakiye:{type:String},
    bakiyedurum:{type:Boolean, default:false},
    uyeId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'uyeler',
    }
}, {collection:'bakiye'});

module.exports = mongoDB.model('bakiye', bakiyesiparis);
