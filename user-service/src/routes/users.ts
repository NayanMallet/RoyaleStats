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

// No public list of accounts: it exposed every name and email (RST-29).

export default router;
