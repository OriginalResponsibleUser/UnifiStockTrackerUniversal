import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Layout from './components/Layout';
import StockChecker from './pages/StockChecker';
import Monitor from './pages/Monitor';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';

// Services
import socketService from './services/socket';
import { ApiService } from './services/api';

// Types
import { StoreInfo } from './types';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [stores, setStores] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    socketId: null as string | null
  });

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Load available stores
        const storeData = await ApiService.getStores();
        setStores(storeData);
        
        // Check server health
        await ApiService.healthCheck();
        
        setError(null);
      } catch (err) {
        console.error('❌ Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Monitor socket connection
  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = socketService.getConnectionStatus();
      setConnectionStatus(status);
    };

    const interval = setInterval(updateConnectionStatus, 5000);
    updateConnectionStatus();

    return () => clearInterval(interval);
  }, []);

  // Handle socket events
  useEffect(() => {
    const handleProductAvailable = (data: any) => {
      toast.success(
        `🎉 ${data.product.name} is now in stock!`,
        {
          onClick: () => window.open(data.product.productUrl, '_blank'),
          autoClose: 10000,
        }
      );
      
      if (data.notifications.sound) {
        try {
          // Simple beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.warn('Could not play notification sound:', e);
        }
      }
    };

    const handleAvailabilityAlert = (data: any) => {
      toast.info(
        `📦 ${data.count} products are now available!`,
        { autoClose: 8000 }
      );
    };

    // Set up socket event listeners
    socketService.onProductAvailable(handleProductAvailable);
    socketService.onAvailabilityAlert(handleAvailabilityAlert);

    return () => {
      socketService.offProductAvailable(handleProductAvailable);
      socketService.offAvailabilityAlert(handleAvailabilityAlert);
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="🚀 Initializing UniFi Stock Tracker..." />;
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: 16,
          padding: 20,
          textAlign: 'center'
        }}>
          <h2>❌ Failed to Connect</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            🔄 Retry Connection
          </button>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout stores={stores} connectionStatus={connectionStatus}>
          <Routes>
            <Route path="/" element={<Navigate to="/stock" replace />} />
            <Route path="/stock" element={<StockChecker stores={stores} />} />
            <Route path="/monitor" element={<Monitor stores={stores} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/stock" replace />} />
          </Routes>
        </Layout>
      </Router>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ThemeProvider>
  );
}

export default App;
