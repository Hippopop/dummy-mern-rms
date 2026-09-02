import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate } from '../middlewares/common.js';
import { authenticate } from '../middlewares/auth.js';
import * as auth from '../controllers/auth.controller.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait and try again.', code: 'RATE_LIMITED' },
});

const router = Router();

router.post('/login', loginLimiter, validate({ body: auth.loginSchema }), asyncHandler(auth.login));
router.post('/refresh', asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', authenticate, asyncHandler(auth.me));
router.patch('/password', authenticate, validate({ body: auth.changePasswordSchema }), asyncHandler(auth.changePassword));

export default router;
