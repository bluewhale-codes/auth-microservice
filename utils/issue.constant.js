const ISSUE_TYPES = {
  GARBAGE_WASTE: "garbage_waste",
  WATER_LEAKAGE: "water_leakage",
  DRAINAGE_ISSUE: "drainage_issue",
};

const ALLOWED_ISSUE_TYPES = Object.values(ISSUE_TYPES);

const ISSUE_STATUSES = {
  REPORTED: "reported",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  REJECTED: "rejected",
};

const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024,
  AUDIO_MAX_SIZE: 20 * 1024 * 1024,
};

const REPORTER_ROLES = ["student", "faculty", "worker"];

module.exports = {
  ISSUE_TYPES,
  ALLOWED_ISSUE_TYPES,
  ISSUE_STATUSES,
  FILE_LIMITS,
  REPORTER_ROLES,
};