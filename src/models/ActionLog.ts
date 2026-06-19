import mongoose, { Schema } from "mongoose";

export interface IActionLog {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  details?: string;
  ip: string;
  userAgent?: string;
  createdAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>(
  {
    userId:    { type: String, default: null },
    userName:  { type: String, default: null },
    userEmail: { type: String, default: null },
    userRole:  { type: String, default: null },
    action:    { type: String, required: true },
    details:   { type: String, default: null },
    ip:        { type: String, required: true },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ userId: 1 });
ActionLogSchema.index({ action: 1 });

export const ActionLog =
  mongoose.models.ActionLog ?? mongoose.model<IActionLog>("ActionLog", ActionLogSchema);
