export function sampleData() {
  return [
    { id: 'sample-1', date: '2026-10-31', buyer: 'A', products: [
      { id: 'milk', name: 'Milk', quantity: 2, unit: 'L', price: 24000, people: ['A','B','C','D'] },
      { id: 'apples', name: 'Apples', quantity: 2, unit: 'kg', price: 25000, people: ['A','B','C','D','E'] },
      { id: 'rice', name: 'Rice', quantity: 1, unit: 'kg', price: 15000, people: ['E'] }
    ], payments: { B: true } },
    { id: 'sample-2', date: '2026-10-30', buyer: 'B', products: [
      { id: 'dinner', name: 'Dinner', quantity: 5, unit: 'pcs', price: 90000, people: ['A','B','C','D','E'] }
    ], payments: { A: false } },
    { id: 'sample-3', date: '2026-10-29', buyer: 'C', products: [
      { id: 'groceries', name: 'Groceries', quantity: 1, unit: 'pack', price: 60000, people: ['A','B','C','D','E'] }
    ], payments: { A: true } }
  ];
}
