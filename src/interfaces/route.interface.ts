import { Router } from 'express';

interface Route {
  path?: string;
  router: Router;
  /** Optional async initialization - called before server starts listening */
  init?(): Promise<void>;
}

export default Route;
