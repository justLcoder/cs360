import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { roommates, getShares, remaining, money, normalizePayments } from './calculations.js';
import { sampleData } from './sampleData.js';
import './style.css';

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem('flatsplit'));
    if (Array.isArray(saved)) return normalizePayments(saved);
  } catch { /* Start with sample data if storage cannot be read. */ }
  return sampleData();
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function App() {
  const [purchases, setPurchases] = useState(loadData);
  const [selectedId, setSelectedId] = useState(() => purchases[0]?.id);
  const [screen, setScreen] = useState('purchase');
  const [viewer, setViewer] = useState('A');
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);
  const purchase = purchases.find(item => item.id === selectedId);
  const shares = getShares(purchase?.products || []);

  useEffect(() => {
    try {
      localStorage.setItem('flatsplit', JSON.stringify(purchases));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [purchases]);

  function navigate(next) {
    setScreen(next);
    setMessage('');
  }

  function updatePurchase(changes) {
    setPurchases(purchases.map(item => item.id === selectedId ? { ...item, ...changes } : item));
  }

  function createPurchase(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = {
      id: crypto.randomUUID(), date: form.get('date'), buyer: form.get('buyer'),
      products: [], payments: {}
    };
    setPurchases([item, ...purchases]);
    setSelectedId(item.id);
    navigate('purchase');
  }

  function togglePayment(name) {
    const paid = !purchase.payments[name];
    updatePurchase({ payments: { ...purchase.payments, [name]: paid } });
    setMessage(name + (paid ? ' marked as paid.' : ' marked as unpaid.'));
  }

  return <div className="app">
    <header><h1>FlatSplit</h1><span>Apartment expenses</span></header>
    <main>
      {storageError && <p className="error" role="alert">Browser storage is unavailable. Changes will be lost on refresh.</p>}
      {message && <p className="notice" role="status">{message}</p>}

      {screen === 'new' && <>
        <button className="back" onClick={() => navigate('history')}>← Back</button>
        <h2>New purchase</h2>
        <form onSubmit={createPurchase}>
          <label>Date<input name="date" type="date" defaultValue={today()} required /></label>
          <label>Buyer<select name="buyer" defaultValue={viewer}>{roommates.map(name => <option key={name}>{name}</option>)}</select></label>
          <button className="primary">Create purchase</button>
        </form>
      </>}

      {screen === 'purchase' && (purchase ? <>
        <div className="heading"><h2>Purchase details</h2><button onClick={() => navigate('new')}>+ New purchase</button></div>
        <p className="muted">{purchase.date} · Buyer: <strong>{purchase.buyer}</strong></p>
        <h3>Products</h3>
        {!purchase.products.length && <p className="empty">No products yet. Add your first product below.</p>}
        {purchase.products.map(product => <article className="card" key={product.id}>
          <div className="heading"><strong>{product.name}</strong><strong>{money(product.price)}</strong></div>
          <p>{product.quantity} {product.unit}</p>
          <p className="muted">Shared by {product.people.join(', ')}</p>
        </article>)}
        <button className="wide" onClick={() => navigate('add')}>+ Add product</button>
        <div className="total"><span>Total spent</span><strong>{money(purchase.products.reduce((sum, product) => sum + product.price, 0))}</strong></div>
        <button className="primary" disabled={!purchase.products.length} onClick={() => navigate('split')}>View split</button>
      </> : <><h2>No purchases</h2><button className="primary" onClick={() => navigate('new')}>Create purchase</button></>)}

      {screen === 'add' && purchase && <ProductForm buyer={purchase.buyer} onCancel={() => navigate('purchase')} onSave={product => {
        updatePurchase({ products: [...purchase.products, product], payments: {} });
        navigate('purchase');
        setMessage('Product saved. Shares updated and payment statuses reset.');
      }} />}

      {screen === 'split' && purchase && <>
        <button className="back" onClick={() => navigate('purchase')}>← Purchase details</button>
        <h2>Split summary</h2>
        <p className="muted">{purchase.date} · Buyer: {purchase.buyer}</p>
        <article className="card own"><strong>{purchase.buyer} (buyer)</strong><p>Own share: {money(shares[purchase.buyer])}</p><small>Already covered. No transfer needed.</small></article>
        <h3>Transfers to {purchase.buyer}</h3>
        {roommates.filter(name => name !== purchase.buyer).map(name => {
          const paid = purchase.payments[name] ? shares[name] : 0;
          const balance = remaining(shares[name], paid);
          const status = shares[name] === 0 ? 'No share' : balance === 0 ? 'Paid' : 'Unpaid';
          return <article className="card" key={name}>
            <div className="heading"><strong>{name} — Share: {money(shares[name])}</strong><span className={`badge ${balance === 0 ? 'settled' : ''}`}>{status}</span></div>
            <p className="muted">Paid: {money(paid)}</p>
            <p><strong>Remaining: {money(balance)}</strong></p>
            <details><summary>Product breakdown</summary>{purchase.products.filter(product => product.people.includes(name)).map(product => <p key={product.id}>{product.name} ({product.quantity} {product.unit}) — {money(getShares([product])[name])}</p>)}</details>
            {shares[name] > 0 && <button className="wide" onClick={() => togglePayment(name)}>{purchase.payments[name] ? `Mark ${name} as unpaid` : `Mark ${name} as paid`}</button>}
          </article>;
        })}
        <p className="muted">Record money transferred outside this app. The app does not send money.</p>
      </>}

      {screen === 'history' && <>
        <div className="heading"><h2>History</h2><button onClick={() => navigate('new')}>+ New purchase</button></div>
        <label>Viewing as<select value={viewer} onChange={event => setViewer(event.target.value)}>{roommates.map(name => <option key={name}>{name}</option>)}</select></label>
        {[...purchases].sort((a, b) => b.date.localeCompare(a.date)).map(item => {
          const itemShares = getShares(item.products);
          const isBuyer = item.buyer === viewer;
          const others = roommates.filter(name => name !== item.buyer);
          const totalOwed = others.reduce((sum, name) => sum + itemShares[name], 0);
          const received = others.reduce((sum, name) => sum + (item.payments[name] ? itemShares[name] : 0), 0);
          const balance = isBuyer ? remaining(totalOwed, received) : remaining(itemShares[viewer], item.payments[viewer] ? itemShares[viewer] : 0);
          return <article className="card" key={item.id}>
            <h3>{item.date} · Buyer: {isBuyer ? `You (${viewer})` : item.buyer}</h3>
            {isBuyer ? <><p>Others' total shares: {money(totalOwed)}</p><p>Received: {money(received)}</p><strong>Still to receive: {money(balance)}</strong></> : <><p>Your share: {money(itemShares[viewer])}</p><p>You paid: {money(item.payments[viewer] ? itemShares[viewer] : 0)}</p><strong>You still owe {item.buyer}: {money(balance)}</strong></>}
            {balance === 0 && <p className="badge settled">{!item.products.length ? 'No products yet' : !isBuyer && itemShares[viewer] === 0 ? 'No share' : 'Settled'}</p>}
            <button className="wide" onClick={() => { setSelectedId(item.id); navigate('purchase'); }}>View details →</button>
          </article>;
        })}
        {!purchases.length && <p className="empty">No purchases recorded yet.</p>}
      </>}
    </main>

    <nav aria-label="Main navigation">
      <button className={screen !== 'history' ? 'active' : ''} onClick={() => navigate('purchase')}>Purchases</button>
      <button className={screen === 'history' ? 'active' : ''} onClick={() => navigate('history')}>History</button>
    </nav>

  </div>;
}

function ProductForm({ buyer, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState('');
  const [people, setPeople] = useState([...roommates]);
  const [error, setError] = useState('');

  function toggle(person) {
    setPeople(people.includes(person) ? people.filter(name => name !== person) : [...people, person]);
  }

  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !Number.isFinite(Number(price)) || Number(price) <= 0 || !people.length) {
      setError('Enter a name, positive quantity and price, and select at least one person.');
      return;
    }
    onSave({ id: crypto.randomUUID(), name: name.trim(), quantity: Number(quantity), unit, price: Number(price), people: roommates.filter(person => people.includes(person)) });
  }

  return <>
    <button className="back" onClick={onCancel}>← Purchase details</button>
    <h2>Add product</h2>
    <form onSubmit={submit}>
      <label>Product name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Milk" required /></label>
      <div className="two-columns">
        <label>Quantity<input type="number" min="0.001" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label>
        <label>Unit<select value={unit} onChange={event => setUnit(event.target.value)}>{['pcs', 'kg', 'g', 'L', 'ml', 'pack'].map(unit => <option key={unit}>{unit}</option>)}</select></label>
      </div>
      <label>Actual total price (UZS)<input type="number" min="0.01" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="e.g. 24000" required /></label>
      <p className="hint">Total spent for {quantity || 'this quantity'} {unit}, not the price per unit.</p>
      <fieldset><legend>Who shares this product?</legend>{roommates.map(person => <label className="checkbox" key={person}><input type="checkbox" checked={people.includes(person)} onChange={() => toggle(person)} />{person}{person === buyer ? ' (buyer)' : ''}</label>)}</fieldset>
      <p className="preview">{people.length ? `${people.length} people · approximately ${money(Number(price || 0) / people.length)} each` : 'Select at least one person'}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary">Save product</button>
    </form>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
