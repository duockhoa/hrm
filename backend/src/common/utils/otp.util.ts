import { randomInt } from 'crypto';

export function generateOtp(length = 6): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('OTP length must be a positive integer');
  }

  const max = 10 ** length;

  return randomInt(0, max).toString().padStart(length, '0');
}
