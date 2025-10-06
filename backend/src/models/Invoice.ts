import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'pending' | 'financed' | 'repaid' | 'defaulted';

export interface IInvoice extends Document {
  id: string;
  amount: number;
  status: InvoiceStatus;
  tokenId?: number; // NFT token ID on blockchain
  recipient?: string; // Address that received the invoice NFT
  dueDate?: Date; // Due date of the invoice
  debtorId?: string; // Debtor identifier
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'financed', 'repaid', 'defaulted'],
      default: 'pending',
      required: true,
    },
    tokenId: {
      type: Number,
      required: false,
    },
    recipient: {
      type: String,
      required: false,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    debtorId: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ status: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
