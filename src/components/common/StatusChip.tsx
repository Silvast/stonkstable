import { Box } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined'
import { tokens } from '../../theme'

const StatusChip = ({ synced }: { synced: boolean }) => (
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
            fontWeight: 500,
            bgcolor: synced ? tokens.upTint : tokens.warningTint,
            color: synced ? tokens.upOnTint : tokens.warningOnTint,
        }}
    >
        {synced ? <CheckIcon sx={{ fontSize: 13 }} /> : <DesktopWindowsOutlinedIcon sx={{ fontSize: 13 }} />}
        {synced ? 'Synced to your account' : 'Saved in this browser only'}
    </Box>
)

export default StatusChip