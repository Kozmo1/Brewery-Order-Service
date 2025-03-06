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
    body('items')
        .isArray({ min: 1 })
        .withMessage('Items must be a non-empty array'),
    body('items.*.product_id')
        .isInt({ min: 1 })
        .withMessage('Product ID must be a positive integer'),
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    (req: AuthRequest, res: Response, next: NextFunction) =>
        orderController.createOrder(req, res, next),
);

// Get a specific order by ID
router.get(
    '/:id',
    verifyToken,
    (req: AuthRequest, res: Response, next: NextFunction) =>
        orderController.getOrderById(req, res, next),
);

// Update an order's status or details
router.put(
    '/:id/status',
    verifyToken,
    body('status')
        .isIn(['Pending', 'Processing', 'Shipped', 'Delivered'])
        .withMessage('Invalid status'),
    (req: AuthRequest, res: Response, next: NextFunction) =>
        orderController.updateOrderStatus(req, res, next),
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
    (req: AuthRequest, res: Response, next: NextFunction) =>
        orderController.getOrdersByUser(req, res, next),
);

export = router;
