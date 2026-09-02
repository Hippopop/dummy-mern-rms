import { Router } from 'express';
import { asyncHandler, validate } from '../middlewares/common.js';
import { allow, authenticate } from '../middlewares/auth.js';
import * as menu from '../controllers/menu.controller.js';

export const categoryRouter = Router();
categoryRouter.use(authenticate);
categoryRouter.get('/', allow('menu', 'read'), asyncHandler(menu.listCategories));
categoryRouter.post('/', allow('menu', 'write'), validate({ body: menu.categorySchema }), asyncHandler(menu.createCategory));
categoryRouter.patch('/:id', allow('menu', 'write'), asyncHandler(menu.updateCategory));
categoryRouter.delete('/:id', allow('menu', 'write'), asyncHandler(menu.deleteCategory));

export const menuRouter = Router();
menuRouter.use(authenticate);
menuRouter.get('/', allow('menu', 'read'), asyncHandler(menu.listMenu));
menuRouter.post('/', allow('menu', 'write'), validate({ body: menu.createMenuItemSchema }), asyncHandler(menu.createMenuItem));
menuRouter.patch('/:id', allow('menu', 'write'), validate({ body: menu.updateMenuItemSchema }), asyncHandler(menu.updateMenuItem));
menuRouter.delete('/:id', allow('menu', 'write'), asyncHandler(menu.deleteMenuItem));
