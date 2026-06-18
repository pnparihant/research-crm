export interface FormSubmissionRecord {
  _id: string;
  date: string;
  salesPerson: string;
  clientName: string;
  executive: string;
  designation: string;
  modeOfCommunication: "Phone" | "Online Meet" | "Physical";
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: "Buy" | "Sell" | "Hold";
  analystName: string;
  submittedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
  twoFactorVerified?: boolean;
}
