https://www.figma.com/make/8eda21nbN7fvOABow5vn0C/Siscaa-B2B-Factory-Management-UI?p=f&t=yGIjJrERBNmdLrCr-0 

📘 CATALOGS (ADVANCED B2B COMMERCIAL LOGIC LAYER)

What this section is (redefined beyond Shopify)
In a modern multi-industry ecommerce backend, Catalogs are not just price lists.
A Catalog is a programmable commercial rule layer that controls who can buy what, under which commercial constraints, and under which operational conditions.
Catalogs sit between Products and Orders and act as a business contract engine.
Products define what exists
 Catalogs define how, to whom, and under what rules those products can be sold

Why catalogs must go beyond Shopify
Shopify’s catalog concept works well for simple B2B but breaks down when:
Industries have complex ordering logic


Pricing depends on more than quantity


Compliance and logistics constraints exist


Multi-role buyers operate under one company


Businesses sell physical + digital + services together


Your system should treat Catalogs as a first-class business abstraction, not just a pricing tool.

## 💰 Multi-Currency Integration with Catalogs

### Why Multi-Currency Belongs in Catalogs

Multi-currency is not separate from catalogs - it's a core pricing dimension that catalogs must control. Catalogs define **who pays what, in which currency, under what conditions**.

### Manual Pricing Control (No Auto-Conversion)

**Your catalogs will store explicit prices per currency** - no automatic exchange rate conversion. This gives you complete control over:

- **Psychological pricing**: ₹8,499 feels better than ₹8,350
- **Market positioning**: Different prices for different markets
- **Margin control**: Fixed margins regardless of exchange fluctuations
- **Competitive positioning**: Match local market prices exactly

### How Multi-Currency Works in Catalogs

```typescript
// Catalog Price Structure
interface CatalogPrice {
  product_id: number;
  catalog_id: number;
  base_currency: string;  // Accounting currency (USD/INR)
  base_price: number;     // Internal accounting price
  
  // Manual prices per currency (what customers actually see)
  prices: {
    INR: 8499,    // ₹8,499 for Indian market
    USD: 100,     // $100 for US market  
    EUR: 95,      // €95 for European market
    GBP: 85       // £85 for UK market
  };
  
  // Catalog rules still apply
  discount_percent: number;
  moq: number;
  volume_tiers: VolumePricing[];
}
```

### Multi-Currency Pricing Dimensions

Your catalogs support pricing based on:

**Currency-Specific Rules:**
- **Payment Method**: ₹700 prepaid, ₹750 on credit (INR)
- **Customer Tier**: $95 for Gold customers, $100 for Silver (USD)
- **Geography**: Different prices for domestic vs export
- **Channel**: Distributor pricing in local currency

**Example - Same Product, Different Currencies:**
```
Industrial Pump - Base Price: $1,000

INR Catalog (India):
- Distributor: ₹84,999 (15% discount)
- Direct Customer: ₹94,999 (5% discount)

USD Catalog (USA):  
- Distributor: $850 (15% discount)
- Direct Customer: $950 (5% discount)

EUR Catalog (Europe):
- Distributor: €782 (15% discount) 
- Direct Customer: €869 (5% discount)
```

### Currency Selection Logic

1. **Company-Based**: Company registered in India → INR catalog
2. **User Preference**: User selects preferred currency
3. **Location-Based**: IP geolocation suggests currency
4. **Contract-Based**: Contract specifies pricing currency

### Database Schema for Multi-Currency Catalogs

```sql
-- Catalogs define commercial rules
CREATE TABLE catalogs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  company_id INTEGER,           -- Specific company or NULL for public
  base_currency VARCHAR(3),     -- Accounting currency (USD/INR)
  supported_currencies TEXT[],  -- ['INR', 'USD', 'EUR']
  is_active BOOLEAN DEFAULT true
);

-- Catalog prices with multi-currency support
CREATE TABLE catalog_prices (
  id SERIAL PRIMARY KEY,
  catalog_id INTEGER REFERENCES catalogs(id),
  product_id INTEGER REFERENCES products(id),
  
  -- Accounting (internal)
  base_currency VARCHAR(3),
  base_price DECIMAL(10,2),
  
  -- Customer-facing prices (manual control)
  price_inr DECIMAL(10,2),  -- NULL = not available in INR
  price_usd DECIMAL(10,2),  -- NULL = not available in USD  
  price_eur DECIMAL(10,2),  -- NULL = not available in EUR
  price_gbp DECIMAL(10,2),  -- NULL = not available in GBP
  
  -- Catalog rules
  discount_percent DECIMAL(5,2) DEFAULT 0,
  moq INTEGER DEFAULT 1,
  volume_pricing JSONB,  -- Complex volume tiers
  
  UNIQUE(catalog_id, product_id)
);
```

