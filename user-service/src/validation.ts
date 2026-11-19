// Input rules of the account API. Every invalid field is reported in `details`, keyed by field,
// so that the form can show the message under the right input.

import { ValidationError } from 'shared';

export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes: a longer password would be silently truncated.
export const PASSWORD_MAX_BYTES = 72;

// Pragmatic format check (one @, a dot in the domain, no spaces); the real proof is the inbox.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Record<string, string>;

/** Trimmed and lower-cased, so that Karim@Example.com and karim@example.com are one account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function checkName(value: unknown, errors: FieldErrors): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    errors.name = 'Le nom est obligatoire.';
    return undefined;
  }
  const name = value.trim();
  if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères.`;
  }
  return name;
}

function checkEmail(value: unknown, errors: FieldErrors): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    errors.email = 'L’email est obligatoire.';
    return undefined;
  }
  const email = normalizeEmail(value);
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = 'L’email n’est pas valide.';
  }
  return email;
}

function checkPassword(value: unknown, errors: FieldErrors): string | undefined {
  if (typeof value !== 'string' || !value) {
    errors.password = 'Le mot de passe est obligatoire.';
    return undefined;
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  } else if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
    errors.password = 'Le mot de passe est trop long.';
  }
  return value;
}

function throwIfInvalid(errors: FieldErrors): void {
  const fields = Object.keys(errors);
  if (fields.length === 0) return;
  const message = fields.length === 1 ? errors[fields[0]] : 'Certains champs sont invalides.';
  throw new ValidationError(message, { details: errors });
}

export function parseRegistration(body: unknown): {
  name: string;
  email: string;
  password: string;
} {
  const input = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};
  const name = checkName(input.name, errors);
  const email = checkEmail(input.email, errors);
  const password = checkPassword(input.password, errors);
  throwIfInvalid(errors);
  return { name: name!, email: email!, password: password! };
}

export function parseLogin(body: unknown): { email: string; password: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  // No format rule at login: an old account created before these rules must still log in.
  if (
    typeof input.email !== 'string' ||
    !input.email.trim() ||
    typeof input.password !== 'string' ||
    !input.password
  ) {
    throw new ValidationError('L’email et le mot de passe sont obligatoires.');
  }
  return { email: normalizeEmail(input.email), password: input.password };
}

export function parseProfileUpdate(body: unknown): { name?: string; email?: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  if (input.name === undefined && input.email === undefined) {
    throw new ValidationError('Indiquez au moins un champ à modifier : nom ou email.');
  }
  const errors: FieldErrors = {};
  const name = input.name === undefined ? undefined : checkName(input.name, errors);
  const email = input.email === undefined ? undefined : checkEmail(input.email, errors);
  throwIfInvalid(errors);
  return { name, email };
}
