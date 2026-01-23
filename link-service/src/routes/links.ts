import { Router } from 'express';
import * as linkController from '../controllers/linkController';

const router = Router();

router.post('/', linkController.createLink);
router.get('/:userId', linkController.getLink);
router.delete('/:userId', linkController.deleteLink);

export default router;
