// ============================================================
// Work/Education 1 — Current occupation
// Field map for 14-work-education-current
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd1Map(a, ctx) {
    const map = [];
    const { emp } = ctx;

    // ===================================================================
    // WORK / EDUCATION 1 (Current)
    // ===================================================================
    map.push({ pattern: /ddlPresentOccupation$/i, value: a.occupationCode, type: "select" });
    
    // Occupation explanation (for "N" = Not Employed, "O" = Other)
    if (a.occupationCode === "N" || a.occupationCode === "O") {
      map.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || "", type: "text" });
    }
    
    if (emp && emp.name) {
      map.push(
        { pattern: /tbxEmpSchName$/i, value: emp.name, type: "text" },
        { pattern: /tbxEmpSchAddr1$/i, value: emp.street1, type: "text" },
        { pattern: /tbxEmpSchAddr2$/i, value: emp.street2 || "", type: "text" },
        { pattern: /tbxEmpSchCity$/i, value: emp.city, type: "text" },
        { pattern: /tbxEmpSchState$/i, value: emp.state || "", type: "text" },
        { pattern: /tbxWORK_EDUC_ADDR_STATE$/i, value: emp.state || "", type: "text" },
        { pattern: /tbxEmpSchPostalCd$/i, value: emp.postalCode || "", type: "text" },
        { pattern: /tbxWORK_EDUC_ADDR_POSTAL_CD$/i, value: emp.postalCode || "", type: "text" },
        { pattern: /ddlEmpSchCountry$/i, value: emp.country, type: "select-label" },
        { pattern: /tbxEmpSchPhone$/i, value: ph(emp.phone), type: "text" },
        { pattern: /tbxWORK_EDUC_TEL$/i, value: ph(emp.phone), type: "text" },
        { pattern: /tbxCURR_MONTHLY_SALARY$/i, value: emp.monthlyIncome, type: "text" },
        { pattern: /JobTitle|tbxDescribeDuties/i, value: emp.jobTitle || "", type: "text" },
      );
    
      // Supervisor in Current Employment
      if (emp.supervisorSurname) {
        map.push(
          { pattern: /SupervisorSurname/i, value: emp.supervisorSurname, type: "text" },
          { pattern: /SupervisorGivenName/i, value: emp.supervisorGivenName || "", type: "text" },
        );
      } else {
        map.push(
          { pattern: /SupervisorSurname.*_NA/i, value: "", type: "checkbox-check" },
          { pattern: /SupervisorGivenName.*_NA/i, value: "", type: "checkbox-check" },
        );
      }
    
      map.push(
        { pattern: /FormView1_ddlEmpDateFromDay$/i, value: emp.startDate?.day || "1", type: "select" },
        { pattern: /FormView1_ddlEmpDateFromMonth$/i, value: emp.startDate.month, type: "select" },
        { pattern: /FormView1_tbxEmpDateFromYear$/i, value: emp.startDate.year, type: "text" },
        { pattern: /FormView1_tbxDescribeDuties$/i, value: emp.duties || emp.jobTitle || "", type: "text" },
      );
    }

    return map;
}

module.exports = { buildWorkEd1Map };
