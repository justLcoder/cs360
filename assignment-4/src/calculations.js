export const roommates = ['A', 'B', 'C', 'D', 'E'];
export function getShares(products) {
  const shares = Object.fromEntries(roommates.map(name => [name, 0]));
  for (const product of products) {
    // Split in tiyin to keep the total correct when division needs rounding.
    const total = Math.round(product.price * 100);
    const each = Math.floor(total / product.people.length);
    const remainder = total % product.people.length;
    product.people.forEach((name, index) => {
      shares[name] += each + (index < remainder ? 1 : 0);
    });
  }
  for (const name of roommates) shares[name] /= 100;
  return shares;
}
export function remaining(share, paid = 0) {
  return Math.max(0, Math.round((share - paid) * 100) / 100);
}
export function money(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) + ' UZS';
}

// Convert older saved amounts to full-payment flags. Incomplete payments become unpaid.
export function normalizePayments(purchases) {
  return purchases.map(purchase => {
    const shares = getShares(purchase.products);
    const payments = {};
    for (const name of roommates) {
      const saved = purchase.payments?.[name];
      payments[name] = saved === true || (typeof saved === 'number' && shares[name] > 0 && saved >= shares[name]);
    }
    return { ...purchase, payments };
  });
}
