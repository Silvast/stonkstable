import { Box, ButtonBase } from '@mui/material';
import { tokens } from '../../theme';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

const SegmentedControl = <T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) => (
  <Box
    role="group"
    aria-label={label}
    sx={{ display: 'inline-flex', p: '3px', bgcolor: tokens.segmentGround, borderRadius: '10px', flexShrink: 0 }}
  >
    {options.map(option => {
      const selected = option === value;
      return (
        <ButtonBase
          key={option}
          aria-pressed={selected}
          onClick={() => onChange(option)}
          sx={{
            minWidth: 52,
            minHeight: 38,
            px: 1.5,
            borderRadius: '8px',
            fontFamily: tokens.fontSans,
            fontSize: 13,
            fontWeight: selected ? 600 : 500,
            color: selected ? tokens.text : tokens.textIdle,
            bgcolor: selected ? tokens.panel : 'transparent',
            boxShadow: selected ? '0 1px 2px rgba(18,24,38,.12)' : 'none',
          }}
        >
          {option}
        </ButtonBase>
      );
    })}
  </Box>
);

export default SegmentedControl;
