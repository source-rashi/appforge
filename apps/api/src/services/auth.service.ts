import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';
import type { User } from '@prisma/client';

export class AuthService {
  private static SALT_ROUNDS = 12;
  private static JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded;
    } catch {
      return null;
    }
  }

  static async createUser(email: string, password: string): Promise<User> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await this.hashPassword(password);
    return prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  static async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user.id);
    
    // Create session in AppSession table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await prisma.appSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return { user, token };
  }

  static async logoutUser(token: string): Promise<void> {
    await prisma.appSession.deleteMany({
      where: { token },
    });
  }
}
