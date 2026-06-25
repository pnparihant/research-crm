import mongoose, { Schema, Document } from "mongoose";

export interface IReportUpload extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  filename: string;
  size: number;
  data: Buffer;
  uploadedAt: Date;
}

const ReportUploadSchema = new Schema<IReportUpload>({
  userId:    { type: String, required: true, index: true },
  userName:  { type: String, required: true },
  userEmail: { type: String, required: true },
  filename:  { type: String, required: true },
  size:      { type: Number, required: true },
  data:      { type: Buffer, required: true },
  uploadedAt:{ type: Date, default: Date.now },
});

ReportUploadSchema.index({ uploadedAt: -1 });

export const ReportUpload =
  mongoose.models.ReportUpload ||
  mongoose.model<IReportUpload>("ReportUpload", ReportUploadSchema);
