export type OrderStatus =
  'new' | 'processing' | 'ready' | 'completed' | 'cancelled';

const validTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['completed', 'processing'],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return validTransitions[from].includes(to);
}
