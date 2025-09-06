import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'

export default function NotFound() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" fontWeight={800} gutterBottom>404</Typography>
        <Typography variant="h6" gutterBottom>Page not found</Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>Go Home</Button>
      </Box>
    </Box>
  )
}
