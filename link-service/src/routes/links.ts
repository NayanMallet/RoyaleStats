import { Router } from 'express';
import { requireAuth } from 'shared';
import * as linkController from '../controllers/linkController';

const router = Router();

// Public: social links shown on a player's profile, without any account data.
router.get('/tag/:tag', linkController.getLinkByTag);

// Private: a valid JWT is required, and a user can only act on their own link.
router.post('/', requireAuth(), linkController.createLink);
router.get('/:userId', requireAuth(), linkController.getLink);
router.patch('/:userId', requireAuth(), linkController.updateLink);
router.delete('/:userId', requireAuth(), linkController.deleteLink);

export default router;
