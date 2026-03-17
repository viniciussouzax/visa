/** 18-student-exchange — Informações SEVIS (F/J/M visas)
 * 
 * DS-160 oficial: SEVIS Information
 * URL: complete_ExchangeVisitorStudentVisa.aspx?node=ExchangeVisitor3
 * 
 * Comportamento condicional por tipo de visto:
 * 
 * F1-F1 (primary):
 *   - SEVIS ID: tbxSevisID (maxlen=11)
 *   - Nome da Escola: tbxNameOfSchool (maxlen=75)
 *   - Curso de Estudo: tbxSchoolCourseOfStudy (maxlen=66)
 *   - Endereço Linha 1: tbxSchoolStreetAddress1 (maxlen=40)
 *   - Endereço Linha 2: tbxSchoolStreetAddress2 (maxlen=40) *Optional
 *   - Cidade: tbxSchoolCity (maxlen=20)
 *   - Estado: ddlSchoolState
 *   - ZIP: tbxSchoolZIPCode (maxlen=10)
 * 
 * J1-J1 (primary):
 *   - SEVIS ID: tbxSevisID (maxlen=11)
 *   - Program Number: tbxProgram
 *   - Intend to Study: rblStudyQuestion (radio Y/N)
 *   - Campos de escola: SÓ se intendToStudy = Y
 * 
 * F2-CH/F2-SP (dependentes):
 *   - SEVIS ID: tbxSevisID (maxlen=11)
 *   - Principal Applicant SEVIS ID: tbxPrincipalSevisID (maxlen=11)
 * 
 * J2-CH/J2-SP (dependentes):
 *   - SEVIS ID: tbxSevisID (maxlen=11)
 *   - Principal Applicant SEVIS ID: tbxPrincipalSevisID (maxlen=11)
 *   - Program Number: tbxProgram
 * 
 * M1/M2: similar a F1/F2
 */
export default {
    id: "studentExchange",
    label: "Informações SEVIS",
    conditional: true,
    showWhen: {
        section: "travel",
        field: "purposeCategory",
        in: ["F", "J", "M"]
    },
    fields: [
        {
            id: "sevisId",
            label: "Número SEVIS",
            type: "text",
            required: true,
            maxLen: 11,
            uppercase: true,
            hint: "ex: N0123456789",
            ds160: "tbxSevisID"
        },
        {
            id: "programNumber",
            label: "Número do Programa",
            type: "text",
            required: true,
            uppercase: true,
            hint: "ex: G-7-12345",
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["J1-J1", "J2-CH", "J2-SP"]
            },
            ds160: "tbxProgram"
        },
        {
            id: "principalSevisId",
            label: "SEVIS ID do Requerente Principal",
            type: "text",
            required: true,
            maxLen: 11,
            uppercase: true,
            hint: "ex: N0123456789",
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F2-CH", "F2-SP", "J2-CH", "J2-SP", "M2"]
            },
            ds160: "tbxPrincipalSevisID"
        },
        {
            id: "intendToStudy",
            label: "Pretende estudar nos Estados Unidos?",
            type: "radio",
            required: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["J1-J1"]
            },
            ds160: "rblStudyQuestion"
        },
        {
            id: "schoolName",
            label: "Nome da Escola",
            type: "text",
            required: true,
            maxLen: 75,
            uppercase: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxNameOfSchool"
        },
        {
            id: "courseOfStudy",
            label: "Curso de Estudo",
            type: "text",
            required: true,
            maxLen: 66,
            uppercase: true,
            hint: "Para ensino médio: 'Academic' ou 'Vocational'. Para outros níveis: sua especialização.",
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxSchoolCourseOfStudy"
        },
        {
            id: "schoolAddress",
            label: "Endereço da Instituição (Linha 1)",
            type: "text",
            required: true,
            maxLen: 40,
            uppercase: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxSchoolStreetAddress1"
        },
        {
            id: "schoolAddress2",
            label: "Endereço da Instituição (Linha 2)",
            type: "text",
            required: false,
            maxLen: 40,
            uppercase: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxSchoolStreetAddress2"
        },
        {
            id: "schoolCity",
            label: "Cidade da Instituição",
            type: "text",
            required: true,
            maxLen: 20,
            uppercase: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxSchoolCity"
        },
        {
            id: "schoolState",
            label: "Estado",
            type: "select",
            required: true,
            optionsRef: "usStates",
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "ddlSchoolState"
        },
        {
            id: "schoolZip",
            label: "CEP (ZIP Code)",
            type: "text",
            required: true,
            maxLen: 10,
            hint: "ex: 12345 ou 12345-1234",
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            ds160: "tbxSchoolZIPCode"
        }
    ]
};
