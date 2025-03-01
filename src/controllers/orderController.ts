import { AuthRequest } from "../middleware/auth";
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { body, validationResult } from "express-validator";

interface OrderQueryParams {
    user?: string;
    status?: string;
}

export class OrderController {
    private readonly breweryApiUrl = config.breweryApiUrl;

    public async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const response = await axios.post(`${this.breweryApiUrl}/api/order`, {
                ...req.body,
                user: req.user?.id || req.user?.email,
            }, {
                headers: { Authorization: req.headers.authorization }
            });
            res.status(201).json(response.data);
        } catch (error: any) {
            console.error("Error creating order:", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({ message: error.response?.data?.message || "Error creating order" });
        }
    }

    public async getOrderById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const response = await axios.get(`${this.breweryApiUrl}/api/order/${req.params.id}`, {
                headers: { Authorization: req.headers.authorization }
            });
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error("Error fetching order:", error.response?.data || error.message);
            res.status(error.response?.status || 404).json({ message: error.response?.data?.message || "Order not found" });
        }
    }

    public async updateOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const response = await axios.put(`${this.breweryApiUrl}/api/order/${req.params.id}`, req.body, {
                headers: { Authorization: req.headers.authorization }
            });
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error("Error updating order:", error.response?.data || error.message);
            res.status(error.response?.status || 404).json({ message: error.response?.data?.message || "Order not found" });
        }
    }

    public async cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const response = await axios.delete(`${this.breweryApiUrl}/api/order/${req.params.id}`, {
                headers: { Authorization: req.headers.authorization }
            });
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error("Error cancelling order:", error.response?.data || error.message);
            res.status(error.response?.status || 404).json({ message: error.response?.data?.message || "Order not found" });
        }
    }

    public async getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const params: OrderQueryParams = {};
            if (req.query.user) params.user = req.query.user as string;
            if (req.query.status) params.status = req.query.status as string;

            const response = await axios.get(`${this.breweryApiUrl}/api/order`, {
                params,
                headers: { Authorization: req.headers.authorization }
            });
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error("Error fetching orders:", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({ message: error.response?.data?.message || "Error fetching orders" });
        }
    }
}