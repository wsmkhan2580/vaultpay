import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'ADMIN' | 'CLIENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  refreshTokenHash?: string | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const SALT_ROUNDS = 12;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
      index: true,
    },
    // Never select passwordHash by default; it must be explicitly requested
    // with .select('+passwordHash') by the auth service only.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'CLIENT'], required: true, default: 'CLIENT' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    refreshTokenHash: { type: String, select: false, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Defense in depth: even if a route accidentally serializes a full document,
// strip sensitive fields from any JSON representation.
userSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.__v;
    return ret;
  },
});

export { SALT_ROUNDS };
export const User = model<IUser>('User', userSchema);
