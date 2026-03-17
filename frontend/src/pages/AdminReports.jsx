import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetReportSessions, adminExportReport, adminGetRoutes, adminGetBusinesses, adminGetUsers } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Filter, FileSpreadsheet, FileText, Search, Loader2, BarChart3, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReports() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useApp();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [helpdeskUsers, setHelpdeskUsers] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') { navigate('/login'); return; }
    loadFilters();
    loadSessions();
  }, [isLoggedIn, navigate, user]);

  const loadFilters = async () => {
    try {
      const [routesRes, bizRes, usersRes] = await Promise.all([
        adminGetRoutes(), adminGetBusinesses(), adminGetUsers()
      ]);
      setRoutes(routesRes.data);
      setBusinesses(bizRes.data);
      setHelpdeskUsers(usersRes.data.filter(u => u.role === 'helpdesk'));
    } catch (e) {}
  };

  // Helper: strip sentinel "all_*" values so they are never sent to the backend
  const cleanFilters = () => {
    const params = {};
    if (statusFilter && !statusFilter.startsWith('all_')) params.status = statusFilter;
    if (routeFilter && !routeFilter.startsWith('all_')) params.route_id = routeFilter;
    if (businessFilter && !businessFilter.startsWith('all_')) params.business_id = businessFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (assignedFilter && !assignedFilter.startsWith('all_')) params.assigned_to = assignedFilter;
    return params;
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await adminGetReportSessions(cleanFilters());
      setSessions(res.data);
    } catch (e) { toast.error('Failed to load sessions'); }
    setLoading(false);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await adminExportReport(format, cleanFilters());
      const blob = new Blob([res.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions_report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error('Export failed'); }
    setExporting(false);
  };

  const getTimeSince = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="analytics" />

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="reports-title">Reports & Export</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Filter, view, and export session data</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={exporting}
                data-testid="export-csv"
              >
                <FileText className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
                data-testid="export-xlsx"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> XLSX
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Filters</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger data-testid="filter-route"><SelectValue placeholder="Route" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_routes">All Routes</SelectItem>
                    {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={businessFilter} onValueChange={setBusinessFilter}>
                  <SelectTrigger data-testid="filter-business"><SelectValue placeholder="Business" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_businesses">All Businesses</SelectItem>
                    {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" data-testid="filter-date-from" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" data-testid="filter-date-to" />
                <Button onClick={loadSessions} disabled={loading} data-testid="apply-filters">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1" /> Apply</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{sessions.length} sessions found</p>

          {/* Sessions Table */}
          <Card>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-[hsl(var(--muted-foreground))]">
                        {loading ? 'Loading...' : 'No sessions match your filters'}
                      </TableCell>
                    </TableRow>
                  ) : sessions.slice(0, 100).map(s => (
                    <TableRow key={s.id} data-testid="report-session-row">
                      <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{s.customer_name || 'Anonymous'}</TableCell>
                      <TableCell className="text-xs font-mono">{s.customer_phone || '-'}</TableCell>
                      <TableCell className="text-xs">{s.business_slug?.toUpperCase()}</TableCell>
                      <TableCell className="text-xs">{s.route_name || '-'}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-xs">{s.entry_source_label || s.entry_campaign || '-'}</TableCell>
                      <TableCell className="text-xs">{s.location_permission_state === 'granted' ? 'GPS' : s.location_permission_state}</TableCell>
                      <TableCell className="text-xs">{getTimeSince(s.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sessions.length > 100 && (
                <p className="text-xs text-center py-2 text-[hsl(var(--muted-foreground))]">Showing 100 of {sessions.length}. Export to see all.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
