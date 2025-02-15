import mongoose from 'mongoose';
import { orderItemSchema } from './orderItemSchema';
import { OrderDocument } from './orderDocument';

const orderSchema = new mongoose.Schema<OrderDocument>({
    user: {
        type: String,
        required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'delivered', 'cancelled'],
        default: 'pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveryDate: {
        type: Date
    },
    shippingAddress: {
        street: String,
        city: String,
        province: String,
        postalCode: String,
    }
});

export { orderSchema };