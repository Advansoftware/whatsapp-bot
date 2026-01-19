"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Chip,
  TextField,
  InputAdornment,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  useTheme,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Add, 
  Search, 
  Edit, 
  Delete, 
  Inventory2, 
  AutoAwesome,
  FilterList
} from '@mui/icons-material';
import { Product } from '../types';
import api from '../lib/api';

const InventoryView: React.FC = () => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aiSync, setAiSync] = useState(true);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({open: false, message: '', severity: 'success'});
  
  // Form State
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formVariant, setFormVariant] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setSnackbar({open: true, message: 'Erro ao carregar produtos', severity: 'error'});
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setCurrentProductId(null);
    setFormName('');
    setFormVariant('');
    setFormQuantity('');
    setFormPrice('');
    setFormSku('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (product: Product) => {
    setCurrentProductId(product.id);
    setFormName(product.name);
    setFormVariant(product.variant);
    setFormQuantity(String(product.quantity));
    setFormPrice(product.price.replace(/[^\d,\.]/g, '').replace(',', '.'));
    setFormSku(product.sku);
    setOpenDialog(true);
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      const productData = {
        name: formName,
        variant: formVariant,
        quantity: Number(formQuantity),
        price: parseFloat(formPrice.replace(',', '.')),
        sku: formSku,
      };

      if (currentProductId) {
        await api.updateProduct(currentProductId, productData);
        setSnackbar({open: true, message: 'Produto atualizado com sucesso!', severity: 'success'});
      } else {
        await api.createProduct(productData);
        setSnackbar({open: true, message: 'Produto criado com sucesso!', severity: 'success'});
      }
      setOpenDialog(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save product:', err);
      setSnackbar({open: true, message: 'Erro ao salvar produto', severity: 'error'});
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteProduct = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (productToDelete) {
      try {
        await api.deleteProduct(productToDelete);
        setSnackbar({open: true, message: 'Produto excluído com sucesso!', severity: 'success'});
        fetchProducts();
      } catch (err) {
        console.error('Failed to delete product:', err);
        setSnackbar({open: true, message: 'Erro ao excluir produto', severity: 'error'});
      }
      setProductToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'success';
      case 'Low Stock': return 'warning';
      case 'Out of Stock': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'In Stock': return 'Em Estoque';
      case 'Low Stock': return 'Baixo Estoque';
      case 'Out of Stock': return 'Esgotado';
      default: return status;
    }
  };

  return (
    <Box maxWidth="xl" mx="auto" display="flex" flexDirection="column" gap={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Gerenciamento de Estoque
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Controle seus produtos e variações para o atendimento automático.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          size="large"
          onClick={handleOpenAdd}
        >
          Adicionar Produto
        </Button>
      </Box>

      {/* AI Context Card */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          border: `1px solid ${theme.palette.primary.main}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 168, 132, 0.05)' : 'rgba(0, 168, 132, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box display="flex" gap={2} alignItems="center">
          <Box p={1.5} borderRadius="50%" bgcolor="primary.main" color="primary.contrastText">
            <AutoAwesome />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="600">Sincronização com IA Ativa</Typography>
            <Typography variant="body2" color="text.secondary">
              Seu chatbot utilizará a quantidade e variações (ex: "Gelada" ou "Natural") abaixo para responder aos clientes em tempo real.
            </Typography>
          </Box>
        </Box>
        <FormControlLabel 
          control={<Switch checked={aiSync} onChange={(e) => setAiSync(e.target.checked)} color="primary" />} 
          label="Sincronizar Automaticamente" 
        />
      </Paper>

      {/* Products Table */}
      <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom={`1px solid ${theme.palette.divider}`}>
          <TextField
            placeholder="Buscar produto, SKU ou variação..."
            size="small"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: { width: 300 }
            }}
          />
          <IconButton color="default">
            <FilterList />
          </IconButton>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PRODUTO</TableCell>
                <TableCell>VARIAÇÃO / TIPO</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="center">QUANTIDADE</TableCell>
                <TableCell>PREÇO</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell align="right">AÇÕES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 1, 
                          bgcolor: 'action.hover', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'text.secondary'
                        }}
                      >
                        <Inventory2 fontSize="small" />
                      </Box>
                      <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                        label={product.variant} 
                        size="small" 
                        variant="outlined"
                        sx={{ borderRadius: 1, borderColor: theme.palette.divider }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                        variant="body2" 
                        fontWeight="bold" 
                        color={product.quantity === 0 ? 'error.main' : product.quantity < 5 ? 'warning.main' : 'text.primary'}
                    >
                      {product.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(product.status)} 
                      size="small" 
                      color={getStatusColor(product.status) as any}
                      sx={{ fontWeight: 600, height: 24 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(product)}>
                        <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => confirmDeleteProduct(product.id)}>
                        <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Product Modal */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentProductId ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <TextField 
                label="Nome do Produto" 
                placeholder="Ex: Cerveja Bohemia" 
                fullWidth 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
            />
            <TextField 
                label="Variação / Atributo" 
                placeholder="Ex: Gelada, Natural, Lata, 600ml" 
                fullWidth 
                helperText="Isso ajuda a IA a diferenciar os tipos do mesmo produto." 
                value={formVariant}
                onChange={(e) => setFormVariant(e.target.value)}
            />
            <Box display="flex" gap={2}>
              <TextField 
                label="Quantidade" 
                type="number" 
                fullWidth 
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
            />
              <TextField 
                label="Preço" 
                placeholder="R$ 0,00" 
                fullWidth 
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
            />
            </Box>
            <TextField 
                label="SKU (Opcional)" 
                fullWidth 
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={handleSaveProduct}>Salvar Produto</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Excluir Produto?</DialogTitle>
        <DialogContent>
            <Typography>
                Tem certeza que deseja excluir <b>{products.find(p => p.id === productToDelete)?.name} - {products.find(p => p.id === productToDelete)?.variant}</b>?
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDeleteProduct} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open: false})}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryView;