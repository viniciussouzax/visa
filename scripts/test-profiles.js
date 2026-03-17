// ============================================================
// DS-160 Test Profiles — Todos os caminhos possíveis
// Cada perfil exercita um conjunto diferente de condicionais
// ============================================================

// ── Base mínima (usada como template) ──
const BASE = {
    location: "RCF",
    securityAnswer: "TESTPASSWORD",
    personal1: {
        surname: "TESTSILVA", givenName: "MARCOS",
        fullNameNative: "MARCOS TESTSILVA",
        otherNamesUsed: "N", otherNames: [],
        telecode: "N", sex: "M", maritalStatus: "S",
        dob: { day: "15", month: "JUN", year: "1990" },
        cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
    },
    personal2: {
        nationality: "BRAZIL", otherNationality: "N",
        otherNationalities: [], permanentResident: "N",
        permanentResidentCountries: [],
        nationalId: "12345678901", ssn: "DNA", taxId: "DNA"
    },
    addressPhone: {
        homeAddress: {
            street1: "RUA TESTE 123", street2: "", city: "SAO PAULO",
            state: "SP", country: "BRAZIL", postalCode: "01234567"
        },
        mailingAddressSame: "Y", phone: "11987654321",
        mobilePhone: "DNA", businessPhone: "DNA",
        email: "test@test.com",
        additionalPhones: "N", additionalEmails: "N",
        socialMedia: [{ platform: "INST", handle: "@testhandle" }],
        additionalSocialMedia: "N"
    },
    passport: {
        type: "R", number: "BR1234567", bookNumber: "DNA",
        issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SP",
        issuedCountry: "BRAZIL",
        issuanceDate: { day: "10", month: "JAN", year: "2020" },
        expirationDate: { day: "10", month: "JAN", year: "2030" },
        lostOrStolen: "N", lostPassports: []
    },
    travel: {
        purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
        hasSpecificPlans: "N",
        nonSpecificArrival: { day: "15", month: "MAR", year: "2027" },
        lengthOfStay: "14", lengthOfStayUnit: "D",
        usAddress: { street1: "123 MAIN ST", street2: "", city: "ORLANDO", state: "FL", zip: "32801" },
        whoIsPaying: "SELF"
    },
    travelCompanions: { travelingWithOthers: "N", companions: [], partOfGroup: "N" },
    previousUSTravel: {
        hasBeenInUS: "N", hasDriversLicense: "N",
        hasUSVisa: "N", visaRefused: "N", immigrantPetition: "N"
    },
    usContact: {
        surname: "DNA", givenName: "DNA", nameDoNotKnow: true,
        organization: "HOTEL TEST", orgDoNotKnow: false,
        relationship: "O",
        address: { street1: "456 TEST ST", city: "ORLANDO", state: "FL", zip: "32801" },
        phone: "4075551234", email: "DNA"
    },
    family1: {
        father: {
            surname: "TESTSILVA", givenName: "JOSE",
            dob: { day: "20", month: "MAR", year: "1960" }, inUS: "N"
        },
        mother: {
            surname: "TESTOLIVEIRA", givenName: "MARIA",
            dob: { day: "15", month: "DEC", year: "1962" }, inUS: "N"
        },
        immediateRelativesInUS: "N", otherRelativesInUS: "N"
    },
    family2: {},
    workEducation1: { occupation: "N" },
    workEducation2: { hasPreviousEmployment: "N", hasEducation: "N" },
    workEducation3: {
        languages: ["PORTUGUESE"], clanTribe: "N",
        countriesVisited: "N", organizationMember: "N",
        specializedSkills: "N", militaryService: "N", insurgentOrg: "N"
    },
    security: {
        disease: "N", disorder: "N", drugUser: "N",
        arrested: "N", controlledSubstances: "N", prostitution: "N",
        moneyLaundering: "N", humanTrafficking: "N",
        assistedSevereTrafficking: "N", humanTraffickingRelated: "N",
        illegalActivity: "N", terroristActivity: "N",
        terroristSupport: "N", terroristOrg: "N", terroristRel: "N",
        genocide: "N", torture: "N", exViolence: "N",
        childSoldier: "N", religiousFreedom: "N",
        populationControls: "N", transplant: "N",
        removalHearing: "N", immigrationFraud: "N",
        failToAttend: "N", visaViolation: "N", deport: "N",
        childCustody: "N", votingViolation: "N",
        renounceExp: "N", attWoReimb: "N"
    }
};

