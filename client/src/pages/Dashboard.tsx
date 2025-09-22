import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  Monitor as MonitorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import { ApiService } from '../services/api';
import { MonitoringStats, MonitoringSession } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<MonitoringSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        const [statsResponse, sessionsResponse] = await Promise.all([
          ApiService.getMonitoringStats(),
          ApiService.getMonitoringSessions()
        ]);

        setStats(statsResponse.stats);
        setRecentSessions(
          sessionsResponse.sessions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
        );
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getStoreChartData = () => {
    if (!stats?.storeDistribution) return [];
    
    const total = Object.values(stats.storeDistribution).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(stats.storeDistribution).map(([store, count]) => ({
      store,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  };

  if (isLoading) {
    return <LoadingSpinner message="📊 Loading dashboard..." />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        📈 Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Overview */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <MonitorIcon color="primary" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Sessions
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats?.totalSessions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Sessions
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats?.activeSessions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon color="info" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Checks
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats?.totalChecks || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <StoreIcon color="warning" />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Unique Stores
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {Object.keys(stats?.storeDistribution || {}).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Store Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Store Distribution
              </Typography>
              
              {getStoreChartData().length > 0 ? (
                <Box>
                  {getStoreChartData().map(({ store, count, percentage }) => (
                    <Box key={store} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">{store}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {count} sessions ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No sessions created yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Server Status</Typography>
                  <Chip 
                    icon={<CheckCircleIcon />}
                    label="Online" 
                    color="success" 
                    size="small" 
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Active Monitors</Typography>
                  <Chip 
                    label={`${stats?.activeSessions || 0} running`}
                    color={stats?.activeSessions ? 'primary' : 'default'}
                    size="small" 
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Last Activity</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recentSessions.length > 0 
                      ? formatDistanceToNow(new Date(recentSessions[0].createdAt), { addSuffix: true })
                      : 'No activity'
                    }
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Sessions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Monitoring Sessions
              </Typography>
              
              {recentSessions.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Store</TableCell>
                        <TableCell>Products</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Last Check</TableCell>
                        <TableCell>Checks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentSessions.map((session) => (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Chip
                              icon={session.status === 'active' ? <CheckCircleIcon /> : <ScheduleIcon />}
                              label={session.status}
                              color={session.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{session.store}</TableCell>
                          <TableCell>
                            {session.products.length > 0 ? (
                              <Box display="flex" gap={0.5} flexWrap="wrap">
                                {session.products.slice(0, 2).map((product, index) => (
                                  <Chip
                                    key={index}
                                    label={product.name || product.sku}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {session.products.length > 2 && (
                                  <Chip
                                    label={`+${session.products.length - 2} more`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                All products
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {session.lastCheck 
                                ? formatDistanceToNow(new Date(session.lastCheck), { addSuffix: true })
                                : 'Never'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>{session.checkCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <MonitorIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No monitoring sessions yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
