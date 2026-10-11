import React, { useEffect, useId, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import Panel from '../components/common/Panel';
import { useAuth } from '../context/AuthContext';
import { useFavourites } from '../context/FavouritesContext';
import { useStockSelection } from '../context/StockSelectionContext';
import { useApiCallsToday } from '../hooks/useApiCallsToday';
import { DAILY_CALL_BUDGET } from '../utils/apiUsage';
import { mono, tokens } from '../theme';

const MASK = '•••• •••• •••• ••••';

interface SettingsProps {
  onLeave: () => void;
}

const SettingsPanel = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const titleId = useId();
  return (
    <Panel aria-labelledby={titleId} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h2" id={titleId}>{title}</Typography>
      {children}
    </Panel>
  );
};

const StatusChip = ({ saved }: { saved: boolean }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: '3px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      bgcolor: saved ? tokens.upTint : tokens.warningTint,
      color: saved ? tokens.upOnTint : tokens.warningOnTint,
    }}
  >
    {saved && <CheckIcon sx={{ fontSize: 13 }} />}
    {saved ? 'Saved' : 'Not set'}
  </Box>
);

const ApiKeySection = () => {
  const { apiKey, setApiKey, apiKeySaveError } = useStockSelection();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const saved = apiKey !== '';

  const startEditing = () => {
    setDraft('');
    setEditing(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.trim()) setApiKey(draft.trim());
    setEditing(false);
  };

  return (
    <SettingsPanel title="EODHD API key">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: -1 }}>
        <Typography variant="body2" color="text.secondary">
          Saved to your account, so every device you sign in on uses it. It never shows on the other pages.
        </Typography>
        <StatusChip saved={saved} />
      </Box>

      {editing ? (
        <Box component="form" onSubmit={save} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'flex-end' }}>
          <TextField
            label="New API key"
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste your EODHD key"
            autoComplete="off"
            autoFocus
            sx={{ flex: '1 1 300px', '& input': mono }}
          />
          <Button type="submit" variant="contained" sx={{ minHeight: 44, fontWeight: 600 }}>Save key</Button>
          <Button type="button" variant="outlined" onClick={() => setEditing(false)} sx={{ minHeight: 44 }}>Cancel</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
          {saved ? (
            <Box
              component="span"
              sx={{
                ...mono,
                flex: '1 1 260px',
                display: 'flex',
                alignItems: 'center',
                minHeight: 44,
                px: 1.5,
                borderRadius: '10px',
                bgcolor: tokens.tableHeader,
                border: `1px solid ${tokens.border}`,
                color: tokens.textSecondary,
                letterSpacing: '0.1em',
              }}
            >
              {MASK}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ flex: '1 1 260px' }}>
              No key saved. The demo key is used, which only covers a few stocks.
            </Typography>
          )}
          <Button variant="outlined" onClick={startEditing} sx={{ minHeight: 44 }}>
            {saved ? 'Replace key' : 'Add key'}
          </Button>
          {saved && (
            <Button onClick={() => setApiKey('')} sx={{ minHeight: 44, color: tokens.downOnTint }}>
              Remove
            </Button>
          )}
        </Box>
      )}

      {apiKeySaveError && <Alert severity="error">{apiKeySaveError}</Alert>}

      <Typography variant="caption" color="text.secondary">
        Opening a link with ?apikey= still works and saves the key here, then removes it from the address bar.
      </Typography>
    </SettingsPanel>
  );
};

const UsageSection = () => {
  const calls = useApiCallsToday();

  return (
    <SettingsPanel title="API usage">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', fontSize: 13 }}>
        <span>{`${calls} of about ${DAILY_CALL_BUDGET} daily calls used`}</span>
        <Box component="span" sx={{ color: tokens.textSecondary }}>Resets at midnight UTC</Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (calls / DAILY_CALL_BUDGET) * 100)}
        aria-label="API calls used today"
        sx={{ height: 8, borderRadius: 4, bgcolor: tokens.neutralChip }}
      />
      <Typography variant="body2" color="text.secondary">
        A fresh analysis costs about 6 calls. A stock table fetch costs 1.
      </Typography>
    </SettingsPanel>
  );
};

const AccountSection = () => {
  const { email, signOut } = useAuth();
  const { favourites } = useFavourites();

  return (
    <SettingsPanel title="Account">
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mt: -1 }}>
        <Typography variant="body2" color="text.secondary">
          {`${email ?? 'Signed in'} · ${favourites.length} ${favourites.length === 1 ? 'favourite' : 'favourites'} synced`}
        </Typography>
        <Button variant="outlined" onClick={() => signOut()} sx={{ minHeight: 44 }}>Sign out</Button>
      </Box>
    </SettingsPanel>
  );
};

const Settings = ({ onLeave }: SettingsProps): React.ReactElement => {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'signedOut' || status === 'disabled') onLeave();
  }, [status, onLeave]);

  return (
    <Stack spacing={2} sx={{ maxWidth: 900 }}>
      <Typography variant="h1">Settings</Typography>
      <ApiKeySection />
      <UsageSection />
      <AccountSection />
    </Stack>
  );
};

export default Settings;
