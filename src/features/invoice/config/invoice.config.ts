/**
 * Invoice PDF Configuration
 *
 * Toggle visibility of specific sections/fields and customize static text.
 * Used by InvoiceService to dynamically generate PDF content.
 */

export const invoiceConfig = {
  // --- Company Details ---
  company: {
    name: 'ANANT ENTERPRISES',
    address: '123 Business Street, City, State 12345',
    email: 'support@anantentries.com',
    showGSTIN: false,
    gstin: '27ABCDE1234F1Z5',
  },

  // --- Tax Configuration ---
  tax: {
    enabled: false, // Master switch for tax calculation
    isInclusive: false, // Whether product prices include tax
    rate: 0.18, // Default tax rate (18%)
  },

  // --- Invoice Header Metadata ---
  header: {
    title: 'TAX INVOICE',
    showPlaceOfSupply: true,
    showTimeOfSupply: true, // Example of unused field for future
  },

  // --- Client Details ---
  client: {
    showGSTIN: false,
    showPhone: true,
    showEmail: true,
  },

  // --- Item Table Columns ---
  table: {
    showSlNo: true,
    showHSN: false,
    showUnit: true, // "Unit Price" and "Unit" split
    showRate: false, // Tax Rate %
    showDiscount: true,
    showTaxableValue: false,
  },

  // --- Footer Content ---
  footer: {
    showAmountInWords: true,
    greeting: 'Thank You!',
    termsAndConditions: [
      'Goods sold are not refundable.',
      'Return within 7 days.',
      'Payment due immediately upon receipt.',
      'GST is not getting charged as the company is under composition scheme.',
    ],
    showAuthorizedSignatory: false, // Placeholder for future signature
  },

  // --- Order Summary ---
  summary: {
    showSubtotal: true,
    showDiscount: true,
    showTaxableValue: false,
    showTaxBreakdown: false, // Master toggle for tax details
    showIGST: false, // Granular toggle for IGST
    showCGSTSGST: false, // Granular toggle for CGST/SGST
    showTotalTax: false,
    showShipping: true,
  },

  // --- Layout Settings ---
  layout: {
    fontFamily: 'Helvetica',
    fontSize: {
      header: 16,
      subHeader: 14,
      body: 10,
      small: 9,
      tiny: 8,
    },
    colors: {
      primary: 'black',
      secondary: '#444444',
      accent: '#000000',
    },
  },
};

