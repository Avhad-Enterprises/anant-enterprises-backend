/**
 * Configuration for cart reservation system
 */

export const CART_RESERVATION_CONFIG = {
    // Timeout in minutes for cart reservations
    RESERVATION_TIMEOUT: parseInt(process.env.CART_RESERVATION_TIMEOUT || '30', 10),

    // Checkout extension in minutes
    CHECKOUT_EXTENSION: parseInt(process.env.CART_CHECKOUT_EXTENSION || '60', 10),

    // Cleanup interval in minutes
    CLEANUP_INTERVAL: parseInt(process.env.CART_CLEANUP_INTERVAL || '5', 10),

    // Feature flag
    ENABLED: process.env.ENABLE_CART_RESERVATIONS !== 'false', // Enabled by default
};
