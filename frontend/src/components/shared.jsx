import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { Phone, MessageCircle, ArrowLeft, LogOut, Navigation, LayoutDashboard, Route, Users, Coins, BarChart3, Headphones, Menu, X, QrCode, Image, Palette, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export const BrandHeader = ({ showBack = false, title, subtitle }) => {
  const { business } = useApp();
  const navigate = useNavigate();
  const bName = business?.full_name || business?.name || 'Navigation Guide';
  const isAjpl = business?.slug === 'ajpl';

  return (
    <header className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
      <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" data-testid="back-button">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-lg truncate" data-testid="brand-header-title">
            {title || bName}
          </h1>
          {subtitle && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {isAjpl && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]">
              Premium
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export const BottomActionBar = ({ children, className = '' }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-md border-t border-[hsl(var(--border))] bottom-safe-area ${className}`}>
      <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-2">
        {children}
      </div>
    </div>
  );
};

export const QuickContactActions = ({ phone, whatsapp }) => {
  return (
    <div className="flex items-center gap-2">
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-sm transition-colors" data-testid="call-button">
          <Phone className="w-4 h-4" />
          <span>Call</span>
        </a>
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-sm transition-colors" data-testid="whatsapp-button">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <span>WhatsApp</span>
        </a>
      )}
    </div>
  );
};

export const DirectionIcon = ({ direction, size = 48 }) => {
  const arrows = {
    straight: '↑',
    left: '←',
    right: '→',
    u_turn: '↶',
    enter: '⎆',
    climb: '↑↑',
    destination: '★'
  };
  const colors = {
    straight: 'bg-blue-100 text-blue-700',
    left: 'bg-orange-100 text-orange-700',
    right: 'bg-orange-100 text-orange-700',
    u_turn: 'bg-red-100 text-red-700',
    enter: 'bg-green-100 text-green-700',
    climb: 'bg-purple-100 text-purple-700',
    destination: 'bg-[hsl(var(--gold)/0.2)] text-[hsl(var(--gold))]'
  };

  return (
    <div className={`direction-arrow ${colors[direction] || 'bg-gray-100 text-gray-700'}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      data-testid="direction-icon">
      {arrows[direction] || '↑'}
    </div>
  );
};

const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'sessions', label: 'Sessions', icon: Navigation, path: '/admin/sessions' },
  { id: 'routes', label: 'Routes', icon: Route, path: '/admin/routes' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'qr-codes', label: 'QR Codes', icon: QrCode, path: '/admin/qr-codes' },
  { id: 'media', label: 'Media', icon: Image, path: '/admin/media' },
  { id: 'gold-rates', label: 'Gold Rates', icon: Coins, path: '/admin/gold-rates' },
  { id: 'branding', label: 'Branding', icon: Palette, path: '/admin/branding' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { id: 'reports', label: 'Reports & Export', icon: FileText, path: '/admin/reports' },
  { id: 'helpdesk', label: 'Helpdesk', icon: Headphones, path: '/helpdesk' },
  { id: 'manuals', label: 'Manuals', icon: BookOpen, path: '/admin/manuals' },
];

const getNavItemsForRole = (role) => {
  if (role === 'admin') return ADMIN_NAV_ITEMS;
  if (role === 'trainer') {
    return [
      { id: 'routes', label: 'Routes', icon: Route, path: '/admin/routes' },
      { id: 'media', label: 'Media', icon: Image, path: '/admin/media' },
      { id: 'manuals', label: 'Trainer Manual', icon: BookOpen, path: '/manual/trainer' },
    ];
  }
  if (role === 'helpdesk') {
    return [
      { id: 'helpdesk', label: 'Helpdesk', icon: Headphones, path: '/helpdesk' },
      { id: 'manuals', label: 'Helpdesk Manual', icon: BookOpen, path: '/manual/helpdesk' },
    ];
  }
  return ADMIN_NAV_ITEMS;
};

const SidebarNavContent = ({ active, items, onNavigate, onLogout, testIdPrefix = '' }) => (
  <>
    <nav className="flex-1 py-2">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.path)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
            active === item.id
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
          }`}
          data-testid={`${testIdPrefix}admin-nav-${item.id}`}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {item.label}
        </button>
      ))}
    </nav>
    <div className="p-4 border-t border-[hsl(var(--border))]">
      <Button variant="outline" size="sm" className="w-full" onClick={onLogout} data-testid={`${testIdPrefix}logout-button`}>
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  </>
);

export const AdminSidebar = ({ active }) => {
  const navigate = useNavigate();
  const { logoutUser, user } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItemsForRole(user?.role);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
    setMobileOpen(false);
  };

  const activeItem = navItems.find(i => i.id === active);

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex-col flex-shrink-0">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h2 className="font-display font-bold text-base">Yash Ornaments</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">WayFinder Admin</p>
        </div>
        <SidebarNavContent
          active={active}
          items={navItems}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Top Bar - shown only on mobile */}
      <div className="md:hidden sticky top-0 z-40 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors duration-150"
              data-testid="mobile-menu-toggle"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm truncate">Yash Ornaments</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                {activeItem ? activeItem.label : 'Admin'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="mobile-logout-button" className="text-xs">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <h2 className="font-display font-bold text-base">Yash Ornaments</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">WayFinder Admin</p>
          </div>
          <div className="flex flex-col h-[calc(100%-65px)]">
            <SidebarNavContent
              active={active}
              items={navItems}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              testIdPrefix="mobile-"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export const StatusBadge = ({ status }) => {
  const colors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    abandoned: 'bg-gray-100 text-gray-600 border-gray-200',
    terminated: 'bg-red-100 text-red-700 border-red-200',
    open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-gray-100 text-gray-600 border-gray-200',
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    published: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`} data-testid="status-badge">
      {status?.replace(/_/g, ' ')}
    </span>
  );
};


export const BrandingFooter = ({ className = '' }) => {
  return (
    <div className={`text-center py-3 ${className}`} data-testid="branding-footer">
      <p className="text-[10px] text-[hsl(var(--muted-foreground))] tracking-wide">
        Navigation powered by <span className="font-semibold">YASH ORNAMENTS</span>
      </p>
    </div>
  );
};

export const ProtectedImage = ({ src, alt, className = '', ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
      draggable={false}
      style={{ WebkitUserSelect: 'none', userSelect: 'none', pointerEvents: 'auto' }}
      {...props}
    />
  );
};
