import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getAllSegmentsRouter from './apis/get-all-segments';
import createSegmentRouter from './apis/create-segment';
import getMatchingUsersRouter from './apis/get-matching-users';
import updateSegmentRouter from './apis/update-segment';
import deleteSegmentRouter from './apis/delete-segment';

class CustomerSegmentRoute implements Route {
    public path = '/customer-segments';
    public router = Router();

    public async init() {
        this.router.use(this.path, getAllSegmentsRouter);
        this.router.use(this.path, createSegmentRouter);
        this.router.use(`${this.path}/preview`, getMatchingUsersRouter);
        this.router.use(this.path, updateSegmentRouter);
        this.router.use(this.path, deleteSegmentRouter);
    }
}

export default CustomerSegmentRoute;