### Integration with Catalog Rules

**Currency affects ALL catalog dimensions:**

1. **MOQ by Currency**: 
   - INR: MOQ 10 units (₹84,990 minimum)
   - USD: MOQ 5 units ($4,250 minimum)

2. **Volume Pricing by Currency**:
   - INR: 10-49 units = ₹84,999, 50+ units = ₹79,999
   - USD: 5-24 units = $850, 25+ units = $800

3. **Payment Terms by Currency**:
   - INR: Prepaid discount, credit terms available
   - USD: Prepaid only, no credit

### Real-World Multi-Currency Catalog Examples

**Manufacturing B2B:**
```
Product: Industrial Valve
Base Price: $500

INR Catalog (India):
- Distributor: ₹41,999 (₹500/unit for 100+ units)
- OEM: ₹39,999 (₹400/unit for 500+ units)

USD Catalog (USA):
- Distributor: $425 ($4.25/unit for 100+ units)  
- OEM: $400 ($4/unit for 500+ units)

EUR Catalog (Europe):
- Distributor: €391 (€3.91/unit for 100+ units)
- OEM: €368 (€3.68/unit for 500+ units)
```

**FMCG Distribution:**
```
Product: Consumer Pack
Base Price: $10

INR Catalog (India):
- Retailer: ₹849 (carton of 24 = ₹20,376)
- Distributor: ₹799 (pallet of 24 cartons = ₹460,776)

USD Catalog (USA):
- Retailer: $8.49 (case of 12 = $101.88)
- Distributor: $7.99 (pallet of 24 cases = $2,302.56)
```

### Currency-Specific Business Rules

**Compliance & Regulations:**
- INR: GST compliance, Indian banking regulations
- USD: Export controls, international banking
- EUR: VAT rules, EU regulations

**Payment Methods:**
- INR: UPI, Net Banking, Cards, COD
- USD: Wire Transfer, Cards, PayPal
- EUR: SEPA, Cards, Bank Transfer

**Shipping & Logistics:**
- INR: Domestic shipping, customs for exports
- USD: International shipping, import duties
- EUR: EU shipping zones, customs union

### Implementation Architecture

```
User Request Flow:
1. Identify Company → Load assigned Catalog
2. Check User Currency Preference → Filter available prices  
3. Apply Catalog Rules → Calculate final price in selected currency
4. Validate MOQ & Business Rules → Show available options
5. Display Price + Rules → User sees ₹84,999 (INR) or $850 (USD)
```

### Key Benefits of Manual Multi-Currency in Catalogs

✅ **Complete Price Control**: Set exact prices for each market
✅ **Psychological Pricing**: ₹8,499 vs ₹8,350 matters
✅ **Stable Pricing**: No exchange rate fluctuations
✅ **Market Positioning**: Different strategies per country
✅ **Margin Protection**: Fixed margins regardless of currency
✅ **Competitive Edge**: Match local competitors exactly

### Currency Management

**Currency Table:**
```sql
CREATE TABLE currencies (
  code VARCHAR(3) PRIMARY KEY,  -- INR, USD, EUR
  name VARCHAR(50),             -- Indian Rupee, US Dollar
  symbol VARCHAR(5),            -- ₹, $, €
  decimal_places INTEGER,       -- 2 for most currencies
  is_active BOOLEAN DEFAULT true
);
```

**Currency Updates:**
- Manual price updates when needed
- Bulk price changes by percentage
- Seasonal pricing adjustments
- Promotional pricing per currency

What an advanced Catalog should control (beyond Shopify)
1️⃣ Multi-dimension pricing (not just quantity)
Shopify focuses mainly on:
Price lists


