import { compare, hash } from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(rawPassword: string) {
  return hash(rawPassword, SALT_ROUNDS);
}

export async function verifyPassword(rawPassword: string, passwordHash: string) {
  return compare(rawPassword, passwordHash);
}
