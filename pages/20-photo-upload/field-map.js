// ============================================================
// Photo Upload — Field map
// Handles photo upload via identix.state.gov for PTA/RCF consulates
// ============================================================
// DS-160 flow:
// 1. Main form → click "Upload Your Photo" button (ctl00_SiteContentPlaceHolder_btnUploadPhoto)
// 2. Redirects to identix.state.gov/qotw/Upload.aspx
// 3. Upload JPEG via file input (ctl00_cphMain_imageFileUpload)
// 4. Click "Upload Selected Photo" (ctl00_cphButtons_btnUpload)
// 5. Returns to "Confirm Photo" page
// 6. Click "Next: Confirm Photo" (ctl00_SiteContentPlaceHolder_UpdateButton3)
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context { page, embassy }
 * @returns {Array} Field map entries for photo upload
 */
function buildPhotoUploadMap(a, ctx) {
    // Photo upload is handled as a special page flow, not regular field filling.
    // The automation runner handles this via dedicated photo upload logic:
    //   1. Click the "Upload Your Photo" button on the main DS-160 page
    //   2. Handle the identix.state.gov upload form
    //   3. Return to DS-160 confirm photo page
    
    // Only required for consulates that require photo upload (PTA, RCF)
    if (!['PTA', 'RCF'].includes(ctx.embassy)) {
        return [];
    }

    return [
        {
            type: 'photo_upload',
            ds160ButtonId: 'ctl00_SiteContentPlaceHolder_btnUploadPhoto',
            identixFileInput: 'ctl00_cphMain_imageFileUpload',
            identixUploadButton: 'ctl00_cphButtons_btnUpload',
            identixCancelButton: 'ctl00_cphButtons_btnCancel',
            confirmNextButton: 'ctl00_SiteContentPlaceHolder_UpdateButton3',
            photoField: 'photoUpload.photo',
            maxSizeKb: 240,
            acceptFormat: 'image/jpeg'
        }
    ];
}

module.exports = { buildPhotoUploadMap };
