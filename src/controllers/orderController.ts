import { AuthRequest } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config/config';
import { body, validationResult } from 'express-validator';

// Alright, setting up some interfaces to keep our data nice and tidy
interface InventoryData {
    StockQuantity: number;
    Name: string;
    Price: number;
}

interface CartItemResponse {
    Id: number;
    UserId: number;
    InventoryId: number;
    Quantity: number;
}

export class OrderController {
    // grabbing the brewery api url from config
    private readonly breweryApiUrl =
        config.breweryApiUrl || 'http://localhost:5089';

    async createOrder(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        // First up, checking if the request has any validation issues
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { user_id } = req.body;
        if (req.user?.id !== user_id) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }
        // Setting up headers with the auth token
        const headers = { Authorization: req.headers.authorization };

        try {
            // Grabbing the user’s cart items from the Cart API
            const cartResponse = await axios.get<CartItemResponse[]>(
                `${this.breweryApiUrl}/api/cart/${user_id}`,
                { headers },
            );
            const cartItems = cartResponse.data.map(
                (item: CartItemResponse) => ({
                    userId: item.UserId,
                    inventoryId: item.InventoryId,
                    quantity: item.Quantity,
                }),
            );
            // If the cart’s empty, no point in going further
            if (!cartItems.length) {
                res.status(400).json({ message: 'Cart is empty' });
                return;
            }
            // loggin the cart items for debugging
            console.log('Cart items:', JSON.stringify(cartItems, null, 2));

            // Now, enriching cart items with inventory data
            const enrichedItems = await Promise.all(
                cartItems.map(
                    async (item: { inventoryId: number; quantity: number }) => {
                        const inventoryResponse = await axios.get(
                            `${this.breweryApiUrl}/api/inventory/${item.inventoryId}`,
                            { headers },
                        );
                        const inventoryData =
                            inventoryResponse.data as InventoryData;
                        // Loggin inventory data for debugging
                        console.log(
                            'Inventory data for item',
                            item.inventoryId,
                            ':',
                            JSON.stringify(inventoryData, null, 2),
                        );
                        // Checking stock
                        if (inventoryData.StockQuantity < item.quantity) {
                            throw new Error(
                                `Insufficient stock for product ${item.inventoryId}`,
                            );
                        }
                        return {
                            ProductId: item.inventoryId,
                            Quantity: item.quantity,
                            ProductName: inventoryData.Name,
                            PriceAtOrder: inventoryData.Price,
                        };
                    },
                ),
            );

            // Building the order payload
            const orderPayload = { UserId: user_id, Items: enrichedItems };
            console.log(
                'Order payload:',
                JSON.stringify(orderPayload, null, 2),
            );

            // Sending the order to the database service
            const orderResponse = await axios.post(
                `${this.breweryApiUrl}/api/order`,
                orderPayload,
                { headers },
            );
            // Updating inventory
            for (const item of enrichedItems) {
                await axios.put(
                    `${this.breweryApiUrl}/api/inventory/${item.ProductId}/stock`,
                    { quantity: -item.Quantity },
                    { headers },
                );
            }
            // Clearing the cart
            await axios.delete(
                `${this.breweryApiUrl}/api/cart/clear/${user_id}`,
                { headers },
            );

            res.status(201).json({
                message: 'Order created successfully',
                order: orderResponse.data,
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
    // This method grabs an order by its ID
    async getOrderById(
        req: AuthRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            // calling database service to get the order
            const response = await axios.get(
                `${this.breweryApiUrl}/api/order/${req.params.id}`,
            );
            console.log(
                'Order response:',
                JSON.stringify(response.data, null, 2),
            );
            console.log('Authenticated user ID:', req.user?.id);
            const orderData = response.data as { UserId: number }; // Use UserId (match C# casing)
            console.log('Order UserId:', orderData.UserId);
            if (req.user?.id !== orderData.UserId) {
                // Compare with UserId
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
            const orderResponse = await axios.get<{ UserId: number }>(
                `${this.breweryApiUrl}/api/order/${req.params.id}`,
            );
            const orderData = orderResponse.data;
            if (req.user?.id !== orderData.UserId) {
                res.status(403).json({ message: 'Unauthorized' });
                return;
            }
            // Transform the body to match C# service's expected casing
            const updateBody = {
                Status: req.body.status,
            };
            const response = await axios.put(
                `${this.breweryApiUrl}/api/order/${req.params.id}/status`,
                updateBody,
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
            if (req.user?.id !== Number(req.params.user_id)) {
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
