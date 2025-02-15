import express, { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { OrderController } from '../../../controllers/orderController';

const router = express.Router();
const orderController = new OrderController();

// Create an order
router.post('/orders',
    body('user').notEmpty().withMessage('User ID is required'),
    body('items').isArray().withMessage('Items must be an array').custom(items => {
        if (items.length === 0) throw new Error('Order must have at least one item');
        return true;
    }),
    body('items.*.product').notEmpty().withMessage('Product ID is required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.priceAtOrder').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('totalPrice').isFloat({ min: 0 }).withMessage('Total price must be a non-negative number'),
    body('shippingAddress').isObject().withMessage('Shipping address must be an object'),
    (req: Request, res: Response, next: NextFunction) => orderController.createOrder(req, res, next)
);

// Get a specific order by ID
router.get('/orders/:id', 
    (req: Request, res: Response, next: NextFunction) => orderController.getOrderById(req, res, next)
);

// Update an order's status or details
router.put('/orders/:id',
    body('status').optional().isIn(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']).withMessage('Invalid status'),
    (req: Request, res: Response, next: NextFunction) => orderController.updateOrder(req, res, next)
);

// Delete an order (cancel order)
router.delete('/orders/:id', 
    (req: Request, res: Response, next: NextFunction) => orderController.cancelOrder(req, res, next)
);

// Get all orders with optional filtering by user or status
router.get('/orders', 
    (req: Request, res: Response, next: NextFunction) => orderController.getOrders(req, res, next)
);

export = router;