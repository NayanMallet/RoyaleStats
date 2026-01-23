import { Router } from 'express';
import * as clashController from '../controllers/clashController';

const router = Router();

router.get('/players/:playerTag', clashController.getPlayer);
router.get('/players/:playerTag/battles', clashController.getPlayerBattles);
router.get('/cards', clashController.getCards);
router.get('/clans/:clanTag', clashController.getClan);
router.get('/leaderboards', clashController.getLeaderboard);
router.get('/locations/global/pathoflegend/players', clashController.getPathOfLegend);

export default router;
