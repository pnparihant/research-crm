import mongoose, { Document, Schema } from "mongoose";

export interface IFormSubmission extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: "Phone" | "Online Meet" | "Physical" | "Message";
  formType: "research" | "institution";
  company?: string;
  sector: string;
  cmpTarget?: string;
  recommendation?: "Buy" | "Sell" | "Hold";
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  others: string;
  submittedAt: Date;
}

const FormSubmissionSchema = new Schema<IFormSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    salesPerson: { type: String, required: true },
    clientName: { type: String, required: true },
    designation: { type: String, required: true },
    modeOfCommunication: { type: String, enum: ["Phone", "Online Meet", "Physical", "Message"], required: true },
    formType: { type: String, enum: ["research", "institution"], required: true },
    company: { type: String, default: "" },
    sector: { type: String, default: "" },
    cmpTarget: { type: String, default: "" },
    recommendation: { type: String, enum: ["Buy", "Sell", "Hold", ""], default: "" },
    analystName: { type: String, required: true },
    buySideAnalystDesignation: { type: String, default: "" },
    rationale: { type: String, default: "" },
    feedback: { type: String, default: "" },
    others: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FormSubmissionSchema.index({ createdAt: -1 });
FormSubmissionSchema.index({ userId: 1 });
FormSubmissionSchema.index({ userId: 1, createdAt: -1 });

export const FormSubmission =
  mongoose.models.FormSubmission ??
  mongoose.model<IFormSubmission>("FormSubmission", FormSubmissionSchema);
