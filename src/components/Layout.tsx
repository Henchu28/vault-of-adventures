import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { LogOut, Home, Users, Sword, Map, Music, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isMaster } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home, show: true },
    { path: '/characters', label: 'Characters', icon: Users, show: true },
    { path: '/campaigns', label: 'Campaigns', icon: Sword, show: true },
    { path: '/maps', label: 'Maps', icon: Map, show: true },
    { path: '/music', label: 'Music', icon: Music, show: true },
    { path: '/notes', label: 'Notes', icon: BookOpen, show: isMaster },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">D&D Campaign Manager</h1>
              
              <NavigationMenu>
                <NavigationMenuList className="flex space-x-2">
                  {navItems.filter(item => item.show).map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavigationMenuItem key={item.path}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.path}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              isActive(item.path)
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.display_name} ({profile?.role === 'master' ? 'Master' : 'Player'})
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}