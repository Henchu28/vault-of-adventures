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
import { LogOut, Home, Users, Sword, Map, Music, BookOpen, Dice6, Sparkles } from 'lucide-react';
import headerBg from '@/assets/header-bg.jpg';

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
      <header 
        className="border-b relative overflow-hidden"
        style={{
          backgroundImage: `url(${headerBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-primary/60 backdrop-blur-[1px]" />
        
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Dice6 className="w-8 h-8 text-primary-foreground" />
                <h1 className="text-2xl font-bold text-primary-foreground">
                  D&D Campaign Manager
                </h1>
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </div>
              
              <NavigationMenu>
                <NavigationMenuList className="flex space-x-2">
                  {navItems.filter(item => item.show).map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavigationMenuItem key={item.path}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.path}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              isActive(item.path)
                                ? 'bg-accent/90 text-accent-foreground shadow-lg scale-105'
                                : 'hover:bg-primary-foreground/20 hover:text-primary-foreground text-primary-foreground/90'
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
              <span className="text-sm text-primary-foreground/90 bg-primary-foreground/10 px-3 py-1 rounded-full border border-primary-foreground/20">
                Welcome, {profile?.display_name} ({profile?.role === 'master' ? 'Master' : 'Player'})
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              >
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