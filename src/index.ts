import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv-safe';
import orderRoutes from './ports/rest/routes/order';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || 'local'}`,
    example: '.env.example'
});

const port = process.env.PORT || 3002;

app.use("/healthcheck", (req, res) => {
    res.status(200).send("We have Orders working");
});

app.use("/order", orderRoutes);

app.listen(port, () => {
    console.log(`Orders service listening at http://localhost:${port}`);
});