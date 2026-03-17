// ============================================================
// Work/Education 2 — Previous employment, education
// Field map for 15-work-education-previous
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd2Map(a, ctx) {
    const map = [];

    // ===================================================================
    // WORK / EDUCATION 2 (Previous)
    // ===================================================================
    // Previous Employment (dtlPrevEmpl) — supports multiple entries
    // Pergunta: "Were you previously employed?" → Yes/No
    // Respostas: previousEmployment[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.hasPreviousEmployment && a.previousEmployment?.length > 0) {
      map.push({ pattern: /rblPreviouslyEmployed_0$/i, value: "", type: "click" });
    
      a.previousEmployment.forEach((prev, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dtlPrevEmpl", idx };
        const sd = prev.startDate || emptyDate;
        const ed = prev.endDate || emptyDate;
    
        map.push(
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerName$`, 'i'), value: prev.name || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerStreetAddress1$`, 'i'), value: prev.street1 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerStreetAddress2$`, 'i'), value: prev.street2 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerCity$`, 'i'), value: prev.city || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_STATE$`, 'i'), value: prev.state || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_POSTAL_CD$`, 'i'), value: prev.postalCode || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_DropDownList2$`, 'i'), value: prev.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerPhone$`, 'i'), value: ph(prev.phone), type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbJobTitle$`, 'i'), value: prev.jobTitle || "", type: "text", ...base },
        );
        // Supervisor
        if (prev.supervisor && prev.supervisor !== 'N/A') {
          map.push(
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbSupervisorSurname$`, 'i'), value: prev.supervisor || "", type: "text", ...base },
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbSupervisorGivenName$`, 'i'), value: prev.supervisorGivenName || "", type: "text", ...base },
          );
        } else {
          map.push(
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_cbxSupervisorSurname_NA$`, 'i'), value: "", type: "checkbox-check", ...base },
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_cbxSupervisorGivenName_NA$`, 'i'), value: "", type: "checkbox-check", ...base },
          );
        }
        map.push(
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateFromDay$`, 'i'), value: sd.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateFromMonth$`, 'i'), value: sd.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxEmpDateFromYear$`, 'i'), value: sd.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateToDay$`, 'i'), value: ed.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateToMonth$`, 'i'), value: ed.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxEmpDateToYear$`, 'i'), value: ed.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbDescribeDuties$`, 'i'), value: prev.duties || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblPreviouslyEmployed_1$/i, value: "", type: "click" });
    }
    
    // Education (dtlPrevEduc) — supports multiple entries
    // Pergunta: "Have you attended any educational institutions?" → Yes/No
    // Respostas: education[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.hasEducation && a.education?.length > 0) {
      map.push({ pattern: /rblOtherEduc_0$/i, value: "", type: "click" });
    
      a.education.forEach((edu, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dtlPrevEduc", idx };
        const sd = edu.startDate || emptyDate;
        const ed = edu.endDate || emptyDate;
    
        map.push(
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolName$`, 'i'), value: edu.name || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr1$`, 'i'), value: edu.street1 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr2$`, 'i'), value: edu.street2 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolCity$`, 'i'), value: edu.city || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_ADDR_STATE$`, 'i'), value: edu.state || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_POSTAL_CD$`, 'i'), value: edu.postalCode || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolCountry$`, 'i'), value: edu.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolCourseOfStudy$`, 'i'), value: edu.course || edu.courseOfStudy || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolFromDay$`, 'i'), value: sd.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolFromMonth$`, 'i'), value: sd.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolFromYear$`, 'i'), value: sd.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolToDay$`, 'i'), value: ed.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolToMonth$`, 'i'), value: ed.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolToYear$`, 'i'), value: ed.year || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblOtherEduc_1$/i, value: "", type: "click" });
    }

    return map;
}

module.exports = { buildWorkEd2Map };
