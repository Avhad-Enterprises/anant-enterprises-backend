// Test if inventory routes can be imported
console.log('Starting test...');

import('./features/inventory/index.js')
    .then(() => {
        console.log('✅ Inventory module loaded successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error loading inventory module:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    });
