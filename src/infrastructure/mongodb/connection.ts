import {connect as connection} from 'mongoose';
import {config} from '../../config/config';

const mongoDb = config.mongo.url; // Get the MongoDB URL from the configuration object

export const ConnectToDb = async () => { // Connect to the MongoDB database
    try {
        await connection(mongoDb); 
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
    }
};