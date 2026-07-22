const pool = require("../config/db");
const ErrorHandler = require("../utils/errorhandler");

const { transaction } = require("../config/db");

const issueRepository = require("../repositories/issue.repository");
const userRepository = require("../repositories/user.repository");

const {
  validateIssueReport,
  validateImageFile,
  validateAudioFile,
} = require("../validators/issue.validator");

const { uploadIdCardImage } = require("./cloudinary.service");
const { uploadAudioToCloudinary } = require("./audioUpload.service");

const ALLOWED_ROLES = ["student", "faculty", "worker"];

// ═══════════════════════════════════════════════════════════════
// REPORT ISSUE
// ═══════════════════════════════════════════════════════════════
const reportIssue = async (req) => {
  // ─── STEP 1: Validate Bearer Token & Extract User ───
  const userId = req.user?.id;
  if (!userId) {
    throw new ErrorHandler("Authentication required. Invalid or missing token.", 401);
  }
  console.log(userId , "User ID");

  // ─── STEP 2: Verify User Exists & Security Checks ───
  const user = await userRepository.findUserById(userId);
  console.log(user , ": User");
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  console.log(!user.is_email_verified)
  if (!user.is_email_verified) {
    throw new ErrorHandler("Email not verified. Please verify your email before reporting issues.", 403);
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new ErrorHandler(`Role '${user.role}' is not authorized to report issues`, 403);
  }

  // if (user.is_suspended) {
  //   throw new ErrorHandler("Your account has been suspended. Contact administration.", 403);
  // }

  // ─── STEP 3: Validate Request Body ───
  const validatedBody = validateIssueReport(req.body);

  // ─── STEP 4: Validate Files ───
  const imageFile = req.files?.image?.[0];
  const audioFile = req.files?.audio?.[0];

  validateImageFile(imageFile);
  validateAudioFile(audioFile);

  // ─── STEP 5: Upload Image to Cloudinary (outside transaction) ───
  let imageResult = null;
  try {
    imageResult = await uploadIdCardImage(imageFile.buffer, "swachh-pu/issues");
  } catch (uploadError) {
    throw new ErrorHandler(`Image upload failed: ${uploadError.message}`, 500);
  }

  // ─── STEP 6: Upload Audio to Cloudinary (Optional, outside transaction) ───
  let audioResult = null;
  if (audioFile) {
    try {
      audioResult = await uploadAudioToCloudinary(audioFile.buffer, "swachh-pu/issues/audio");
    } catch (uploadError) {
      // Cleanup image upload if audio fails
      if (imageResult?.publicId) {
        try {
          await require("./cloudinary.service").deleteImageFromCloudinary(imageResult.publicId);
        } catch (cleanupError) {
          console.error("Failed to cleanup image after audio upload failure:", cleanupError.message);
        }
      }
      throw new ErrorHandler(`Audio upload failed: ${uploadError.message}`, 500);
    }
  }

  // ─── STEP 7: Create Issue Report in Database (inside transaction) ───
  return await transaction(async (client) => {
    const issueData = {
      reported_by: userId,
      image_url: imageResult.url,
      audio_url: audioResult?.url || null,
      issue_type: validatedBody.issue_type,
      description: validatedBody.description,
      latitude: validatedBody.latitude,
      longitude: validatedBody.longitude,
      block_id: validatedBody.block_id,
      floor_id: validatedBody.floor_id,
      room_id: validatedBody.room_id,
      status: "reported",
    };

    const createdIssue = await issueRepository.createIssueReport(client, issueData);

    return {
      id: createdIssue.id,
      issue_type: createdIssue.issue_type,
      status: createdIssue.status,
      created_at: createdIssue.created_at,
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// GET ISSUE BY ID
// ═══════════════════════════════════════════════════════════════
const getIssueById = async (issueId) => {
  const issue = await issueRepository.findIssueById(issueId);
  if (!issue) {
    throw new ErrorHandler("Issue not found", 404);
  }
  return issue;
};

// ═══════════════════════════════════════════════════════════════
// GET ISSUES BY USER (with pagination)
// ═══════════════════════════════════════════════════════════════
const getIssuesByUser = async (userId, limit = 20, offset = 0) => {
  const [issues, total] = await Promise.all([
    issueRepository.findIssuesByUser(userId, limit, offset),
    issueRepository.countIssuesByUser(userId),
  ]);

  return {
    issues,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + issues.length < total,
    },
  };
};

// ═══════════════════════════════════════════════════════════════
// UPDATE ISSUE STATUS
// ═══════════════════════════════════════════════════════════════
const updateIssueStatus = async (issueId, status, assignedWorkerId = null) => {
  return await transaction(async (client) => {
    const existingIssue = await issueRepository.findIssueById(client, issueId);
    if (!existingIssue) {
      throw new ErrorHandler("Issue not found", 404);
    }

    const updatedIssue = await issueRepository.updateIssueStatus(
      client,
      issueId,
      status,
      assignedWorkerId
    );

    return updatedIssue;
  });
};

module.exports = {
  reportIssue,
  getIssueById,
  getIssuesByUser,
  updateIssueStatus,
};