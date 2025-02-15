import mongoose from 'mongoose';
import { orderSchema } from './orderSchema';
import { OrderDocument } from './orderDocument';

const Order = mongoose.model<OrderDocument>('Order', orderSchema);

export { Order };