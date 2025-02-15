import {config} from "../config/config"; 
import mongoDbClient from "./mongodb/mongoDbClient";

const dependencies = { // Export the dependencies object
    config,
    mongoDbClient
};

export default dependencies;