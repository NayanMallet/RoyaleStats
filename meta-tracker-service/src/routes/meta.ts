import { Router } from 'express';
import * as metaController from '../controllers/metaController';

const router = Router();

router.get('/snapshot', metaController.getMetaSnapshot);
router.post('/analyze/deck', metaController.analyzeDeck);
router.get('/players/:playerTag/analysis', metaController.analysePlayerDeck);
// The server fetches the battles itself: no route accepts battles sent by a client.
router.post('/players/:playerTag/ingest', metaController.ingestPlayer);

export default router;
