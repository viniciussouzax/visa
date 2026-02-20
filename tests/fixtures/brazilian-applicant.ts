// ============================================================
// DS-160 Applicant Types & Profiles
// ============================================================

export interface DateField {
  day: string;
  month: string;
  year: string;
}

export interface DS160Applicant {
  // --- Landing ---
  location: string;
  securityQuestion: string;
  securityAnswer: string;

  // --- Personal 1 ---
  surname: string;
  givenName: string;
  fullNameNative: string;
  otherNamesUsed: boolean;
  otherNames?: Array<{ surname: string; givenName: string }>;
  telecode: boolean;
  telecodeSurname?: string;
  telecodeGivenName?: string;
  sex: string;
  maritalStatus: string; // S=Single, M=Married, C=CommonLaw, P=CivilUnion, W=Widowed, D=Divorced, L=Separated, O=Other
  otherMaritalStatusText?: string;
  dob: DateField;
  cityOfBirth: string;
  stateOfBirth: string;
  countryOfBirth: string;

  // --- Personal 2 ---
  nationality: string;
  otherNationality: boolean;
  otherNationalityCountry?: string;
  otherNationalityPassport?: boolean;
  otherNationalityPassportNumber?: string;
  otherNationalityList?: Array<{ country: string; hasOtherPassport: boolean; passportNumber?: string }>; // dtlOTHER_NATL (multi-entry)
  permanentResidentOtherCountry?: boolean;
  permanentResidentCountry?: string;
  permanentResidentCountryList?: string[]; // dtlOthPermResCntry (multi-entry)
  nationalId: string;
  usSsn: string | null;
  usTaxpayerId: string | null;

