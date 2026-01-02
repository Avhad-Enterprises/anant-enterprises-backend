/**
 * Categories Route Feature
 * Handles category-related endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class CategoriesRoute implements Route {
    public path = '/categories';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        const { default: getCategoryProductsRouter } = await import('../product/apis/get-category-products');

        this.router.use(this.path, getCategoryProductsRouter);
    }
}

export default CategoriesRoute;
