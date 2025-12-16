import { Router } from 'express';
import { userController } from '../controllers/userController';

export default function userRoutes() {
  const router = Router();

  // Allow listing users without auth in the dev playground.
  // Previously this route required authentication which made frontend requests
  // return 401 when no token was provided.
  router.get('/users', userController.list);
  router.post('/users', userController.register);
  router.post('/login', userController.login);

  return router;
}