// Helper: deep merge
function merge(base, override) {
    const result = JSON.parse(JSON.stringify(base));
    for (const [key, val] of Object.entries(override)) {
        if (val && typeof val === 'object' && !Array.isArray(val) && result[key] && typeof result[key] === 'object') {
            result[key] = merge(result[key], val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

// ============================================================
// PERFIS DE TESTE
// ============================================================

const PROFILES = {

    // ── 1. CAMINHO MÍNIMO: Solteiro, sem extras ──
    // Condicionais: tudo "N" ou vazio
    'minimal-single': {
        description: 'Solteiro, sem other names, sem extras, self-paying, never been in US',
        branches: [
            'otherNamesUsed=N', 'telecode=N', 'otherNationality=N', 'permanentResident=N',
            'ssn=DNA→checkbox', 'taxId=DNA→checkbox', 'hasSpecificPlans=N',
            'whoIsPaying=SELF', 'travelingWithOthers=N', 'hasBeenInUS=N', 'hasUSVisa=N',
            'visaRefused=N', 'immigrantPetition=N', 'mailingAddressSame=Y',
            'mobilePhone=DNA→checkbox', 'businessPhone=DNA→checkbox',
            'lostOrStolen=N', 'bookNumber=DNA→checkbox', 'nameDoNotKnow=true',
            'immediateRelativesInUS=N', 'otherRelativesInUS=N',
            'occupation=N→notEmployed', 'hasPreviousEmployment=N', 'hasEducation=N',
            'clanTribe=N', 'countriesVisited=N', 'organizationMember=N',
            'specializedSkills=N', 'militaryService=N', 'insurgentOrg=N',
            'allSecurity=N'
        ],
        data: BASE
    },

    // ── 2. OTHER NAMES + TELECODE ──
    'other-names-telecode': {
        description: 'Has other names (2 entries) + telecode enabled',
        branches: ['otherNamesUsed=Y', 'otherNames.length=2→AddAnother', 'telecode=Y'],
        data: merge(BASE, {
            personal1: {
                otherNamesUsed: "Y",
                otherNames: [
                    { surname: "SOUZA", givenName: "VINICIUS" },
                    { surname: "COSTA", givenName: "MARCOS" }
                ],
                telecode: "Y",
                telecodeSurname: "1234",
                telecodeGivenName: "5678"
            }
        })
    },

    // ── 3. CASADO com cônjuge ──
    'married-with-spouse': {
        description: 'Married with spouse (Family2 page), US Contact known',
        branches: [
            'maritalStatus=M→Family2Active', 'spouse.addressType=H',
            'nameDoNotKnow=false→fillContact', 'orgDoNotKnow=false→fillOrg'
        ],
        data: merge(BASE, {
            personal1: { maritalStatus: "M" },
            family2: {
                surname: "COSTA", givenName: "JULIANA",
                nationality: "BRAZIL", cityOfBirth: "RIO DE JANEIRO",
                countryOfBirth: "BRAZIL", addressType: "H"
            },
            usContact: {
                surname: "SMITH", givenName: "JOHN", nameDoNotKnow: false,
                organization: "ABC COMPANY", orgDoNotKnow: false,
                relationship: "F",
                address: { street1: "789 OAK AVE", city: "MIAMI", state: "FL", zip: "33101" },
                phone: "3055551234", email: "john@test.com"
            }
        })
    },

    // ── 4. CASADO com endereço do cônjuge (addressType="O") ──
    'married-spouse-other-address': {
        description: 'Married, spouse lives at different address (addressType=O triggers address fields)',
        branches: ['maritalStatus=M', 'spouse.addressType=O→addressFields'],
        data: merge(BASE, {
            personal1: { maritalStatus: "M" },
            family2: {
                surname: "FERREIRA", givenName: "ANA",
                nationality: "BRAZIL", cityOfBirth: "CURITIBA",
                countryOfBirth: "BRAZIL", addressType: "O",
                address: {
                    street1: "OUTRA RUA 100", street2: "APTO 5",
                    city: "CURITIBA", state: "PR", postalCode: "80000000", country: "BRAZIL"
                }
            }
        })
    },

    // ── 5. DIVORCIADO com ex-cônjuges (PrevSpouse page) ──
    'divorced-prev-spouses': {
        description: 'Divorced with 2 previous spouses (DListSpouse AddAnother)',
        branches: ['maritalStatus=D→PrevSpousePage', 'prevSpouse.spouses.length=2→AddAnother'],
        data: merge(BASE, {
            personal1: { maritalStatus: "D" },
            prevSpouse: {
                numberOfPrevious: "2",
                spouses: [
                    {
                        surname: "SANTOS", givenName: "CARLA",
                        dob: { day: "01", month: "MAR", year: "1988" },
                        nationality: "BRAZIL", cityOfBirth: "RECIFE", countryOfBirth: "BRAZIL",
                        dateOfMarriage: { day: "15", month: "JUN", year: "2012" },
                        dateMarriageEnded: { day: "20", month: "DEC", year: "2016" },
                        howEnded: "DIVORCE", countryTerminated: "BRAZIL"
                    },
                    {
                        surname: "LIMA", givenName: "PATRICIA",
                        dob: { day: "10", month: "JUL", year: "1991" },
                        nationality: "PORTUGAL", cityOfBirth: "LISBON", countryOfBirth: "PORTUGAL",
                        dateOfMarriage: { day: "01", month: "FEB", year: "2018" },
                        dateMarriageEnded: { day: "30", month: "SEP", year: "2022" },
                        howEnded: "DIVORCE", countryTerminated: "PORTUGAL"
                    }
                ]
            }
        })
    },

    // ── 6. VIÚVO com cônjuge falecido + city unknown ──
    'widowed-deceased-spouse': {
        description: 'Widowed with deceased spouse (DeceasedSpouse page), cityOfBirth unknown',
        branches: ['maritalStatus=W→DeceasedSpousePage', 'deceasedSpouse.cityOfBirth=DNA→checkbox'],
        data: merge(BASE, {
            personal1: { maritalStatus: "W" },
            deceasedSpouse: {
                surname: "OLIVEIRA", givenName: "PEDRO",
                dob: { day: "17", month: "NOV", year: "1985" },
                nationality: "BRAZIL", cityOfBirth: "DNA", countryOfBirth: "BRAZIL"
            }
        })
    },

    // ── 7. OUTRAS NACIONALIDADES + RESIDENTE PERMANENTE ──
    'multi-nationality-permres': {
        description: 'Multiple nationalities (2) + permanent resident (2 countries) + SSN + TaxID',
        branches: [
            'otherNationality=Y', 'otherNationalities.length=2→AddAnother',
            'otherNationalityPassport=Y→numberField', 'otherNationalityPassport=N→noNumber',
            'permanentResident=Y', 'permanentResidentCountries.length=2→AddAnother',
            'ssn=valid→3parts', 'taxId=valid→field'
        ],
        data: merge(BASE, {
            personal2: {
                otherNationality: "Y",
                otherNationalities: [
                    { country: "PORTUGAL", hasPassport: "Y", passportNumber: "PT999888" },
                    { country: "ITALY", hasPassport: "N", passportNumber: "" }
                ],
                permanentResident: "Y",
                permanentResidentCountries: [
                    { country: "PORTUGAL" },
                    { country: "SPAIN" }
                ],
                ssn: { p1: "123", p2: "45", p3: "6789" },
                taxId: "987654321"
            }
        })
    },

    // ── 8. TRAVEL: PLANOS ESPECÍFICOS + OTHER payer ──
    'specific-travel-other-payer': {
        description: 'Specific travel plans (3 locations) + Other person paying (diff address)',
        branches: [
            'hasSpecificPlans=Y→specificFields', 'specificLocations.length=3→AddAnother',
            'arrivalFlight+city→fields', 'departureFlight+city→fields',
            'whoIsPaying=OTH→otherPayer', 'payer.sameAddress=N→payerAddressFields',
            'payer.email=valid→field'
        ],
        data: merge(BASE, {
            travel: {
                hasSpecificPlans: "Y",
                specificLocations: ["HILTON ORLANDO", "MARRIOTT MIAMI", "HYATT TAMPA"],
                arrivalDate: { day: "15", month: "MAR", year: "2027" },
                departureDate: { day: "30", month: "MAR", year: "2027" },
                arrivalFlight: "AA1234",
                arrivalCity: "ORLANDO",
                departureFlight: "UA5678",
                departureCity: "MIAMI",
                lengthOfStay: "15",
                lengthOfStayUnit: "D",
                usAddress: { street1: "123 MAIN ST", street2: "SUITE 100", city: "ORLANDO", state: "FL", zip: "32801" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "SMITH", givenName: "ROBERT",
                    phone: "4075559999", email: "robert@test.com",
                    relationship: "F", sameAddress: "N",
                    address: {
                        street1: "999 PAYER ST", street2: "APT 2",
                        city: "MIAMI", state: "FL", country: "UNITED STATES OF AMERICA", postalCode: "33101"
                    }
                }
            }
        })
    },

    // ── 9. TRAVEL: PAYER = SAME ADDRESS ──
    'travel-payer-same-address': {
        description: 'Other person paying with SAME address as applicant',
        branches: ['whoIsPaying=OTH', 'payer.sameAddress=Y→noAddressFields'],
        data: merge(BASE, {
            travel: {
                whoIsPaying: "OTH",
                payer: {
                    surname: "PARENT", givenName: "DAD",
                    phone: "11999887766", email: "DNA",
                    relationship: "P", sameAddress: "Y"
                }
            }
        })
    },

    // ── 10. TRAVEL: COMPANY PAYING ──
    'travel-company-paying': {
        description: 'Company paying for trip (type C → different fields than Other)',
        branches: ['whoIsPaying=COM→companyPayer', 'companyName+relation+addressFields'],
        data: merge(BASE, {
            travel: {
                whoIsPaying: "COM",
                payer: {
                    companyName: "GLOBAL TECH INC",
                    phone: "2125551234",
                    companyRelation: "EMPLOYER",
                    address: {
                        street1: "100 BROADWAY", street2: "FLOOR 20",
                        city: "NEW YORK", state: "NY", country: "UNITED STATES OF AMERICA", postalCode: "10001"
                    }
                }
            }
        })
    },

    // ── 11. TRAVEL: EMPLOYER PAYING ──
    'travel-employer-paying': {
        description: 'Present employer paying (type EMP → maps to P)',
        branches: ['whoIsPaying=EMP→employerPayer(P)'],
        data: merge(BASE, {
            travel: {
                whoIsPaying: "EMP",
                payer: {
                    companyName: "MY COMPANY SA", phone: "1133334444",
                    companyRelation: "EMPLOYEE",
                    address: {
                        street1: "AV PAULISTA 1000", city: "SAO PAULO",
                        state: "SP", country: "BRAZIL", postalCode: "01310100"
                    }
                }
            }
        })
    },

    // ── 12. COMPANIONS + GROUP ──
    'travel-companions-group': {
        description: 'Traveling with 3 others + part of group',
        branches: [
            'travelingWithOthers=Y', 'companions.length=3→AddAnother',
            'partOfGroup=Y→groupNameField'
        ],
        data: merge(BASE, {
            travelCompanions: {
                travelingWithOthers: "Y",
                companions: [
                    { surname: "SILVA", givenName: "ANA", relationship: "S" },
                    { surname: "SILVA", givenName: "PEDRO", relationship: "C" },
                    { surname: "COSTA", givenName: "MARIA", relationship: "R" }
                ],
                partOfGroup: "Y",
                groupName: "BRAZIL TOUR GROUP 2027"
            }
        })
    },

    // ── 13. PREVIOUS US TRAVEL COMPLETO ──
    'previous-us-travel-full': {
        description: 'Been in US (2 visits) + drivers license + previous visa (lost + cancelled) + refused + petition',
        branches: [
            'hasBeenInUS=Y', 'previousVisits.length=2→AddAnother',
            'hasDriversLicense=Y', 'driversLicenses.length=1',
            'hasUSVisa=Y', 'previousVisa.lost=Y→lostVisaFields',
            'previousVisa.cancelled=Y→cancelledVisaFields',
            'visaRefused=Y→explanationField',
            'immigrantPetition=Y→explanationField'
        ],
        data: merge(BASE, {
            previousUSTravel: {
                hasBeenInUS: "Y",
                previousVisits: [
                    { arrivalDate: { day: "01", month: "JAN", year: "2019" }, lengthOfStay: "10", lengthOfStayUnit: "D" },
                    { arrivalDate: { day: "15", month: "JUL", year: "2021" }, lengthOfStay: "3", lengthOfStayUnit: "W" }
                ],
                hasDriversLicense: "Y",
                driversLicenses: [{ number: "D12345678", state: "FL" }, { number: "D99887766", state: "CA" }],
                hasUSVisa: "Y",
                previousVisa: {
                    issueDate: { day: "05", month: "MAR", year: "2018" },
                    number: "123456789",
                    sameType: "Y", sameCountry: "Y", tenPrint: "Y",
                    lost: "Y", lostYear: "2020", lostExplanation: "PASSPORT WAS STOLEN DURING TRAVEL",
                    cancelled: "Y", cancelledExplanation: "CANCELLED DUE TO PASSPORT REPLACEMENT"
                },
                visaRefused: "Y",
                visaRefusedExplanation: "APPLIED IN 2015 SECTION 214B",
                immigrantPetition: "Y",
                immigrantPetitionExplanation: "PETITION FILED BY EMPLOYER IN 2017"
            }
        })
    },

    // ── 14. PASSPORT LOST + BOOK NUMBER VALID ──
    'passport-lost-book': {
        description: 'Lost passport (2 entries) + valid book number (not DNA)',
        branches: [
            'lostOrStolen=Y', 'lostPassports.length=2→AddAnother',
            'lostPassport[0].number=valid', 'lostPassport[1].numberUnknown=true→checkbox',
            'bookNumber=valid→textField'
        ],
        data: merge(BASE, {
            passport: {
                type: "R", number: "BR9999999",
                bookNumber: "BK123456",
                issuingCountry: "BRAZIL", issuedCity: "RIO DE JANEIRO", issuedState: "RJ",
                issuedCountry: "BRAZIL",
                issuanceDate: { day: "01", month: "MAY", year: "2023" },
                expirationDate: { day: "01", month: "MAY", year: "2033" },
                lostOrStolen: "Y",
                lostPassports: [
                    { number: "BR7777777", country: "BRAZIL", explanation: "LOST IN AIRPORT" },
                    { numberUnknown: true, country: "BRAZIL", explanation: "STOLEN MANY YEARS AGO" }
                ]
            }
        })
    },

    // ── 15. PASSPORT TYPE OTHER (type="T") ──
    'passport-type-other': {
        description: 'Travel document (passport type T) + type explanation',
        branches: ['passport.type=T→typeExplanationField'],
        data: merge(BASE, {
            passport: {
                type: "T", typeExplanation: "REFUGEE TRAVEL DOCUMENT",
                number: "TD123456", bookNumber: "DNA",
                issuingCountry: "BRAZIL", issuedCity: "BRASILIA", issuedState: "DF",
                issuedCountry: "BRAZIL",
                issuanceDate: { day: "01", month: "JAN", year: "2024" },
                expirationDate: { day: "01", month: "JAN", year: "2029" },
                lostOrStolen: "N"
            }
        })
    },

    // ── 16. MAILING ADDRESS DIFERENTE ──
    'mailing-address-different': {
        description: 'Mailing address different + additional phones + additional emails + additional social media',
        branches: [
            'mailingAddressSame=N→mailingAddressFields',
            'additionalPhones=Y→AddAnother', 'additionalEmails=Y→AddAnother',
            'additionalSocialMedia=Y→AddAnother',
            'mobilePhone=valid→field', 'businessPhone=valid→field'
        ],
        data: merge(BASE, {
            addressPhone: {
                homeAddress: {
                    street1: "RUA CASA 100", city: "SP", state: "SP",
                    country: "BRAZIL", postalCode: "01234567"
                },
                mailingAddressSame: "N",
                mailingAddress: {
                    street1: "CAIXA POSTAL 999", street2: "",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "09876543"
                },
                phone: "11987654321",
                mobilePhone: "11912345678",
                businessPhone: "1133334444",
                email: "test@test.com",
                additionalPhones: "Y",
                additionalPhoneNumbers: ["11988887777", "11966665555"],
                additionalEmails: "Y",
                additionalEmailAddresses: ["alt1@test.com", "alt2@test.com"],
                socialMedia: [
                    { platform: "INST", handle: "@main" },
                    { platform: "FCBK", handle: "user.main" }
                ],
                additionalSocialMedia: "Y",
                additionalSocialMediaAccounts: [
                    { platform: "TELEGRAM", handle: "@telegram_user" }
                ]
            }
        })
    },

    // ── 17. FAMILY: PAIS COM DADOS DESCONHECIDOS + PARENTES NOS EUA ──
    'family-unknown-parents-usrelatives': {
        description: 'Father name+DOB unknown, mother name+DOB unknown, both in US, 2 relatives in US (AddAnother)',
        branches: [
            'father.nameUnknown=true→checkboxes', 'father.dobUnknown=true→checkbox',
            'father.inUS=Y→statusField',
            'mother.nameUnknown=true→checkboxes', 'mother.dobUnknown=true→checkbox',
            'mother.inUS=Y→statusField',
            'immediateRelativesInUS=Y', 'relatives.length=2→AddAnother'
        ],
        data: merge(BASE, {
            family1: {
                father: {
                    surname: "", givenName: "", dobUnknown: true,
                    inUS: "Y", usStatus: "C"
                },
                mother: {
                    surname: "", givenName: "", dobUnknown: true,
                    inUS: "Y", usStatus: "L"
                },
                immediateRelativesInUS: "Y",
                relatives: [
                    { surname: "TESTSILVA", givenName: "CARLOS", type: "P", status: "C" },
                    { surname: "TESTSILVA", givenName: "LUCAS", type: "S", status: "S" }
                ],
                otherRelativesInUS: "N"
            }
        })
    },

    // ── 18. FAMILY: SEM PARENTES IMEDIATOS MAS COM OUTROS PARENTES ──
    'family-other-relatives-only': {
        description: 'No immediate relatives BUT has other relatives in US',
        branches: ['immediateRelativesInUS=N→otherRelativesQuestion', 'otherRelativesInUS=Y'],
        data: merge(BASE, {
            family1: {
                father: {
                    surname: "TESTSILVA", givenName: "JOSE",
                    dob: { day: "20", month: "MAR", year: "1960" }, inUS: "N"
                },
                mother: {
                    surname: "TESTOLIVEIRA", givenName: "MARIA",
                    dob: { day: "15", month: "DEC", year: "1962" }, inUS: "N"
                },
                immediateRelativesInUS: "N",
                otherRelativesInUS: "Y"
            }
        })
    },

    // ── 19. WORK: EMPREGADO COM SUPERVISOR ──
    'work-employed-supervisor': {
        description: 'Employed (BUS) with employer details + supervisor + previous employment (2) + education (2)',
        branches: [
            'occupation=BUS→employerFields', 'supervisorSurname→field',
            'hasPreviousEmployment=Y', 'previousEmployment.length=2→AddAnother',
            'hasEducation=Y', 'education.length=2→AddAnother'
        ],
        data: merge(BASE, {
            workEducation1: {
                occupation: "BUS",
                employer: {
                    name: "TECH CORP", street1: "AV PAULISTA 1000", street2: "ANDAR 10",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL",
                    postalCode: "01310100", phone: "1133334444",
                    duties: "SOFTWARE DEVELOPMENT", monthlySalary: "15000",
                    jobTitle: "SENIOR DEVELOPER",
                    supervisorSurname: "MANAGER", supervisorGivenName: "BIG",
                    startDate: { day: "01", month: "MAR", year: "2018" }
                }
            },
            workEducation2: {
                hasPreviousEmployment: "Y",
                previousEmployment: [
                    {
                        name: "OLD CORP", street1: "RUA VELHA 55", city: "SAO PAULO",
                        state: "SP", country: "BRAZIL", postalCode: "01234567",
                        phone: "1144445555", jobTitle: "JUNIOR DEV",
                        supervisor: "BOSS", supervisorGivenName: "OLD",
                        startDate: { day: "01", month: "JAN", year: "2015" },
                        endDate: { day: "28", month: "FEB", year: "2018" },
                        duties: "WEB DEVELOPMENT"
                    },
                    {
                        name: "FIRST JOB SA", street1: "AV FIRST 10", city: "CAMPINAS",
                        state: "SP", country: "BRAZIL", postalCode: "13000000",
                        phone: "1955556666", jobTitle: "INTERN",
                        supervisor: "N/A",
                        startDate: { day: "01", month: "JUN", year: "2013" },
                        endDate: { day: "31", month: "DEC", year: "2014" },
                        duties: "INTERNSHIP TASKS"
                    }
                ],
                hasEducation: "Y",
                education: [
                    {
                        name: "UNIVERSIDADE DE SAO PAULO", street1: "AV PROF LUCIANO 380",
                        city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "05508010",
                        courseOfStudy: "COMPUTER SCIENCE",
                        startDate: { month: "FEB", year: "2010" }, endDate: { month: "DEC", year: "2014" }
                    },
                    {
                        name: "UDEMY ONLINE", street1: "ONLINE", city: "SAN FRANCISCO",
                        state: "CA", country: "UNITED STATES OF AMERICA", postalCode: "94105",
                        courseOfStudy: "MACHINE LEARNING",
                        startDate: { month: "JAN", year: "2020" }, endDate: { month: "JUN", year: "2020" }
                    }
                ]
            }
        })
    },

    // ── 20. WORK: OCCUPATION=O (OTHER) com explicação ──
    'work-occupation-other': {
        description: 'Occupation = Other → explanation field',
        branches: ['occupation=O→explanationField'],
        data: merge(BASE, {
            workEducation1: {
                occupation: "O",
                occupationExplanation: "FREELANCE DIGITAL MARKETING"
            }
        })
    },

    // ── 21. WE3: TODOS OS CONDICIONAIS ATIVADOS ──
    'we3-all-active': {
        description: 'WE3 all conditionals: languages(3), clanTribe, countriesVisited(3), organizations(2), specializedSkills, military(2 AddAnother), insurgentOrg',
        branches: [
            'languages.length=3→AddAnother',
            'clanTribe=Y→nameField',
            'countriesVisited=Y', 'countriesVisitedList.length=3→AddAnother',
            'organizationMember=Y', 'organizations.length=2→AddAnother',
            'specializedSkills=Y→explanationField',
            'militaryService=Y→AddAnother', 'military.length=2→AddAnother',
            'insurgentOrg=Y→explanationField'
        ],
        data: merge(BASE, {
            workEducation3: {
                languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
                clanTribe: "Y", clanTribeName: "GUARANI",
                countriesVisited: "Y",
                countriesVisitedList: ["ARGENTINA", "CHILE", "URUGUAY"],
                organizationMember: "Y",
                organizations: ["ROTARY CLUB", "IEEE"],
                specializedSkills: "Y",
                specializedSkillsExplanation: "NUCLEAR PHYSICS RESEARCH AT UNIVERSITY",
                militaryService: "Y",
                military: [
                    {
                        country: "BRAZIL", branch: "ARMY", rank: "SERGEANT",
                        specialty: "COMMUNICATIONS",
                        startDate: { day: "01", month: "JAN", year: "2010" },
                        endDate: { day: "31", month: "DEC", year: "2011" }
                    },
                    {
                        country: "BRAZIL", branch: "NAVY", rank: "CORPORAL",
                        specialty: "LOGISTICS",
                        startDate: { day: "01", month: "FEB", year: "2012" },
                        endDate: { day: "30", month: "JUN", year: "2013" }
                    }
                ],
                insurgentOrg: "Y",
                insurgentOrgExplanation: "PARTICIPATED IN STUDENT POLITICAL ORGANIZATION"
            }
        })
    },

    // ── 22. SECURITY COM YES ──
    'security-with-yes': {
        description: 'Security questions with some YES answers + explanations',
        branches: [
            'security.disease=Y→explanationField',
            'security.arrested=Y→explanationField',
            'security.deport=Y→explanationField'
        ],
        data: merge(BASE, {
            security: {
                disease: "Y", diseaseExpl: "HAD TUBERCULOSIS IN 2010 FULLY TREATED",
                disorder: "N", drugUser: "N",
                arrested: "Y", arrestedExpl: "MINOR TRAFFIC VIOLATION IN 2015",
                controlledSubstances: "N", prostitution: "N",
                moneyLaundering: "N", humanTrafficking: "N",
                assistedSevereTrafficking: "N", humanTraffickingRelated: "N",
                illegalActivity: "N", terroristActivity: "N",
                terroristSupport: "N", terroristOrg: "N", terroristRel: "N",
                genocide: "N", torture: "N", exViolence: "N",
                childSoldier: "N", religiousFreedom: "N",
                populationControls: "N", transplant: "N",
                removalHearing: "N", immigrationFraud: "N",
                failToAttend: "N", visaViolation: "N",
                deport: "Y", deportExpl: "OVERSTAYED VISA IN 2016",
                childCustody: "N", votingViolation: "N",
                renounceExp: "N", attWoReimb: "N"
            }
        })
    },

    // ── 23. PREVIOUS US TRAVEL: VISA SEM NÚMERO + DADOS MÍNIMOS ──
    'previous-visa-no-number': {
        description: 'Previous visa with number N/A (checkbox), not lost, not cancelled',
        branches: ['hasUSVisa=Y', 'previousVisa.numberNA=true→checkbox',
            'previousVisa.lost=N', 'previousVisa.cancelled=N'],
        data: merge(BASE, {
            previousUSTravel: {
                hasBeenInUS: "N",
                hasUSVisa: "Y",
                previousVisa: {
                    issueDate: { day: "01", month: "JUN", year: "2015" },
                    number: "",
                    sameType: "N", sameCountry: "Y", tenPrint: "N",
                    lost: "N", cancelled: "N"
                },
                visaRefused: "N", immigrantPetition: "N"
            }
        })
    },

    // ── 24. VWP DENIAL + PERMANENT RESIDENT ──
    'vwp-denial-perm-resident': {
        description: 'VWP denial + permanent resident explanation (previous US travel section)',
        branches: ['vwpDenial=Y→explanationField', 'permanentResident=Y→explanationField (previousUSTravel section)'],
        data: merge(BASE, {
            previousUSTravel: {
                hasBeenInUS: "N", hasUSVisa: "N",
                visaRefused: "N", immigrantPetition: "N",
                permanentResident: "Y",
                permanentResidentExplanation: "APPLIED FOR GREEN CARD IN 2019",
                vwpDenial: "Y",
                vwpDenialExplanation: "DENIED ESTA IN 2020"
            }
        })
    },

    // ── 25. US CONTACT: ORG DO NOT KNOW ──
    'uscontact-org-unknown': {
        description: 'US Contact: name known but organization unknown',
        branches: ['nameDoNotKnow=false→nameFields', 'orgDoNotKnow=true→checkbox'],
        data: merge(BASE, {
            usContact: {
                surname: "JOHNSON", givenName: "MARY", nameDoNotKnow: false,
                organization: "", orgDoNotKnow: true,
                relationship: "F",
                address: { street1: "100 FRIEND ST", city: "BOSTON", state: "MA", zip: "02101" },
                phone: "6175551234", email: "mary@test.com"
            }
        })
    },

    // ── 26. MARITAL STATUS = OTHER ──
    'marital-other': {
        description: 'Marital status Other → other marital status explanation field',
        branches: ['maritalStatus=O→otherMaritalStatusTextField'],
        data: merge(BASE, {
            personal1: {
                maritalStatus: "O",
                otherMaritalStatusText: "CIVIL UNION"
            }
        })
    },

    // ============================================================
    // PERFIS DA MATRIZ (test_profiles_matrix.md)
    // Cobrem variações críticas: estado civil, visto, idade, localidade
    // ============================================================

    // ── M01 — "TUDO SIM" (Cobertura Máxima) ──
    'matrix-all-yes': {
        description: 'MATRIX P01: Todos radios Y, arrays com 3 itens, máxima expansão de campos',
        branches: [
            'ALL_RADIOS=Y', 'arrays=3items', 'maritalStatus=M→family2',
            'hasSpecificPlans=Y', 'whoIsPaying=OTH→payerSameAddr=N',
            'travelingWithOthers=Y→individuals', 'hasBeenInUS=Y→3visits',
            'hasDriversLicense=Y', 'hasUSVisa=Y→lost+cancelled',
            'visaRefused=Y', 'immigrantPetition=Y',
            'mailingAddressSame=N', 'additionalPhones=Y', 'additionalEmails=Y',
            'additionalSocialMedia=Y', 'lostOrStolen=Y',
            'fatherInUS=Y', 'motherInUS=Y', 'immediateRelativesInUS=Y→3',
            'hasPreviousEmployment=Y→3', 'hasEducation=Y→3',
            'clanTribe=Y', 'countriesVisited=Y→3', 'organizationMember=Y→3',
            'specializedSkills=Y', 'militaryService=Y→3', 'insurgentOrg=Y'
        ],
        data: merge(BASE, {
            location: "SPL",
            personal1: {
                surname: "ALLYESSILVA", givenName: "MAXIMUS",
                fullNameNative: "MAXIMUS ALLYESSILVA",
                otherNamesUsed: "Y",
                otherNames: [
                    { surname: "SOUZA", givenName: "MAX" },
                    { surname: "COSTA", givenName: "MAXIMUS" },
                    { surname: "LIMA", givenName: "MAXIMO" }
                ],
                telecode: "Y", telecodeSurname: "1234", telecodeGivenName: "5678",
                sex: "M", maritalStatus: "M",
                dob: { day: "15", month: "JUN", year: "1994" },
                cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            personal2: {
                nationality: "BRAZIL",
                otherNationality: "Y",
                otherNationalities: [
                    { country: "PORTUGAL", hasPassport: "Y", passportNumber: "PT111222" },
                    { country: "ITALY", hasPassport: "Y", passportNumber: "IT333444" },
                    { country: "SPAIN", hasPassport: "N", passportNumber: "" }
                ],
                permanentResident: "Y",
                permanentResidentCountries: [
                    { country: "PORTUGAL" },
                    { country: "JAPAN" },
                    { country: "CANADA" }
                ],
                nationalId: "12345678901",
                ssn: { p1: "111", p2: "22", p3: "3333" },
                taxId: "999888777"
            },
            addressPhone: {
                homeAddress: {
                    street1: "RUA COMPLETA 500", street2: "BLOCO A APTO 101",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "01001000"
                },
                mailingAddressSame: "N",
                mailingAddress: {
                    street1: "CAIXA POSTAL 789", street2: "",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "01002000"
                },
                phone: "11999001122",
                mobilePhone: "11988776655",
                businessPhone: "1133221100",
                email: "allyes@test.com",
                additionalPhones: "Y",
                additionalPhoneNumbers: ["11977665544", "11966554433", "11955443322"],
                additionalEmails: "Y",
                additionalEmailAddresses: ["alt1@test.com", "alt2@test.com", "alt3@test.com"],
                socialMedia: [
                    { platform: "INST", handle: "@allyesmax" },
                    { platform: "FCBK", handle: "max.allyes" },
                    { platform: "TWTR", handle: "@maxallyes" }
                ],
                additionalSocialMedia: "Y",
                additionalSocialMediaAccounts: [
                    { platform: "LNKD", handle: "maximus-allyes" },
                    { platform: "YUBO", handle: "maxallyes" },
                    { platform: "TELEGRAM", handle: "@max_t" }
                ]
            },
            passport: {
                type: "R", number: "BR5555555", bookNumber: "BK999111",
                issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SP",
                issuedCountry: "BRAZIL",
                issuanceDate: { day: "01", month: "JAN", year: "2022" },
                expirationDate: { day: "01", month: "JAN", year: "2032" },
                lostOrStolen: "Y",
                lostPassports: [
                    { number: "BR1111111", country: "BRAZIL", explanation: "LOST IN TRANSIT" },
                    { number: "BR2222222", country: "BRAZIL", explanation: "STOLEN FROM HOTEL" },
                    { numberUnknown: true, country: "BRAZIL", explanation: "DAMAGED AND REPLACED" }
                ]
            },
            travel: {
                purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
                hasSpecificPlans: "Y",
                specificLocations: ["HILTON ORLANDO", "MARRIOTT MIAMI", "SHERATON NEW YORK"],
                arrivalDate: { day: "10", month: "JUN", year: "2027" },
                departureDate: { day: "30", month: "JUN", year: "2027" },
                arrivalFlight: "LA8001", arrivalCity: "MIAMI",
                departureFlight: "LA8002", departureCity: "NEW YORK",
                lengthOfStay: "20", lengthOfStayUnit: "D",
                usAddress: { street1: "200 PARK AVE", street2: "FLOOR 5", city: "NEW YORK", state: "NY", zip: "10001" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "SPONSOR", givenName: "RICH",
                    phone: "2125559999", email: "rich@sponsor.com",
                    relationship: "F", sameAddress: "N",
                    address: {
                        street1: "500 FIFTH AVE", street2: "SUITE 100",
                        city: "NEW YORK", state: "NY", country: "UNITED STATES OF AMERICA", postalCode: "10001"
                    }
                }
            },
            travelCompanions: {
                travelingWithOthers: "Y",
                companions: [
                    { surname: "COMP1", givenName: "ALICE", relationship: "S" },
                    { surname: "COMP2", givenName: "BOB", relationship: "C" },
                    { surname: "COMP3", givenName: "CAROL", relationship: "R" }
                ],
                partOfGroup: "N"
            },
            previousUSTravel: {
                hasBeenInUS: "Y",
                previousVisits: [
                    { arrivalDate: { day: "01", month: "JAN", year: "2018" }, lengthOfStay: "15", lengthOfStayUnit: "D" },
                    { arrivalDate: { day: "10", month: "JUL", year: "2020" }, lengthOfStay: "1", lengthOfStayUnit: "M" },
                    { arrivalDate: { day: "05", month: "DEC", year: "2023" }, lengthOfStay: "10", lengthOfStayUnit: "D" }
                ],
                hasDriversLicense: "Y",
                driversLicenses: [
                    { number: "D11111111", state: "FL" },
                    { number: "D22222222", state: "NY" },
                    { number: "D33333333", state: "CA" }
                ],
                hasUSVisa: "Y",
                previousVisa: {
                    issueDate: { day: "10", month: "MAR", year: "2017" },
                    number: "V12345678",
                    sameType: "Y", sameCountry: "Y", tenPrint: "Y",
                    lost: "Y", lostYear: "2019", lostExplanation: "PASSPORT STOLEN WITH VISA INSIDE",
                    cancelled: "Y", cancelledExplanation: "CANCELLED WHEN PASSPORT WAS REPLACED"
                },
                visaRefused: "Y",
                visaRefusedExplanation: "214B REFUSAL IN 2016 AT SAO PAULO CONSULATE",
                immigrantPetition: "Y",
                immigrantPetitionExplanation: "EB2 PETITION FILED BY EMPLOYER IN 2020"
            },
            usContact: {
                surname: "CONTACTFULL", givenName: "JOHN", nameDoNotKnow: false,
                organization: "ABC GLOBAL INC", orgDoNotKnow: false,
                relationship: "F",
                address: { street1: "100 MAIN ST", city: "MIAMI", state: "FL", zip: "33101" },
                phone: "3055551234", email: "john@abcglobal.com"
            },
            family1: {
                father: {
                    surname: "ALLYESSILVA", givenName: "JOSE",
                    dob: { day: "20", month: "MAR", year: "1965" },
                    inUS: "Y", usStatus: "C"
                },
                mother: {
                    surname: "ALLYESOLIVEIRA", givenName: "MARIA",
                    dob: { day: "15", month: "DEC", year: "1968" },
                    inUS: "Y", usStatus: "L"
                },
                immediateRelativesInUS: "Y",
                relatives: [
                    { surname: "ALLYESSILVA", givenName: "PEDRO", type: "S", status: "C" },
                    { surname: "ALLYESSILVA", givenName: "ANA", type: "P", status: "S" },
                    { surname: "ALLYESCOSTA", givenName: "LUCAS", type: "C", status: "L" }
                ],
                otherRelativesInUS: "N"
            },
            family2: {
                surname: "ALLYESCOSTA", givenName: "JULIANA",
                dob: { day: "01", month: "FEB", year: "1996" },
                nationality: "BRAZIL", cityOfBirth: "RIO DE JANEIRO",
                countryOfBirth: "BRAZIL", addressType: "H"
            },
            workEducation1: {
                occupation: "BUS",
                employer: {
                    name: "MEGA TECH SA", street1: "AV BRASIL 2000", street2: "ANDAR 15",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL",
                    postalCode: "04538000", phone: "1130001234",
                    duties: "SOFTWARE ENGINEERING AND ARCHITECTURE",
                    monthlySalary: "25000", jobTitle: "TECH LEAD",
                    supervisorSurname: "BOSS", supervisorGivenName: "MEGA",
                    startDate: { day: "01", month: "JAN", year: "2020" }
                }
            },
            workEducation2: {
                hasPreviousEmployment: "Y",
                previousEmployment: [
                    {
                        name: "OLD TECH", street1: "RUA OLD 100", city: "SAO PAULO",
                        state: "SP", country: "BRAZIL", postalCode: "01234567",
                        phone: "1144441111", jobTitle: "SENIOR DEV",
                        supervisor: "MANAGER", supervisorGivenName: "OLD",
                        startDate: { day: "01", month: "MAR", year: "2017" },
                        endDate: { day: "31", month: "DEC", year: "2019" },
                        duties: "BACKEND DEVELOPMENT"
                    },
                    {
                        name: "MID CORP", street1: "AV MID 200", city: "CAMPINAS",
                        state: "SP", country: "BRAZIL", postalCode: "13000000",
                        phone: "1955552222", jobTitle: "DEV",
                        supervisor: "LEAD",
                        startDate: { day: "01", month: "JAN", year: "2015" },
                        endDate: { day: "28", month: "FEB", year: "2017" },
                        duties: "FULL STACK DEVELOPMENT"
                    },
                    {
                        name: "FIRST JOB LTDA", street1: "RUA FIRST 50", city: "SAO PAULO",
                        state: "SP", country: "BRAZIL", postalCode: "02000000",
                        phone: "1133335555", jobTitle: "INTERN",
                        supervisor: "N/A",
                        startDate: { day: "01", month: "JUN", year: "2013" },
                        endDate: { day: "31", month: "DEC", year: "2014" },
                        duties: "INTERNSHIP"
                    }
                ],
                hasEducation: "Y",
                education: [
                    {
                        name: "UNIVERSIDADE DE SAO PAULO", street1: "AV PROF LUCIANO 380",
                        city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "05508010",
                        courseOfStudy: "COMPUTER SCIENCE",
                        startDate: { month: "FEB", year: "2010" }, endDate: { month: "DEC", year: "2014" }
                    },
                    {
                        name: "MIT ONLINE", street1: "77 MASSACHUSETTS AVE",
                        city: "CAMBRIDGE", state: "MA", country: "UNITED STATES OF AMERICA", postalCode: "02139",
                        courseOfStudy: "ARTIFICIAL INTELLIGENCE",
                        startDate: { month: "JAN", year: "2019" }, endDate: { month: "DEC", year: "2019" }
                    },
                    {
                        name: "SENAC SP", street1: "AV PAULISTA 500",
                        city: "SAO PAULO", state: "SP", country: "BRAZIL", postalCode: "01310100",
                        courseOfStudy: "PROJECT MANAGEMENT",
                        startDate: { month: "MAR", year: "2016" }, endDate: { month: "NOV", year: "2016" }
                    }
                ]
            },
            workEducation3: {
                languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
                clanTribe: "Y", clanTribeName: "TUPI GUARANI",
                countriesVisited: "Y",
                countriesVisitedList: ["ARGENTINA", "JAPAN", "GERMANY"],
                organizationMember: "Y",
                organizations: ["IEEE MEMBER", "ACM MEMBER", "ROTARY CLUB SP"],
                specializedSkills: "Y",
                specializedSkillsExplanation: "ADVANCED CRYPTOGRAPHY AND NUCLEAR PHYSICS RESEARCH",
                militaryService: "Y",
                military: [
                    {
                        country: "BRAZIL", branch: "ARMY", rank: "SERGEANT",
                        specialty: "COMMUNICATIONS",
                        startDate: { day: "01", month: "JAN", year: "2012" },
                        endDate: { day: "31", month: "DEC", year: "2012" }
                    },
                    {
                        country: "BRAZIL", branch: "NAVY", rank: "CORPORAL",
                        specialty: "LOGISTICS",
                        startDate: { day: "01", month: "FEB", year: "2013" },
                        endDate: { day: "30", month: "JUN", year: "2013" }
                    },
                    {
                        country: "BRAZIL", branch: "AIR FORCE", rank: "PRIVATE",
                        specialty: "RADAR OPERATION",
                        startDate: { day: "01", month: "JUL", year: "2013" },
                        endDate: { day: "31", month: "DEC", year: "2013" }
                    }
                ],
                insurgentOrg: "Y",
                insurgentOrgExplanation: "MEMBER OF STUDENT POLITICAL ORGANIZATION"
            },
            security: {
                disease: "N", disorder: "N", drugUser: "N",
                arrested: "N", controlledSubstances: "N", prostitution: "N",
                moneyLaundering: "N", humanTrafficking: "N",
                assistedSevereTrafficking: "N", humanTraffickingRelated: "N",
                illegalActivity: "N", terroristActivity: "N",
                terroristSupport: "N", terroristOrg: "N", terroristRel: "N",
                genocide: "N", torture: "N", exViolence: "N",
                childSoldier: "N", religiousFreedom: "N",
                populationControls: "N", transplant: "N",
                removalHearing: "N", immigrationFraud: "N",
                failToAttend: "N", visaViolation: "N", deport: "N",
                childCustody: "N", votingViolation: "N",
                renounceExp: "N", attWoReimb: "N"
            }
        })
    },

    // ── M03 — "DNA MÁXIMO" (Máximo Do Not Apply) ──
    'matrix-max-dna': {
        description: 'MATRIX P03: Máximo de campos DNA/checkbox — fullNameNative, stateOfBirth, SSN, taxId, bookNumber, mobilePhone, businessPhone, usContactEmail',
        branches: [
            'fullNameNative=DNA→checkbox', 'stateOfBirth=DNA→checkbox',
            'ssn=DNA→checkbox', 'taxId=DNA→checkbox', 'bookNumber=DNA→checkbox',
            'mobilePhone=DNA→checkbox', 'businessPhone=DNA→checkbox',
            'usContactEmail=DNA→checkbox'
        ],
        data: merge(BASE, {
            location: "RCF",
            personal1: {
                surname: "TESTDNA", givenName: "MARCOS",
                fullNameNative: "DNA",
                sex: "M", maritalStatus: "S",
                dob: { day: "10", month: "AUG", year: "1979" },
                cityOfBirth: "RECIFE", stateOfBirth: "DNA", countryOfBirth: "BRAZIL"
            },
            personal2: {
                nationality: "BRAZIL", otherNationality: "N",
                permanentResident: "N",
                nationalId: "98765432100", ssn: "DNA", taxId: "DNA"
            },
            passport: {
                type: "R", number: "BR7654321", bookNumber: "DNA",
                issuingCountry: "BRAZIL", issuedCity: "RECIFE", issuedState: "PE",
                issuedCountry: "BRAZIL",
                issuanceDate: { day: "05", month: "MAR", year: "2021" },
                expirationDate: { day: "05", month: "MAR", year: "2031" },
                lostOrStolen: "N"
            },
            addressPhone: {
                homeAddress: {
                    street1: "RUA DNA 100", city: "RECIFE",
                    state: "PE", country: "BRAZIL", postalCode: "50000000"
                },
                mailingAddressSame: "Y",
                phone: "81987654321",
                mobilePhone: "DNA", businessPhone: "DNA",
                email: "dna@test.com",
                additionalPhones: "N", additionalEmails: "N",
                socialMedia: [{ platform: "NONE", handle: "" }],
                additionalSocialMedia: "N"
            },
            usContact: {
                surname: "DNA", givenName: "DNA", nameDoNotKnow: true,
                organization: "HOTEL DNA", orgDoNotKnow: false,
                relationship: "O",
                address: { street1: "100 HOTEL ST", city: "ORLANDO", state: "FL", zip: "32801" },
                phone: "4075551111", email: "DNA"
            },
            travel: {
                purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "01", month: "SEP", year: "2027" },
                lengthOfStay: "7", lengthOfStayUnit: "D",
                usAddress: { street1: "100 HOTEL ST", city: "ORLANDO", state: "FL", zip: "32801" },
                whoIsPaying: "SELF"
            }
        })
    },

    // ── M06 — UNIÃO ESTÁVEL (C) ──
    'matrix-civil-union': {
        description: 'MATRIX P06: União Estável (C) → ativa family2, sexo F',
        branches: ['maritalStatus=C→Family2Active', 'sex=F'],
        data: merge(BASE, {
            personal1: {
                surname: "TESTUNIAO", givenName: "PATRICIA",
                fullNameNative: "PATRICIA TESTUNIAO",
                sex: "F", maritalStatus: "C",
                dob: { day: "22", month: "APR", year: "1992" },
                cityOfBirth: "BELO HORIZONTE", stateOfBirth: "MG", countryOfBirth: "BRAZIL"
            },
            family2: {
                surname: "FERREIRA", givenName: "RODRIGO",
                dob: { day: "10", month: "JUL", year: "1990" },
                nationality: "BRAZIL", cityOfBirth: "BELO HORIZONTE",
                countryOfBirth: "BRAZIL", addressType: "H"
            }
        })
    },

    // ── M09 — SEPARADO LEGALMENTE (L) ──
    'matrix-legally-separated': {
        description: 'MATRIX P09: Separado Legalmente (L) → ativa family2, sexo F',
        branches: ['maritalStatus=L→Family2Active'],
        data: merge(BASE, {
            personal1: {
                surname: "TESTSEPARADA", givenName: "CAMILA",
                fullNameNative: "CAMILA TESTSEPARADA",
                sex: "F", maritalStatus: "L",
                dob: { day: "08", month: "NOV", year: "1985" },
                cityOfBirth: "CURITIBA", stateOfBirth: "PR", countryOfBirth: "BRAZIL"
            },
            family2: {
                surname: "SANTOS", givenName: "MARCOS",
                dob: { day: "15", month: "JAN", year: "1983" },
                nationality: "BRAZIL", cityOfBirth: "CURITIBA",
                countryOfBirth: "BRAZIL", addressType: "O",
                address: {
                    street1: "RUA SEPARACAO 200", street2: "",
                    city: "CURITIBA", state: "PR", postalCode: "80000000", country: "BRAZIL"
                }
            }
        })
    },

    // ── M11 — VISTO F1 (ESTUDANTE) ──
    'matrix-visa-f1': {
        description: 'MATRIX P11: Visto F1 (Estudante), 20 anos, solteiro, ocupação Student',
        branches: ['purposeCategory=F→F1', 'occupation=ST→studentFields'],
        data: merge(BASE, {
            location: "SPL",
            personal1: {
                surname: "TESTSTUDENT", givenName: "LUCAS",
                fullNameNative: "LUCAS TESTSTUDENT",
                sex: "M", maritalStatus: "S",
                dob: { day: "05", month: "MAR", year: "2006" },
                cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "F", purposeOfTrip: "F1", purposeSubCategory: "F1",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "15", month: "AUG", year: "2027" },
                lengthOfStay: "48", lengthOfStayUnit: "M",
                usAddress: { street1: "100 UNIVERSITY AVE", city: "BOSTON", state: "MA", zip: "02115" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "TESTSTUDENT", givenName: "JOSE",
                    phone: "11999112233", email: "pai@test.com",
                    relationship: "P", sameAddress: "Y"
                }
            },
            workEducation1: {
                occupation: "ST",
                employer: {
                    name: "COLEGIO ELITE", street1: "AV ESTUDANTE 500",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL",
                    postalCode: "01234567", phone: "1133339999",
                    courseOfStudy: "HIGH SCHOOL",
                    startDate: { day: "01", month: "FEB", year: "2021" }
                }
            }
        })
    },

    // ── M12 — VISTO F2 (DEPENDENTE DE F1) ──
    'matrix-visa-f2': {
        description: 'MATRIX P12: Visto F2 (Dependente de estudante F1), casado',
        branches: ['purposeCategory=F→F2', 'maritalStatus=M→family2'],
        data: merge(BASE, {
            location: "BRA",
            personal1: {
                surname: "TESTDEPF2", givenName: "MARIANA",
                fullNameNative: "MARIANA TESTDEPF2",
                sex: "F", maritalStatus: "M",
                dob: { day: "20", month: "SEP", year: "1995" },
                cityOfBirth: "BRASILIA", stateOfBirth: "DF", countryOfBirth: "BRAZIL"
            },
            family2: {
                surname: "TESTDEPF2", givenName: "CARLOS",
                dob: { day: "10", month: "MAR", year: "1993" },
                nationality: "BRAZIL", cityOfBirth: "BRASILIA",
                countryOfBirth: "BRAZIL", addressType: "H"
            },
            travel: {
                purposeCategory: "F", purposeOfTrip: "F2", purposeSubCategory: "F2",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "15", month: "AUG", year: "2027" },
                lengthOfStay: "48", lengthOfStayUnit: "M",
                usAddress: { street1: "200 CAMPUS DR", city: "CAMBRIDGE", state: "MA", zip: "02139" },
                whoIsPaying: "SELF"
            },
            workEducation1: { occupation: "H" }
        })
    },

    // ── M13 — VISTO J1 (INTERCÂMBIO) ──
    'matrix-visa-j1': {
        description: 'MATRIX P13: Visto J1 (Intercâmbio), 22 anos, solteiro',
        branches: ['purposeCategory=J→J1', 'occupation=ST'],
        data: merge(BASE, {
            location: "SPL",
            personal1: {
                surname: "TESTEXCHANGE", givenName: "RAFAEL",
                fullNameNative: "RAFAEL TESTEXCHANGE",
                sex: "M", maritalStatus: "S",
                dob: { day: "12", month: "FEB", year: "2004" },
                cityOfBirth: "PORTO ALEGRE", stateOfBirth: "RS", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "J", purposeOfTrip: "J1", purposeSubCategory: "J1",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "01", month: "JUN", year: "2027" },
                lengthOfStay: "12", lengthOfStayUnit: "M",
                usAddress: { street1: "300 EXCHANGE BLVD", city: "CHICAGO", state: "IL", zip: "60601" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "TESTEXCHANGE", givenName: "MARIA",
                    phone: "51998765432", email: "mae@test.com",
                    relationship: "P", sameAddress: "Y"
                }
            },
            workEducation1: {
                occupation: "ST",
                employer: {
                    name: "UNIVERSIDADE FEDERAL RS", street1: "AV PAULO GAMA 110",
                    city: "PORTO ALEGRE", state: "RS", country: "BRAZIL",
                    postalCode: "90040060", phone: "5133085000",
                    courseOfStudy: "INTERNATIONAL RELATIONS",
                    startDate: { day: "01", month: "MAR", year: "2022" }
                }
            }
        })
    },

    // ── M14 — VISTO O1 (HABILIDADE EXTRAORDINÁRIA) ──
    'matrix-visa-o1': {
        description: 'MATRIX P14: Visto O1 (Habilidade Extraordinária), empregado especializado, membro de organizações',
        branches: ['purposeCategory=O→O1', 'occupation=BUS', 'organizationMember=Y'],
        data: merge(BASE, {
            location: "SPL",
            personal1: {
                surname: "TESTGENIUS", givenName: "ROBERTO",
                fullNameNative: "ROBERTO TESTGENIUS",
                sex: "M", maritalStatus: "S",
                dob: { day: "25", month: "OCT", year: "1988" },
                cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "O", purposeOfTrip: "O1", purposeSubCategory: "O1",
                hasSpecificPlans: "Y",
                specificLocations: ["GOOGLE HQ MOUNTAIN VIEW", "STANFORD UNIVERSITY"],
                arrivalDate: { day: "01", month: "MAR", year: "2027" },
                departureDate: { day: "01", month: "MAR", year: "2030" },
                arrivalFlight: "LA8080", arrivalCity: "SAN FRANCISCO",
                departureFlight: "", departureCity: "",
                lengthOfStay: "36", lengthOfStayUnit: "M",
                usAddress: { street1: "1600 AMPHITHEATRE PKWY", city: "MOUNTAIN VIEW", state: "CA", zip: "94043" },
                whoIsPaying: "COM",
                payer: {
                    companyName: "GOOGLE LLC", phone: "6505551234",
                    companyRelation: "EMPLOYER",
                    address: {
                        street1: "1600 AMPHITHEATRE PKWY", city: "MOUNTAIN VIEW",
                        state: "CA", country: "UNITED STATES OF AMERICA", postalCode: "94043"
                    }
                }
            },
            workEducation1: {
                occupation: "BUS",
                employer: {
                    name: "TECH GENIUS SA", street1: "AV FARIA LIMA 3000", street2: "ANDAR 20",
                    city: "SAO PAULO", state: "SP", country: "BRAZIL",
                    postalCode: "04538000", phone: "1130009999",
                    duties: "ARTIFICIAL INTELLIGENCE RESEARCH",
                    monthlySalary: "50000", jobTitle: "CHIEF AI OFFICER",
                    supervisorSurname: "DIRECTOR", supervisorGivenName: "TECH",
                    startDate: { day: "01", month: "JAN", year: "2018" }
                }
            },
            workEducation3: {
                languages: ["PORTUGUESE", "ENGLISH", "JAPANESE"],
                clanTribe: "N",
                countriesVisited: "Y",
                countriesVisitedList: ["UNITED STATES OF AMERICA", "JAPAN", "GERMANY", "UNITED KINGDOM"],
                organizationMember: "Y",
                organizations: ["IEEE FELLOW", "ACM DISTINGUISHED MEMBER", "BRAZILIAN AI SOCIETY"],
                specializedSkills: "Y",
                specializedSkillsExplanation: "PUBLISHED 50+ PAPERS IN MACHINE LEARNING AND NLP",
                militaryService: "N", insurgentOrg: "N"
            }
        })
    },

    // ── M15 — PORTO ALEGRE (PTA) — exige foto ──
    'matrix-location-pta': {
        description: 'MATRIX P15: Localidade Porto Alegre (PTA) — exige upload de foto, sexo F, solteira, planos Y',
        branches: ['location=PTA→photoAlert', 'hasSpecificPlans=Y', 'sex=F'],
        data: merge(BASE, {
            location: "PTA",
            personal1: {
                surname: "TESTPTA", givenName: "FERNANDA",
                fullNameNative: "FERNANDA TESTPTA",
                sex: "F", maritalStatus: "S",
                dob: { day: "18", month: "JUL", year: "1997" },
                cityOfBirth: "PORTO ALEGRE", stateOfBirth: "RS", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
                hasSpecificPlans: "Y",
                specificLocations: ["DISNEY WORLD ORLANDO"],
                arrivalDate: { day: "20", month: "DEC", year: "2027" },
                departureDate: { day: "05", month: "JAN", year: "2028" },
                arrivalFlight: "G31234", arrivalCity: "ORLANDO",
                departureFlight: "G35678", departureCity: "ORLANDO",
                lengthOfStay: "16", lengthOfStayUnit: "D",
                usAddress: { street1: "1 DISNEY WAY", city: "ORLANDO", state: "FL", zip: "32830" },
                whoIsPaying: "SELF"
            }
        })
    },

    // ── M16 — RECIFE (RCF) + CASADO — exige foto ──
    'matrix-location-rcf-married': {
        description: 'MATRIX P16: Localidade Recife (RCF) — exige foto, casado (M), sexo M',
        branches: ['location=RCF→photoAlert', 'maritalStatus=M→family2'],
        data: merge(BASE, {
            location: "RCF",
            personal1: {
                surname: "TESTRCF", givenName: "THIAGO",
                fullNameNative: "THIAGO TESTRCF",
                sex: "M", maritalStatus: "M",
                dob: { day: "03", month: "MAY", year: "1991" },
                cityOfBirth: "RECIFE", stateOfBirth: "PE", countryOfBirth: "BRAZIL"
            },
            family2: {
                surname: "TESTRCF", givenName: "AMANDA",
                dob: { day: "22", month: "SEP", year: "1993" },
                nationality: "BRAZIL", cityOfBirth: "RECIFE",
                countryOfBirth: "BRAZIL", addressType: "H"
            }
        })
    },

    // ── M17 — MENOR DE 14 ANOS ──
    'matrix-minor-under14': {
        description: 'MATRIX P17: Menor de 14 anos (DOB≈2015 → ~11 anos), pagador=pais, ocupação N',
        branches: ['age<14→skipWorkSections?', 'whoIsPaying=OTH→parents', 'occupation=N'],
        data: merge(BASE, {
            personal1: {
                surname: "TESTMINOR", givenName: "GABRIEL",
                fullNameNative: "GABRIEL TESTMINOR",
                sex: "M", maritalStatus: "S",
                dob: { day: "20", month: "AUG", year: "2015" },
                cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "01", month: "JUL", year: "2027" },
                lengthOfStay: "14", lengthOfStayUnit: "D",
                usAddress: { street1: "123 FAMILY ST", city: "ORLANDO", state: "FL", zip: "32801" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "TESTMINOR", givenName: "JOSE",
                    phone: "11999887766", email: "pai@test.com",
                    relationship: "P", sameAddress: "Y"
                }
            },
            workEducation1: { occupation: "N" }
        })
    },

    // ── M18 — JOVEM 15 ANOS (ESTUDANTE) ──
    'matrix-young-15': {
        description: 'MATRIX P18: Jovem de 15 anos (DOB≈2011), sexo F, solteira, estudante',
        branches: ['age=15→studentOccupation', 'sex=F'],
        data: merge(BASE, {
            personal1: {
                surname: "TESTYOUNG", givenName: "ISABELA",
                fullNameNative: "ISABELA TESTYOUNG",
                sex: "F", maritalStatus: "S",
                dob: { day: "10", month: "MAR", year: "2011" },
                cityOfBirth: "CAMPINAS", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            travel: {
                purposeCategory: "B", purposeOfTrip: "B1/B2", purposeSubCategory: "B1/B2",
                hasSpecificPlans: "N",
                nonSpecificArrival: { day: "15", month: "JUL", year: "2027" },
                lengthOfStay: "21", lengthOfStayUnit: "D",
                usAddress: { street1: "456 FAMILY DR", city: "MIAMI", state: "FL", zip: "33101" },
                whoIsPaying: "OTH",
                payer: {
                    surname: "TESTYOUNG", givenName: "MARIA",
                    phone: "19998877665", email: "mae@test.com",
                    relationship: "P", sameAddress: "Y"
                }
            },
            workEducation1: {
                occupation: "ST",
                employer: {
                    name: "COLEGIO CAMPINAS", street1: "RUA ESCOLA 100",
                    city: "CAMPINAS", state: "SP", country: "BRAZIL",
                    postalCode: "13010000", phone: "1935551234",
                    courseOfStudy: "ENSINO MEDIO",
                    startDate: { day: "01", month: "FEB", year: "2024" }
                }
            }
        })
    },

    // ── M08 — DIVORCIADO COM 3 EX-CÔNJUGES (ajuste da matrix) ──
    'matrix-divorced-3ex': {
        description: 'MATRIX P08: Divorciado com 3 ex-cônjuges (array de 3 items), SPL',
        branches: ['maritalStatus=D→PrevSpousePage', 'prevSpouse.spouses.length=3→AddAnother×2'],
        data: merge(BASE, {
            location: "SPL",
            personal1: {
                surname: "TESTDIVORCED3", givenName: "MARCELO",
                fullNameNative: "MARCELO TESTDIVORCED3",
                sex: "M", maritalStatus: "D",
                dob: { day: "05", month: "JAN", year: "1980" },
                cityOfBirth: "SAO PAULO", stateOfBirth: "SP", countryOfBirth: "BRAZIL"
            },
            prevSpouse: {
                numberOfPrevious: "3",
                spouses: [
                    {
                        surname: "EX1SILVA", givenName: "CARLA",
                        dob: { day: "01", month: "MAR", year: "1982" },
                        nationality: "BRAZIL", cityOfBirth: "SAO PAULO", countryOfBirth: "BRAZIL",
                        dateOfMarriage: { day: "10", month: "JUN", year: "2005" },
                        dateMarriageEnded: { day: "20", month: "DEC", year: "2008" },
                        howEnded: "DIVORCE", countryTerminated: "BRAZIL"
                    },
                    {
                        surname: "EX2COSTA", givenName: "PATRICIA",
                        dob: { day: "15", month: "JUL", year: "1985" },
                        nationality: "ARGENTINA", cityOfBirth: "BUENOS AIRES", countryOfBirth: "ARGENTINA",
                        dateOfMarriage: { day: "01", month: "FEB", year: "2010" },
                        dateMarriageEnded: { day: "30", month: "SEP", year: "2014" },
                        howEnded: "DIVORCE", countryTerminated: "BRAZIL"
                    },
                    {
                        surname: "EX3LIMA", givenName: "RENATA",
                        dob: { day: "22", month: "NOV", year: "1988" },
                        nationality: "PORTUGAL", cityOfBirth: "LISBON", countryOfBirth: "PORTUGAL",
                        dateOfMarriage: { day: "15", month: "MAR", year: "2016" },
                        dateMarriageEnded: { day: "01", month: "JAN", year: "2022" },
                        howEnded: "DIVORCE", countryTerminated: "PORTUGAL"
                    }
                ]
            }
        })
    },
};

module.exports = { PROFILES, BASE, merge };

