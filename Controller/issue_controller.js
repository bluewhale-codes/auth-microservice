const catchAsyncErrors = require("../middleware/catchAsyncError");
const issueService = require("../services/issue.service");

const reportIssue = catchAsyncErrors(async (req, res, next) => {
    
  const result = await issueService.reportIssue(req);

  res.status(201).json({
    success: true,
    message: "Issue reported successfully",
    data: result,
  });
});

const getIssueById = catchAsyncErrors(async (req, res, next) => {
  const { issueId } = req.params;
  const issue = await issueService.getIssueById(issueId);

  res.status(200).json({
    success: true,
    message: "Issue retrieved successfully",
    data: issue,
  });
});

const getMyIssues = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = parseInt(req.query.offset, 10) || 0;

  const result = await issueService.getIssuesByUser(userId, limit, offset);

  res.status(200).json({
    success: true,
    message: "Issues retrieved successfully",
    data: result.issues,
    pagination: result.pagination,
  });
});

const updateIssueStatus = catchAsyncErrors(async (req, res, next) => {
  const { issueId } = req.params;
  const { status, assigned_worker_id } = req.body;

  const result = await issueService.updateIssueStatus(issueId, status, assigned_worker_id);

  res.status(200).json({
    success: true,
    message: "Issue status updated successfully",
    data: result,
  });
});

module.exports = {
  reportIssue,
  getIssueById,
  getMyIssues,
  updateIssueStatus,
};