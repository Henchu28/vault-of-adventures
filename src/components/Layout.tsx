import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Users, Sword, ImageIcon, Music, BookOpen, Sparkles, Menu, X, Settings, ScrollText, Swords } from 'lucide-react';
import { D20Roller } from '@/components/D20Roller';
import headerBg from '@/assets/header-bg.jpg';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';

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
    { path: '/gallery', label: 'Gallery', icon: ImageIcon, show: true },
    { path: '/music', label: 'Music', icon: Music, show: true },
    { path: '/encyclopedia', label: 'Enciclopedia', icon: BookOpen, show: true },
    { path: '/ficha', label: 'Ficha', icon: ScrollText, show: true },
    { path: '/combat', label: 'Combat', icon: Swords, show: true },
    { path: '/status', label: 'Status Actual', icon: ScrollText, show: true },
    { path: '/settings', label: 'Settings', icon: Settings, show: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header
        className="border-b relative overflow-hidden"
        style={{
          backgroundImage: `url(${headerBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-primary/60 backdrop-blur-[1px]" />

        <div className="relative z-10 px-4 py-5">
          {/* Title row - centered */}
          <div className="flex items-center justify-center gap-4">
            <D20Roller size="lg" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-wide">
              D&D Campaign Manager
            </h1>
            <Sparkles className="w-7 h-7 text-accent animate-pulse" />
          </div>

          {/* User badge - right aligned under title on larger screens */}
          <div className="flex justify-end mt-2 pr-2">
            <span className="text-sm text-primary-foreground/90 bg-primary-foreground/10 px-3 py-1 rounded-full border border-primary-foreground/20">
              {profile?.display_name} ({profile?.role === 'master' ? 'Master' : 'Player'})
            </span>
          </div>
        </div>
      </header>

      {/* Hamburger menu bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Menu className="w-5 h-5" />
                <span className="text-sm font-medium">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Menu header */}
                <div className="p-4 border-b bg-primary/10">
                  <p className="font-semibold text-foreground">{profile?.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.role === 'master' ? 'Master' : 'Player'}
                  </p>
                </div>

                {/* Nav links */}
                <nav className="flex-1 p-2">
                  {navItems
                    .filter((item) => item.show)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                              isActive(item.path)
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        </SheetClose>
                      );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t">
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={signOut}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-8 pb-40">{children}</main>
    </div>
  );
}
