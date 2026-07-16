export type YesNo = 'YES' | 'NO';

export interface ResidencyEntry {
  street: string;
  city: string;
  state: string;
  zip: string;
  years: string;
}

export interface DrivingExperienceEntry {
  equipmentClass: string;
  equipmentType: string;
  dateFrom: string;
  dateTo: string;
  approxMiles: string;
}

export interface AccidentEntry {
  dates: string;
  nature: string;
  fatalities: string;
  injuries: string;
  chemicalSpills: string;
}

export interface ConvictionEntry {
  dateConvicted: string;
  violation: string;
  state: string;
  penalty: string;
}

export interface EmploymentEntry {
  employerName: string;
  address: string;
  positionHeld: string;
  dateFrom: string;
  dateTo: string;
  reasonForLeaving: string;
  employmentGaps: string;
  subjectToFmcsr: YesNo;
  safetySensitiveFunction: YesNo;
  previousEmployerEmail: string;
  previousEmployerPhone: string;
}

export interface DriverIntakeForm {
  firstName: string;
  middleName: string;
  maidenName: string;
  lastName: string;
  residency: ResidencyEntry[];
  dateOfBirth: string;
  socialSecurityNumber: string;
  telephone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactEmail: string;
  emergencyContactRelation: string;
  requiredQuestions: {
    deniedLicense: YesNo;
    suspendedRevoked: YesNo;
    cmvCriminalConviction: YesNo;
    felonyConviction: YesNo;
    refusedDrugAlcoholTest: YesNo;
    positiveDrugAlcoholTest: YesNo;
    positivePreEmploymentTest: YesNo;
    explanation: string;
  };
  licenseState: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiration: string;
  licenseCertificationAccepted: boolean;
  drivingExperience: DrivingExperienceEntry[];
  accidents: AccidentEntry[];
  noAccidents: boolean;
  convictions: ConvictionEntry[];
  noConvictions: boolean;
  employments: EmploymentEntry[];
  employmentGapsExplanation: string;
  authorizationAccepted: boolean;
  finalCertificationAccepted: boolean;
  applicantSignature: string;
  signatureDate: string;
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const emptyResidency = (): ResidencyEntry => ({
  street: '',
  city: '',
  state: '',
  zip: '',
  years: '',
});

const emptyExperience = (): DrivingExperienceEntry => ({
  equipmentClass: '',
  equipmentType: '',
  dateFrom: '',
  dateTo: '',
  approxMiles: '',
});

const emptyEmployment = (): EmploymentEntry => ({
  employerName: '',
  address: '',
  positionHeld: '',
  dateFrom: '',
  dateTo: '',
  reasonForLeaving: '',
  employmentGaps: '',
  subjectToFmcsr: 'NO',
  safetySensitiveFunction: 'NO',
  previousEmployerEmail: '',
  previousEmployerPhone: '',
});

export function createEmptyDriverIntakeForm(hint?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}): DriverIntakeForm {
  return {
    firstName: hint?.firstName || '',
    middleName: '',
    maidenName: '',
    lastName: hint?.lastName || '',
    residency: [emptyResidency(), emptyResidency(), emptyResidency()],
    dateOfBirth: '',
    socialSecurityNumber: '',
    telephone: hint?.phone || '',
    email: hint?.email || '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
    emergencyContactRelation: '',
    requiredQuestions: {
      deniedLicense: 'NO',
      suspendedRevoked: 'NO',
      cmvCriminalConviction: 'NO',
      felonyConviction: 'NO',
      refusedDrugAlcoholTest: 'NO',
      positiveDrugAlcoholTest: 'NO',
      positivePreEmploymentTest: 'NO',
      explanation: '',
    },
    licenseState: '',
    licenseNumber: '',
    licenseType: '',
    licenseExpiration: '',
    licenseCertificationAccepted: false,
    drivingExperience: [emptyExperience()],
    accidents: [],
    noAccidents: true,
    convictions: [],
    noConvictions: true,
    employments: [emptyEmployment()],
    employmentGapsExplanation: '',
    authorizationAccepted: false,
    finalCertificationAccepted: false,
    applicantSignature: '',
    signatureDate: new Date().toISOString().split('T')[0],
  };
}

export const WIZARD_STEPS = [
  { id: 'personal', title: 'Personal Info', subtitle: 'Name, address & contact' },
  { id: 'questions', title: 'Required Questions', subtitle: 'DOT qualification items' },
  { id: 'license', title: 'Driver License', subtitle: 'CDL certification' },
  { id: 'history', title: 'Driving History', subtitle: 'Experience, accidents & convictions' },
  { id: 'employment', title: 'Employment', subtitle: 'Work history (10 years)' },
  { id: 'sign', title: 'Review & Sign', subtitle: 'Authorization & signature' },
] as const;
