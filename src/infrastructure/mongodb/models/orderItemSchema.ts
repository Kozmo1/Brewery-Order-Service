import {Schema} from 'mongoose';

const orderItemSchema = new Schema({
    product: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    }, 
    priceAtOrder: {
        type: Number,
        required: true,
        min: 0,
    }
});

export {orderItemSchema};