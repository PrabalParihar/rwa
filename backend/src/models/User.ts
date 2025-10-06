import mongoose, { Document, Schema } from 'mongoose';

export type KycStatus = 'not_started' | 'approved' | 'rejected';

export interface IUser extends Document {
  wallet: string;
  kycStatus: KycStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    wallet: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    kycStatus: {
      type: String,
      enum: ['not_started', 'approved', 'rejected'],
      default: 'not_started',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
