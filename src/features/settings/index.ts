/**
 * Settings Feature Index
 *
 * Configuration tables for multi-currency and tax management
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class SettingsRoute implements Route {
  public path = '/settings';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // TODO: Add settings APIs
    // Currencies CRUD
    // Tax Rules CRUD
    // Countries reference
    // Regions reference
  }
}

// Main route export
export default SettingsRoute;

// Schema exports
export * from './shared/currencies.schema';
export * from './shared/tax-rules.schema';
export * from './shared/interface';
