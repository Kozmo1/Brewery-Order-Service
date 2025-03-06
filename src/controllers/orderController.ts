import { AuthRequest } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/config';
import { body, validationResult } from 'express-validator';

interface OrderQueryParams {
    user?: string;
    status?: string;
}

export class OrderController {
    private readonly breweryApiUrl = config.breweryApiUrl;

    async createOrder(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { user_id, items } = req.body;
        if (req.user?.id !== user_id.toString()) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }

        try {
            // Check stock availability with Inventory Service
            for (const item of items) {
                const inventoryResponse = await axios.get<{
                    stockQuantity: number;
                }>(`${this.breweryApiUrl}/api/inventory/${item.product_id}`);
                if (inventoryResponse.data.stockQuantity < item.quantity) {
                    res.status(400).json({
                        message: `Insufficient stock for product ${item.product_id}`,
                    });
                    return;
                }
            }

            // Create order
            const orderResponse = await axios.post<{
                id: string;
                totalPrice: number;
            }>(`${this.breweryApiUrl}/api/order`, req.body);

            // Update stock
            for (const item of items) {
                await axios.put(
                    `${this.breweryApiUrl}/api/inventory/${item.product_id}/stock`,
                    {
                        quantity: -item.quantity,
                    },
                );
            }

            // Trigger payment
            const paymentResponse = await axios.post(
                `${this.breweryApiUrl.replace('5089', '3003')}/payment/process`,
                {
                    orderId: orderResponse.data.id,
                    amount: orderResponse.data.totalPrice,
                },
            );

            // Trigger shipping
            await axios.post(
                `${this.breweryApiUrl.replace('5089', '3010')}/shipping/create`,
                {
                    user_id,
                    order_id: orderResponse.data.id,
                    address: req.body.address,
                    city: req.body.city,
                    country: req.body.country,
                    postal_code: req.body.postal_code,
                },
            );

            res.status(201).json({
                message: 'Order created successfully',
                order: orderResponse.data,
                payment: paymentResponse.data,
            });
        } catch (error: any) {
            console.error(
                'Error creating order:',
                error.response?.data || error.message,
            );
            res.status(error.response?.status || 500).json({
                message:
                    error.response?.data?.message || 'Error creating order',
                error: error.response?.data?.errors || error.message,
            });
        }
    }

    async getOrderById(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const response = await axios.get(
                `${this.breweryApiUrl}/api/order/${req.params.id}`,
            );
            const orderData = response.data as { user_id: string };
            if (req.user?.id !== orderData.user_id.toString()) {
                res.status(403).json({ message: 'Unauthorized' });
                return;
            }
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error(
                'Error fetching order:',
                error.response?.data || error.message,
            );
            res.status(error.response?.status || 404).json({
                message: error.response?.data?.message || 'Order not found',
                error: error.response?.data?.errors || error.message,
            });
        }
    }

    async updateOrderStatus(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const orderResponse = await axios.get<{ user_id: string }>(
                `${this.breweryApiUrl}/api/order/${req.params.id}`,
            );
            const orderData = orderResponse.data as { user_id: string };
            if (req.user?.id !== orderData.user_id.toString()) {
                res.status(403).json({ message: 'Unauthorized' });
                return;
            }
            const response = await axios.put(
                `${this.breweryApiUrl}/api/order/${req.params.id}/status`,
                req.body,
            );

            // Notify user of status update
            await axios.post(
                `${this.breweryApiUrl.replace('5089', '3005')}/notifications/order-status`,
                {
                    user_id: orderResponse.data.user_id,
                    order_id: req.params.id,
                    status: req.body.status,
                },
            );

            res.status(200).json({
                message: 'Order status updated successfully',
                order: response.data,
            });
        } catch (error: any) {
            console.error(
                'Error updating order status:',
                error.response?.data || error.message,
            );
            res.status(error.response?.status || 500).json({
                message:
                    error.response?.data?.message ||
                    'Error updating order status',
                error: error.response?.data?.errors || error.message,
            });
        }
    }

    public async cancelOrder(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const response = await axios.delete(
                `${this.breweryApiUrl}/api/order/${req.params.id}`,
                {
                    headers: { Authorization: req.headers.authorization },
                },
            );
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error(
                'Error cancelling order:',
                error.response?.data || error.message,
            );
            res.status(error.response?.status || 404).json({
                message: error.response?.data?.message || 'Order not found',
            });
        }
    }

    async getOrdersByUser(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (req.user?.id !== req.params.user_id) {
                res.status(403).json({ message: 'Unauthorized' });
                return;
            }
            const response = await axios.get(
                `${this.breweryApiUrl}/api/order/user/${req.params.user_id}`,
            );
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error(
                'Error fetching user orders:',
                error.response?.data || error.message,
            );
            res.status(error.response?.status || 500).json({
                message:
                    error.response?.data?.message || 'Error fetching orders',
                error: error.response?.data?.errors || error.message,
            });
        }
    }
}
