import { Request, Response } from 'express';
import { userModel } from '../models/userModel';
import { AuthService } from '../services/authService';

export const userController = {
  async list(req: Request, res: Response) {
    const users = await userModel.getAll();
    res.json(users);
  },

  async register(req: Request, res: Response) {
    const { player_tag, password } = req.body;

    if (!player_tag || !password) {
      return res.status(400).json({ error: 'player_tag and password are required' });
    }

    // Validate player_tag length (max 10 characters)
    if (player_tag.length > 10) {
      return res.status(400).json({ error: 'player_tag must be 10 characters or less' });
    }

    const existing = await userModel.getByPlayerTag(player_tag);
    if (existing) {
      return res.status(409).json({ error: 'player_tag already registered' });
    }

    const uuid = AuthService.makeUserUuid();
    const hashed = await AuthService.hash(password);

    const user = await userModel.create({
      uuid,
      player_tag,
      password: hashed,
    });

    const token = AuthService.sign({ uuid, player_tag });
    res.status(201).json({ uuid: user.uuid, player_tag: user.player_tag, token });
  },

  async login(req: Request, res: Response) {
    const { player_tag, password } = req.body;

    if (!player_tag || !password) {
      return res.status(400).json({ error: 'player_tag and password are required' });
    }

    const user = await userModel.getByPlayerTag(player_tag);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await AuthService.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = AuthService.sign({ uuid: user.uuid, player_tag: user.player_tag });
    res.json({ token, uuid: user.uuid, player_tag: user.player_tag });
  },
};
