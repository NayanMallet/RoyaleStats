import { Router } from 'express';
import { requireAuth } from 'shared';
import * as linkController from '../controllers/linkController';

const router = Router();

// Public: social links shown on a player's profile, without any account data.
router.get('/tag/:tag', linkController.getLinkByTag);
// Public share page: public fields of the link, trophy goal and achievements (RST-53).
router.get('/tag/:tag/share', linkController.getShare);

// Private: a valid JWT is required, and a user can only act on their own link.
router.post('/', requireAuth(), linkController.createLink);
router.get('/:userId', requireAuth(), linkController.getLink);
router.patch('/:userId', requireAuth(), linkController.updateLink);
router.delete('/:userId', requireAuth(), linkController.deleteLink);
router.get('/:userId/achievements', requireAuth(), linkController.getAchievements);

export default router;
