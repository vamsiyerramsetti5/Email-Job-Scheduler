import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      return next();
    }

    // Default Fallback Demo User for instant testing if no token provided
    let demoUser = await prisma.user.findFirst({
      where: { email: 'oliver.brown@domain.io' },
    });

    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        },
      });
    }

    req.user = {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      avatar: demoUser.avatar || undefined,
    };

    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized token' });
  }
};
