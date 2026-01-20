"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

interface CollectedDataItem {
  id: string;
  participantName?: string;
  participantJid: string;
  data: any;
  createdAt: string;
}

interface CollectedDataDialogProps {
  open: boolean;
  onClose: () => void;
  data: CollectedDataItem[];
}

/**
 * Dialog para visualizar dados coletados
 */
export default function CollectedDataDialog({
  open,
  onClose,
  data,
}: CollectedDataDialogProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Dados Coletados</DialogTitle>
      <DialogContent>
        {data.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Nenhum dado coletado ainda
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Participante</TableCell>
                  <TableCell>Dados</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Data/Hora
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {item.participantName || item.participantJid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {JSON.stringify(item.data)}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ display: { xs: "none", sm: "table-cell" } }}
                    >
                      <Typography variant="caption">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
