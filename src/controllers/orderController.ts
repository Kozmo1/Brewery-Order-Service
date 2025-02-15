import { Request, Response, NextFunction } from 'express';
import { Order } from '../infrastructure/mongodb/models/order';
import { body, validationResult } from 'express-validator';

export class OrderController {
    // Create an order
    public async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    // Get a specific order by ID
    public async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    }
    // Update an order's status or details
    public async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

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
    // Delete an order (cancel order)
    public async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    }
    // Get all orders with optional filtering by user or status
    public async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    }
}