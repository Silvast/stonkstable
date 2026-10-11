import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography } from '@mui/material';
import { useStockSelection } from '../../context/StockSelectionContext';
import { useAuth } from '../../context/AuthContext';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

const ApiKeyDialog = ({ open, onClose }: ApiKeyDialogProps) => {
  const { apiKey, setApiKey, rememberOnDevice, setRememberOnDevice } = useStockSelection();
  const { status } = useAuth();

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="api-key-title" maxWidth="xs" fullWidth>
      <DialogTitle id="api-key-title">EODHD API key</DialogTitle>
      <DialogContent>
        <TextField
          label="API key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Leave empty to use the demo key"
          autoComplete="off"
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        />
        <FormControlLabel
          control={(
            <Checkbox size="small" checked={rememberOnDevice} onChange={(event) => setRememberOnDevice(event.target.checked)} />
          )}
          label="Remember on this device"
          slotProps={{ typography: { variant: 'body2', color: 'text.secondary' } }}
        />
        {status === 'signedOut' && (
          <Typography variant="body2" color="text.secondary">
            Sign in to keep your key on every device.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeyDialog;
