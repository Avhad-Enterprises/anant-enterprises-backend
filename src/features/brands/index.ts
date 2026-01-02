/**
 * Brands Route Feature
 * Handles brand-related endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class BrandsRoute implements Route {
    public path = '/brands';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        const { default: getBrandProductsRouter } = await import('../product/apis/get-brand-products');

        this.router.use(this.path, getBrandProductsRouter);
    }
}

export default BrandsRoute;