  // --- Travel ---
  purposeOfTrip: string;
  hasSpecificPlans: boolean;
  travel: {
    arrivalDate: DateField;
    departureDate?: DateField;
    arrivalFlight?: string;
    arrivalCity?: string;
    departureFlight?: string;
    departureCity?: string;
    lengthOfStay: { value: string; unit: string };
    location?: string;
    usAddress: {
      street1: string;
      street2?: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  payingForTrip: string; // S=Self, O=OtherPerson, C=Company, P=PresentEmployer, H=USPetitioner
  payer?: {
    surname?: string;
    givenName?: string;
    phone?: string;
    email?: string;
    emailNA?: boolean;
    relationship?: string;
    sameAddress?: boolean;
    companyName?: string;
    companyRelation?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // --- Travel Companions ---
  travelingWithOthers: boolean;
  companions?: Array<{ surname: string; givenName: string; relationship: string }>;
  partOfGroup: boolean;
  groupName?: string;

  // --- Previous US Travel ---
  hasBeenInUS: boolean;
  previousUSVisit?: {
    arrivalDate: DateField;
    lengthOfStay: string;
    lengthOfStayUnit: string;
  };
  previousUSVisitsList?: Array<{ // dtlPREV_US_VISIT (multi-entry)
    arrivalDate: DateField;
    lengthOfStay: string;
    lengthOfStayUnit: string;
    usDriverLicenses?: Array<{ // dtlUS_DRIVER_LICENSE (nested multi-entry)
      number: string;
      numberNA?: boolean;
      state: string;
    }>;
  }>;
  previousUSDriversLicense?: boolean;
  previousUSDriversLicenseNumber?: string;
  previousUSDriversLicenseState?: string;
  hasUSVisa: boolean;
  previousVisa?: {
    issueDate: DateField;
    number: string;
    numberNA?: boolean;
    sameType: boolean;
    sameCountry: boolean;
    tenPrint: boolean;
    lost: boolean;
    cancelled: boolean;
  };
  visaRefused: boolean;
  visaRefusedExplanation?: string;
  immigrantPetition: boolean;
  immigrantPetitionExplanation?: string;
  permanentResident?: boolean; // rblPERM_RESIDENT_IND - are you a permanent resident of a country other than country of origin?
  permanentResidentExplanation?: string; // tbxPERM_RESIDENT_EXPL
  vwpDenial?: boolean; // Visa Waiver Program denial
  vwpDenialExplanation?: string; // tbxVWP_DENIAL_EXPL

  // --- Address & Phone ---
  homeAddress: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  mailingAddressSame: boolean;
  mailingAddress?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  mobilePhone?: string | null;
  businessPhone?: string | null;
  email: string;
  additionalPhones: boolean;
  additionalPhoneNumbers?: string[];
  additionalEmails: boolean;
  additionalEmailAddresses?: string[];
  additionalWebsites: boolean;
  additionalSocialMedia?: boolean;
  additionalSocialMediaAccounts?: Array<{ platform: string; handle: string }>;

  // --- Passport ---
  passport: {
    type: string;
    typeExplanation?: string;
    number: string;
    bookNumber: string | null;
    issuingCountry: string;
    issuedCity: string;
    issuedState: string;
    issuedCountry: string;
    issuanceDate: DateField;
    expirationDate: DateField;
    lostOrStolen: boolean;
    lostPassport?: {
      number: string;
      numberUnknown?: boolean;
      country: string;
      explanation: string;
    };
    lostPassportsList?: Array<{ // dtlLostPPT (multi-entry) - Comum para viajantes frequentes
      number: string;
      numberUnknown?: boolean;
      country: string;
      explanation: string;
    }>;
  };

  // --- US Contact ---
  usContact: {
    surname: string;
    givenName: string;
    organization?: string;
    relationship: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email?: string;
    emailNA?: boolean;
  };

  // --- Family ---
  father: {
    surname: string;
    givenName: string;
    dob: DateField;
    inUS: boolean;
    usStatus?: string;
  };
  mother: {
    surname: string;
    givenName: string;
    dob: DateField;
    inUS: boolean;
    usStatus?: string;
  };
  spouse?: {
    surname: string;
    givenName: string;
    dob: DateField;
    nationality?: string;
    cityOfBirth?: string;
    pobCountry?: string;
    addressType?: string; // H=Same as Home, W=Same as Work, O=Other
    address?: {
      street1: string;
      street2?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
  };
  relativesInUS: boolean;
  immediateRelative?: {
    surname: string;
    givenName: string;
    relationship: string;
    status: string;
  };
  immediateRelatives?: Array<{
    surname: string;
    givenName: string;
    relationship: string;
    status: string;
  }>;
  usRelativesList?: Array<{ // dlUSRelatives (multi-entry) - Pais/irmãos/filhos nos EUA
    surname: string;
    givenName: string;
    relationship: string; // F=Father, M=Mother, S=Sister, B=Brother, C=Child, etc
    status: string; // C=Citizen, P=Permanent Resident, V=Visa holder
  }>;
  otherRelativesInUS: boolean;

  // --- Work/Education ---
  occupationCode: string;
  occupationExplanation?: string;
  employer?: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    phone: string;
    startDate: { month: string; year: string };
    monthlyIncome: string;
    duties: string;
  };
  hasPreviousEmployment: boolean;
  previousEmployment?: Array<{
    name: string;
    street1: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    phone: string;
    jobTitle: string;
    startDate: { month: string; year: string };
    endDate: { month: string; year: string };
    duties?: string;
  }>;
  hasEducation: boolean;
  education?: Array<{
    name: string;
    street1: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    courseOfStudy: string;
    startDate: { month: string; year: string };
    endDate: { month: string; year: string };
  }>;

  // --- WE3 ---
  languages: string[];
  clanTribe: boolean;
  clanTribeName?: string;
  countriesVisited: boolean;
  countriesVisitedList?: string[];
  organizationMember: boolean;
  organizationName?: string;
  organizations?: Array<{
    name: string;
    startDate: DateField;
    endDate: DateField;
  }>;
  specializedSkills: boolean;
  specializedSkillsList?: string[];
  specializedSkillsExplanation?: string;
  militaryService: boolean;
  military?: {
    country: string;
    branch: string; // Exército, Marinha, Aeronáutica
    rank: string;
    specialty: string;
    startDate: DateField;
    endDate: DateField;
  };
  militaryServiceList?: Array<{ // dtlMILITARY_SERVICE (multi-entry) - Serviço militar obrigatório BR
    country: string;
    branch: string;
    rank: string;
    specialty: string;
    startDate: DateField;
    endDate: DateField;
  }>;
  insurgentOrg: boolean;
  insurgentOrgExplanation?: string;

  // --- Previous Spouse (PrevSpouse page - appears for D/W/L marital status) ---
  previousSpouse?: {
    numberOfFormerSpouses: string;
    surname: string;
    givenName: string;
    dob: DateField;
    nationality: string;
    cityOfBirth?: string;
    cityOfBirthUnknown?: boolean;
    countryOfBirth: string;
    dateOfMarriage: DateField;
    dateMarriageEnded: DateField;
    howMarriageEnded: string;
    countryMarriageTerminated: string;
  };

  // --- Social Media ---
  socialMedia: Array<{ platform: string; handle: string }>;

  // --- Security ---
  securityAnswers: string;
}

// ============================================================
// Profile 1: Single Male - Brazilian Engineer (baseline)
// All radios = NO, self-paying, no history
// ============================================================
const singleMale: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "SILVA",
  givenName: "JOAO PEDRO",
  fullNameNative: "João Pedro Silva",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "S",
  dob: { day: "15", month: "MAR", year: "1990" },
  cityOfBirth: "SAO PAULO",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "12345678900",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "01", month: "JUN", year: "2026" },
    departureDate: { day: "16", month: "JUN", year: "2026" },
    arrivalFlight: "AA8050",
    arrivalCity: "MIAMI",
    departureFlight: "AA8051",
    departureCity: "MIAMI",
    lengthOfStay: { value: "15", unit: "D" },
    location: "MIAMI",
    usAddress: { street1: "200 BISCAYNE BLVD", street2: "SUITE 100", city: "MIAMI", state: "FL", zip: "33131" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA AUGUSTA 1200", street2: "APTO 42", city: "SAO PAULO", state: "SAO PAULO", postalCode: "01304-001", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-11-91234-5678",
  mobilePhone: null,
  businessPhone: null,
  email: "joao.silva@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "FX123456", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "JAN", year: "2020" },
    expirationDate: { day: "10", month: "JAN", year: "2030" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL MARRIOTT MIAMI", givenName: "FRONT DESK",
    organization: "HOTEL MARRIOTT MIAMI", relationship: "H",
    street1: "200 BISCAYNE BLVD", city: "MIAMI", state: "FL", zip: "33131",
    phone: "+1-305-555-1234", email: "frontdesk@marriott.com",
  },

  father: { surname: "SILVA", givenName: "CARLOS", dob: { day: "22", month: "JUL", year: "1960" }, inUS: false },
  mother: { surname: "OLIVEIRA", givenName: "MARIA", dob: { day: "15", month: "DEC", year: "1962" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "EN",
  employer: {
    name: "EMPRESA TECH LTDA", street1: "AV PAULISTA 1000", city: "SAO PAULO", state: "SAO PAULO",
    postalCode: "01310-100", country: "BRAZIL", phone: "+55-11-3456-7890",
    startDate: { month: "MAR", year: "2018" }, monthlyIncome: "8000", duties: "SOFTWARE DEVELOPMENT",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "STARTUP BRASIL SA", street1: "RUA FARIA LIMA 500", city: "SAO PAULO", state: "SAO PAULO",
    postalCode: "01452-000", country: "BRAZIL", phone: "+55-11-2222-3333", jobTitle: "JUNIOR DEVELOPER",
    startDate: { month: "JAN", year: "2015" }, endDate: { month: "FEB", year: "2018" }, duties: "SOFTWARE DEVELOPMENT",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE DE SAO PAULO", street1: "AV PROF LUCIANO GUALBERTO 380",
    city: "SAO PAULO", state: "SAO PAULO", postalCode: "05508-010", country: "BRAZIL",
    courseOfStudy: "ENGENHARIA DA COMPUTACAO", startDate: { month: "FEB", year: "2010" }, endDate: { month: "DEC", year: "2014" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@joaosilva90" }, { platform: "LINKEDIN", handle: "joaopedrosilva" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 2: Married Female - Nurse, spouse paying
// Has been to US, has prior visa, traveling with spouse
// ============================================================
const marriedFemale: DS160Applicant = {
  location: "RDJ",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "SANTOS",
  givenName: "ANA CAROLINA",
  fullNameNative: "Ana Carolina Ferreira Santos",
  otherNamesUsed: true,
  otherNames: [{ surname: "FERREIRA", givenName: "ANA CAROLINA" }],
  telecode: false,
  sex: "F",
  maritalStatus: "M",
  dob: { day: "20", month: "AUG", year: "1988" },
  cityOfBirth: "RIO DE JANEIRO",
  stateOfBirth: "RIO DE JANEIRO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "98765432100",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "15", month: "JUL", year: "2026" },
    departureDate: { day: "30", month: "JUL", year: "2026" },
    arrivalFlight: "LA8080", arrivalCity: "NEW YORK",
    departureFlight: "LA8081", departureCity: "NEW YORK",
    lengthOfStay: { value: "15", unit: "D" }, location: "NEW YORK",
    usAddress: { street1: "1535 BROADWAY", city: "NEW YORK", state: "NY", zip: "10036" },
  },
  payingForTrip: "O",
  payer: {
    surname: "SANTOS", givenName: "MARCOS VINICIUS",
    phone: "552199887766", email: "marcos.santos@email.com",
    relationship: "S", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [{ surname: "SANTOS", givenName: "MARCOS VINICIUS", relationship: "S" }],
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "10", month: "DEC", year: "2022" }, lengthOfStay: "14", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "05", month: "SEP", year: "2021" }, number: "B12345678",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA VISCONDE DE PIRAJA 330", street2: "APTO 801", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO", postalCode: "22410-002", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-21-98765-4321",
  mobilePhone: null,
  businessPhone: null,
  email: "ana.santos@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "GH987654", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "RIO DE JANEIRO", issuedState: "RIO DE JANEIRO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "MAR", year: "2021" },
    expirationDate: { day: "15", month: "MAR", year: "2031" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL HILTON", givenName: "RESERVATIONS",
    organization: "HOTEL HILTON TIMES SQUARE", relationship: "H",
    street1: "234 W 42ND ST", city: "NEW YORK", state: "NY", zip: "10036",
    phone: "+1-212-555-9876", email: "reservations@hilton.com",
  },

  father: { surname: "FERREIRA", givenName: "ANTONIO", dob: { day: "10", month: "MAR", year: "1958" }, inUS: false },
  mother: { surname: "LIMA", givenName: "CLAUDIA", dob: { day: "25", month: "NOV", year: "1960" }, inUS: false },
  spouse: { surname: "SANTOS", givenName: "MARCOS VINICIUS", dob: { day: "03", month: "FEB", year: "1985" }, nationality: "BRAZIL", cityOfBirth: "RIO DE JANEIRO" },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "MD",
  employer: {
    name: "HOSPITAL SAO LUCAS", street1: "RUA BAMBINA 100", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO",
    postalCode: "22251-050", country: "BRAZIL", phone: "+55-21-3333-4444",
    startDate: { month: "JUN", year: "2016" }, monthlyIncome: "7000", duties: "PATIENT CARE AND NURSING",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "CLINICA SAO JOSE", street1: "AV ATLANTICA 500", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO",
    postalCode: "22010-000", country: "BRAZIL", phone: "+55-21-2222-1111", jobTitle: "NURSE",
    startDate: { month: "MAR", year: "2013" }, endDate: { month: "MAY", year: "2016" }, duties: "CLINICAL NURSING",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DO RIO DE JANEIRO", street1: "AV CARLOS CHAGAS FILHO 373",
    city: "RIO DE JANEIRO", state: "RIO DE JANEIRO", postalCode: "21941-902", country: "BRAZIL",
    courseOfStudy: "ENFERMAGEM", startDate: { month: "MAR", year: "2009" }, endDate: { month: "DEC", year: "2012" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@anacsantos" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 3: Divorced Male - Business, visa refused, military
// Company paying, countries visited
// ============================================================
const divorcedHistory: DS160Applicant = {
  location: "BRA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "OLIVEIRA",
  givenName: "RICARDO",
  fullNameNative: "Ricardo Oliveira",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "D",
  dob: { day: "05", month: "MAY", year: "1975" },
  cityOfBirth: "BRASILIA",
  stateOfBirth: "DISTRITO FEDERAL",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "55566677788",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "10", month: "AUG", year: "2026" },
    departureDate: { day: "17", month: "AUG", year: "2026" },
    arrivalFlight: "UA9090", arrivalCity: "HOUSTON",
    departureFlight: "UA9091", departureCity: "HOUSTON",
    lengthOfStay: { value: "7", unit: "D" }, location: "HOUSTON",
    usAddress: { street1: "1600 LAMAR ST", city: "HOUSTON", state: "TX", zip: "77010" },
  },
  payingForTrip: "C",
  payer: {
    companyName: "GLOBAL CONSULTING LTDA", phone: "556133334444",
    companyRelation: "EMPLOYER SPONSORED BUSINESS TRIP",
    street1: "SBS QUADRA 2 BLOCO E", city: "BRASILIA", state: "DISTRITO FEDERAL",
    postalCode: "70070-120", country: "BRAZIL",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "20", month: "MAR", year: "2018" }, lengthOfStay: "10", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: false,
  visaRefused: true,
  visaRefusedExplanation: "APPLIED FOR B1 B2 VISA IN 2019 AT EMBASSY BRASILIA REFUSED UNDER SECTION 214 B",
  immigrantPetition: false,

  homeAddress: { street1: "SQS 308 BLOCO A APTO 302", city: "BRASILIA", state: "DISTRITO FEDERAL", postalCode: "70356-010", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-61-99876-5432",
  email: "ricardo.oliveira@globalconsulting.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "JK456789", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "BRASILIA", issuedState: "DISTRITO FEDERAL", issuedCountry: "BRAZIL",
    issuanceDate: { day: "20", month: "JUN", year: "2022" },
    expirationDate: { day: "20", month: "JUN", year: "2032" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "SMITH", givenName: "JOHN",
    organization: "GLOBAL CONSULTING US INC", relationship: "B",
    street1: "1600 LAMAR ST SUITE 400", city: "HOUSTON", state: "TX", zip: "77010",
    phone: "+1-713-555-6789", email: "jsmith@globalconsulting.com",
  },

  father: { surname: "OLIVEIRA", givenName: "JOSE", dob: { day: "14", month: "APR", year: "1945" }, inUS: false },
  mother: { surname: "SOUZA", givenName: "TEREZA", dob: { day: "30", month: "SEP", year: "1948" }, inUS: false },
  spouse: { surname: "MENDES", givenName: "PATRICIA", dob: { day: "18", month: "OCT", year: "1978" }, nationality: "BRAZIL", cityOfBirth: "BRASILIA" },
  previousSpouse: {
    numberOfFormerSpouses: "1",
    surname: "MENDES", givenName: "PATRICIA",
    dob: { day: "18", month: "OCT", year: "1978" },
    nationality: "BRAZIL", cityOfBirth: "BRASILIA", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "15", month: "JUN", year: "2005" },
    dateMarriageEnded: { day: "10", month: "MAR", year: "2015" },
    howMarriageEnded: "DIVORCE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "B",
  employer: {
    name: "GLOBAL CONSULTING LTDA", street1: "SBS QUADRA 2 BLOCO E", city: "BRASILIA", state: "DISTRITO FEDERAL",
    postalCode: "70070-120", country: "BRAZIL", phone: "+55-61-3333-4444",
    startDate: { month: "JAN", year: "2010" }, monthlyIncome: "15000", duties: "BUSINESS CONSULTING AND PROJECT MANAGEMENT",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "BANCO DO BRASIL", street1: "SBS QUADRA 1 BLOCO G", city: "BRASILIA", state: "DISTRITO FEDERAL",
    postalCode: "70073-901", country: "BRAZIL", phone: "+55-61-3108-0000", jobTitle: "BUSINESS ANALYST",
    startDate: { month: "MAR", year: "2000" }, endDate: { month: "DEC", year: "2009" }, duties: "FINANCIAL ANALYSIS",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE DE BRASILIA", street1: "CAMPUS DARCY RIBEIRO",
    city: "BRASILIA", state: "DISTRITO FEDERAL", postalCode: "70910-900", country: "BRAZIL",
    courseOfStudy: "ADMINISTRACAO DE EMPRESAS", startDate: { month: "MAR", year: "1995" }, endDate: { month: "DEC", year: "1999" },
  }],

  languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["ARGENTINA", "CHILE", "UNITED STATES"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: true,
  military: {
    country: "BRAZIL", branch: "EXERCITO BRASILEIRO", rank: "SOLDADO", specialty: "INFANTARIA",
    startDate: { day: "01", month: "MAR", year: "1993" }, endDate: { day: "01", month: "MAR", year: "1994" },
  },
  insurgentOrg: false,

  socialMedia: [{ platform: "LINKEDIN", handle: "ricardooliveirabr" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 4: Widowed Female - Homemaker, lost passport,
// relative in US, dual nationality, father in US
// ============================================================
const widowedRelativeUS: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "COSTA",
  givenName: "MARIA HELENA",
  fullNameNative: "Maria Helena Costa",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "W",
  dob: { day: "12", month: "FEB", year: "1965" },
  cityOfBirth: "BELO HORIZONTE",
  stateOfBirth: "MINAS GERAIS",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: true,
  otherNationalityCountry: "PORTUGAL",
  otherNationalityPassport: true,
  permanentResidentOtherCountry: false,
  nationalId: "11122233344",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "SEP", year: "2026" },
    departureDate: { day: "05", month: "OCT", year: "2026" },
    arrivalFlight: "AA7070", arrivalCity: "ORLANDO",
    departureFlight: "AA7071", departureCity: "ORLANDO",
    lengthOfStay: { value: "30", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "7600 INTERNATIONAL DR", city: "ORLANDO", state: "FL", zip: "32819" },
  },
  payingForTrip: "O",
  payer: {
    surname: "COSTA", givenName: "PAULO HENRIQUE",
    phone: "14075551234", email: "paulo.costa@email.com",
    relationship: "C", sameAddress: false,
    street1: "1200 SAND LAKE RD", city: "ORLANDO", state: "FL",
    postalCode: "32809", country: "UNITED STATES",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "20", month: "JUN", year: "2019" }, lengthOfStay: "21", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "10", month: "APR", year: "2018" }, number: "C98765432",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA DA BAHIA 1500", street2: "APTO 1201", city: "BELO HORIZONTE", state: "MINAS GERAIS", postalCode: "30160-011", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-31-99888-7766",
  email: "maria.costa@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "LM112233", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "BELO HORIZONTE", issuedState: "MINAS GERAIS", issuedCountry: "BRAZIL",
    issuanceDate: { day: "01", month: "FEB", year: "2018" },
    expirationDate: { day: "01", month: "FEB", year: "2028" },
    lostOrStolen: true,
    lostPassport: { number: "CD987654", country: "BRAZIL", explanation: "PASSPORT LOST DURING TRAVEL TO ARGENTINA IN DECEMBER 2021" },
  },

  usContact: {
    surname: "COSTA", givenName: "PAULO HENRIQUE",
    relationship: "R", street1: "1200 SAND LAKE RD",
    city: "ORLANDO", state: "FL", zip: "32809",
    phone: "+1-407-555-1234", email: "paulo.costa@email.com",
  },

  father: { surname: "ALMEIDA", givenName: "FRANCISCO", dob: { day: "08", month: "JAN", year: "1940" }, inUS: true, usStatus: "S" },
  mother: { surname: "PEREIRA", givenName: "ROSA", dob: { day: "20", month: "JUN", year: "1942" }, inUS: false },
  spouse: { surname: "COSTA", givenName: "ROBERTO", dob: { day: "30", month: "APR", year: "1960" }, nationality: "BRAZIL", cityOfBirth: "BELO HORIZONTE" },
  previousSpouse: {
    numberOfFormerSpouses: "1",
    surname: "COSTA", givenName: "ROBERTO",
    dob: { day: "30", month: "APR", year: "1960" },
    nationality: "BRAZIL", cityOfBirth: "BELO HORIZONTE", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "20", month: "DEC", year: "1988" },
    dateMarriageEnded: { day: "15", month: "AUG", year: "2020" },
    howMarriageEnded: "DEATH OF SPOUSE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: true,
  immediateRelative: { surname: "COSTA", givenName: "PAULO HENRIQUE", relationship: "C", status: "S" },
  otherRelativesInUS: false,

  occupationCode: "H",
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "ESCRITORIO CONTABIL BH", street1: "AV AFONSO PENA 2000", city: "BELO HORIZONTE", state: "MINAS GERAIS",
    postalCode: "30130-007", country: "BRAZIL", phone: "+55-31-3222-1111", jobTitle: "ACCOUNTING ASSISTANT",
    startDate: { month: "JAN", year: "1990" }, endDate: { month: "DEC", year: "2000" }, duties: "BOOKKEEPING AND ACCOUNTING",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE MINAS GERAIS", street1: "AV ANTONIO CARLOS 6627",
    city: "BELO HORIZONTE", state: "MINAS GERAIS", postalCode: "31270-901", country: "BRAZIL",
    courseOfStudy: "CIENCIAS CONTABEIS", startDate: { month: "MAR", year: "1985" }, endDate: { month: "DEC", year: "1989" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["ARGENTINA", "UNITED STATES", "PORTUGAL"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "FACEBOOK", handle: "mariahelenacosta65" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 5: Complex All-YES - Exercises every branch
// Married male, other names, telecode, dual nationality,
// permanent resident, company paying, travel companions,
// group travel, prior US travel, prior visa, refused, petition,
// different mailing address, additional phones/emails/social,
// lost passport, parents in US, immediate relative,
// prev employment, education, clan, countries visited,
// organization, specialized skills, military, insurgent org
// ============================================================
const complexAllYes: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  // Personal 1
  surname: "PEREIRA",
  givenName: "LUCAS GABRIEL",
  fullNameNative: "Lucas Gabriel Pereira",
  otherNamesUsed: true,
  otherNames: [
    { surname: "RODRIGUES", givenName: "LUCAS" },
    { surname: "PEREIRA RODRIGUES", givenName: "LUCAS G" },
  ],
  telecode: false,
  sex: "M",
  maritalStatus: "M",
  dob: { day: "10", month: "APR", year: "1982" },
  cityOfBirth: "CURITIBA",
  stateOfBirth: "PARANA",
  countryOfBirth: "BRAZIL",

  // Personal 2
  nationality: "BRAZIL",
  otherNationality: true,
  otherNationalityCountry: "ITALY",
  otherNationalityPassport: true,
  otherNationalityPassportNumber: "YA1234567",
  permanentResidentOtherCountry: true,
  permanentResidentCountry: "PORTUGAL",
  nationalId: "44455566677",
  usSsn: null,
  usTaxpayerId: null,

  // Travel
  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "20", month: "OCT", year: "2026" },
    departureDate: { day: "05", month: "NOV", year: "2026" },
    arrivalFlight: "DL9000",
    arrivalCity: "ATLANTA",
    departureFlight: "DL9001",
    departureCity: "ATLANTA",
    lengthOfStay: { value: "16", unit: "D" },
    location: "ATLANTA",
    usAddress: { street1: "265 PEACHTREE CENTER AVE", street2: "SUITE 200", city: "ATLANTA", state: "GA", zip: "30303" },
  },
  payingForTrip: "C",
  payer: {
    companyName: "TECH SOLUTIONS BRASIL LTDA",
    phone: "554132225555",
    companyRelation: "EMPLOYER SPONSORED CONFERENCE",
    street1: "RUA XV DE NOVEMBRO 700",
    street2: "SALA 301",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80020-310",
    country: "BRAZIL",
  },

  // Travel Companions
  travelingWithOthers: true,
  companions: [
    { surname: "PEREIRA", givenName: "JULIANA MARIA", relationship: "S" },
    { surname: "SANTOS", givenName: "CARLOS EDUARDO", relationship: "O" },
  ],
  partOfGroup: true,
  groupName: "TECH CONFERENCE BRAZIL DELEGATION",

  // Previous US Travel
  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "15", month: "MAY", year: "2020" }, lengthOfStay: "10", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "20", month: "FEB", year: "2019" },
    number: "D5566778",
    sameType: true,
    sameCountry: true,
    tenPrint: true,
    lost: false,
    cancelled: false,
  },
  visaRefused: true,
  visaRefusedExplanation: "APPLIED FOR H1B IN 2017 AT CONSULATE SAO PAULO REFUSED DUE TO INCOMPLETE DOCUMENTATION",
  immigrantPetition: true,
  immigrantPetitionExplanation: "EMPLOYER FILED I-140 PETITION IN 2018. PETITION WAS WITHDRAWN BY EMPLOYER.",
  permanentResident: true,
  permanentResidentExplanation: "PERMANENT RESIDENT OF PORTUGAL SINCE 2019 THROUGH GOLDEN VISA PROGRAM",
  vwpDenial: true,
  vwpDenialExplanation: "DENIED ENTRY UNDER VWP AT JFK IN 2016 DUE TO PREVIOUS OVERSTAY",

  // Address & Phone
  homeAddress: { street1: "RUA MARECHAL DEODORO 500", street2: "APTO 1502", city: "CURITIBA", state: "PARANA", postalCode: "80010-010", country: "BRAZIL" },
  mailingAddressSame: false,
  mailingAddress: {
    street1: "CAIXA POSTAL 1234",
    street2: "",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80001-970",
    country: "BRAZIL",
  },
  phone: "+55-41-99876-5432",
  mobilePhone: "+55-41-98765-4321",
  businessPhone: "+55-41-3222-5555",
  email: "lucas.pereira@techsolutions.com.br",
  additionalPhones: true,
  additionalPhoneNumbers: ["554132221111", "554198887766"],
  additionalEmails: true,
  additionalEmailAddresses: ["lucas.gabriel@gmail.com", "lg.pereira@outlook.com"],
  additionalWebsites: false,
  additionalSocialMedia: true,
  additionalSocialMediaAccounts: [
    { platform: "TWITTER", handle: "@lucaspereira82" },
    { platform: "INSTAGRAM", handle: "@lgpereira_tech" },
  ],

  // Passport
  passport: {
    type: "R",
    number: "NP334455",
    bookNumber: null,
    issuingCountry: "BRAZIL",
    issuedCity: "CURITIBA",
    issuedState: "PARANA",
    issuedCountry: "BRAZIL",
    issuanceDate: { day: "05", month: "AUG", year: "2021" },
    expirationDate: { day: "05", month: "AUG", year: "2031" },
    lostOrStolen: true,
    lostPassport: {
      number: "MN112233",
      country: "BRAZIL",
      explanation: "PASSPORT STOLEN FROM HOTEL ROOM IN BUENOS AIRES ARGENTINA IN MARCH 2020",
    },
  },

  // US Contact
  usContact: {
    surname: "JOHNSON",
    givenName: "MICHAEL",
    organization: "TECH SOLUTIONS US INC",
    relationship: "B",
    street1: "265 PEACHTREE CENTER AVE SUITE 400",
    city: "ATLANTA",
    state: "GA",
    zip: "30303",
    phone: "+1-404-555-7890",
    email: "mjohnson@techsolutions.com",
  },

  // Family
  father: { surname: "PEREIRA", givenName: "ROBERTO", dob: { day: "18", month: "JAN", year: "1955" }, inUS: true, usStatus: "C" },
  mother: { surname: "RODRIGUES", givenName: "SANDRA", dob: { day: "25", month: "JUN", year: "1958" }, inUS: true, usStatus: "P" },
  spouse: {
    surname: "PEREIRA",
    givenName: "JULIANA MARIA",
    dob: { day: "14", month: "SEP", year: "1985" },
    nationality: "BRAZIL",
    cityOfBirth: "CURITIBA",
    pobCountry: "BRAZIL",
    addressType: "H",
  },
  relativesInUS: true,
  immediateRelative: { surname: "PEREIRA", givenName: "ROBERTO", relationship: "F", status: "C" },
  otherRelativesInUS: false,

  // Work/Education
  occupationCode: "CS",
  employer: {
    name: "TECH SOLUTIONS BRASIL LTDA",
    street1: "RUA XV DE NOVEMBRO 700",
    street2: "SALA 301",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80020-310",
    country: "BRAZIL",
    phone: "+55-41-3222-5555",
    startDate: { month: "MAR", year: "2015" },
    monthlyIncome: "12000",
    duties: "SOFTWARE ARCHITECTURE AND TEAM MANAGEMENT",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "EMPRESA DE INFORMATICA SA",
    street1: "AV SETE DE SETEMBRO 3000",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80240-000",
    country: "BRAZIL",
    phone: "+55-41-3333-2222",
    jobTitle: "SOFTWARE DEVELOPER",
    startDate: { month: "JAN", year: "2008" },
    endDate: { month: "FEB", year: "2015" },
    duties: "APPLICATION DEVELOPMENT AND MAINTENANCE",
  }, {
    name: "STARTUP DIGITAL LTDA",
    street1: "RUA COMENDADOR ARAUJO 100",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80420-000",
    country: "BRAZIL",
    phone: "+55-41-3111-4444",
    jobTitle: "JUNIOR DEVELOPER",
    startDate: { month: "JUN", year: "2005" },
    endDate: { month: "DEC", year: "2007" },
    duties: "WEB DEVELOPMENT AND DATABASE ADMINISTRATION",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DO PARANA",
    street1: "RUA XV DE NOVEMBRO 1299",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80060-000",
    country: "BRAZIL",
    courseOfStudy: "CIENCIA DA COMPUTACAO",
    startDate: { month: "MAR", year: "2001" },
    endDate: { month: "DEC", year: "2005" },
  }, {
    name: "PONTIFICIA UNIVERSIDADE CATOLICA DO PARANA",
    street1: "RUA IMACULADA CONCEICAO 1155",
    city: "CURITIBA",
    state: "PARANA",
    postalCode: "80215-901",
    country: "BRAZIL",
    courseOfStudy: "MBA GESTAO DE PROJETOS",
    startDate: { month: "MAR", year: "2010" },
    endDate: { month: "DEC", year: "2012" },
  }],

