import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  IconButton,
  Badge,
  Chip,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Monitor as MonitorIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { StoreInfo } from '../types';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  stores: StoreInfo | null;
  connectionStatus: {
    connected: boolean;
    socketId: string | null;
  };
}

interface NavigationItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const Layout: React.FC<LayoutProps> = ({ children, stores, connectionStatus }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems: NavigationItem[] = [
    {
      text: 'Stock Checker',
      icon: <SearchIcon />,
      path: '/stock'
    },
    {
      text: 'Monitor',
      icon: <MonitorIcon />,
      path: '/monitor'
    },
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getTotalStores = () => {
    if (!stores) return 0;
    return stores.modern.length + stores.legacy.length;
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1}>
          <StoreIcon color="primary" />
          <Typography variant="h6" noWrap component="div" color="primary">
            UniFi Tracker
          </Typography>
        </Box>
      </Toolbar>
      
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '15',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '25',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? theme.palette.primary.main : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    color: location.pathname === item.path ? theme.palette.primary.main : 'inherit'
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            UniFi Stock Tracker
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            {stores && (
              <Chip
                icon={<StoreIcon />}
                label={`${getTotalStores()} Stores`}
                size="small"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
            )}
            
            <Chip
              icon={connectionStatus.connected ? <WifiIcon /> : <WifiOffIcon />}
              label={connectionStatus.connected ? 'Connected' : 'Disconnected'}
              size="small"
              color={connectionStatus.connected ? 'success' : 'error'}
              variant="filled"
            />
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
