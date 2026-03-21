const APPLICANT_ACTIVE_STATUS = 'doing';
const APPLICANT_IMMEDIATE_DISPATCH_STATUSES = Object.freeze(['todo', 'retry']);
const APPLICANT_CLAIMABLE_STATUSES = Object.freeze(['todo', 'retry', 'standby']);
const APPLICANT_BLOCKING_STATUSES = Object.freeze(['error', 'fail', 'done']);
const STANDBY_COOLDOWN_SECONDS = 30 * 60;
const STANDBY_COOLDOWN_MS = STANDBY_COOLDOWN_SECONDS * 1000;

function isStandbyEligible(updatedAt, now = Date.now()) {
    if (!updatedAt) return false;
    const timestamp = new Date(updatedAt).getTime();
    if (!Number.isFinite(timestamp)) return false;
    return timestamp <= (now - STANDBY_COOLDOWN_MS);
}

module.exports = {
    APPLICANT_ACTIVE_STATUS,
    APPLICANT_IMMEDIATE_DISPATCH_STATUSES,
    APPLICANT_CLAIMABLE_STATUSES,
    APPLICANT_BLOCKING_STATUSES,
    STANDBY_COOLDOWN_SECONDS,
    STANDBY_COOLDOWN_MS,
    isStandbyEligible,
};
