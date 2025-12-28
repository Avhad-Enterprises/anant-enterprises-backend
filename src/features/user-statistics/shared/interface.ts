/**
 * IUserStatistics Interface - Pre-computed user metrics
 */
export interface IUserStatistics {
  id: number;
  user_id: number;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_placed_at: Date | null;
  first_order_at: Date | null;
  total_reviews: number;
  average_rating: number;
  support_tickets_created: number;
  support_tickets_resolved: number;
  wishlist_items_count: number;
  cart_abandonment_count: number;
  total_returns: number;
  total_disputes: number;
  total_page_views: number;
  days_since_last_order: number | null;
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date | null;
}
