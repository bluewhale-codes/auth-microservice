const streamifier = require("streamifier");
const cloudinary = require("./cloudinary");


const uploadImage = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "Avatars",
        width: 150,
        crop: "scale"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};
module.exports = uploadImage;