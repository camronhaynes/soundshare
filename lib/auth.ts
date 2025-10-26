import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Token expiration times
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UserPayload {
  id: string;
  email: string;
  username: string;
  name: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a magic link token for email authentication
 */
export function generateMagicLinkToken(): string {
  return nanoid(32); // 32 character random token
}

/**
 * Create a session token (JWT)
 */
export async function createSessionToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Ensure payload has the required fields
    if (payload && typeof payload === 'object' &&
        'id' in payload &&
        'email' in payload &&
        'username' in payload &&
        'name' in payload) {
      return {
        id: payload.id as string,
        email: payload.email as string,
        username: payload.username as string,
        name: payload.name as string
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string) {
  (await cookies()).set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Remove authentication cookie
 */
export async function removeAuthCookie() {
  (await cookies()).delete('auth-token');
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return null;

    const user = await verifySessionToken(token);
    if (!user) return null;

    // Verify user still exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, username: true, name: true }
    });

    return dbUser;
  } catch (error) {
    return null;
  }
}

/**
 * Get session from database
 */
export async function getSessionFromDb(token: string) {
  return await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });
}

/**
 * Calculate token expiry time
 */
export function getMagicLinkExpiry(): Date {
  return new Date(Date.now() + MAGIC_LINK_EXPIRY);
}

/**
 * Calculate session expiry time
 */
export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_EXPIRY);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a username from email
 */
export function generateUsernameFromEmail(email: string): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = nanoid(4);
  return `${base}_${random}`;
}

/**
 * Clean up expired tokens and sessions
 */
export async function cleanupExpiredTokens() {
  const now = new Date();

  // Delete expired magic links
  await prisma.magicLink.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { used: true }
      ]
    }
  });

  // Delete expired sessions
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: now }
    }
  });
}

// For backward compatibility with existing code
export const createToken = createSessionToken;
export const verifyToken = verifySessionToken;