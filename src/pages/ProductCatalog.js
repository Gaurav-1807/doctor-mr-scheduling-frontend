import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const ProductCatalog = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [distributeData, setDistributeData] = useState({ quantity: 1, doctorId: '', notes: '' });
  const [doctors, setDoctors] = useState([]);
  const [activeTab, setActiveTab] = useState('catalog');
  const [receivedSamples, setReceivedSamples] = useState([]);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      let url = '/products';
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      setProducts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchReceivedSamples = async () => {
    try {
      const res = await api.get('/products/samples/received');
      setReceivedSamples(res.data.data || []);
    } catch (error) {
      console.error('Error fetching received samples:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user.role === 'mr') {
      fetchDoctors();
    }
    if (user.role === 'doctor') {
      fetchReceivedSamples();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const distributeSample = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${selectedProduct._id}/samples/distribute`, distributeData);
      setShowDistributeModal(false);
      setSelectedProduct(null);
      setDistributeData({ quantity: 1, doctorId: '', notes: '' });
      fetchProducts();
      alert('Sample distributed successfully!');
    } catch (error) {
      console.error('Error distributing sample:', error);
      alert('Failed to distribute sample');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {user.role === 'doctor' ? 'Product Information' : 'Product Catalog'}
          </h1>
          
          {/* Tabs for Doctor */}
          {user.role === 'doctor' && (
            <div className="flex bg-white rounded-lg shadow-sm p-1">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'received'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Received Samples
              </button>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        {activeTab === 'catalog' && (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-48 px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid - Catalog Tab */}
        {activeTab === 'catalog' && (
          <>
            {products.length === 0 ? (
              <div className="bg-white rounded-lg p-6 sm:p-8 text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map(product => (
                  <div key={product._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-36 sm:h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 sm:h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-1">{product.name}</h3>
                        {user.role === 'mr' && (
                          <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                            product.stockQuantity > 10 ? 'bg-green-100 text-green-800' :
                            product.stockQuantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs sm:text-sm text-blue-600 mb-2">{product.category}</p>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 sm:mb-3">{product.description}</p>
                      
                      {product.composition && (
                        <p className="text-xs text-gray-400 mb-2 sm:mb-3 line-clamp-1">
                          <span className="font-medium">Composition:</span> {product.composition}
                        </p>
                      )}

                      {/* Doctor View - View Details Button */}
                      {user.role === 'doctor' && (
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductDetail(true);
                          }}
                          className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs sm:text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      )}

                      {/* MR View - Distribute Button */}
                      {user.role === 'mr' && product.stockQuantity > 0 && (
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDistributeModal(true);
                          }}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium"
                        >
                          Distribute Sample
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Received Samples Tab - Doctor Only */}
        {activeTab === 'received' && user.role === 'doctor' && (
          <>
            {receivedSamples.length === 0 ? (
              <div className="bg-white rounded-lg p-6 sm:p-8 text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500 mb-2">No samples received yet</p>
                <p className="text-xs sm:text-sm text-gray-400">Samples distributed by MRs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {receivedSamples.map((sample, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="w-full sm:w-20 h-32 sm:h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {sample.productImage ? (
                          <img src={sample.productImage} alt={sample.productName} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Sample Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{sample.productName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          From: <span className="text-gray-700">{sample.mrName}</span> ({sample.mrCompany})
                        </p>
                        {sample.notes && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                            Note: {sample.notes}
                          </p>
                        )}
                      </div>
                      
                      {/* Quantity & Date */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 pt-2 sm:pt-0 border-t sm:border-t-0">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                          Qty: {sample.quantity}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(sample.distributedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Product Detail Modal - Doctor */}
        {showProductDetail && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Product Image */}
              {selectedProduct.images?.[0] ? (
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="w-full h-48 sm:h-56 object-cover"
                />
              ) : (
                <div className="w-full h-48 sm:h-56 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">{selectedProduct.name}</h2>
                    <p className="text-sm text-blue-600">{selectedProduct.category}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProductDetail(false);
                      setSelectedProduct(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-sm sm:text-base text-gray-600 mb-4">{selectedProduct.description}</p>
                
                {selectedProduct.composition && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Composition</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{selectedProduct.composition}</p>
                  </div>
                )}
                
                {selectedProduct.dosage && (
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-blue-700 mb-1">Dosage</h4>
                    <p className="text-xs sm:text-sm text-blue-600">{selectedProduct.dosage}</p>
                  </div>
                )}
                
                {selectedProduct.sideEffects && (
                  <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 mb-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-yellow-700 mb-1">Side Effects</h4>
                    <p className="text-xs sm:text-sm text-yellow-600">{selectedProduct.sideEffects}</p>
                  </div>
                )}
                
                {selectedProduct.manufacturer && (
                  <div className="text-xs sm:text-sm text-gray-500">
                    <span className="font-medium">Manufacturer:</span> {selectedProduct.manufacturer}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowProductDetail(false);
                    setSelectedProduct(null);
                  }}
                  className="w-full mt-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Distribute Sample Modal - MR */}
        {showDistributeModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Distribute Sample</h2>
              <p className="text-sm text-gray-600 mb-4">Product: {selectedProduct.name}</p>
              
              <form onSubmit={distributeSample}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                    <select
                      required
                      value={distributeData.doctorId}
                      onChange={(e) => setDistributeData({ ...distributeData, doctorId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map(doc => (
                        <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.stockQuantity}
                      required
                      value={distributeData.quantity}
                      onChange={(e) => setDistributeData({ ...distributeData, quantity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">Available: {selectedProduct.stockQuantity}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={distributeData.notes}
                      onChange={(e) => setDistributeData({ ...distributeData, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDistributeModal(false);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 px-4 py-2.5 border rounded-lg hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base order-1 sm:order-2"
                  >
                    Distribute
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCatalog;
