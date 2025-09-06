import * as React from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'

export default function CenteredContainer({ children, maxWidth = 'lg', sx }) {
  return (
    <Container maxWidth={maxWidth} disableGutters>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3 },
          ...sx,
        }}
      >
        {children}
      </Box>
    </Container>
  )
}
