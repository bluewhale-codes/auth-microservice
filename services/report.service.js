/**
 * Report Service Layer
 * 
 * Contains all business logic for report operations.
 * Validates inputs, applies role-based access rules,
 * orchestrates repository calls, and computes pagination metadata.
 */

const reportRepository = require('../repositories/report.repository');
const { ErrorHandler } = require('../utils/errorHandler');

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const ALLOWED_ROLES = ['student', 'faculty', 'worker'];
const ALLOWED_STATUSES = ['reported', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
const ALLOWED_ISSUE_TYPES = ['garbage_waste', 'water_leakage', 'drainage_issue'];

// ─── Validation Helpers ──────────────────────────────────────────────────────

const validatePagination = (page, limit) => {
  let parsedPage = parseInt(page, 10);
  let parsedLimit = parseInt(limit, 10);

  if (isNaN(parsedPage) || parsedPage < 1) parsedPage = DEFAULT_PAGE;
  if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = DEFAULT_LIMIT;
  if (parsedLimit > MAX_LIMIT) parsedLimit = MAX_LIMIT;

  const offset = (parsedPage - 1) * parsedLimit;
  return { page: parsedPage, limit: parsedLimit, offset };
};

const validateStatus = (status) => {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  return ALLOWED_STATUSES.includes(normalized) ? normalized : null;
};

const validateIssueType = (issueType) => {
  if (!issueType) return null;
  const normalized = String(issueType).trim().toLowerCase();
  return ALLOWED_ISSUE_TYPES.includes(normalized) ? normalized : null;
};

const isValidRole = (role) => ALLOWED_ROLES.includes(role);

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Fetch paginated reports based on user role
 * @param {Object} user - Authenticated user { id, role }
 * @param {Object} queryParams - Raw query parameters from request
 * @returns {Promise<Object>} Standardized success response
 */

module.exports = { validatePagination,
validateStatus,
validateIssueType,
isValidRole, };