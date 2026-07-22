const Joi = require("joi");

const ALLOWED_ISSUE_TYPES = ["garbage_waste", "water_leakage", "drainage_issue"];
const ALLOWED_IMAGE_TYPES = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/x-aac", "audio/ogg",
  "audio/opus",];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20 MB

const issueReportSchema = Joi.object({
  issue_type: Joi.string()
    .valid(...ALLOWED_ISSUE_TYPES)
    .required()
    .messages({
      "any.required": "Issue type is required",
      "any.only": `Issue type must be one of: ${ALLOWED_ISSUE_TYPES.join(", ")}`,
      "string.empty": "Issue type cannot be empty",
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      "any.required": "Description is required",
      "string.empty": "Description cannot be empty",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 1000 characters",
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "any.required": "Latitude is required",
      "number.base": "Latitude must be a number",
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "any.required": "Longitude is required",
      "number.base": "Longitude must be a number",
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
    }),

  block_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "any.required": "Block ID is required",
      "number.base": "Block ID must be a number",
      "number.integer": "Block ID must be an integer",
      "number.positive": "Block ID must be a positive integer",
    }),

  floor_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "any.required": "Floor ID is required",
      "number.base": "Floor ID must be a number",
      "number.integer": "Floor ID must be an integer",
      "number.positive": "Floor ID must be a positive integer",
    }),

  room_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "any.required": "Room ID is required",
      "number.base": "Room ID must be a number",
      "number.integer": "Room ID must be an integer",
      "number.positive": "Room ID must be a positive integer",
    }),
});

const validateIssueReport = (data) => {
  const { error, value } = issueReportSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    const err = new Error(messages);
    err.statusCode = 400;
    throw err;
  }

  return value;
};

const validateImageFile = (file) => {
  if (!file) {
    const err = new Error("Image is required");
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    const err = new Error(`Invalid image format. Allowed: jpg, jpeg, png, webp`);
    err.statusCode = 400;
    throw err;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    const err = new Error("Image size must not exceed 10 MB");
    err.statusCode = 400;
    throw err;
  }

  return true;
};

const validateAudioFile = (file) => {
  if (!file) return true;

  if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    const err = new Error(`Invalid audio format. Allowed: mp3, wav, m4a, aac`);
    err.statusCode = 400;
    throw err;
  }

  if (file.size > MAX_AUDIO_SIZE) {
    const err = new Error("Audio size must not exceed 20 MB");
    err.statusCode = 400;
    throw err;
  }

  return true;
};

module.exports = {
  validateIssueReport,
  validateImageFile,
  validateAudioFile,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_AUDIO_SIZE,
};