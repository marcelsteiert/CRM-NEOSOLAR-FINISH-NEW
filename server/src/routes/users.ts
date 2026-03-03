import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Mock team members
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string | null;
}

const mockUsers: User[] = [
  { id: 'u001', firstName: 'Marco', lastName: 'Bianchi', email: 'marco.bianchi@neosolar.ch', role: 'Vertrieb', avatar: null },
  { id: 'u002', firstName: 'Laura', lastName: 'Meier', email: 'laura.meier@neosolar.ch', role: 'Vertrieb', avatar: null },
  { id: 'u003', firstName: 'Simon', lastName: 'Keller', email: 'simon.keller@neosolar.ch', role: 'Projektleitung', avatar: null },
  { id: 'u004', firstName: 'Nina', lastName: 'Fischer', email: 'nina.fischer@neosolar.ch', role: 'Buchhaltung', avatar: null },
  { id: 'u005', firstName: 'Adrian', lastName: 'Brunner', email: 'adrian.brunner@neosolar.ch', role: 'Geschaeftsleitung', avatar: null },
];

// GET /api/v1/users
router.get('/', (_req: Request, res: Response) => {
  res.json({ data: mockUsers });
});

// GET /api/v1/users/:id
router.get('/:id', (req: Request, res: Response) => {
  const user = mockUsers.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ message: 'Benutzer nicht gefunden' });
    return;
  }
  res.json({ data: user });
});

export default router;
