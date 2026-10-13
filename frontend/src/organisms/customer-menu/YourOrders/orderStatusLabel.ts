/** How a customer reads an order's status. */
export const customerStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case 'PLACED':
      return 'Order placed';
    case 'PREPARING':
    case 'CONFIRMED':
      return 'Being prepared';
    case 'READY':
      return 'Ready to serve';
    case 'COMPLETED':
    case 'SERVED':
      return 'Served';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return 'In progress';
  }
};
