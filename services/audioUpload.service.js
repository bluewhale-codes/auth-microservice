const cloudinary = require('cloudinary').v2;
const streamifier = require("streamifier");

const uploadAudioToCloudinary = async (fileBuffer, folder = "swachh-pu/audio") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        format: "mp3",
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Audio upload failed: ${error.message}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const deleteAudioFromCloudinary = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "video" },
      (error, result) => {
        if (error) {
          return reject(new Error(`Audio deletion failed: ${error.message}`));
        }
        resolve(result);
      }
    );
  });
};

module.exports = {
  uploadAudioToCloudinary,
  deleteAudioFromCloudinary,
};