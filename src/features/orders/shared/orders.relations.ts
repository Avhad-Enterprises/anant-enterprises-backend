import { relations } from 'drizzle-orm';
import { orders } from './orders.schema';
import { orderItems } from './order-items.schema';
import { users } from '../../user/shared/user.schema';
import { userAddresses } from '../../address/shared/addresses.schema';
import { invoices } from '../../invoice/shared/invoice.schema';

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.user_id],
    references: [users.id],
  }),
  shippingAddress: one(userAddresses, {
    fields: [orders.shipping_address_id],
    references: [userAddresses.id],
    relationName: 'shippingAddress',
  }),
  billingAddress: one(userAddresses, {
    fields: [orders.billing_address_id],
    references: [userAddresses.id],
    relationName: 'billingAddress',
  }),
  items: many(orderItems),
  invoices: many(invoices),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
}));
