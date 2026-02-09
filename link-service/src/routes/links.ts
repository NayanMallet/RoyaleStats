import { Router } from 'express';
import * as linkController from '../controllers/linkController';

const router = Router();

router.post('/', linkController.createLink);
router.get('/tag/:tag', linkController.getLinkByTag);
router.get('/:userId', linkController.getLink);
router.patch('/:userId', linkController.updateLink);
router.delete('/:userId', linkController.deleteLink);

export default router;
