import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Checkbox,
  FormControlLabel,
  SelectChangeEvent
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Store as StoreIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

import { ApiService } from '../services/api';
import { StoreInfo, Product, StockResponse } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

interface StockCheckerProps {
  stores: StoreInfo | null;
}

const StockChecker: React.FC<StockCheckerProps> = ({ stores }) => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Load collections when store changes
  useEffect(() => {
    const loadCollections = async () => {
      if (!selectedStore) {
        setAvailableCollections([]);
        return;
      }

      try {
        const response = await ApiService.getStoreCollections(selectedStore);
        setAvailableCollections(response.collections);
      } catch (err) {
        console.error('Failed to load collections:', err);
        setAvailableCollections([]);
      }
    };

    loadCollections();
  }, [selectedStore]);

  // Auto-select first store when stores load
  useEffect(() => {
    if (stores && !selectedStore) {
      const allStores = [...stores.modern, ...stores.legacy];
      if (allStores.length > 0) {
        setSelectedStore(allStores[0]);
      }
    }
  }, [stores, selectedStore]);

  const handleStoreChange = (event: SelectChangeEvent<string>) => {
    setSelectedStore(event.target.value);
    setSelectedCollections([]);
    setProducts([]);
    setSearchQuery('');
  };

  const handleCollectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedCollections(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSearch = async () => {
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response: StockResponse;
      
      if (searchQuery.trim()) {
        const searchResponse = await ApiService.searchProducts(
          selectedStore, 
          searchQuery, 
          selectedCollections
        );
        response = {
          store: searchResponse.store,
          collections: searchResponse.collections,
          timestamp: searchResponse.timestamp,
          products: searchResponse.results,
          summary: searchResponse.summary
        };
      } else {
        response = await ApiService.getStock(selectedStore, selectedCollections);
      }

      setProducts(response.products);
      toast.success(`Found ${response.products.length} products`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = showAvailableOnly 
    ? products.filter(p => p.available)
    : products;

  const getAllStores = () => {
    if (!stores) return [];
    return [...stores.modern, ...stores.legacy];
  };

  const isModernStore = (store: string) => {
    return stores?.modern.includes(store) || false;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        📦 Stock Checker
      </Typography>
      
      <Grid container spacing={3}>
        {/* Search Controls */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Store</InputLabel>
                    <Select
                      value={selectedStore}
                      label="Store"
                      onChange={handleStoreChange}
                    >
                      {getAllStores().map((store) => (
                        <MenuItem key={store} value={store}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <StoreIcon fontSize="small" />
                            {store}
                            {isModernStore(store) && (
                              <Chip size="small" label="Modern" color="primary" />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Collections</InputLabel>
                    <Select
                      multiple
                      value={selectedCollections}
                      onChange={handleCollectionChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {availableCollections.map((collection) => (
                        <MenuItem key={collection} value={collection}>
                          <Checkbox checked={selectedCollections.indexOf(collection) > -1} />
                          {collection}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Search products"
                    placeholder="Product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSearch}
                    disabled={isLoading || !selectedStore}
                    startIcon={isLoading ? <RefreshIcon /> : <SearchIcon />}
                    size="large"
                  >
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                </Grid>
              </Grid>
              
              <Box mt={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showAvailableOnly}
                      onChange={(e) => setShowAvailableOnly(e.target.checked)}
                    />
                  }
                  label="Show only available products"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {isLoading ? (
            <LoadingSpinner message="🔍 Searching products..." />
          ) : (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Products ({filteredProducts.length})
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label={`${filteredProducts.filter(p => p.available).length} Available`}
                      color="success" 
                      size="small" 
                    />
                    <Chip 
                      icon={<CancelIcon />}
                      label={`${filteredProducts.filter(p => !p.available).length} Out of Stock`}
                      color="error" 
                      size="small" 
                    />
                  </Box>
                </Box>
                
                {filteredProducts.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts.slice(0, 100).map((product) => (
                          <TableRow key={product.sku} hover>
                            <TableCell>
                              <Chip
                                icon={product.available ? <CheckCircleIcon /> : <CancelIcon />}
                                label={product.available ? 'Available' : 'Out of Stock'}
                                color={product.available ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {product.name}
                                </Typography>
                                {product.shortName && product.shortName !== product.name && (
                                  <Typography variant="caption" color="text.secondary">
                                    {product.shortName}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {product.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={<CategoryIcon />}
                                label={product.category}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {product.price ? (
                                <Typography variant="body2">
                                  {product.price.amount.toFixed(2)} {product.price.currency}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Open product page">
                                <IconButton
                                  size="small"
                                  onClick={() => window.open(product.productUrl, '_blank')}
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredProducts.length > 100 && (
                      <Box p={2} textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Showing first 100 of {filteredProducts.length} products
                        </Typography>
                      </Box>
                    )}
                  </TableContainer>
                ) : products.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      {selectedStore ? 'Click search to load products' : 'Select a store to begin'}
                    </Typography>
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="text.secondary">
                      No products match your filter criteria
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default StockChecker;
