/**
 * Discount Services Index
 *
 * Re-exports all discount services for easy importing.
 */

export { discountService, type CreateDiscountInput, type UpdateDiscountInput } from './discount.service';

export {
    discountValidationService,
    type ValidationContext,
    type ValidationResult,
    DiscountErrorCode,
} from './discount-validation.service';

export {
    discountCalculationService,
    type CalculationContext,
    type CalculationResult,
    type DiscountBreakdown,
    type FreeItem,
} from './discount-calculation.service';

export {
    discountCodeService,
    type CreateCodeInput,
    type BulkCodeOptions,
    type RecordUsageInput,
} from './discount-code.service';
