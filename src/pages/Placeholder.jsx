import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'

export default function Placeholder({ title = 'Placeholder' }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>{title}</Typography>
        <Typography variant="body1" color="text.secondary">
          This screen is part of the routing demo. Replace it with your content.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>Back to Landing</Button>
      </Box>
    </Box>
  )
}
