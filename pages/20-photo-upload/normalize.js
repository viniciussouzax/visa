// ============================================================
// Photo Upload — Normalize
// Normalize raw form data → flat profile for photo upload page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for photo upload
 */
function normalizePhotoUpload(data, helpers) {
    const { g } = helpers;

    const photoSection = data.photoUpload || {};

    return {
        // Photo file path or URL (from Supabase Storage or local path)
        photoPath: photoSection.photo || null,
        // Whether photo upload is required (based on consulate)
        photoRequired: ['PTA', 'RCF'].includes(g(data, 'location.location')),
    };
}

module.exports = { normalizePhotoUpload };
