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
                ssn: "123-45-6789",
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
};

module.exports = { PROFILES, BASE, merge };
