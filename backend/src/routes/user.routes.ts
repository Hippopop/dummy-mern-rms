import { Router } from 'express';
import { asyncHandler, validate } from '../middlewares/common.js';
import { allow, authenticate } from '../middlewares/auth.js';
import * as users from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', allow('users', 'read'), asyncHandler(users.listUsers));
router.post('/', allow('users', 'write'), validate({ body: users.createUserSchema }), asyncHandler(users.createUser));
router.patch('/:id', allow('users', 'write'), validate({ body: users.updateUserSchema }), asyncHandler(users.updateUser));

export default router;
