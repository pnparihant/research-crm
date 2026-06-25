import mongoose, { Schema, Document } from "mongoose";

export interface IAdminReport extends Document {
  adminId: string;
  adminName: string;
  adminEmail: string;
  filename: string;
  size: number;
  data: Buffer;
  uploadedAt: Date;
}

const AdminReportSchema = new Schema<IAdminReport>({
  adminId:    { type: String, required: true, index: true },
  adminName:  { type: String, required: true },
  adminEmail: { type: String, required: true },
  filename:   { type: String, required: true },
  size:       { type: Number, required: true },
  data:       { type: Buffer, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

AdminReportSchema.index({ uploadedAt: -1 });

export const AdminReport =
  mongoose.models.AdminReport ||
  mongoose.model<IAdminReport>("AdminReport", AdminReportSchema);
