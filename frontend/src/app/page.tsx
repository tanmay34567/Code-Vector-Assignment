'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  limit: number;
  has_more: boolean;
  has_previous: boolean;
  next_cursor: string | null;
  prev_cursor: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    has_more: false,
    has_previous: false,
    next_cursor: null,
    prev_cursor: null,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [latency, setLatency] = useState<number>(0);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories`);
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products helper
  const fetchProducts = async (params: { category?: string; next?: string | null; prev?: string | null }) => {
    setLoading(true);
    const start = Date.now();
    try {
      let url = `${API_BASE_URL}/api/products?limit=20`;
      if (params.category && params.category !== 'All') {
        url += `&category=${encodeURIComponent(params.category)}`;
      }
      if (params.next) {
        url += `&next=${params.next}`;
      } else if (params.prev) {
        url += `&prev=${params.prev}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLatency(Date.now() - start);
      setLoading(false);
    }
  };

  // Fetch initial products or on category change
  useEffect(() => {
    fetchProducts({ category: selectedCategory });
    setCurrentPageNum(1);
  }, [selectedCategory]);

  const handleNextPage = () => {
    if (pagination.has_more && pagination.next_cursor) {
      fetchProducts({ category: selectedCategory, next: pagination.next_cursor });
      setCurrentPageNum((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.has_previous && pagination.prev_cursor) {
      fetchProducts({ category: selectedCategory, prev: pagination.prev_cursor });
      setCurrentPageNum((prev) => Math.max(1, prev - 1));
    }
  };

  const handleSimulateInsert = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 50 }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Simulated: ${data.message}`);
        // If we are on the first page, let's refresh to show the new items
        if (currentPageNum === 1 && !pagination.prev_cursor) {
          fetchProducts({ category: selectedCategory });
        }
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      showToast('Simulation failed. Is the backend server running?');
    } finally {
      setSimulating(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-color)' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand-container">
          <img src="/logo.png" alt="Finder & Filter Logo" className="brand-logo" />
          <div className="brand">
            <h1>Finder & Filter</h1>
            <p>Real-Time Keyset Pagination Product Catalog</p>
          </div>
        </div>

        <div className="actions-group">
          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Category:
            </span>
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loading}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Simulator Trigger */}
          <button
            className="btn btn-simulate"
            onClick={handleSimulateInsert}
            disabled={simulating}
          >
            {simulating ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ marginRight: '0.25rem' }}>
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            )}
            Simulate 50 New Products
          </button>
        </div>
      </header>

      {/* Latency & Info Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-light)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div>
          Database Size: <strong>~200,000 products</strong>
        </div>
        <div>
          API Latency: <strong style={{ color: latency < 50 ? 'var(--primary-color)' : 'orange' }}>{latency}ms</strong>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="products-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-text category"></div>
              <div className="skeleton-text title"></div>
              <div className="skeleton-text meta"></div>
              <div className="skeleton-text price"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Try changing the category filter or seeding the database again.</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((prod) => (
            <div key={prod._id} className="product-card">
              <div className="product-info">
                <span className="product-category">{prod.category}</span>
                <h3 className="product-name">{prod.name}</h3>
                <div className="product-meta">
                  <span>ID: {prod._id.substring(18)}</span>
                  <span>Added: {formatDate(prod.created_at)}</span>
                </div>
              </div>
              <div className="product-footer">
                <div className="product-price">
                  <span className="price-symbol">$</span>
                  {prod.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <footer className="pagination-container">
        <button
          className="btn"
          onClick={handlePrevPage}
          disabled={loading || !pagination.has_previous}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>

        <div className="page-indicator">
          Page <span>{currentPageNum}</span>
        </div>

        <button
          className="btn"
          onClick={handleNextPage}
          disabled={loading || !pagination.has_more}
        >
          Next
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </footer>

      {/* Styling helper for spinning animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
