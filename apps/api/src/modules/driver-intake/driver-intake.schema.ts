import { z } from 'zod';

const yesNo = z.enum(['YES', 'NO']);

const residencyEntryFieldsSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  years: z.string(),
});

function residencyRowFilled(row: z.infer<typeof residencyEntryFieldsSchema>): boolean {
  return [row.street, row.city, row.state, row.zip, row.years].some((v) => v.trim().length > 0);
}

function validateResidencyRow(
  row: z.infer<typeof residencyEntryFieldsSchema>,
  index: number,
  ctx: z.RefinementCtx,
  required: boolean,
) {
  const prefix = `residency.${index}`;
  const filled = residencyRowFilled(row);
  if (!required && !filled) return;

  if (!row.street.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Street is required', path: [prefix, 'street'] });
  }
  if (!row.city.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City is required', path: [prefix, 'city'] });
  }
  if (row.state.trim().length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use 2-letter state', path: [prefix, 'state'] });
  }
  if (!row.zip.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Zip is required', path: [prefix, 'zip'] });
  }
  if (!row.years.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Years at address is required', path: [prefix, 'years'] });
  }
}

const drivingExperienceSchema = z.object({
  equipmentClass: z.string().optional(),
  equipmentType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  approxMiles: z.string().optional(),
});

const accidentSchema = z.object({
  dates: z.string().optional(),
  nature: z.string().optional(),
  fatalities: z.string().optional(),
  injuries: z.string().optional(),
  chemicalSpills: z.string().optional(),
});

const convictionSchema = z.object({
  dateConvicted: z.string().optional(),
  violation: z.string().optional(),
  state: z.string().optional(),
  penalty: z.string().optional(),
});

const employmentSchema = z.object({
  employerName: z.string().min(1, 'Employer name is required'),
  address: z.string().min(1, 'Address is required'),
  positionHeld: z.string().min(1, 'Position is required'),
  dateFrom: z.string().min(1, 'From date is required'),
  dateTo: z.string().min(1, 'To date is required'),
  reasonForLeaving: z.string().min(1, 'Reason for leaving is required'),
  employmentGaps: z.string().optional(),
  subjectToFmcsr: yesNo,
  safetySensitiveFunction: yesNo,
  previousEmployerEmail: z.string().optional(),
  previousEmployerPhone: z.string().optional(),
});

export const driverIntakeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  maidenName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  residency: z.array(residencyEntryFieldsSchema).length(3),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  socialSecurityNumber: z.string().min(4, 'SSN is required'),
  telephone: z.string().min(1, 'Telephone is required'),
  email: z.string().email('Valid email is required'),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),
  emergencyContactEmail: z.string().optional(),
  emergencyContactRelation: z.string().min(1, 'Relation is required'),
  requiredQuestions: z.object({
    deniedLicense: yesNo,
    suspendedRevoked: yesNo,
    cmvCriminalConviction: yesNo,
    felonyConviction: yesNo,
    refusedDrugAlcoholTest: yesNo,
    positiveDrugAlcoholTest: yesNo,
    positivePreEmploymentTest: yesNo,
    explanation: z.string().optional(),
  }),
  licenseState: z.string().length(2, 'License state is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseType: z.string().min(1, 'License type is required'),
  licenseExpiration: z.string().min(1, 'Expiration date is required'),
  licenseCertificationAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must certify license compliance' }),
  }),
  drivingExperience: z.array(drivingExperienceSchema).default([]),
  accidents: z.array(accidentSchema).default([]),
  noAccidents: z.boolean().optional(),
  convictions: z.array(convictionSchema).default([]),
  noConvictions: z.boolean().optional(),
  employments: z.array(employmentSchema).min(1, 'At least one employer is required'),
  employmentGapsExplanation: z.string().optional(),
  authorizationAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must authorize employer inquiries' }),
  }),
  finalCertificationAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must certify the application is truthful' }),
  }),
  applicantSignature: z.string().min(2, 'Signature (full legal name) is required'),
  signatureDate: z.string().min(1, 'Date is required'),
}).superRefine((data, ctx) => {
  data.residency.forEach((row, index) => {
    validateResidencyRow(row, index, ctx, index === 0);
  });

  const rq = data.requiredQuestions;
  const anyYes = [
    rq.deniedLicense,
    rq.suspendedRevoked,
    rq.cmvCriminalConviction,
    rq.felonyConviction,
    rq.refusedDrugAlcoholTest,
    rq.positiveDrugAlcoholTest,
    rq.positivePreEmploymentTest,
  ].some((v) => v === 'YES');
  if (anyYes && !data.requiredQuestions.explanation?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Explanation is required when any required question is YES',
      path: ['requiredQuestions', 'explanation'],
    });
  }
});

export type DriverIntakeFormInput = z.infer<typeof driverIntakeFormSchema>;

export const emptyResidencyEntry = (): z.infer<typeof residencyEntryFieldsSchema> => ({
  street: '',
  city: '',
  state: '',
  zip: '',
  years: '',
});

export const emptyDrivingExperience = (): z.infer<typeof drivingExperienceSchema> => ({
  equipmentClass: '',
  equipmentType: '',
  dateFrom: '',
  dateTo: '',
  approxMiles: '',
});

export const emptyAccident = (): z.infer<typeof accidentSchema> => ({
  dates: '',
  nature: '',
  fatalities: '',
  injuries: '',
  chemicalSpills: '',
});

export const emptyConviction = (): z.infer<typeof convictionSchema> => ({
  dateConvicted: '',
  violation: '',
  state: '',
  penalty: '',
});

export const emptyEmployment = (): z.infer<typeof employmentSchema> => ({
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

export const emptyDriverIntakeForm = (): DriverIntakeFormInput => ({
  firstName: '',
  middleName: '',
  maidenName: '',
  lastName: '',
  residency: [emptyResidencyEntry(), emptyResidencyEntry(), emptyResidencyEntry()],
  dateOfBirth: '',
  socialSecurityNumber: '',
  telephone: '',
  email: '',
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
  licenseCertificationAccepted: true,
  drivingExperience: [emptyDrivingExperience()],
  accidents: [],
  noAccidents: true,
  convictions: [],
  noConvictions: true,
  employments: [emptyEmployment()],
  employmentGapsExplanation: '',
  authorizationAccepted: true,
  finalCertificationAccepted: true,
  applicantSignature: '',
  signatureDate: new Date().toISOString().split('T')[0],
});
