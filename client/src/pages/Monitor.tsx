import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Alert,
  SelectChangeEvent,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Monitor as MonitorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import { ApiService } from '../services/api';
import socketService from '../services/socket';
import { StoreInfo, MonitoringSession, MonitoringFormData } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import { useForm, useFieldArray, Controller } from 'react-hook-form';

interface MonitorProps {
  stores: StoreInfo | null;
}

const Monitor: React.FC<MonitorProps> = ({ stores }) => {
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  const { control, handleSubmit, reset, watch, setValue } = useForm<MonitoringFormData>({
    defaultValues: {
      store: '',
      productInputs: [{ type: 'name', value: '' }],
      collections: [],
      interval: 60,
      notifications: { web: true, sound: true }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'productInputs'
  });

  const watchedStore = watch('store');

  // Load monitoring sessions
  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.getMonitoringSessions();
      setSessions(response.sessions);
    } catch (err) {
      console.error('Failed to load monitoring sessions:', err);
      toast.error('Failed to load monitoring sessions');
    } finally {
      setIsLoading(false);
    }
  };

  // Load collections when store changes
  useEffect(() => {
    const loadCollections = async () => {
      if (!watchedStore) {
        setAvailableCollections([]);
        return;
      }

      try {
        const response = await ApiService.getStoreCollections(watchedStore);
        setAvailableCollections(response.collections);
      } catch (err) {
        console.error('Failed to load collections:', err);
        setAvailableCollections([]);
      }
    };

    loadCollections();
  }, [watchedStore]);

  // Load data on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const handleCheckCompleted = (data: any) => {
      setSessions(prev => prev.map(session => 
        session.id === data.sessionId 
          ? { ...session, lastCheck: new Date(data.timestamp), checkCount: data.checkCount }
          : session
      ));
    };

    const handleSessionStopped = (data: any) => {
      setSessions(prev => prev.map(session =>
        session.id === data.sessionId
          ? { ...session, status: 'stopped' }
          : session
      ));
      toast.info(`⏹️ Monitoring session stopped: ${data.reason}`);
    };

    socketService.onCheckCompleted(handleCheckCompleted);

    return () => {
      socketService.offCheckCompleted(handleCheckCompleted);
    };
  }, []);

  const onSubmit = async (data: MonitoringFormData) => {
    try {
      const response = await ApiService.createMonitoringSession(data);
      setSessions(prev => [...prev, response.session]);
      
      socketService.joinMonitoringSession(response.session.id);
      
      toast.success('✅ Monitoring session created successfully');
      setIsCreateDialogOpen(false);
      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create monitoring session';
      toast.error(errorMessage);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await ApiService.stopMonitoringSession(sessionId);
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { ...session, status: 'stopped' }
          : session
      ));
      toast.success('⏹️ Monitoring session stopped');
    } catch (err) {
      toast.error('Failed to stop monitoring session');
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    try {
      await ApiService.resumeMonitoringSession(sessionId);
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { ...session, status: 'active' }
          : session
      ));
      toast.success('▶️ Monitoring session resumed');
    } catch (err) {
      toast.error('Failed to resume monitoring session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this monitoring session?')) {
      return;
    }

    try {
      await ApiService.deleteMonitoringSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('🗑️ Monitoring session deleted');
    } catch (err) {
      toast.error('Failed to delete monitoring session');
    }
  };

  const handleForceCheck = async (sessionId: string) => {
    try {
      await ApiService.forceCheckSession(sessionId);
      toast.success('🔄 Manual check triggered');
    } catch (err) {
      toast.error('Failed to trigger manual check');
    }
  };

  const getAllStores = () => {
    if (!stores) return [];
    return [...stores.modern, ...stores.legacy];
  };

  const getNextCheckTime = (session: MonitoringSession) => {
    if (!session.lastCheck) return 'Not checked yet';
    const nextCheck = new Date(session.lastCheck.getTime() + session.interval * 1000);
    return nextCheck.toLocaleTimeString();
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        📊 Stock Monitor
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Active Monitoring Sessions ({sessions.filter(s => s.status === 'active').length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create Monitor
                </Button>
              </Box>

              {isLoading ? (
                <LoadingSpinner message="Loading monitoring sessions..." />
              ) : sessions.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <MonitorIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No monitoring sessions yet. Create one to start tracking stock!
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Store</TableCell>
                        <TableCell>Products</TableCell>
                        <TableCell>Interval</TableCell>
                        <TableCell>Last Check</TableCell>
                        <TableCell>Next Check</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Chip
                              icon={session.status === 'active' ? <CheckCircleIcon /> : <CancelIcon />}
                              label={session.status === 'active' ? 'Active' : 'Stopped'}
                              color={session.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{session.store}</TableCell>
                          <TableCell>
                            <Box>
                              {session.products.length > 0 ? (
                                session.products.slice(0, 3).map((product, index) => (
                                  <Chip
                                    key={index}
                                    label={`${product.type}: ${product.name || product.sku}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  All products
                                </Typography>
                              )}
                              {session.products.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{session.products.length - 3} more
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{session.interval}s</TableCell>
                          <TableCell>
                            {session.lastCheck
                              ? `${session.lastCheck.toLocaleTimeString()} (${session.checkCount})`
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            {session.status === 'active' ? getNextCheckTime(session) : 'Stopped'}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={0.5}>
                              {session.status === 'active' ? (
                                <Tooltip title="Stop monitoring">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleStopSession(session.id)}
                                  >
                                    <StopIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Resume monitoring">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleResumeSession(session.id)}
                                  >
                                    <PlayIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="Force check now">
                                <IconButton
                                  size="small"
                                  onClick={() => handleForceCheck(session.id)}
                                  disabled={session.status !== 'active'}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete session">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteSession(session.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Monitor Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Create Stock Monitor</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="store"
                  control={control}
                  rules={{ required: 'Store is required' }}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Store *</InputLabel>
                      <Select {...field} label="Store *">
                        {getAllStores().map((store) => (
                          <MenuItem key={store} value={store}>
                            {store}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Products to Monitor
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Leave empty to monitor all products in selected collections
                </Typography>
                
                {fields.map((field, index) => (
                  <Box key={field.id} display="flex" gap={2} mb={2}>
                    <Controller
                      name={`productInputs.${index}.type`}
                      control={control}
                      render={({ field }) => (
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel>Type</InputLabel>
                          <Select {...field} label="Type">
                            <MenuItem value="name">Name</MenuItem>
                            <MenuItem value="sku">SKU</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                    
                    <Controller
                      name={`productInputs.${index}.value`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Value"
                          placeholder="Product name or SKU"
                          fullWidth
                        />
                      )}
                    />
                    
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => append({ type: 'name', value: '' })}
                >
                  Add Product
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="collections"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Collections (Optional)</InputLabel>
                      <Select
                        {...field}
                        multiple
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {availableCollections.map((collection) => (
                          <MenuItem key={collection} value={collection}>
                            <Checkbox checked={field.value.indexOf(collection) > -1} />
                            {collection}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="interval"
                  control={control}
                  rules={{ 
                    required: 'Interval is required',
                    min: { value: 10, message: 'Minimum interval is 10 seconds' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Check Interval (seconds)"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Notification Settings
                </Typography>
                
                <Controller
                  name="notifications.web"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Web notifications"
                    />
                  )}
                />
                
                <Controller
                  name="notifications.sound"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Sound notifications"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Create Monitor
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Monitor;
