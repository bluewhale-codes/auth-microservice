const cloudinary = require("./cloudinary")

const uploadScript = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // IMPORTANT for pdf/txt
        folder: "scripts",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer); // send buffer
  });
};

module.exports = uploadScript;