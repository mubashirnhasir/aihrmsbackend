const multer = require("multer")
const path = require("path")


const storage = multer.diskStorage({
    destination: function(req,res,cb){
        cb(null, "uploads")
    },
    filename: function (req,file,cb){
        const uniqueSuffix = Date.now() + path.extname(file.originalname)
        cb(null, uniqueSuffix)
    },
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG are allowed"), false);
    }
  };


const upload = multer({storage: storage, fileFilter: fileFilter});

module.exports = upload