  // WE3 - All YES
  languages: ["PORTUGUESE", "ENGLISH", "ITALIAN"],
  clanTribe: true,
  clanTribeName: "GUARANI",
  countriesVisited: true,
  countriesVisitedList: ["ARGENTINA", "CHILE", "PORTUGAL"],
  organizationMember: true,
  organizationName: "IEEE COMPUTER SOCIETY",
  specializedSkills: true,
  specializedSkillsExplanation: "ADVANCED CRYPTOGRAPHY AND NETWORK SECURITY RESEARCH",
  militaryService: true,
  military: {
    country: "BRAZIL",
    branch: "EXERCITO BRASILEIRO",
    rank: "CABO",
    specialty: "COMUNICACOES",
    startDate: { day: "01", month: "FEB", year: "2000" },
    endDate: { day: "01", month: "FEB", year: "2001" },
  },
  insurgentOrg: false,

  socialMedia: [{ platform: "LINKEDIN", handle: "lucasgpereira" }, { platform: "INSTAGRAM", handle: "@lucaspereira82" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 6: Civil Union Female - SSN, DL, US Petitioner paying
// Tests: P marital status, SSN fields, DL fields, payer U
// ============================================================
const civilUnionSSN: DS160Applicant = {
  location: "RDJ",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "BARBOSA",
  givenName: "CAMILA CRISTINA",
  fullNameNative: "Camila Cristina Barbosa",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "P", // Civil Union / Domestic Partnership
  dob: { day: "22", month: "NOV", year: "1991" },
  cityOfBirth: "PORTO ALEGRE",
  stateOfBirth: "RIO GRANDE DO SUL",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "77788899900",
  usSsn: "123456789", // Has SSN from prior work authorization
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "10", month: "DEC", year: "2026" },
    departureDate: { day: "25", month: "DEC", year: "2026" },
    arrivalFlight: "UA7700", arrivalCity: "NEWARK",
    departureFlight: "UA7701", departureCity: "NEWARK",
    lengthOfStay: { value: "15", unit: "D" }, location: "NEW YORK",
    usAddress: { street1: "350 FIFTH AVE", street2: "SUITE 3300", city: "NEW YORK", state: "NY", zip: "10118" },
  },
  payingForTrip: "H", // US Petitioner
  payer: {
    companyName: "GLOBAL MEDIA CORP",
    phone: "12125559999",
    companyRelation: "US PETITIONER FOR WORK CONFERENCE",
    street1: "350 FIFTH AVE",
    street2: "SUITE 3300",
    city: "NEW YORK",
    state: "NY",
    postalCode: "10118",
    country: "UNITED STATES",
  },

  travelingWithOthers: true,
  companions: [{ surname: "BARBOSA", givenName: "RAFAEL AUGUSTO", relationship: "P" }],
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "01", month: "FEB", year: "2023" }, lengthOfStay: "90", lengthOfStayUnit: "D" },
  previousUSDriversLicense: true,
  previousUSDriversLicenseNumber: "B12345678",
  previousUSDriversLicenseState: "NY",
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "10", month: "JAN", year: "2022" }, number: "A1234567",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA DOS ANDRADAS 1200", street2: "APTO 601", city: "PORTO ALEGRE", state: "RIO GRANDE DO SUL", postalCode: "90020-008", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-51-99876-1234",
  mobilePhone: "+55-51-98765-4321",
  businessPhone: null,
  email: "camila.barbosa@globalmedia.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "QR556677", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "PORTO ALEGRE", issuedState: "RIO GRANDE DO SUL", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "MAY", year: "2022" },
    expirationDate: { day: "15", month: "MAY", year: "2032" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "WILLIAMS", givenName: "SARAH",
    organization: "GLOBAL MEDIA CORP", relationship: "B",
    street1: "350 FIFTH AVE SUITE 3300", city: "NEW YORK", state: "NY", zip: "10118",
    phone: "+1-212-555-9999", email: "swilliams@globalmedia.com",
  },

  father: { surname: "BARBOSA", givenName: "FERNANDO", dob: { day: "05", month: "MAR", year: "1963" }, inUS: false },
  mother: { surname: "NASCIMENTO", givenName: "PATRICIA", dob: { day: "18", month: "JUL", year: "1966" }, inUS: false },
  spouse: { surname: "BARBOSA", givenName: "RAFAEL AUGUSTO", dob: { day: "09", month: "JAN", year: "1989" }, nationality: "BRAZIL", cityOfBirth: "PORTO ALEGRE", pobCountry: "BRAZIL", addressType: "H" },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "AC", // Artist/Performer
  employer: {
    name: "AGENCIA CRIATIVA LTDA", street1: "AV INDEPENDENCIA 900", city: "PORTO ALEGRE", state: "RIO GRANDE DO SUL",
    postalCode: "90035-072", country: "BRAZIL", phone: "+55-51-3333-7777",
    startDate: { month: "FEB", year: "2019" }, monthlyIncome: "9000", duties: "CREATIVE DIRECTION AND MEDIA PRODUCTION",
  },
  hasPreviousEmployment: false,
  hasEducation: true,
  education: [{
    name: "PONTIFICA UNIVERSIDADE CATOLICA DO RS", street1: "AV IPIRANGA 6681",
    city: "PORTO ALEGRE", state: "RIO GRANDE DO SUL", postalCode: "90619-900", country: "BRAZIL",
    courseOfStudy: "COMUNICACAO SOCIAL", startDate: { month: "MAR", year: "2010" }, endDate: { month: "DEC", year: "2013" },
  }],

  languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@camilabarbosa91" }, { platform: "LINKEDIN", handle: "camilacbarbosa" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 7: Separated Male, Other marital text, insurgent org
