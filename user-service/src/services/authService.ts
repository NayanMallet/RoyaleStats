import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from '../config';

export const AuthService = {
  async hash(password: string) {
    return bcrypt.hash(password, 10);
  },

  async compare(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },

  sign(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  },

  verify<T = any>(token: string): T {
    return jwt.verify(token, JWT_SECRET) as T;
  },

  makeUserUuid() {
    return uuidv4();
  },
};
