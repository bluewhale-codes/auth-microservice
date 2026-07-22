const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const ErrorHandler = require('../utils/errorhandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name:env.CLOUDINARY_CLOUD_NAME,
  api_key:env.CLOUDINARY_API_KEY,
  api_secret:env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadIdCardImage = async (fileBuffer, workerId) => {

  console.log("Inside the UploadIdCardImage");
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mysite',
        public_id: `worker_${workerId}_${Date.now()}`,
        resource_type: 'image',
        transformation: [{ width: 800, height: 600, crop: 'limit' }, { quality: 'auto:good' }]
      },
      (error, result) => {
        if (error) {
          reject(new ErrorHandler(ERROR_MESSAGES.UPLOAD_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );
     streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = { uploadIdCardImage };



// const uploadIdCardImage = async (fileBuffer, workerId) => {

//   console.log("Inside the UploadIdCardImage");
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder: "Avatars",
//         width: 150,
//         crop: "scale"
//       },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result);
//       }
//     );

//     streamifier.createReadStream(fileBuffer).pipe(stream);
//   });
// };