Volume pricing


Your system should support pricing based on:
Customer role (buyer, manager, procurement)


Company tier (Silver / Gold / Enterprise)


Geography (city, state, export vs domestic)


Time windows (seasonal, contract-based)


Channel (direct, reseller, distributor)


Payment method (prepaid vs credit)


Delivery method (pickup vs shipped)


Example
Same product:


₹700 if prepaid


₹750 on credit


₹680 for long-term contract customers



2️⃣ Advanced MOQ logic (industry-specific)
Shopify supports basic MOQ + increments.
 Many industries need more.
Your catalog should support:
MOQ by variant attribute (size, grade, pack)


MOQ by order value, not quantity


MOQ by logistics unit (pallet, carton, roll, batch)


Conditional MOQ (lower MOQ after first order)


Progressive MOQ (increases over time)


Industry examples
FMCG: MOQ in cartons, not pieces


Chemicals: MOQ in kilograms or barrels


Apparel: MOQ per size-color combination


Manufacturing: MOQ per production batch



3️⃣ Mixed catalogs (products + services + access)
Shopify catalogs assume products only.
Your system should allow catalogs to include:
Physical products


Digital products


Subscriptions


Services (installation, AMC, consulting)


Access rights (support level, delivery priority)


Example
 A B2B catalog may include:
Products


Free installation


Priority dispatch


Dedicated account support



4️⃣ Conditional product availability
Instead of simple include/exclude:
Catalogs should support:
“Available only if cart contains X”


“Hidden unless MOQ reached”


“Available only for repeat customers”


“Unlocked after approval or verification”


Example
 Industrial equipment accessories only appear after main machine is added to cart.

5️⃣ Catalog stacking & hierarchy (Shopify fails here)
Real businesses often need multiple overlapping agreements.
Your system should support:
Base catalog (default)


Contract catalog (overrides)


Campaign catalog (temporary)


Exception catalog (one-off)


With clear precedence rules, such as:
Exception > Contract > Campaign > Base

This avoids breaking pricing logic when multiple rules apply.

6️⃣ Location, department & budget-aware catalogs
Shopify handles location; businesses need more.
Extend catalogs to:
Department budgets


Project-based buying


Cost center limits


Approval thresholds


Example
 A company’s marketing team can order only from a “Marketing Catalog” with monthly spend caps.

7️⃣ Compliance-driven catalogs (regulated industries)
Critical for:
Alcohol


Pharma


Chemicals


Medical devices


Export goods


Catalog rules can enforce:
License checks before visibility


Geo-restricted availability


Age or document verification


SKU locking by regulation


Example
 Certain SKUs visible only to licensed buyers in approved regions.

8️⃣ Operational constraints baked into catalog
Catalogs should influence operations, not just checkout.
Examples:
Lead time promises per catalog


Dispatch priority


Packaging requirements


Carrier restrictions


Example
 Distributor catalog guarantees same-day dispatch, retail does not.

How catalogs interact with the rest of the system (expanded view)
Catalogs should integrate with:
Customer Companies → commercial contracts


Customer Roles → buyer permissions


Inventory → feasibility of MOQ rules


Orders → validation & enforcement


Shipping → logistics compatibility


Payments → allowed payment methods


Automation → rule execution


Analytics → catalog performance


Catalogs become a decision engine, not a static configuration.

Real-world multi-industry examples
Manufacturing
MOQ per batch


Pricing by raw material index


Delivery windows by plant


FMCG Distribution
Carton-based ordering


Route-wise pricing


Credit limit enforcement


Apparel B2B
Size-wise MOQ


Season-based catalogs


Clearance catalogs for old stock


SaaS + Hardware
Product + subscription bundles


Tier-based service access


Contract renewal pricing



What catalogs should NOT be used for (even in advanced systems)
Inventory tracking


Order history


User authentication


Marketing content storage


Catalogs define commercial rules, not operational state.

Key design principles for your system
Catalogs must be rule-driven, not hardcoded


Catalog assignment must be contextual (company, location, role)


Conflicts must be deterministic and explainable


UI must explain rules to buyers clearly


Catalog logic must be auditable and testable

