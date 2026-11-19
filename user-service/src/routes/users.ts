import { Router } from 'express';
import * as userController from '../controllers/userController';
import { requireAuth } from 'shared';

const router = Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (require authentication)
router.get('/me', requireAuth(), userController.getMe);
router.put('/me', requireAuth(), userController.updateMe);
router.delete('/me', requireAuth(), userController.deleteMe);

// List all users (could be made admin-only in the future)
router.get('/', userController.listUsers);

export default router;
