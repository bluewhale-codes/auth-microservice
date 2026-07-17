const {body} = require("express-validator");

exports.validatePortfolioWork = [

  // 🔹 Strings
  body("title")
    .notEmpty().withMessage("Title is required")
    .isString().withMessage("Title must be a string"),

  body("description")
    .notEmpty().withMessage("Description is required"),

  body("voiceCategory")
    .notEmpty().withMessage("Voice category is required"),

  body("clientName")
    .notEmpty().withMessage("Client name is required"),

  body("clientFeedback")
    .optional()
    .isString().withMessage("Feedback must be string"),

  
  // 🔹 Arrays
  body("languages")
    .isArray({ min: 1 })
    .withMessage("Languages must be a non-empty array"),

  body("voiceStyles")
    .isArray({ min: 1 })
    .withMessage("Voice styles must be a non-empty array"),

  // 🔹 Boolean
  body("isPublic")
    .isBoolean()
    .withMessage("isPublic must be boolean"),

  // 🔹 Number
  body("rating")
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5"),

  // 🔹 Date
  body("completionDate")
    .isISO8601()
    .withMessage("Invalid date format (YYYY-MM-DD)")

];