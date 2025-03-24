import express, { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { OrderController } from '../../../controllers/orderController';
import { verifyToken, AuthRequest } from '../../../middleware/auth';

const router = express.Router();
const orderController = new OrderController();

// Create an order
router.post(
    '/create',
    verifyToken,
    body('user_id')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    orderController.createOrder.bind(orderController),
);
// Get a specific order by ID
router.get(
    '/:id',
    verifyToken,
    orderController.getOrderById.bind(orderController),
);

// Update an order's status or details
router.put(
    '/:id/status',
    verifyToken,
    body('status')
        .isIn(['Pending', 'Processing', 'Shipped', 'Delivered'])
        .withMessage('Invalid status'),
    orderController.updateOrderStatus.bind(orderController),
);

// Delete an order (cancel order)
router.delete(
    '/orders/:id',
    verifyToken,
    (req: Request, res: Response, next: NextFunction) =>
        orderController.cancelOrder(req, res, next),
);

// get user orders
router.get(
    '/user/:user_id',
    verifyToken,
    orderController.getOrdersByUser.bind(orderController),
);

export = router;
