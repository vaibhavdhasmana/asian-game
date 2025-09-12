import * as React from 'react';
import { Box, Avatar, Chip, Typography, Stack, Tooltip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const MEDALS = {
  1: { color: '#F7C948', label: 'Gold' },
  2: { color: '#C0C6D1', label: 'Silver' },
  3: { color: '#D6A571', label: 'Bronze' },
};

const initials = (name = '', uuid = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1)
    return parts[0][0]?.toUpperCase() || uuid.slice(0, 2).toUpperCase();
  return uuid.slice(0, 2).toUpperCase();
};

function Item({ rank, row }) {
  const m = MEDALS[rank];
  if (!row) return <span />;
  return (
    <Stack
      spacing={0.75}
      alignItems="center"
      sx={{
        px: { xs: 0.75, sm: 1 },
        py: 1,
        minWidth: { xs: 96, sm: 120 },
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Avatar
        sx={{
          width: 44,
          height: 44,
          fontWeight: 900,
          boxShadow: `0 0 0 3px ${m.color}66`,
          bgcolor: 'rgba(255,255,255,0.12)'
        }}
      >
        {initials(row.name, row.uuid)}
      </Avatar>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <EmojiEventsIcon sx={{ fontSize: 18, color: m.color }} />
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{`#${rank}`}</Typography>
      </Stack>
      <Tooltip title={row.name || row.uuid} placement="top">
        <Typography
          noWrap
          sx={{
            maxWidth: 120,
            fontSize: { xs: 12, sm: 13 },
            fontWeight: 700,
          }}
        >
          {row.name || row.uuid}
        </Typography>
      </Tooltip>
      <Chip
        size="small"
        label={`${row.total ?? 0} pts`}
        color={rank === 1 ? 'warning' : 'default'}
        sx={{ fontWeight: 800 }}
      />
    </Stack>
  );
}

export default function CompactPodium({ top3 }) {
  const [first, second, third] = top3 || [];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 1,
        alignItems: 'stretch',
        justifyItems: 'center',
        mb: 1.5,
      }}
    >
      <Item rank={2} row={second} />
      <Item rank={1} row={first} />
      <Item rank={3} row={third} />
    </Box>
  );
}

