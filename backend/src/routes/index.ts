import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middlewares/common.js';
import { allow, authenticate } from '../middlewares/auth.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import inventoryRoutes from './inventory.routes.js';
import { categoryRouter, menuRouter } from './menu.routes.js';
import * as tables from '../controllers/table.controller.js';
import * as orders from '../controllers/order.controller.js';
import * as kitchen from '../controllers/kitchen.controller.js';
import * as bills from '../controllers/bill.controller.js';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { ORDER_ITEM_STATUSES } from '../types/enums.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is healthy', data: { uptime: process.uptime() } });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ingredients', inventoryRoutes);
router.use('/categories', categoryRouter);
router.use('/menu', menuRouter);

const tableRouter = Router();
tableRouter.use(authenticate);
tableRouter.get('/', allow('tables', 'read'), asyncHandler(tables.listTables));
tableRouter.post('/', allow('tables', 'write'), validate({ body: tables.createTableSchema }), asyncHandler(tables.createTable));
tableRouter.patch('/:id', allow('tables', 'write'), validate({ body: tables.updateTableSchema }), asyncHandler(tables.updateTable));
router.use('/tables', tableRouter);

const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.get('/', allow('orders', 'read'), asyncHandler(orders.listOrders));
orderRouter.post('/', allow('orders', 'write'), validate({ body: orders.createOrderSchema }), asyncHandler(orders.createOrder));
orderRouter.get('/:id', allow('orders', 'read'), asyncHandler(orders.getOrder));
orderRouter.post('/:id/items', allow('orders', 'write'), validate({ body: orders.addItemsSchema }), asyncHandler(orders.addItems));
orderRouter.patch('/:id/waiter', allow('orders', 'write'), validate({ body: orders.assignWaiterSchema }), asyncHandler(orders.assignWaiter));
orderRouter.post('/:id/cancel', allow('orders', 'write'), asyncHandler(orders.cancelOrder));
orderRouter.post('/:orderId/bill', allow('bills', 'write'), asyncHandler(bills.createBill));
router.use('/orders', orderRouter);

const kitchenRouter = Router();
kitchenRouter.use(authenticate);
kitchenRouter.get('/queue', allow('kitchen', 'read'), asyncHandler(kitchen.getQueue));
kitchenRouter.post('/cook', allow('kitchen', 'write'), validate({ body: kitchen.cookSchema }), asyncHandler(kitchen.cookOnDemand));
kitchenRouter.patch('/orders/:orderId/items/:itemId', allow('kitchen', 'write'),
  validate({ body: z.object({ status: z.enum(ORDER_ITEM_STATUSES) }) }), asyncHandler(kitchen.setItemStatus));
router.use('/kitchen', kitchenRouter);

const billRouter = Router();
billRouter.use(authenticate);
billRouter.get('/', allow('bills', 'read'), asyncHandler(bills.listBills));
billRouter.get('/:id', allow('bills', 'read'), asyncHandler(bills.getBill));
billRouter.post('/:id/pay', allow('bills', 'write'), validate({ body: bills.payBillSchema }), asyncHandler(bills.payBill));
router.use('/bills', billRouter);

router.get('/dashboard', authenticate, allow('dashboard', 'read'), asyncHandler(getDashboard));

export default router;
