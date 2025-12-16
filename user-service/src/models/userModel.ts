import { prisma } from '../config';
import type { User } from '../types/user';

export const userModel = {
  async getAll(): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany({
      select: {
        uuid: true,
        player_tag: true,
        created_at: true,
        updated_at: true,
        password: false,
      },
    });
    return users;
  },

  async getByPlayerTag(player_tag: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { player_tag },
    });
    return user;
  },

  async create(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const newUser = await prisma.user.create({
      data: {
        uuid: user.uuid,
        player_tag: user.player_tag,
        password: user.password,
      },
    });
    return newUser;
  },
};
