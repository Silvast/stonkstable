import { lazy, Suspense } from 'react';
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';

const AuthenticatorPanel = lazy(() => import('./AuthenticatorPanel'));

const SignInDialog = () => {
  const { signInOpen, closeSignIn } = useAuth();

  return (
    <Dialog open={signInOpen} onClose={closeSignIn} aria-labelledby="sign-in-title" maxWidth="xs" fullWidth>
      <DialogTitle id="sign-in-title" sx={{ pr: 6 }}>Sign in to Stonkstable</DialogTitle>
      <IconButton aria-label="Close" onClick={closeSignIn} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <CloseIcon />
      </IconButton>
      <DialogContent>
        {signInOpen && (
          <Suspense
            fallback={(
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress aria-label="Loading sign-in" />
              </Box>
            )}
          >
            <AuthenticatorPanel />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
