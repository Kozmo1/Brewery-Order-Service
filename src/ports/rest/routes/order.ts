import express, { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Order } from '../../../infrastructure/mongodb/models/order';
import { ConnectToDb } from '../../../infrastructure/mongodb/connection';

const router = express.Router();

ConnectToDb();

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
    async (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const order = new Order(req.body);
            await order.save();
            res.status(201).json({ message: 'Order created successfully', orderId: order._id });
        } catch (error) {
            console.error('Error creating order:', error);
            res.status(500).json({ message: 'Error creating order' });
        }
    }
);

// Get a specific order by ID
router.get('/orders/:id', async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            res.status(200).json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Error fetching order' });
    }
});

// Update an order's status or details
router.put('/orders/:id',
    body('status').optional().isIn(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']).withMessage('Invalid status'),
    async (req: Request, res: Response) => {
        try {
            const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
            if (order) {
                res.status(200).json(order);
            } else {
                res.status(404).json({ message: 'Order not found' });
            }
        } catch (error) {
            console.error('Error updating order:', error);
            res.status(500).json({ message: 'Error updating order' });
        }
    }
);

// Delete an order (cancel order)
router.delete('/orders/:id', async (req: Request, res: Response) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: 'Cancelled' }, { new: true });
        if (order) {
            res.status(200).json({ message: 'Order cancelled successfully', order: order });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Error cancelling order' });
    }
});

// Get all orders with optional filtering by user or status
router.get('/orders', async (req: Request, res: Response) => {
    try {
        const query: any = {};
        if (req.query.user) query.user = req.query.user;
        if (req.query.status) query.status = req.query.status;

        const orders = await Order.find(query);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

export = router;