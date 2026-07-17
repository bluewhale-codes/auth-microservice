exports.validateFiles = (req, res, next) => {
  // 🔹 check thumbnail
  if (!req.files || !req.files.thumbnail) {
    return res.status(400).json({
      message: "Thumbnail image is required"
    });
  }

  // 🔹 check video
  if (!req.files.video) {
    return res.status(400).json({
      message: "Video file is required"
    });
  }

  const image = req.files.thumbnail[0];
  const video = req.files.video[0];

  // ✅ Image type check
  if (!image.mimetype.startsWith("image/")) {
    return res.status(400).json({
      message: "Thumbnail must be an image"
    });
  }

  // ✅ Video type check
  if (!video.mimetype.startsWith("video/")) {
    return res.status(400).json({
      message: "File must be a video"
    });
  }

  // ✅ size check (example: 5MB image, 50MB video)
  if (image.size > 5 * 1024 * 1024) {
    return res.status(400).json({
      message: "Image too large (max 5MB)"
    });
  }

  if (video.size > 50 * 1024 * 1024) {
    return res.status(400).json({
      message: "Video too large (max 50MB)"
    });
  }

  next();
};