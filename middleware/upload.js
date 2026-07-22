const multer = require("multer");
const ErrorHandler = require("../utils/errorhandler");

const {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_AUDIO_SIZE,
} = require("../validators/issue.validator");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "image") {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorHandler(`Invalid image format '${file.mimetype}'. Allowed: jpg, jpeg, png, webp`, 400), false);
    }
  } else if (file.fieldname === "audio") {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorHandler(`Invalid audio format '${file.mimetype}'. Allowed: mp3, wav, m4a, aac`, 400), false);
    }
  } else {
    cb(new ErrorHandler(`Unexpected field: '${file.fieldname}'. Allowed: image, audio`, 400), false);
  }
};

const limits = {
  fileSize: Math.max(MAX_IMAGE_SIZE, MAX_AUDIO_SIZE),
  files: 2,
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;