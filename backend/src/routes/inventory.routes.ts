import { Router } from 'express';
import { asyncHandler, validate } from '../middlewares/common.js';
import { allow, authenticate } from '../middlewares/auth.js';
import * as inv from '../controllers/inventory.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', allow('inventory', 'read'), asyncHandler(inv.listIngredients));
router.post('/', allow('inventory', 'write'), validate({ body: inv.createIngredientSchema }), asyncHandler(inv.createIngredient));
router.patch('/:id', allow('inventory', 'write'), validate({ body: inv.updateIngredientSchema }), asyncHandler(inv.updateIngredient));
router.post('/:id/restock', allow('inventory', 'write'), validate({ body: inv.restockSchema }), asyncHandler(inv.restockIngredient));
router.delete('/:id', allow('inventory', 'write'), asyncHandler(inv.deleteIngredient));

export default router;
