import { Router } from 'express'
import * as metaController from '../controllers/metaController'

const router = Router()

router.get('/snapshot', metaController.getMetaSnapshot)
router.post('/analyze/deck', metaController.analyzeDeck)
router.get('/recommend/:playerTag', metaController.getRecommendations)
router.post('/ingest/battles', metaController.ingestBattles)

export default router