// Tests: L marital status, payer=S, insurgent org YES
// ============================================================
const separatedOther: DS160Applicant = {
  location: "BRA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "ARAUJO",
  givenName: "MARCOS ANTONIO",
  fullNameNative: "Marcos Antonio Araujo",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "L", // Legally Separated
  dob: { day: "28", month: "JAN", year: "1970" },
  cityOfBirth: "RECIFE",
  stateOfBirth: "PERNAMBUCO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "33344455566",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "MAR", year: "2027" },
    departureDate: { day: "15", month: "MAR", year: "2027" },
    arrivalFlight: "DL5500", arrivalCity: "ATLANTA",
    departureFlight: "DL5501", departureCity: "ATLANTA",
    lengthOfStay: { value: "10", unit: "D" }, location: "ATLANTA",
    usAddress: { street1: "100 CNN CENTER NW", city: "ATLANTA", state: "GA", zip: "30303" },
  },
  payingForTrip: "S", // Self

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV BOA VIAGEM 3000", street2: "APTO 1801", city: "RECIFE", state: "PERNAMBUCO", postalCode: "51020-001", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-81-99876-3210",
  mobilePhone: "+55-81-98765-1234",
  businessPhone: null,
  email: "marcos.araujo@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "ST778899", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "RECIFE", issuedState: "PERNAMBUCO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "OCT", year: "2023" },
    expirationDate: { day: "10", month: "OCT", year: "2033" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL MARRIOTT", givenName: "FRONT DESK",
    organization: "MARRIOTT ATLANTA DOWNTOWN", relationship: "H",
    street1: "160 SPRING ST NW", city: "ATLANTA", state: "GA", zip: "30303",
    phone: "+1-404-555-3333", email: "atlanta@marriott.com",
  },

  father: { surname: "ARAUJO", givenName: "JOSE CARLOS", dob: { day: "12", month: "JUN", year: "1940" }, inUS: false },
  mother: { surname: "MONTEIRO", givenName: "LUCIA", dob: { day: "30", month: "OCT", year: "1945" }, inUS: false },
  spouse: {
    surname: "FERREIRA", givenName: "SIMONE", dob: { day: "22", month: "MAR", year: "1975" },
    nationality: "BRAZIL", cityOfBirth: "RECIFE", pobCountry: "BRAZIL", addressType: "O",
    address: { street1: "RUA DA AURORA 500", street2: "APTO 302", city: "RECIFE", state: "PERNAMBUCO", postalCode: "50050-000", country: "BRAZIL" },
  },
  previousSpouse: {
    numberOfFormerSpouses: "1",
    surname: "FERREIRA", givenName: "SIMONE",
    dob: { day: "22", month: "MAR", year: "1975" },
    nationality: "BRAZIL", cityOfBirth: "RECIFE", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "10", month: "NOV", year: "2000" },
    dateMarriageEnded: { day: "05", month: "JUN", year: "2018" },
    howMarriageEnded: "LEGAL SEPARATION",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "GV", // Government
  employer: {
    name: "PREFEITURA DO RECIFE", street1: "AV CAIS DO APOLO 925", city: "RECIFE", state: "PERNAMBUCO",
    postalCode: "50030-903", country: "BRAZIL", phone: "+55-81-3355-8000",
    startDate: { month: "JAN", year: "2005" }, monthlyIncome: "6000", duties: "PUBLIC ADMINISTRATION AND URBAN PLANNING",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "GOVERNO DO ESTADO DE PERNAMBUCO", street1: "AV CRUZ CABUGA 665", city: "RECIFE", state: "PERNAMBUCO",
    postalCode: "50040-000", country: "BRAZIL", phone: "+55-81-3184-3000", jobTitle: "ADMINISTRATIVE ASSISTANT",
    startDate: { month: "MAR", year: "1995" }, endDate: { month: "DEC", year: "2004" }, duties: "ADMINISTRATIVE SUPPORT",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE PERNAMBUCO", street1: "AV PROF MORAES REGO 1235",
    city: "RECIFE", state: "PERNAMBUCO", postalCode: "50670-901", country: "BRAZIL",
    courseOfStudy: "DIREITO", startDate: { month: "MAR", year: "1990" }, endDate: { month: "DEC", year: "1994" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: true,
  organizationName: "ORDEM DOS ADVOGADOS DO BRASIL",
  specializedSkills: false,
  militaryService: true,
  military: {
    country: "BRAZIL", branch: "MARINHA DO BRASIL", rank: "MARINHEIRO", specialty: "ADMINISTRACAO NAVAL",
    startDate: { day: "01", month: "MAR", year: "1988" }, endDate: { day: "01", month: "MAR", year: "1989" },
  },
  insurgentOrg: true,
  insurgentOrgExplanation: "PARTICIPATED IN STUDENT POLITICAL MOVEMENT DURING UNIVERSITY IN 1992. NO VIOLENT ACTIVITIES.",

  socialMedia: [{ platform: "FACEBOOK", handle: "marcosaaraujo70" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 8: Child Minor (8 years old) - Minimal info
// Tests: under-14 applicant, no work/education, parent paying
// Most sections simplified or skipped
// ============================================================
const childMinor: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "LIMA",
  givenName: "PEDRO HENRIQUE",
  fullNameNative: "Pedro Henrique Lima",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "S",
  dob: { day: "15", month: "JUN", year: "2018" },
  cityOfBirth: "SAO PAULO",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "55566677788",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "20", month: "JUL", year: "2026" },
    departureDate: { day: "10", month: "AUG", year: "2026" },
    arrivalFlight: "LA8100", arrivalCity: "MIAMI",
    departureFlight: "LA8101", departureCity: "MIAMI",
    lengthOfStay: { value: "21", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "8000 INTERNATIONAL DR", city: "ORLANDO", state: "FL", zip: "32819" },
  },
  payingForTrip: "O", // Parent paying
  payer: {
    surname: "LIMA", givenName: "ROBERTO CARLOS",
    phone: "551199887766", email: "roberto.lima@email.com",
    relationship: "P", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [{ surname: "LIMA", givenName: "ROBERTO CARLOS", relationship: "P" }],
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA OSCAR FREIRE 500", street2: "APTO 301", city: "SAO PAULO", state: "SAO PAULO", postalCode: "01426-001", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-11-91234-9999",
  mobilePhone: null,
  businessPhone: null,
  email: "roberto.lima@email.com", // Parent's email
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "UV112233", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "MAR", year: "2023" },
    expirationDate: { day: "10", month: "MAR", year: "2028" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL HILTON", givenName: "RESERVATIONS",
    organization: "HILTON ORLANDO BONNET CREEK", relationship: "H",
    street1: "14100 BONNET CREEK RESORT LN", city: "ORLANDO", state: "FL", zip: "32821",
    phone: "+1-407-555-7777", email: "reservations@hilton.com",
  },

  father: { surname: "LIMA", givenName: "ROBERTO CARLOS", dob: { day: "10", month: "SEP", year: "1985" }, inUS: false },
  mother: { surname: "SANTOS", givenName: "JULIANA", dob: { day: "25", month: "APR", year: "1988" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "N", // Not employed (child)
  occupationExplanation: "MINOR CHILD AGED 8",
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "NONE", handle: "NONE" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 9: Teen Male (17 years old) - More fields than child
// Tests: 16+ male applicant, student, self-payer (parents),
// additional security questions for males 16-45
// ============================================================
const teenMale: DS160Applicant = {
  location: "PTA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "FERNANDES",
  givenName: "GABRIEL LUCAS",
  fullNameNative: "Gabriel Lucas Fernandes",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "S",
  dob: { day: "08", month: "SEP", year: "2009" },
  cityOfBirth: "CAMPINAS",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "99900011122",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "15", month: "JAN", year: "2027" },
    departureDate: { day: "30", month: "JAN", year: "2027" },
    arrivalFlight: "AA9200", arrivalCity: "DALLAS",
    departureFlight: "AA9201", departureCity: "DALLAS",
    lengthOfStay: { value: "15", unit: "D" }, location: "DALLAS",
    usAddress: { street1: "1717 N AKARD ST", city: "DALLAS", state: "TX", zip: "75201" },
  },
  payingForTrip: "O", // Parent paying
  payer: {
    surname: "FERNANDES", givenName: "MARCELO",
    phone: "551932221111", email: "marcelo.fernandes@email.com",
    relationship: "P", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [
    { surname: "FERNANDES", givenName: "MARCELO", relationship: "P" },
    { surname: "RIBEIRO", givenName: "CAROLINA", relationship: "P" },
  ],
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV JOSE DE SOUZA CAMPOS 800", street2: "APTO 102", city: "CAMPINAS", state: "SAO PAULO", postalCode: "13092-123", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-19-3222-1111",
  mobilePhone: "+55-19-98765-9999",
  businessPhone: null,
  email: "gabrielfernandes2009@gmail.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "WX334455", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "CAMPINAS", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "20", month: "JUN", year: "2024" },
    expirationDate: { day: "20", month: "JUN", year: "2029" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL OMNI", givenName: "FRONT DESK",
    organization: "OMNI DALLAS HOTEL", relationship: "H",
    street1: "555 S LAMAR ST", city: "DALLAS", state: "TX", zip: "75202",
    phone: "+1-214-555-6000", email: "dallas@omnihotels.com",
  },

  father: { surname: "FERNANDES", givenName: "MARCELO", dob: { day: "15", month: "FEB", year: "1980" }, inUS: false },
  mother: { surname: "RIBEIRO", givenName: "CAROLINA", dob: { day: "20", month: "NOV", year: "1982" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "ST", // Student
  employer: {
    name: "COLEGIO OBJETIVO CAMPINAS", street1: "RUA BARAO DE JAGUARA 500", city: "CAMPINAS", state: "SAO PAULO",
    postalCode: "13015-001", country: "BRAZIL", phone: "+55-19-3231-5555",
    startDate: { month: "FEB", year: "2024" }, monthlyIncome: "0", duties: "STUDENT",
  },
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@gabrielf2009" }, { platform: "TIKTOK", handle: "@gabrielfernandes" }],
  securityAnswers: "ALL_NO",
};

// ==========================================================================
// PROFILE 2: "business-complex" - B1 Business with EVERYTHING
// Tests: Dual citizenship (IT), 3 US visits, 2 relatives in US, 2 previous employers,
//        3 countries visited, prev education, lost passport, organizations, languages
// ==========================================================================
export const businessComplex: DS160Applicant = {
  location: "SAO", // São Paulo
  securityQuestion: "Favorite teacher's name",
  securityAnswer: "VO",

  surname: "MARTINEZ",
  givenName: "RICARDO",
  fullNameNative: "RICARDO MARTINEZ",
  otherNamesUsed: true,
  otherNames: [
    { surname: "MARTINEZ ROSSI", givenName: "RICARDO" }, // Italian surname
  ],
  telecode: false,
  sex: "M",
  maritalStatus: "M", // Married
  dob: { day: "22", month: "NOV", year: "1982" },
  cityOfBirth: "SAO PAULO",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  // Spouse info
  spouse: {
    surname: "MARTINEZ",
    givenName: "FERNANDA",
    dob: { day: "10", month: "JUL", year: "1985" },
    nationality: "BRAZIL",
    cityOfBirth: "SAO PAULO",

    pobCountry: "BRAZIL",
  },

  // 🆕 DUAL CITIZENSHIP (dtlOTHER_NATL - Add Another)
  nationality: "BRAZIL",
  otherNationality: true,
  otherNationalityList: [
    { country: "ITALY", hasOtherPassport: true }, // Italian citizenship through grandfather
  ],

  nationalId: "234567890-12",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2", // Business/Tourism (always B1/B2)
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "AUG", year: "2027" },
    departureDate: { day: "12", month: "AUG", year: "2027" },
    arrivalFlight: "LATAM8050", arrivalCity: "MIAMI",
    departureFlight: "LATAM8051", departureCity: "MIAMI",
    lengthOfStay: { value: "7", unit: "D" },
    location: "MIAMI",
    usAddress: { street1: "2889 MCFARLANE RD", city: "MIAMI", state: "FL", zip: "33133" },
  },
  payingForTrip: "C", // Company
  payer: {
    companyName: "EMBRAER SA",
    companyRelation: "EMPLOYER",
    street1: "AV BRIGADEIRO FARIA LIMA 2170",
    city: "SAO JOSE DOS CAMPOS",
    state: "SAO PAULO",
    postalCode: "12227-901",
    country: "BRAZIL",
    phone: "+55-12-3927-4000",
    email: "travel@embraer.com.br",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  // 🆕 3 PREVIOUS US VISITS (dtlPREV_US_VISIT - Add Another)
  hasBeenInUS: true,
  previousUSVisitsList: [
    {
      arrivalDate: { day: "10", month: "MAR", year: "2019" },
      lengthOfStay: "5",
      lengthOfStayUnit: "D",
      usDriverLicenses: undefined, // No license on this trip
    },
    {
      arrivalDate: { day: "20", month: "SEP", year: "2021" },
      lengthOfStay: "10",
      lengthOfStayUnit: "D",
      // 🆕 NESTED: Got FL license on 2nd trip (dtlUS_DRIVER_LICENSE)
      usDriverLicenses: [
        { number: "M123-456-78-901-0", state: "FLORIDA", numberNA: false },
      ],
    },
    {
      arrivalDate: { day: "15", month: "FEB", year: "2024" },
      lengthOfStay: "14",
      lengthOfStayUnit: "D",
      usDriverLicenses: undefined,
    },
  ],

  previousUSDriversLicense: true,
  previousUSDriversLicenseNumber: "M123-456-78-901-0",
  previousUSDriversLicenseState: "FLORIDA",

  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "01", month: "FEB", year: "2019" },
    number: "77123456",
    numberNA: false,
    sameType: true, // B1/B2
    sameCountry: true,
    tenPrint: true,
    lost: false,
    cancelled: false,
  },

  // 🆕 LOST PASSPORT (dtlLostPPT - Add Another)
  passport: {
    type: "R", number: "ZB334455", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "MAY", year: "2024" },
    expirationDate: { day: "15", month: "MAY", year: "2034" },
    lostOrStolen: true,
    lostPassportsList: [
      {
        number: "ZA998877",
        country: "BRAZIL",
        explanation: "PASSPORT LOST DURING BUSINESS TRIP TO NEW YORK IN 2023. REPORTED TO BRAZILIAN CONSULATE AND LOCAL POLICE.",
      },
    ],
  },

  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA JOAQUIM FLORIANO 1000", street2: "APTO 1502", city: "SAO PAULO", state: "SAO PAULO", postalCode: "04534-004", country: "BRAZIL" },
  mailingAddressSame: true,

  // 🆕 ADDITIONAL PHONES (dtlAddPhone - Add Another)
  phone: "+55-11-3456-7890",
  mobilePhone: "+55-11-98765-4321",
  businessPhone: "+55-12-3927-4100",
  additionalPhones: true,
  additionalPhoneNumbers: ["212345678"],

  // 🆕 ADDITIONAL EMAILS (dtlAddEmail - Add Another)
  email: "ricardo.martinez@embraer.com.br",
  additionalEmails: true,
  additionalEmailAddresses: [
    "ricardo.martinez@gmail.com",
    "r.martinez@fastmail.com",
  ],

  // 🆕 SOCIAL MEDIA (dtlAddSocial - Add Another)
  additionalWebsites: true,
  socialMedia: [
    { platform: "LINKEDIN", handle: "ricardo-martinez-aerospace" },
    { platform: "TWITTER", handle: "@ricmartinez_aero" },
    { platform: "FACEBOOK", handle: "ricardomartinezofficial" },
  ],

  usContact: {
    surname: "BOEING", givenName: "SALES DEPARTMENT",
    organization: "BOEING COMMERCIAL AIRPLANES", relationship: "B", // Business
    street1: "100 N RIVERSIDE PLZ", city: "CHICAGO", state: "IL", zip: "60606",
    phone: "+1-312-544-2000", email: "sales@boeing.com",
  },

  father: { surname: "MARTINEZ", givenName: "JOSE", dob: { day: "15", month: "APR", year: "1955" }, inUS: false },
  mother: { surname: "ROSSI", givenName: "GIULIA", dob: { day: "20", month: "SEP", year: "1958" }, inUS: false },

  // 🆕 2 RELATIVES IN US (dlUSRelatives - Add Another)
  relativesInUS: true,
  immediateRelatives: [
    {
      surname: "MARTINEZ",
      givenName: "CARLOS",
      relationship: "O", // Other (cousin)
      status: "C", // US Citizen
    },
  ],
  otherRelativesInUS: true,
  /* otherRelatives: [
    {
      surname: "ROSSI",
      givenName: "MARCO",
      relationship: "O", // Uncle
      status: "LPR", // Permanent Resident
    },
  ], */

  occupationCode: "EN", // Engineering
  employer: {
    name: "EMBRAER SA", street1: "AV BRIGADEIRO FARIA LIMA 2170", city: "SAO JOSE DOS CAMPOS", state: "SAO PAULO",
    postalCode: "12227-901", country: "BRAZIL", phone: "+55-12-3927-4000",
    startDate: { month: "JAN", year: "2015" }, monthlyIncome: "28000", duties: "SENIOR AEROSPACE ENGINEER - AIRCRAFT DESIGN",
  },

  // 🆕 PREVIOUS EMPLOYMENT (dtlPrevEmpl - Add Another)
  hasPreviousEmployment: true,
  previousEmployment: [
    {
      name: "AVIANCA BRASIL",
      street1: "AV WASHINGTON LUIS 7059",
      city: "SAO PAULO",
      state: "SAO PAULO",
      postalCode: "04627-006",
      country: "BRAZIL",
      phone: "+55-11-4502-3000",
      jobTitle: "AIRCRAFT MAINTENANCE ENGINEER",
      startDate: { month: "MAR", year: "2010" },
      endDate: { month: "DEC", year: "2014" },
      duties: "AIRCRAFT MAINTENANCE ENGINEER",
    },
    {
      name: "TAM LINHAS AEREAS",
      street1: "RUA ÁTICA 673",
      city: "SAO PAULO",
      state: "SAO PAULO",
      postalCode: "04634-042",
      country: "BRAZIL",
      phone: "+55-11-5582-8700",
      jobTitle: "JUNIOR ENGINEER",
      startDate: { month: "JAN", year: "2008" },
      endDate: { month: "FEB", year: "2010" },
      duties: "JUNIOR ENGINEER",
    },
  ],

  // 🆕 EDUCATION (dtlPrevEduc - Add Another)
  hasEducation: true,
  education: [
    {
      name: "INSTITUTO TECNOLOGICO DE AERONAUTICA (ITA)",
      street1: "PRACA MARECHAL EDUARDO GOMES 50",
      city: "SAO JOSE DOS CAMPOS",
      state: "SAO PAULO",
      postalCode: "12228-900",
      country: "BRAZIL",
      courseOfStudy: "AERONAUTICAL ENGINEERING",
      startDate: { month: "FEB", year: "2001" },
      endDate: { month: "DEC", year: "2005" },
    },
  ],

  // 🆕 LANGUAGES (dtlLANGUAGES - Add Another)
  languages: ["PORTUGUESE", "ENGLISH", "ITALIAN", "SPANISH"],

  clanTribe: false,

  // 🆕 COUNTRIES VISITED (dtlCountriesVisited - Add Another)
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "ITALY", "FRANCE", "GERMANY", "UNITED KINGDOM", "CHINA", "JAPAN"],

  // 🆕 ORGANIZATIONS (dtlORGANIZATIONS - Add Another)
  organizationMember: true,
  organizations: [
    {
      name: "AMERICAN INSTITUTE OF AERONAUTICS AND ASTRONAUTICS (AIAA)",
      startDate: { day: "01", month: "JAN", year: "2015" },
      endDate: { day: "01", month: "PRESENT", year: "" },
    },
    {
      name: "SOCIEDADE BRASILEIRA DE ENGENHARIA AERONAUTICA E ESPACIAL",
      startDate: { day: "01", month: "MAR", year: "2010" },
      endDate: { day: "01", month: "PRESENT", year: "" },
    },
  ],

  specializedSkills: true,
  specializedSkillsList: ["AIRCRAFT DESIGN", "CFD ANALYSIS", "STRUCTURAL ENGINEERING"],

  // 🆕 MILITARY SERVICE (dtlMILITARY_SERVICE - Add Another)
  militaryService: true,
  militaryServiceList: [
    {
      country: "BRAZIL",
      branch: "BRAZILIAN AIR FORCE (FAB)",
      rank: "SERGEANT",
      specialty: "AIRCRAFT MAINTENANCE",
      startDate: { day: "01", month: "JAN", year: "2006" },
      endDate: { day: "31", month: "DEC", year: "2007" },
    },
  ],

  insurgentOrg: false,

  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 11: Simple Tourist Female - Minimal branches
// Tests: F+S baseline, ED occupation, self-paying, no US history
// ============================================================
const touristSimpleFemale: DS160Applicant = {
  location: "REC",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "DUARTE",
  givenName: "LARISSA BEATRIZ",
  fullNameNative: "Larissa Beatriz Duarte",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "S",
  dob: { day: "18", month: "JUL", year: "1997" },
  cityOfBirth: "RECIFE",
  stateOfBirth: "PERNAMBUCO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "88899900011",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "10", month: "MAR", year: "2027" },
    departureDate: { day: "25", month: "MAR", year: "2027" },
    arrivalFlight: "AA7200", arrivalCity: "MIAMI",
    departureFlight: "AA7201", departureCity: "MIAMI",
    lengthOfStay: { value: "15", unit: "D" }, location: "MIAMI",
    usAddress: { street1: "1601 BISCAYNE BLVD", city: "MIAMI", state: "FL", zip: "33132" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA DO BON JESUS 200", street2: "APTO 502", city: "RECIFE", state: "PERNAMBUCO", postalCode: "50030-170", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-81-99123-4567",
  mobilePhone: null,
  businessPhone: null,
  email: "larissa.duarte@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "AB112233", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "RECIFE", issuedState: "PERNAMBUCO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "05", month: "APR", year: "2023" },
    expirationDate: { day: "05", month: "APR", year: "2033" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL INTERCONTINENTAL", givenName: "RESERVATIONS",
    organization: "INTERCONTINENTAL MIAMI", relationship: "H",
    street1: "100 CHOPIN PLZ", city: "MIAMI", state: "FL", zip: "33131",
    phone: "+1-305-577-1000", email: "reservations@ihg.com",
  },

  father: { surname: "DUARTE", givenName: "PAULO CESAR", dob: { day: "10", month: "MAY", year: "1968" }, inUS: false },
  mother: { surname: "CARVALHO", givenName: "ANDREA", dob: { day: "22", month: "SEP", year: "1970" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "ED",
  employer: {
    name: "COLEGIO SAO JOSE RECIFE", street1: "AV RUI BARBOSA 1000", city: "RECIFE", state: "PERNAMBUCO",
    postalCode: "52050-000", country: "BRAZIL", phone: "+55-81-3222-5555",
    startDate: { month: "FEB", year: "2021" }, monthlyIncome: "4500", duties: "ENGLISH LANGUAGE TEACHER",
  },
  hasPreviousEmployment: false,
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE PERNAMBUCO", street1: "AV PROF MORAES REGO 1235",
    city: "RECIFE", state: "PERNAMBUCO", postalCode: "50670-901", country: "BRAZIL",
    courseOfStudy: "LETRAS INGLES PORTUGUES", startDate: { month: "MAR", year: "2015" }, endDate: { month: "DEC", year: "2019" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@larissaduarte97" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 12: Retired Senior Female - Divorced, been to US
// Tests: RT occupation, senior (68yo), D+F, payer O (child)
// ============================================================
const retiredSenior: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "MENDES",
  givenName: "TERESA CRISTINA",
  fullNameNative: "Teresa Cristina Mendes",
  otherNamesUsed: true,
  otherNames: [{ surname: "NOGUEIRA", givenName: "TERESA CRISTINA" }],
  telecode: false,
  sex: "F",
  maritalStatus: "D",
  dob: { day: "03", month: "DEC", year: "1957" },
  cityOfBirth: "SANTOS",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "12398745600",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "01", month: "MAY", year: "2027" },
    departureDate: { day: "30", month: "MAY", year: "2027" },
    arrivalFlight: "LA8300", arrivalCity: "ORLANDO",
    departureFlight: "LA8301", departureCity: "ORLANDO",
    lengthOfStay: { value: "29", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "9801 INTERNATIONAL DR", city: "ORLANDO", state: "FL", zip: "32819" },
  },
  payingForTrip: "O",
  payer: {
    surname: "MENDES", givenName: "RAFAEL",
    phone: "551199887700", email: "rafael.mendes@email.com",
    relationship: "C", sameAddress: false,
    street1: "RUA CONSELHEIRO NEBIAS 600", city: "SANTOS", state: "SAO PAULO",
    postalCode: "11015-002", country: "BRAZIL",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "10", month: "JAN", year: "2015" }, lengthOfStay: "20", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "20", month: "NOV", year: "2014" }, number: "E5432109",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV ANA COSTA 400", street2: "APTO 71", city: "SANTOS", state: "SAO PAULO", postalCode: "11060-002", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-13-99876-5432",
  mobilePhone: null,
  businessPhone: null,
  email: "teresa.mendes@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "CD998877", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SANTOS", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "20", month: "JUL", year: "2020" },
    expirationDate: { day: "20", month: "JUL", year: "2030" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL ROSEN", givenName: "FRONT DESK",
    organization: "ROSEN INN INTERNATIONAL", relationship: "H",
    street1: "7600 INTERNATIONAL DR", city: "ORLANDO", state: "FL", zip: "32819",
    phone: "+1-407-996-1600", email: "reservations@roseninn.com",
  },

  father: { surname: "NOGUEIRA", givenName: "JOAQUIM", dob: { day: "15", month: "AUG", year: "1930" }, inUS: false },
  mother: { surname: "PINTO", givenName: "MARIA JOSE", dob: { day: "28", month: "FEB", year: "1932" }, inUS: false },
  spouse: { surname: "MENDES", givenName: "ANTONIO CARLOS", dob: { day: "10", month: "JAN", year: "1955" }, nationality: "BRAZIL", cityOfBirth: "SANTOS" },
  previousSpouse: {
    numberOfFormerSpouses: "1",
    surname: "MENDES", givenName: "ANTONIO CARLOS",
    dob: { day: "10", month: "JAN", year: "1955" },
    nationality: "BRAZIL", cityOfBirth: "SANTOS", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "15", month: "MAR", year: "1980" },
    dateMarriageEnded: { day: "20", month: "AUG", year: "2005" },
    howMarriageEnded: "DIVORCE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "RT",
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "HOSPITAL GUILHERME ALVARO", street1: "AV OSWALDO CRUZ 197", city: "SANTOS", state: "SAO PAULO",
    postalCode: "11045-101", country: "BRAZIL", phone: "+55-13-3202-1500", jobTitle: "HEAD NURSE",
    startDate: { month: "MAR", year: "1985" }, endDate: { month: "DEC", year: "2017" }, duties: "HOSPITAL NURSING SUPERVISION AND PATIENT CARE",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE CATOLICA DE SANTOS", street1: "AV CONSELHEIRO NEBIAS 300",
    city: "SANTOS", state: "SAO PAULO", postalCode: "11015-002", country: "BRAZIL",
    courseOfStudy: "ENFERMAGEM", startDate: { month: "MAR", year: "1977" }, endDate: { month: "DEC", year: "1981" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "ARGENTINA"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "FACEBOOK", handle: "teresacmendes57" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 13: Common Law Male - Employer paying (P)
// Tests: C marital status, payer P (Present Employer), with companion
// ============================================================
const commonLawEmployer: DS160Applicant = {
  location: "BRA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "CARDOSO",
  givenName: "THIAGO HENRIQUE",
  fullNameNative: "Thiago Henrique Cardoso",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "C", // Common Law
  dob: { day: "25", month: "JUN", year: "1986" },
  cityOfBirth: "GOIANIA",
  stateOfBirth: "GOIAS",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "66677788899",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "15", month: "SEP", year: "2027" },
    departureDate: { day: "25", month: "SEP", year: "2027" },
    arrivalFlight: "UA6600", arrivalCity: "HOUSTON",
    departureFlight: "UA6601", departureCity: "HOUSTON",
    lengthOfStay: { value: "10", unit: "D" }, location: "HOUSTON",
    usAddress: { street1: "1001 AVENIDA DE LAS AMERICAS", city: "HOUSTON", state: "TX", zip: "77010" },
  },
  payingForTrip: "P", // Present Employer
  payer: {
    companyName: "VALE FERTILIZANTES SA",
    phone: "556233334444",
    companyRelation: "PRESENT EMPLOYER BUSINESS TRIP",
    street1: "SIA TRECHO 3 LOTE 625",
    city: "BRASILIA",
    state: "DISTRITO FEDERAL",
    postalCode: "71200-030",
    country: "BRAZIL",
  },

  travelingWithOthers: true,
  companions: [{ surname: "GOMES", givenName: "MARIANA SILVA", relationship: "P" }],
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "05", month: "NOV", year: "2023" }, lengthOfStay: "7", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "15", month: "SEP", year: "2022" }, number: "F7654321",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV T-63 1200", street2: "APTO 901", city: "GOIANIA", state: "GOIAS", postalCode: "74250-020", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-62-99876-5432",
  mobilePhone: "+55-62-98765-1234",
  businessPhone: "+55-62-3222-4444",
  email: "thiago.cardoso@valefert.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "EF445566", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "GOIANIA", issuedState: "GOIAS", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "FEB", year: "2022" },
    expirationDate: { day: "10", month: "FEB", year: "2032" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "BAKER", givenName: "THOMAS",
    organization: "VALE FERTILIZERS USA INC", relationship: "B",
    street1: "1001 AVENIDA DE LAS AMERICAS SUITE 500", city: "HOUSTON", state: "TX", zip: "77010",
    phone: "+1-713-555-8888", email: "tbaker@vale.com",
  },

  father: { surname: "CARDOSO", givenName: "RENATO", dob: { day: "20", month: "MAR", year: "1958" }, inUS: false },
  mother: { surname: "GOMES", givenName: "ELIZABETH", dob: { day: "08", month: "NOV", year: "1960" }, inUS: false },
  spouse: { surname: "GOMES", givenName: "MARIANA SILVA", dob: { day: "12", month: "APR", year: "1990" }, nationality: "BRAZIL", cityOfBirth: "GOIANIA", pobCountry: "BRAZIL", addressType: "H" },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "EN",
  employer: {
    name: "VALE FERTILIZANTES SA", street1: "SIA TRECHO 3 LOTE 625", city: "BRASILIA", state: "DISTRITO FEDERAL",
    postalCode: "71200-030", country: "BRAZIL", phone: "+55-62-3333-4444",
    startDate: { month: "JAN", year: "2018" }, monthlyIncome: "14000", duties: "CHEMICAL ENGINEERING AND PROCESS OPTIMIZATION",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "PETROBRAS SA", street1: "AV REPUBLICA DO CHILE 65", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO",
    postalCode: "20031-912", country: "BRAZIL", phone: "+55-21-3224-4477", jobTitle: "PROCESS ENGINEER",
    startDate: { month: "MAR", year: "2012" }, endDate: { month: "DEC", year: "2017" }, duties: "REFINERY PROCESS ENGINEERING",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE GOIAS", street1: "AV ESPERANCA S/N",
    city: "GOIANIA", state: "GOIAS", postalCode: "74690-900", country: "BRAZIL",
    courseOfStudy: "ENGENHARIA QUIMICA", startDate: { month: "MAR", year: "2005" }, endDate: { month: "DEC", year: "2010" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "CHILE"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "LINKEDIN", handle: "thiagohcardoso" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 14: Student Female - School paying (C), first time
// Tests: F+S+22yo student, company/school paying (C)
// ============================================================
const studentFemale: DS160Applicant = {
  location: "PTA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "ROCHA",
  givenName: "ISABELA CRISTINA",
  fullNameNative: "Isabela Cristina Rocha",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "S",
  dob: { day: "14", month: "FEB", year: "2004" },
  cityOfBirth: "FLORIANOPOLIS",
  stateOfBirth: "SANTA CATARINA",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "11223344556",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "JUL", year: "2027" },
    departureDate: { day: "20", month: "JUL", year: "2027" },
    arrivalFlight: "DL4400", arrivalCity: "NEW YORK",
    departureFlight: "DL4401", departureCity: "NEW YORK",
    lengthOfStay: { value: "15", unit: "D" }, location: "NEW YORK",
    usAddress: { street1: "1 UNIVERSITY PLZ", city: "NEW YORK", state: "NY", zip: "10003" },
  },
  payingForTrip: "C",
  payer: {
    companyName: "UNIVERSIDADE FEDERAL DE SANTA CATARINA",
    phone: "554833319000",
    companyRelation: "UNIVERSITY SPONSORED ACADEMIC EXCHANGE",
    street1: "CAMPUS REITOR JOAO DAVID FERREIRA LIMA",
    city: "FLORIANOPOLIS",
    state: "SANTA CATARINA",
    postalCode: "88040-900",
    country: "BRAZIL",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA LAURO LINHARES 700", street2: "APTO 303", city: "FLORIANOPOLIS", state: "SANTA CATARINA", postalCode: "88036-001", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-48-99876-5432",
  mobilePhone: null,
  businessPhone: null,
  email: "isabela.rocha@grad.ufsc.br",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "GH667788", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "FLORIANOPOLIS", issuedState: "SANTA CATARINA", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "JAN", year: "2024" },
    expirationDate: { day: "15", month: "JAN", year: "2034" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "NYU HOUSING", givenName: "OFFICE",
    organization: "NEW YORK UNIVERSITY", relationship: "O",
    street1: "726 BROADWAY 7TH FL", city: "NEW YORK", state: "NY", zip: "10003",
    phone: "+1-212-998-4600", emailNA: true,
  },

  father: { surname: "ROCHA", givenName: "ANDERSON", dob: { day: "05", month: "OCT", year: "1975" }, inUS: false },
  mother: { surname: "MACHADO", givenName: "SIMONE", dob: { day: "12", month: "APR", year: "1978" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "ST",
  employer: {
    name: "UNIVERSIDADE FEDERAL DE SANTA CATARINA", street1: "CAMPUS REITOR JOAO DAVID FERREIRA LIMA", city: "FLORIANOPOLIS", state: "SANTA CATARINA",
    postalCode: "88040-900", country: "BRAZIL", phone: "+55-48-3319-9000",
    startDate: { month: "MAR", year: "2022" }, monthlyIncome: "0", duties: "UNDERGRADUATE STUDENT",
  },
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@isabelarocha04" }, { platform: "TIKTOK", handle: "@isacrocha" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 15: Child Female (6yo) - Menor de idade feminina
// Tests: F+S+6yo, N occupation, parent paying, traveling with mother
// ============================================================
const childFemale: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "ALVES",
  givenName: "SOFIA VALENTINA",
  fullNameNative: "Sofia Valentina Alves",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "S",
  dob: { day: "20", month: "AUG", year: "2020" },
  cityOfBirth: "CAMPINAS",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "55500011122",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "10", month: "JUL", year: "2027" },
    departureDate: { day: "30", month: "JUL", year: "2027" },
    arrivalFlight: "LA8500", arrivalCity: "ORLANDO",
    departureFlight: "LA8501", departureCity: "ORLANDO",
    lengthOfStay: { value: "20", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "6000 UNIVERSAL BLVD", city: "ORLANDO", state: "FL", zip: "32819" },
  },
  payingForTrip: "O",
  payer: {
    surname: "ALVES", givenName: "RENATA",
    phone: "551998761234", email: "renata.alves@email.com",
    relationship: "P", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [{ surname: "ALVES", givenName: "RENATA", relationship: "P" }],
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV NORTE SUL 500", street2: "APTO 23", city: "CAMPINAS", state: "SAO PAULO", postalCode: "13015-500", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-19-99876-1234",
  mobilePhone: null,
  businessPhone: null,
  email: "renata.alves@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "IJ223344", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "CAMPINAS", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "05", month: "MAR", year: "2024" },
    expirationDate: { day: "05", month: "MAR", year: "2029" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "UNIVERSAL RESORT", givenName: "RESERVATIONS",
    organization: "UNIVERSAL ORLANDO RESORT", relationship: "H",
    street1: "6000 UNIVERSAL BLVD", city: "ORLANDO", state: "FL", zip: "32819",
    phone: "+1-407-363-8000", emailNA: true,
  },

  father: { surname: "ALVES", givenName: "DANIEL", dob: { day: "15", month: "MAR", year: "1990" }, inUS: false },
  mother: { surname: "TAVARES", givenName: "RENATA", dob: { day: "22", month: "JUN", year: "1992" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "N",
  occupationExplanation: "MINOR CHILD AGED 6",
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "NONE", handle: "NONE" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 16: Teen Female (16yo) - Estudante adolescente
// Tests: F+S+16yo, ST, parent paying, 2 companions (both parents)
// ============================================================
const teenFemale: DS160Applicant = {
  location: "RDJ",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "SOUZA",
  givenName: "VALENTINA MARIA",
  fullNameNative: "Valentina Maria Souza",
  otherNamesUsed: false,
  telecode: false,
  sex: "F",
  maritalStatus: "S",
  dob: { day: "25", month: "MAR", year: "2010" },
  cityOfBirth: "NITEROI",
  stateOfBirth: "RIO DE JANEIRO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "33344400011",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "20", month: "DEC", year: "2026" },
    departureDate: { day: "05", month: "JAN", year: "2027" },
    arrivalFlight: "AA7800", arrivalCity: "NEW YORK",
    departureFlight: "AA7801", departureCity: "NEW YORK",
    lengthOfStay: { value: "16", unit: "D" }, location: "NEW YORK",
    usAddress: { street1: "1 TIMES SQ", city: "NEW YORK", state: "NY", zip: "10036" },
  },
  payingForTrip: "O",
  payer: {
    surname: "SOUZA", givenName: "MARCOS PAULO",
    phone: "552199887700", email: "marcos.souza@email.com",
    relationship: "P", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [
    { surname: "SOUZA", givenName: "MARCOS PAULO", relationship: "P" },
    { surname: "CAMPOS", givenName: "JULIANA", relationship: "P" },
  ],
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA GAVIAO PEIXOTO 120", street2: "APTO 502", city: "NITEROI", state: "RIO DE JANEIRO", postalCode: "24230-100", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-21-3333-4444",
  mobilePhone: "+55-21-99876-5432",
  businessPhone: null,
  email: "valentina.souza@gmail.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "KL334455", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "NITEROI", issuedState: "RIO DE JANEIRO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "SEP", year: "2024" },
    expirationDate: { day: "10", month: "SEP", year: "2029" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL MARRIOTT", givenName: "RESERVATIONS",
    organization: "MARRIOTT MARQUIS TIMES SQUARE", relationship: "H",
    street1: "1535 BROADWAY", city: "NEW YORK", state: "NY", zip: "10036",
    phone: "+1-212-398-1900", email: "reservations@marriott.com",
  },

  father: { surname: "SOUZA", givenName: "MARCOS PAULO", dob: { day: "10", month: "JUL", year: "1978" }, inUS: false },
  mother: { surname: "CAMPOS", givenName: "JULIANA", dob: { day: "28", month: "NOV", year: "1980" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "ST",
  employer: {
    name: "COLEGIO PEDRO II", street1: "AV MARECHAL FLORIANO 80", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO",
    postalCode: "20080-007", country: "BRAZIL", phone: "+55-21-3291-1212",
    startDate: { month: "FEB", year: "2025" }, monthlyIncome: "0", duties: "HIGH SCHOOL STUDENT",
  },
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@valsouza10" }, { platform: "TIKTOK", handle: "@valentinams" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 17: Senior Widower Male (75yo) - Aposentado viúvo
// Tests: M+W+75yo, RT, self-paying, been to US multiple times
// ============================================================
const seniorWidower: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "MARTINS",
  givenName: "JOSE ANTONIO",
  fullNameNative: "Jose Antonio Martins",
  otherNamesUsed: true,
  otherNames: [{ surname: "MARTINS NETO", givenName: "JOSE ANTONIO" }],
  telecode: false,
  sex: "M",
  maritalStatus: "W",
  dob: { day: "08", month: "JAN", year: "1951" },
  cityOfBirth: "RIBEIRAO PRETO",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "11100022233",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "01", month: "APR", year: "2027" },
    departureDate: { day: "20", month: "APR", year: "2027" },
    arrivalFlight: "AA8800", arrivalCity: "MIAMI",
    departureFlight: "AA8801", departureCity: "MIAMI",
    lengthOfStay: { value: "19", unit: "D" }, location: "MIAMI",
    usAddress: { street1: "1601 COLLINS AVE", city: "MIAMI BEACH", state: "FL", zip: "33139" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "15", month: "MAR", year: "2022" }, lengthOfStay: "30", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "10", month: "JAN", year: "2020" }, number: "G1234567",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV PRESIDENTE VARGAS 2000", street2: "APTO 121", city: "RIBEIRAO PRETO", state: "SAO PAULO", postalCode: "14020-260", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-16-99876-5432",
  mobilePhone: null,
  businessPhone: null,
  email: "jose.martins51@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "MN445566", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "RIBEIRAO PRETO", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "20", month: "NOV", year: "2019" },
    expirationDate: { day: "20", month: "NOV", year: "2029" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HOTEL FONTAINEBLEAU", givenName: "FRONT DESK",
    organization: "FONTAINEBLEAU MIAMI BEACH", relationship: "H",
    street1: "4441 COLLINS AVE", city: "MIAMI BEACH", state: "FL", zip: "33140",
    phone: "+1-305-538-2000", email: "reservations@fontainebleau.com",
  },

  father: { surname: "MARTINS", givenName: "BENEDITO", dob: { day: "05", month: "MAR", year: "1920" }, inUS: false },
  mother: { surname: "RIBEIRO", givenName: "APARECIDA", dob: { day: "12", month: "AUG", year: "1925" }, inUS: false },
  spouse: { surname: "MARTINS", givenName: "MARIA LUCIA", dob: { day: "15", month: "JUN", year: "1955" }, nationality: "BRAZIL", cityOfBirth: "RIBEIRAO PRETO" },
  previousSpouse: {
    numberOfFormerSpouses: "2",
    surname: "MARTINS", givenName: "MARIA LUCIA",
    dob: { day: "15", month: "JUN", year: "1955" },
    nationality: "BRAZIL", cityOfBirth: "RIBEIRAO PRETO", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "20", month: "DEC", year: "1975" },
    dateMarriageEnded: { day: "10", month: "MAR", year: "2021" },
    howMarriageEnded: "DEATH OF SPOUSE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "RT",
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "USINA SAO MARTINHO", street1: "FAZENDA SAO MARTINHO S/N", city: "PRADOPOLIS", state: "SAO PAULO",
    postalCode: "14850-000", country: "BRAZIL", phone: "+55-16-3981-9000", jobTitle: "PRODUCTION MANAGER",
    startDate: { month: "JAN", year: "1980" }, endDate: { month: "DEC", year: "2016" }, duties: "SUGAR AND ETHANOL PRODUCTION MANAGEMENT",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE DE SAO PAULO RIBEIRAO PRETO", street1: "AV BANDEIRANTES 3900",
    city: "RIBEIRAO PRETO", state: "SAO PAULO", postalCode: "14049-900", country: "BRAZIL",
    courseOfStudy: "ENGENHARIA AGRONOMICA", startDate: { month: "MAR", year: "1970" }, endDate: { month: "DEC", year: "1975" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "PORTUGAL", "ITALY"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: true,
  military: {
    country: "BRAZIL", branch: "EXERCITO BRASILEIRO", rank: "SOLDADO", specialty: "INFANTARIA",
    startDate: { day: "01", month: "MAR", year: "1969" }, endDate: { day: "01", month: "MAR", year: "1970" },
  },
  insurgentOrg: false,

  socialMedia: [{ platform: "FACEBOOK", handle: "joseamartins51" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 18: Family Group Travel - Casal + 2 filhos + grupo
// Tests: M+M+42yo, CM occupation, payer S, 3 companions, partOfGroup=true
// ============================================================
const familyGroupTravel: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "CASTRO",
  givenName: "ALEXANDRE ROBERTO",
  fullNameNative: "Alexandre Roberto Castro",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "M",
  dob: { day: "14", month: "SEP", year: "1984" },
  cityOfBirth: "SAO PAULO",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "44455500099",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "15", month: "JUL", year: "2027" },
    departureDate: { day: "30", month: "JUL", year: "2027" },
    arrivalFlight: "LA8600", arrivalCity: "ORLANDO",
    departureFlight: "LA8601", departureCity: "ORLANDO",
    lengthOfStay: { value: "15", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "1 EPCOT CENTER DR", city: "ORLANDO", state: "FL", zip: "32836" },
  },
  payingForTrip: "S",

  travelingWithOthers: true,
  companions: [
    { surname: "CASTRO", givenName: "PATRICIA FERREIRA", relationship: "S" },
    { surname: "CASTRO", givenName: "LUCAS ALEXANDRE", relationship: "C" },
    { surname: "CASTRO", givenName: "MARIA EDUARDA", relationship: "C" },
  ],
  partOfGroup: true,
  groupName: "VIAGEM FAMILIA CASTRO DISNEY 2027",

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "20", month: "JUL", year: "2023" }, lengthOfStay: "14", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "05", month: "MAY", year: "2022" }, number: "H8765432",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA HADDOCK LOBO 1200", street2: "APTO 82", city: "SAO PAULO", state: "SAO PAULO", postalCode: "01414-002", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-11-99876-5432",
  mobilePhone: "+55-11-98765-4321",
  businessPhone: "+55-11-3055-8000",
  email: "alexandre.castro@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "OP556677", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SAO PAULO", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "FEB", year: "2022" },
    expirationDate: { day: "10", month: "FEB", year: "2032" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "DISNEY RESORT", givenName: "RESERVATIONS",
    organization: "WALT DISNEY WORLD RESORT", relationship: "H",
    street1: "1180 SEVEN SEAS DR", city: "ORLANDO", state: "FL", zip: "32830",
    phone: "+1-407-939-5277", emailNA: true,
  },

  father: { surname: "CASTRO", givenName: "ROBERTO", dob: { day: "20", month: "FEB", year: "1955" }, inUS: false },
  mother: { surname: "FERREIRA", givenName: "SANDRA MARIA", dob: { day: "08", month: "DEC", year: "1958" }, inUS: false },
  spouse: { surname: "CASTRO", givenName: "PATRICIA FERREIRA", dob: { day: "30", month: "APR", year: "1986" }, nationality: "BRAZIL", cityOfBirth: "SAO PAULO", pobCountry: "BRAZIL", addressType: "H" },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "CM",
  employer: {
    name: "TV GLOBO SP", street1: "AV JAGUARE 1485", city: "SAO PAULO", state: "SAO PAULO",
    postalCode: "05346-902", country: "BRAZIL", phone: "+55-11-3055-8000",
    startDate: { month: "MAR", year: "2012" }, monthlyIncome: "18000", duties: "TELEVISION PRODUCTION AND MEDIA DIRECTION",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "REDE BANDEIRANTES", street1: "RUA RADIANTES 13", city: "SAO PAULO", state: "SAO PAULO",
    postalCode: "05070-010", country: "BRAZIL", phone: "+55-11-3131-3131", jobTitle: "ASSISTANT PRODUCER",
    startDate: { month: "JAN", year: "2008" }, endDate: { month: "FEB", year: "2012" }, duties: "TELEVISION PRODUCTION SUPPORT",
  }],
  hasEducation: true,
  education: [{
    name: "FACULDADE CASPER LIBERO", street1: "AV PAULISTA 900",
    city: "SAO PAULO", state: "SAO PAULO", postalCode: "01310-940", country: "BRAZIL",
    courseOfStudy: "JORNALISMO E COMUNICACAO", startDate: { month: "FEB", year: "2003" }, endDate: { month: "DEC", year: "2006" },
  }],

  languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "ARGENTINA", "MEXICO"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@alecastro84" }, { platform: "LINKEDIN", handle: "alexandrecastro" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 19: Young Male Backpacker (21yo) - Recém-formado
// Tests: M+S+21yo, O occupation (Other), self-paying, first time
// ============================================================
const youngBackpacker: DS160Applicant = {
  location: "PTA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "MOREIRA",
  givenName: "PEDRO LUCAS",
  fullNameNative: "Pedro Lucas Moreira",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "S",
  dob: { day: "30", month: "OCT", year: "2005" },
  cityOfBirth: "PORTO ALEGRE",
  stateOfBirth: "RIO GRANDE DO SUL",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "88877766655",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "FEB", year: "2027" },
    departureDate: { day: "25", month: "FEB", year: "2027" },
    arrivalFlight: "UA9300", arrivalCity: "SAN FRANCISCO",
    departureFlight: "UA9301", departureCity: "LOS ANGELES",
    lengthOfStay: { value: "20", unit: "D" }, location: "SAN FRANCISCO",
    usAddress: { street1: "500 POST ST", city: "SAN FRANCISCO", state: "CA", zip: "94102" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA PADRE CHAGAS 300", street2: "APTO 405", city: "PORTO ALEGRE", state: "RIO GRANDE DO SUL", postalCode: "90570-080", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-51-99876-4321",
  mobilePhone: null,
  businessPhone: null,
  email: "pedro.moreira@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "QR667788", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "PORTO ALEGRE", issuedState: "RIO GRANDE DO SUL", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "AUG", year: "2024" },
    expirationDate: { day: "15", month: "AUG", year: "2034" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HI HOSTEL", givenName: "RECEPTION",
    organization: "HI SAN FRANCISCO DOWNTOWN HOSTEL", relationship: "H",
    street1: "312 MASON ST", city: "SAN FRANCISCO", state: "CA", zip: "94102",
    phone: "+1-415-788-5604", emailNA: true,
  },

  father: { surname: "MOREIRA", givenName: "CARLOS HENRIQUE", dob: { day: "10", month: "MAR", year: "1975" }, inUS: false },
  mother: { surname: "SILVEIRA", givenName: "ANA PAULA", dob: { day: "18", month: "JUL", year: "1978" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "O",
  occupationExplanation: "RECENTLY GRADUATED SEEKING EMPLOYMENT",
  hasPreviousEmployment: false,
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL", street1: "AV PAULO GAMA 110",
    city: "PORTO ALEGRE", state: "RIO GRANDE DO SUL", postalCode: "90040-060", country: "BRAZIL",
    courseOfStudy: "DESIGN GRAFICO", startDate: { month: "MAR", year: "2023" }, endDate: { month: "DEC", year: "2026" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["URUGUAY", "ARGENTINA"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@pedromoreira05" }, { platform: "TIKTOK", handle: "@pedrolucas" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 20: Divorced Businesswoman (50yo) - Empresária
// Tests: F+D+50yo, SM occupation (Small Business), company paying
// ============================================================
const divorcedBusinesswoman: DS160Applicant = {
  location: "BRA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "PIRES",
  givenName: "CLAUDIA REGINA",
  fullNameNative: "Claudia Regina Pires",
  otherNamesUsed: true,
  otherNames: [
    { surname: "TEIXEIRA", givenName: "CLAUDIA REGINA" },
    { surname: "BORGES", givenName: "CLAUDIA REGINA" },
  ],
  telecode: false,
  sex: "F",
  maritalStatus: "D",
  dob: { day: "02", month: "NOV", year: "1976" },
  cityOfBirth: "GOIANIA",
  stateOfBirth: "GOIAS",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "22233344455",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "10", month: "NOV", year: "2027" },
    departureDate: { day: "20", month: "NOV", year: "2027" },
    arrivalFlight: "DL7700", arrivalCity: "ATLANTA",
    departureFlight: "DL7701", departureCity: "ATLANTA",
    lengthOfStay: { value: "10", unit: "D" }, location: "ATLANTA",
    usAddress: { street1: "100 CENTENNIAL OLYMPIC PARK DR", city: "ATLANTA", state: "GA", zip: "30313" },
  },
  payingForTrip: "C",
  payer: {
    companyName: "PIRES CONSULTORIA EMPRESARIAL LTDA",
    phone: "556232224444",
    companyRelation: "OWN COMPANY BUSINESS DEVELOPMENT TRIP",
    street1: "AV T-10 1500", street2: "SALA 802",
    city: "GOIANIA", state: "GOIAS",
    postalCode: "74223-060", country: "BRAZIL",
  },

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "05", month: "SEP", year: "2019" }, lengthOfStay: "7", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "20", month: "JUL", year: "2018" }, number: "I9876543",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA 1128 QUADRA 270 LOTE 15", street2: "SETOR MARISTA", city: "GOIANIA", state: "GOIAS", postalCode: "74175-130", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-62-99876-1234",
  mobilePhone: "+55-62-98765-4321",
  businessPhone: "+55-62-3222-4444",
  email: "claudia.pires@piresconsultoria.com.br",
  additionalPhones: false,
  additionalEmails: true,
  additionalEmailAddresses: ["claudia.pires@gmail.com"],
  additionalWebsites: false,

  passport: {
    type: "R", number: "ST889900", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "GOIANIA", issuedState: "GOIAS", issuedCountry: "BRAZIL",
    issuanceDate: { day: "01", month: "JUN", year: "2021" },
    expirationDate: { day: "01", month: "JUN", year: "2031" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "JOHNSON", givenName: "DAVID",
    organization: "SOUTHERN BUSINESS ALLIANCE", relationship: "B",
    street1: "191 PEACHTREE ST NE SUITE 3400", city: "ATLANTA", state: "GA", zip: "30303",
    phone: "+1-404-555-2222", email: "djohnson@sballiance.com",
  },

  father: { surname: "TEIXEIRA", givenName: "GERALDO", dob: { day: "15", month: "APR", year: "1948" }, inUS: false },
  mother: { surname: "BORGES", givenName: "NEIDE", dob: { day: "20", month: "SEP", year: "1950" }, inUS: false },
  spouse: { surname: "PIRES", givenName: "MARCIO HENRIQUE", dob: { day: "10", month: "MAR", year: "1974" }, nationality: "BRAZIL", cityOfBirth: "GOIANIA" },
  previousSpouse: {
    numberOfFormerSpouses: "2",
    surname: "PIRES", givenName: "MARCIO HENRIQUE",
    dob: { day: "10", month: "MAR", year: "1974" },
    nationality: "BRAZIL", cityOfBirth: "GOIANIA", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "20", month: "JUN", year: "2002" },
    dateMarriageEnded: { day: "15", month: "NOV", year: "2016" },
    howMarriageEnded: "DIVORCE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "SM",
  employer: {
    name: "PIRES CONSULTORIA EMPRESARIAL LTDA", street1: "AV T-10 1500", street2: "SALA 802", city: "GOIANIA", state: "GOIAS",
    postalCode: "74223-060", country: "BRAZIL", phone: "+55-62-3222-4444",
    startDate: { month: "JAN", year: "2017" }, monthlyIncome: "20000", duties: "BUSINESS CONSULTING AND MANAGEMENT",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "CAIXA ECONOMICA FEDERAL", street1: "SBS QUADRA 4 BLOCO A", city: "BRASILIA", state: "DISTRITO FEDERAL",
    postalCode: "70092-900", country: "BRAZIL", phone: "+55-61-3206-9000", jobTitle: "BANK MANAGER",
    startDate: { month: "MAR", year: "2000" }, endDate: { month: "DEC", year: "2016" }, duties: "BRANCH MANAGEMENT AND FINANCIAL SERVICES",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE GOIAS", street1: "AV ESPERANCA S/N",
    city: "GOIANIA", state: "GOIAS", postalCode: "74690-900", country: "BRAZIL",
    courseOfStudy: "ADMINISTRACAO DE EMPRESAS", startDate: { month: "MAR", year: "1995" }, endDate: { month: "DEC", year: "1999" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "CHILE", "COLOMBIA"],
  organizationMember: true,
  organizationName: "ASSOCIACAO COMERCIAL DE GOIANIA",
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "LINKEDIN", handle: "claudiapires" }, { platform: "INSTAGRAM", handle: "@claudiarpires" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 21: Infant Baby (2yo) - Bebê viajando com pais
// Tests: M+S+2yo, N occupation, parent paying, 2 companions (both parents)
// ============================================================
const infantBaby: DS160Applicant = {
  location: "RDJ",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "GONCALVES",
  givenName: "BERNARDO",
  fullNameNative: "Bernardo Goncalves",
  otherNamesUsed: false,
  telecode: false,
  sex: "M",
  maritalStatus: "S",
  dob: { day: "10", month: "MAR", year: "2024" },
  cityOfBirth: "RIO DE JANEIRO",
  stateOfBirth: "RIO DE JANEIRO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "99988877766",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "20", month: "JUN", year: "2027" },
    departureDate: { day: "10", month: "JUL", year: "2027" },
    arrivalFlight: "AA7500", arrivalCity: "ORLANDO",
    departureFlight: "AA7501", departureCity: "ORLANDO",
    lengthOfStay: { value: "20", unit: "D" }, location: "ORLANDO",
    usAddress: { street1: "4600 WORLD CENTER DR", city: "ORLANDO", state: "FL", zip: "32821" },
  },
  payingForTrip: "O",
  payer: {
    surname: "GONCALVES", givenName: "ANDRE LUIZ",
    phone: "552199887766", email: "andre.goncalves@email.com",
    relationship: "P", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [
    { surname: "GONCALVES", givenName: "ANDRE LUIZ", relationship: "P" },
    { surname: "VIEIRA", givenName: "AMANDA CRISTINA", relationship: "P" },
  ],
  partOfGroup: false,

  hasBeenInUS: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA VOLUNTARIOS DA PATRIA 400", street2: "APTO 1203", city: "RIO DE JANEIRO", state: "RIO DE JANEIRO", postalCode: "22270-010", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-21-99876-5432",
  mobilePhone: null,
  businessPhone: null,
  email: "andre.goncalves@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "UV998877", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "RIO DE JANEIRO", issuedState: "RIO DE JANEIRO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "20", month: "JUN", year: "2024" },
    expirationDate: { day: "20", month: "JUN", year: "2029" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "HILTON BONNET CREEK", givenName: "FRONT DESK",
    organization: "HILTON ORLANDO BONNET CREEK", relationship: "H",
    street1: "14100 BONNET CREEK RESORT LN", city: "ORLANDO", state: "FL", zip: "32821",
    phone: "+1-407-597-3600", emailNA: true,
  },

  father: { surname: "GONCALVES", givenName: "ANDRE LUIZ", dob: { day: "05", month: "JAN", year: "1992" }, inUS: false },
  mother: { surname: "VIEIRA", givenName: "AMANDA CRISTINA", dob: { day: "18", month: "SEP", year: "1994" }, inUS: false },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "N",
  occupationExplanation: "INFANT CHILD AGED 2",
  hasPreviousEmployment: false,
  hasEducation: false,

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: false,
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "NONE", handle: "NONE" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 22: Married Homemaker (55yo) - Dona de casa, marido paga
// Tests: F+M+55yo, H occupation, payer O (spouse), been to US
// ============================================================
const marriedHomemaker: DS160Applicant = {
  location: "REC",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "ANDRADE",
  givenName: "MARIA JOSE",
  fullNameNative: "Maria Jose Andrade",
  otherNamesUsed: true,
  otherNames: [
    { surname: "LOPES", givenName: "MARIA JOSE" },
    { surname: "SILVA", givenName: "MARIA JOSE" },
  ],
  telecode: false,
  sex: "F",
  maritalStatus: "M",
  dob: { day: "12", month: "APR", year: "1971" },
  cityOfBirth: "SALVADOR",
  stateOfBirth: "BAHIA",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "66677700088",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "01", month: "AUG", year: "2027" },
    departureDate: { day: "20", month: "AUG", year: "2027" },
    arrivalFlight: "AA8200", arrivalCity: "MIAMI",
    departureFlight: "AA8201", departureCity: "MIAMI",
    lengthOfStay: { value: "19", unit: "D" }, location: "MIAMI",
    usAddress: { street1: "19525 BISCAYNE BLVD", city: "AVENTURA", state: "FL", zip: "33180" },
  },
  payingForTrip: "O",
  payer: {
    surname: "ANDRADE", givenName: "WELLINGTON JOSE",
    phone: "557199887766", email: "wellington.andrade@email.com",
    relationship: "S", sameAddress: true,
  },

  travelingWithOthers: true,
  companions: [{ surname: "ANDRADE", givenName: "WELLINGTON JOSE", relationship: "S" }],
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "15", month: "DEC", year: "2019" }, lengthOfStay: "15", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "05", month: "OCT", year: "2018" }, number: "J5678901",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA DA GRACA 300", street2: "APTO 901", city: "SALVADOR", state: "BAHIA", postalCode: "40150-055", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-71-99876-5432",
  mobilePhone: null,
  businessPhone: null,
  email: "mariajose.andrade@email.com",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "WX112233", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "SALVADOR", issuedState: "BAHIA", issuedCountry: "BRAZIL",
    issuanceDate: { day: "10", month: "MAR", year: "2021" },
    expirationDate: { day: "10", month: "MAR", year: "2031" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "AVENTURA MALL", givenName: "INFORMATION",
    organization: "AVENTURA MALL GUEST SERVICES", relationship: "O",
    street1: "19501 BISCAYNE BLVD", city: "AVENTURA", state: "FL", zip: "33180",
    phone: "+1-305-935-1110", emailNA: true,
  },

  father: { surname: "LOPES", givenName: "MANOEL", dob: { day: "20", month: "JAN", year: "1942" }, inUS: false },
  mother: { surname: "SANTOS", givenName: "IVONE", dob: { day: "05", month: "JUN", year: "1945" }, inUS: false },
  spouse: { surname: "ANDRADE", givenName: "WELLINGTON JOSE", dob: { day: "22", month: "AUG", year: "1968" }, nationality: "BRAZIL", cityOfBirth: "SALVADOR", pobCountry: "BRAZIL", addressType: "H" },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "H",
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "LOJAS AMERICANAS", street1: "AV TANCREDO NEVES 1500", city: "SALVADOR", state: "BAHIA",
    postalCode: "41820-020", country: "BRAZIL", phone: "+55-71-3341-5000", jobTitle: "SALES SUPERVISOR",
    startDate: { month: "MAR", year: "1995" }, endDate: { month: "DEC", year: "2005" }, duties: "RETAIL SALES AND TEAM SUPERVISION",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DA BAHIA", street1: "RUA AUGUSTO VIANA S/N",
    city: "SALVADOR", state: "BAHIA", postalCode: "40110-060", country: "BRAZIL",
    courseOfStudy: "PEDAGOGIA", startDate: { month: "MAR", year: "1990" }, endDate: { month: "DEC", year: "1994" },
  }],

  languages: ["PORTUGUESE"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "FACEBOOK", handle: "mariajoseandrade71" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 23: Divorced Three Marriages - Mulher casada 3x, 3 sobrenomes
// Tests: F+D+48yo, numberOfFormerSpouses=3, 3 otherNames, ED occupation
// ============================================================
const divorcedThreeMarriages: DS160Applicant = {
  location: "BRA",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "MENDES",
  givenName: "ROSA MARIA",
  fullNameNative: "Rosa Maria Mendes",
  otherNamesUsed: true,
  otherNames: [
    { surname: "SOUZA", givenName: "ROSA MARIA" },
    { surname: "VIEIRA", givenName: "ROSA MARIA" },
    { surname: "ALMEIDA", givenName: "ROSA MARIA" },
  ],
  telecode: false,
  sex: "F",
  maritalStatus: "D",
  dob: { day: "25", month: "MAY", year: "1978" },
  cityOfBirth: "BELO HORIZONTE",
  stateOfBirth: "MINAS GERAIS",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "44455566677",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "15", month: "JAN", year: "2028" },
    departureDate: { day: "30", month: "JAN", year: "2028" },
    arrivalFlight: "UA8400", arrivalCity: "WASHINGTON",
    departureFlight: "UA8401", departureCity: "WASHINGTON",
    lengthOfStay: { value: "15", unit: "D" }, location: "WASHINGTON DC",
    usAddress: { street1: "1400 PENNSYLVANIA AVE NW", city: "WASHINGTON", state: "DC", zip: "20004" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: true,
  previousUSVisit: { arrivalDate: { day: "10", month: "JUL", year: "2018" }, lengthOfStay: "12", lengthOfStayUnit: "D" },
  previousUSDriversLicense: false,
  hasUSVisa: true,
  previousVisa: {
    issueDate: { day: "01", month: "MAY", year: "2017" }, number: "K8765432",
    sameType: true, sameCountry: true, tenPrint: true, lost: false, cancelled: false,
  },
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "RUA DA BAHIA 2500", street2: "APTO 1402", city: "BELO HORIZONTE", state: "MINAS GERAIS", postalCode: "30160-012", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-31-99876-5432",
  mobilePhone: "+55-31-98765-4321",
  businessPhone: "+55-31-3222-5555",
  email: "rosa.mendes@escola.edu.br",
  additionalPhones: false,
  additionalEmails: true,
  additionalEmailAddresses: ["rosamaria.souza@gmail.com"],
  additionalWebsites: false,

  passport: {
    type: "R", number: "UV334455", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "BELO HORIZONTE", issuedState: "MINAS GERAIS", issuedCountry: "BRAZIL",
    issuanceDate: { day: "15", month: "SEP", year: "2022" },
    expirationDate: { day: "15", month: "SEP", year: "2032" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "SMITHSONIAN", givenName: "VISITOR CENTER",
    organization: "SMITHSONIAN INSTITUTION", relationship: "O",
    street1: "1000 JEFFERSON DR SW", city: "WASHINGTON", state: "DC", zip: "20560",
    phone: "+1-202-633-1000", emailNA: true,
  },

  father: { surname: "SOUZA", givenName: "CARLOS ALBERTO", dob: { day: "10", month: "FEB", year: "1950" }, inUS: false },
  mother: { surname: "FERREIRA", givenName: "RITA DE CASSIA", dob: { day: "18", month: "JUL", year: "1953" }, inUS: false },
  spouse: { surname: "MENDES", givenName: "RICARDO AUGUSTO", dob: { day: "30", month: "OCT", year: "1975" }, nationality: "BRAZIL", cityOfBirth: "BELO HORIZONTE" },
  previousSpouse: {
    numberOfFormerSpouses: "3",
    surname: "MENDES", givenName: "RICARDO AUGUSTO",
    dob: { day: "30", month: "OCT", year: "1975" },
    nationality: "BRAZIL", cityOfBirth: "BELO HORIZONTE", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "14", month: "FEB", year: "2012" },
    dateMarriageEnded: { day: "20", month: "AUG", year: "2023" },
    howMarriageEnded: "DIVORCE",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "ED",
  employer: {
    name: "COLEGIO SANTO AGOSTINHO", street1: "AV RAJA GABAGLIA 3200", street2: null, city: "BELO HORIZONTE", state: "MINAS GERAIS",
    postalCode: "30350-540", country: "BRAZIL", phone: "+55-31-3319-9000",
    startDate: { month: "FEB", year: "2010" }, monthlyIncome: "8000", duties: "HISTORY AND GEOGRAPHY TEACHER",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "ESCOLA ESTADUAL GOVERNADOR MILTON CAMPOS", street1: "RUA ESPIRITO SANTO 900", city: "BELO HORIZONTE", state: "MINAS GERAIS",
    postalCode: "30160-031", country: "BRAZIL", phone: "+55-31-3237-5000", jobTitle: "TEACHER",
    startDate: { month: "MAR", year: "2002" }, endDate: { month: "DEC", year: "2009" }, duties: "ELEMENTARY SCHOOL TEACHER",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE FEDERAL DE MINAS GERAIS", street1: "AV ANTONIO CARLOS 6627",
    city: "BELO HORIZONTE", state: "MINAS GERAIS", postalCode: "31270-901", country: "BRAZIL",
    courseOfStudy: "LICENCIATURA EM HISTORIA", startDate: { month: "MAR", year: "1996" }, endDate: { month: "DEC", year: "2000" },
  }],

  languages: ["PORTUGUESE", "ENGLISH", "SPANISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["UNITED STATES", "ARGENTINA", "PORTUGAL", "FRANCE"],
  organizationMember: false,
  specializedSkills: false,
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "INSTAGRAM", handle: "@rosamariamendes" }, { platform: "FACEBOOK", handle: "rosamaria.mendes" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile 24: Separated Multiple Names - Homem separado, 2 casamentos, outros nomes
// Tests: M+L+44yo, numberOfFormerSpouses=2, 2 otherNames, EN occupation
// ============================================================
const separatedMultipleNames: DS160Applicant = {
  location: "SPL",
  securityQuestion: "WHAT IS YOUR MOTHER'S MAIDEN NAME?",
  securityAnswer: "VO",

  surname: "SANTOS FILHO",
  givenName: "ANTONIO CARLOS",
  fullNameNative: "Antonio Carlos Santos Filho",
  otherNamesUsed: true,
  otherNames: [
    { surname: "SANTOS", givenName: "ANTONIO CARLOS" },
    { surname: "SANTOS JUNIOR", givenName: "ANTONIO CARLOS" },
  ],
  telecode: false,
  sex: "M",
  maritalStatus: "L",
  dob: { day: "18", month: "SEP", year: "1982" },
  cityOfBirth: "CAMPINAS",
  stateOfBirth: "SAO PAULO",
  countryOfBirth: "BRAZIL",

  nationality: "BRAZIL",
  otherNationality: false,
  nationalId: "55566677788",
  usSsn: null,
  usTaxpayerId: null,

  purposeOfTrip: "B1/B2",
  hasSpecificPlans: true,
  travel: {
    arrivalDate: { day: "05", month: "MAR", year: "2028" },
    departureDate: { day: "12", month: "MAR", year: "2028" },
    arrivalFlight: "LA8100", arrivalCity: "NEW YORK",
    departureFlight: "LA8101", departureCity: "NEW YORK",
    lengthOfStay: { value: "7", unit: "D" }, location: "NEW YORK",
    usAddress: { street1: "350 5TH AVE", city: "NEW YORK", state: "NY", zip: "10118" },
  },
  payingForTrip: "S",

  travelingWithOthers: false,
  partOfGroup: false,

  hasBeenInUS: false,
  previousUSDriversLicense: false,
  hasUSVisa: false,
  visaRefused: false,
  immigrantPetition: false,

  homeAddress: { street1: "AV NORTE SUL 1200", street2: "BLOCO B APTO 34", city: "CAMPINAS", state: "SAO PAULO", postalCode: "13015-904", country: "BRAZIL" },
  mailingAddressSame: true,
  phone: "+55-19-99888-7766",
  mobilePhone: "+55-19-98777-6655",
  businessPhone: "+55-19-3232-8800",
  email: "antonio.santos@techcorp.com.br",
  additionalPhones: false,
  additionalEmails: false,
  additionalWebsites: false,

  passport: {
    type: "R", number: "AB556677", bookNumber: null,
    issuingCountry: "BRAZIL", issuedCity: "CAMPINAS", issuedState: "SAO PAULO", issuedCountry: "BRAZIL",
    issuanceDate: { day: "01", month: "APR", year: "2023" },
    expirationDate: { day: "01", month: "APR", year: "2033" },
    lostOrStolen: false,
  },

  usContact: {
    surname: "EMPIRE STATE", givenName: "OBSERVATORY",
    organization: "EMPIRE STATE BUILDING", relationship: "O",
    street1: "20 W 34TH ST", city: "NEW YORK", state: "NY", zip: "10001",
    phone: "+1-212-736-3100", emailNA: true,
  },

  father: { surname: "SANTOS", givenName: "CARLOS ROBERTO", dob: { day: "05", month: "DEC", year: "1955" }, inUS: false },
  mother: { surname: "PEREIRA", givenName: "SANDRA MARIA", dob: { day: "22", month: "MAR", year: "1958" }, inUS: false },
  spouse: { surname: "OLIVEIRA", givenName: "FERNANDA CRISTINA", dob: { day: "14", month: "JUN", year: "1985" }, nationality: "BRAZIL", cityOfBirth: "CAMPINAS" },
  previousSpouse: {
    numberOfFormerSpouses: "2",
    surname: "OLIVEIRA", givenName: "FERNANDA CRISTINA",
    dob: { day: "14", month: "JUN", year: "1985" },
    nationality: "BRAZIL", cityOfBirth: "CAMPINAS", countryOfBirth: "BRAZIL",
    dateOfMarriage: { day: "10", month: "MAY", year: "2010" },
    dateMarriageEnded: { day: "05", month: "JAN", year: "2025" },
    howMarriageEnded: "LEGAL SEPARATION",
    countryMarriageTerminated: "BRAZIL",
  },
  relativesInUS: false,
  otherRelativesInUS: false,

  occupationCode: "EN",
  employer: {
    name: "TECHCORP SOLUCOES EM TI LTDA", street1: "AV JOSE DE SOUZA CAMPOS 900", street2: "SALA 501", city: "CAMPINAS", state: "SAO PAULO",
    postalCode: "13025-320", country: "BRAZIL", phone: "+55-19-3232-8800",
    startDate: { month: "JAN", year: "2015" }, monthlyIncome: "15000", duties: "SOFTWARE ENGINEERING AND PROJECT MANAGEMENT",
  },
  hasPreviousEmployment: true,
  previousEmployment: [{
    name: "IBM BRASIL LTDA", street1: "RUA TUTOIA 1157", city: "SAO PAULO", state: "SAO PAULO",
    postalCode: "04007-900", country: "BRAZIL", phone: "+55-11-2132-0000", jobTitle: "SOFTWARE DEVELOPER",
    startDate: { month: "JUN", year: "2006" }, endDate: { month: "DEC", year: "2014" }, duties: "ENTERPRISE SOFTWARE DEVELOPMENT",
  }],
  hasEducation: true,
  education: [{
    name: "UNIVERSIDADE ESTADUAL DE CAMPINAS", street1: "CIDADE UNIVERSITARIA ZEFERINO VAZ",
    city: "CAMPINAS", state: "SAO PAULO", postalCode: "13083-970", country: "BRAZIL",
    courseOfStudy: "ENGENHARIA DA COMPUTACAO", startDate: { month: "MAR", year: "2000" }, endDate: { month: "DEC", year: "2005" },
  }],

  languages: ["PORTUGUESE", "ENGLISH"],
  clanTribe: false,
  countriesVisited: true,
  countriesVisitedList: ["ARGENTINA", "CHILE"],
  organizationMember: false,
  specializedSkills: true,
  specializedSkillsExplanation: "CERTIFIED JAVA AND CLOUD ARCHITECTURE SPECIALIST",
  militaryService: false,
  insurgentOrg: false,

  socialMedia: [{ platform: "LINKEDIN", handle: "antoniocsantos" }],
  securityAnswers: "ALL_NO",
};

// ============================================================
// Profile Registry & Selection
// ============================================================

export const profiles: Record<string, DS160Applicant> = {
  "single-male": singleMale,
  "married-female": marriedFemale,
  "divorced-history": divorcedHistory,
  "widowed-relative-us": widowedRelativeUS,
  "complex-all-yes": complexAllYes,
  "civil-union-ssn": civilUnionSSN,
  "separated-other": separatedOther,
  "child-minor": childMinor,
  "teen-male": teenMale,

  "business-complex": businessComplex,
  "tourist-simple-female": touristSimpleFemale,
  "retired-senior": retiredSenior,
  "common-law-employer": commonLawEmployer,
  "student-female": studentFemale,

  "child-female": childFemale,
  "teen-female": teenFemale,
  "senior-widower": seniorWidower,
  "family-group-travel": familyGroupTravel,
  "young-backpacker": youngBackpacker,
  "divorced-businesswoman": divorcedBusinesswoman,
  "infant-baby": infantBaby,
  "married-homemaker": marriedHomemaker,
  "divorced-three-marriages": divorcedThreeMarriages,
  "separated-multiple-names": separatedMultipleNames,
};

const envProfile = process.env.DS160_PROFILE;
const defaultProfile = "single-male";

const selectedProfile = (envProfile && profiles[envProfile]) ? envProfile : defaultProfile;

if (envProfile && !profiles[envProfile]) {
  console.warn(`>>> WARNING: Profile '${envProfile}' not found. Falling back to '${defaultProfile}'.`);
}

console.log(`>>> DS160 Profile: ${selectedProfile}`);
export const applicant = profiles[selectedProfile];
