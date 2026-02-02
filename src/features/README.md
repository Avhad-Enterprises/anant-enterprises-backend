# Features Architecture Guide

> **Vertical Slice Architecture** — Each feature is self-contained with all related code grouped together.

---

## Standard Feature Structure

```
feature-name/
├── index.ts              # Route class & exports
├── apis/                 # HTTP endpoints
│   └── action-name.ts    # Route + Handler + Validation
├── services/             # Business logic
│   └── feature.service.ts
├── shared/               # Schemas, types, queries
│   ├── feature.schema.ts # Drizzle schema
│   ├── interface.ts      # TypeScript types
│   ├── queries.ts        # Database queries
│   └── index.ts          # Barrel exports
└── [optional]
    ├── config/           # Feature configuration
    ├── jobs/             # Background/cron tasks
    └── socket/           # WebSocket handlers
```

---

## Layer Responsibilities

### `apis/` — HTTP Endpoints

Each file = **one endpoint** (vertical slice):

```typescript
// apis/create-product.ts

// 1. VALIDATION — Zod schema (inline or from shared/)
const createProductSchema = z.object({
    name: z.string().min(1).max(255),
    price: z.number().positive(),
});

// 2. HANDLER — Request processing
const handler = async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);
    const result = await productService.create(data);
    return ResponseFormatter.success(res, result, 'Product created', 201);
};

// 3. ROUTE
const router = Router();
router.post('/', requireAuth, handler);
export default router;
```

**Best Practices:**
- Keep validation inline if used by single endpoint
- Move to `shared/` if schema is shared or complex (50+ lines)
- Handler should focus on request/response, delegate business logic

---

### `services/` — Business Logic

Services contain **reusable business operations**:

```typescript
// services/cart.service.ts
export class CartService {
    async getOrCreateCart(userId?: string): Promise<Cart> { }
    async applyDiscount(cartId: string, code: string): Promise<Cart> { }
    async recalculate(cartId: string): Promise<void> { }
}
export const cartService = new CartService();
```

**When to use services:**
| Service | Inline |
|---------|--------|
| Complex logic | Simple CRUD |
| Shared between APIs | Single endpoint |
| Transaction handling | One-liner ops |
| External integrations | Direct DB ops |

---

### `shared/` — Schemas, Types, Queries

| File | Purpose |
|------|---------|
| `*.schema.ts` | Drizzle database schemas |
| `interface.ts` | TypeScript types/interfaces |
| `queries.ts` | Reusable database queries |
| `validation.ts` | Shared Zod schemas (optional) |
| `index.ts` | Barrel exports |

---

### `queries/` — Pure Data Access (Optional)

For large features with 10+ database operations:

```typescript
// queries/inventory.queries.ts
export function findInventoryById(id: string) {
    return db.select().from(inventory).where(eq(inventory.id, id));
}
```

> Use `shared/queries.ts` for most features. Only create `queries/` for complex features.

---

## Decision Tree

```
HTTP endpoint? → apis/
Business logic reused by multiple APIs? → services/
Database schema/type? → shared/*.schema.ts or interface.ts
Reusable query? → shared/queries.ts (or queries/ for large features)
Background job? → jobs/
Configuration? → config/
```

---

## Validation Best Practices

1. **Always validate in handler** (never trust client)
2. **Use Zod** for schema-based validation
3. **Return clear error messages** with field-specific errors
4. **Types of validation:**
   - Syntax (format, length)
   - Business rules (in services)
   - Data constraints (DB level)
   - Authorization (in middleware)

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| API files | `verb-noun.ts` | `create-product.ts`, `get-orders.ts` |
| Schemas | `feature.schema.ts` | `product.schema.ts` |
| Services | `feature.service.ts` | `cart.service.ts` |
| Interfaces | `interface.ts` | `interface.ts` |
| Queries | `queries.ts` or `feature.queries.ts` | `queries.ts` |

---

## Feature Checklist

Before adding a new feature, ensure:

- [ ] `index.ts` with Route class
- [ ] `apis/` with endpoint files
- [ ] `services/` for complex business logic
- [ ] `shared/` with schemas and interfaces
- [ ] Zod validation in each API
- [ ] Proper error handling
- [ ] TypeScript types exported

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|---------|------|
| Giant controller files | One file per endpoint |
| Business logic in handlers | Delegate to services |
| Inline SQL everywhere | Use queries layer |
| Skip validation | Validate every input |
| Mixed concerns | Separate by responsibility |
