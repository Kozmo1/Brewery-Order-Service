import { Document } from 'mongoose';

interface OrderDocument extends Document {
    user: string;
    items: Array<{
        product: string;
        quantity: number;
        orderPrice: number;
    }>;
    totalPrice: number;
    status: string;
    orderDate: Date;
    deliveryDate?: Date;
    shippingAddress: {
        street: string;
        city: string;
        province: string;
        postalCode: string;
    };
}

export { OrderDocument };