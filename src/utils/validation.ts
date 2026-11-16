import { passwordIsStrong } from '@/data/familyStore';

export { passwordIsStrong };

/** Administrator usernames follow the same policy as the local store. */
export function usernameIsValid(username: string) {
  return /^[A-Za-z0-9._-]{3,32}$/.test(username.trim());
}

export function isPinComplete(pin: string) {
  return /^\d{6,8}$/.test(pin);
}

export function onlyDigits(value: string, maxLength = 8) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
