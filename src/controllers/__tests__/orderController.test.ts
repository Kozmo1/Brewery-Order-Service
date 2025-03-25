import { OrderController } from '../orderController';
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import axios from 'axios';
import { validationResult, ValidationError } from 'express-validator';

// Mock axios for external API calls
jest.mock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}));

// Mock express-validator
jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));

// Type the mocked validationResult to match its expected return type
const mockedValidationResult =
    validationResult as unknown as jest.MockedFunction<
        () => {
            isEmpty: () => boolean;
            array: () => ValidationError[];
        }
    >;

describe('OrderController', () => {
    let orderController: OrderController;
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    // Set up mocks and controller before each test
    beforeEach(() => {
        orderController = new OrderController();
        mockRequest = {
            body: {},
            params: {},
            headers: { authorization: 'Bearer mock-token' },
            user: { id: 1, email: 'test@example.com' },
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();

        // Clear mocks to ensure test isolation
        jest.clearAllMocks();
        // Suppress console logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('createOrder', () => {
        // Test successful order creation
        it('should create an order successfully', async () => {
            // Mock validation passing
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            // Mock cart response
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: [{ Id: 1, UserId: 1, InventoryId: 101, Quantity: 2 }],
            });
            // Mock inventory response
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { StockQuantity: 5, Name: 'Beer', Price: 5.99 },
            });
            // Mock order creation
            (axios.post as jest.Mock).mockResolvedValueOnce({
                data: { id: 'order1', UserId: 1 },
            });
            // Mock inventory update and cart clear
            (axios.put as jest.Mock).mockResolvedValueOnce({});
            (axios.delete as jest.Mock).mockResolvedValueOnce({});

            mockRequest.body = { user_id: 1 };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:5089/api/cart/1',
                expect.any(Object),
            );
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:5089/api/order',
                expect.any(Object),
                expect.any(Object),
            );
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order created successfully',
                order: { id: 'order1', UserId: 1 },
            });
        });

        it('should handle errors with partial response data', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockRejectedValue({
                response: { status: 400, data: {} }, // No message or errors
            });

            mockRequest.body = { user_id: 1 };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error creating order',
                error: undefined,
            });
        });

        // Test validation failure
        it('should return 400 if validation fails', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [
                    {
                        msg: 'User ID must be a positive integer',
                    } as ValidationError,
                ],
            });

            mockRequest.body = { user_id: 'invalid' };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errors: [{ msg: 'User ID must be a positive integer' }],
            });
        });

        // Test unauthorized user
        it('should return 403 if user is unauthorized', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });

            mockRequest.body = { user_id: 2 }; // Different from req.user.id (1)

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test empty cart
        it('should return 400 if cart is empty', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });

            mockRequest.body = { user_id: 1 };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Cart is empty',
            });
        });

        // Test insufficient stock
        it('should handle insufficient stock error', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: [{ Id: 1, UserId: 1, InventoryId: 101, Quantity: 2 }],
            });
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { StockQuantity: 1, Name: 'Beer', Price: 5.99 }, // Less than requested
            });

            mockRequest.body = { user_id: 1 };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error creating order',
                error: 'Insufficient stock for product 101',
            });
        });

        // Test error without response
        it('should handle errors without response', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockRejectedValue(
                new Error('Network error'),
            );

            mockRequest.body = { user_id: 1 };

            await orderController.createOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error creating order',
                error: 'Network error',
            });
        });
    });

    describe('getOrderById', () => {
        // Test successful order retrieval
        it('should get order by ID successfully', async () => {
            (axios.get as jest.Mock).mockResolvedValue({
                data: { id: 'order1', UserId: 1 },
            });

            mockRequest.params = { id: 'order1' };

            await orderController.getOrderById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:5089/api/order/order1',
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                id: 'order1',
                UserId: 1,
            });
        });

        // Test unauthorized user
        it('should return 403 if user is unauthorized', async () => {
            (axios.get as jest.Mock).mockResolvedValue({
                data: { id: 'order1', UserId: 2 }, // Different from req.user.id (1)
            });

            mockRequest.params = { id: 'order1' };

            await orderController.getOrderById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test req.user undefined
        it('should return 403 if req.user is undefined', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { id: 'order1' };

            await orderController.getOrderById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test order not found
        it('should handle order not found', async () => {
            (axios.get as jest.Mock).mockRejectedValue({
                response: { status: 404, data: { message: 'Order not found' } },
            });

            mockRequest.params = { id: 'order1' };

            await orderController.getOrderById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order not found',
                error: undefined,
            });
        });

        // Test error without response
        it('should handle errors without response', async () => {
            (axios.get as jest.Mock).mockRejectedValue(
                new Error('Network error'),
            );

            mockRequest.params = { id: 'order1' };

            await orderController.getOrderById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order not found',
                error: 'Network error',
            });
        });
    });

    describe('updateOrderStatus', () => {
        // Test successful status update
        it('should update order status successfully', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { UserId: 1 },
            });
            (axios.put as jest.Mock).mockResolvedValue({
                data: { id: 'order1', Status: 'Shipped' },
            });

            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Shipped' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(axios.put).toHaveBeenCalledWith(
                'http://localhost:5089/api/order/order1/status',
                { Status: 'Shipped' },
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order status updated successfully',
                order: { id: 'order1', Status: 'Shipped' },
            });
        });

        it('should handle errors with partial response data', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockRejectedValue({
                response: { status: 400, data: {} }, // No message or errors
            });

            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Shipped' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error updating order status',
                error: undefined,
            });
        });

        // Test validation failure
        it('should return 400 if validation fails', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Invalid status' } as ValidationError],
            });

            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Invalid' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errors: [{ msg: 'Invalid status' }],
            });
        });

        // Test unauthorized user
        it('should return 403 if user is unauthorized', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: { UserId: 2 }, // Different from req.user.id (1)
            });

            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Shipped' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test req.user undefined
        it('should return 403 if req.user is undefined', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            mockRequest.user = undefined;
            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Shipped' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test error without response
        it('should handle errors without response', async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });
            (axios.get as jest.Mock).mockRejectedValue(
                new Error('Network error'),
            );

            mockRequest.params = { id: 'order1' };
            mockRequest.body = { status: 'Shipped' };

            await orderController.updateOrderStatus(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error updating order status',
                error: 'Network error',
            });
        });
    });

    describe('cancelOrder', () => {
        // Test successful order cancellation
        it('should cancel order successfully', async () => {
            (axios.delete as jest.Mock).mockResolvedValue({
                data: { message: 'Order cancelled' },
            });

            mockRequest.params = { id: 'order1' };

            await orderController.cancelOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(axios.delete).toHaveBeenCalledWith(
                'http://localhost:5089/api/order/order1',
                expect.any(Object),
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order cancelled',
            });
        });

        // Test order not found
        it('should handle order not found', async () => {
            (axios.delete as jest.Mock).mockRejectedValue({
                response: { status: 404, data: { message: 'Order not found' } },
            });

            mockRequest.params = { id: 'order1' };

            await orderController.cancelOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order not found',
            });
        });

        // Test error without response
        it('should handle errors without response', async () => {
            (axios.delete as jest.Mock).mockRejectedValue(
                new Error('Network error'),
            );

            mockRequest.params = { id: 'order1' };

            await orderController.cancelOrder(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Order not found',
            });
        });
    });

    describe('getOrdersByUser', () => {
        // Test successful retrieval of user orders
        it('should get orders by user successfully', async () => {
            (axios.get as jest.Mock).mockResolvedValue({
                data: [{ id: 'order1', UserId: 1 }],
            });

            mockRequest.params = { user_id: '1' };

            await orderController.getOrdersByUser(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:5089/api/order/user/1',
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith([
                { id: 'order1', UserId: 1 },
            ]);
        });

        it('should handle errors with partial response data', async () => {
            (axios.get as jest.Mock).mockRejectedValue({
                response: { status: 400, data: {} }, // No message or errors
            });

            mockRequest.params = { user_id: '1' };

            await orderController.getOrdersByUser(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error fetching orders',
                error: undefined,
            });
        });

        // Test unauthorized user
        it('should return 403 if user is unauthorized', async () => {
            mockRequest.params = { user_id: '2' }; // Different from req.user.id (1)

            await orderController.getOrdersByUser(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test req.user undefined
        it('should return 403 if req.user is undefined', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { user_id: '1' };

            await orderController.getOrdersByUser(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });

        // Test error without response
        it('should handle errors without response', async () => {
            (axios.get as jest.Mock).mockRejectedValue(
                new Error('Network error'),
            );

            mockRequest.params = { user_id: '1' };

            await orderController.getOrdersByUser(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext,
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error fetching orders',
                error: 'Network error',
            });
        });
    });
});
