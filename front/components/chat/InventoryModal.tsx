"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Close, Inventory as InventoryIcon } from "@mui/icons-material";

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
  products: any[];
  loading: boolean;
  onSelectProduct: (name: string, price: string) => void;
  colors: {
    headerBg: string;
    incomingText: string;
    iconColor: string;
    divider: string;
  };
  isDark: boolean;
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  open,
  onClose,
  products,
  loading,
  onSelectProduct,
  colors,
  isDark,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: colors.headerBg, color: colors.incomingText },
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${colors.divider}` }}>
        Selecionar Produto
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: colors.iconColor,
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Nenhum produto cadastrado. Adicione produtos no módulo Inventário.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid size={{ xs: 6, sm: 4 }} key={product.id}>
                <Card
                  sx={{
                    bgcolor: isDark ? "#111b21" : "#ffffff",
                    color: colors.incomingText,
                  }}
                >
                  <CardActionArea
                    onClick={() => onSelectProduct(product.name, product.price)}
                  >
                    <Box
                      height={100}
                      bgcolor={isDark ? "#2a3942" : "#f0f2f5"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {product.imageUrl ? (
                        <CardMedia
                          component="img"
                          height="100"
                          image={product.imageUrl}
                          alt={product.name}
                        />
                      ) : (
                        <InventoryIcon
                          sx={{
                            fontSize: 40,
                            opacity: 0.5,
                            color: colors.iconColor,
                          }}
                        />
                      )}
                    </Box>
                    <CardContent>
                      <Typography variant="body2" noWrap>
                        {product.name}
                      </Typography>
                      {product.variant && (
                        <Typography variant="caption" color="text.secondary">
                          {product.variant}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        display="block"
                        color="#00a884"
                      >
                        {product.price}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;
