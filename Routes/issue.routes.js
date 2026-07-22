const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

const {
  reportIssue,
  getIssueById,
  getMyIssues,
  updateIssueStatus,
} = require("../Controller/issue_controller");

// POST /api/v1/issues/report
router.post(
  "/report",
  authenticate,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  reportIssue
);

// GET /api/v1/issues/my-issues
router.get("/my-issues", authenticate, getMyIssues);

// GET /api/v1/issues/:issueId
router.get("/:issueId", authenticate, getIssueById);

// PATCH /api/v1/issues/:issueId/status
router.patch("/:issueId/status", authenticate, updateIssueStatus);

module.exports = router;