import mongoose, { Document, Schema } from "mongoose";

// ── Sector ──────────────────────────────────────────────────────────────────
export interface ISector extends Document { name: string }
const SectorSchema = new Schema<ISector>({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true });
export const Sector = mongoose.models.Sector ?? mongoose.model<ISector>("Sector", SectorSchema);

// ── Company Group ────────────────────────────────────────────────────────────
export interface ICompanyGroup extends Document { name: string }
const CompanyGroupSchema = new Schema<ICompanyGroup>({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true });
export const CompanyGroup = mongoose.models.CompanyGroup ?? mongoose.model<ICompanyGroup>("CompanyGroup", CompanyGroupSchema);

// ── Company (belongs to a group) ─────────────────────────────────────────────
export interface ICompany extends Document { name: string; groupId: mongoose.Types.ObjectId; sector?: string }
const CompanySchema = new Schema<ICompany>({
  name:    { type: String, required: true, trim: true },
  groupId: { type: Schema.Types.ObjectId, ref: "CompanyGroup", required: true },
  sector:  { type: String, default: "" },
}, { timestamps: true });
export const Company = mongoose.models.Company ?? mongoose.model<ICompany>("Company", CompanySchema);

// ── Arihant Representative ───────────────────────────────────────────────────────────
export interface ISalesExecutive extends Document { name: string }
const SalesExecutiveSchema = new Schema<ISalesExecutive>({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true });
export const SalesExecutive = mongoose.models.SalesExecutive ?? mongoose.model<ISalesExecutive>("SalesExecutive", SalesExecutiveSchema);

// ── Client (Arihant's institutional clients / counterparties) ─────────────────
export interface IClient extends Document { code?: string; name: string; category: string }
const ClientSchema = new Schema<IClient>({
  code:     { type: String, sparse: true, trim: true },
  name:     { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
}, { timestamps: true });
export const Client = mongoose.models.Client ?? mongoose.model<IClient>("Client", ClientSchema);
