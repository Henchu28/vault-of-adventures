import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Sword, Map, Music, BookOpen, Dice6, ScrollText, Swords } from 'lucide-react';
import charactersImg from '@/assets/characters-card.jpg';
import campaignsImg from '@/assets/campaigns-card.jpg';
import mapsImg from '@/assets/maps-card.jpg';
import musicImg from '@/assets/music-card.jpg';
import notesImg from '@/assets/notes-card.jpg';
import combatImg from '@/assets/combat-card.jpg';
import fichaImg from '@/assets/ficha-card.jpg';

const Index = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-2xl mx-auto px-4">
          <div className="space-y-4">
            <Dice6 className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">D&D Campaign Manager</h1>
            <p className="text-xl text-muted-foreground">
              Organize your adventures, track your characters, and manage your campaigns all in one place.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Character Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Keep track of all player characters and NPCs with detailed information and stats.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sword className="w-5 h-5" />
                    <span>Campaign Tracking</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Organize your ongoing and completed campaigns with detailed descriptions.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Map className="w-5 h-5" />
                    <span>Interactive Maps</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Store and organize maps of all the places your adventures take you.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Music className="w-5 h-5" />
                    <span>Ambient Music</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Set the mood with a curated collection of background music for your sessions.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          <Link to="/auth">
            <Button size="lg" className="mt-8">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Your Campaign</h1>
        <p className="text-xl text-muted-foreground">
          Ready for your next adventure, {profile?.display_name}?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${charactersImg})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
            <div className="absolute top-4 left-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Characters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Manage player characters and NPCs
            </CardDescription>
            <Link to="/characters">
              <Button className="w-full bg-primary hover:bg-primary/90">View Characters</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${campaignsImg})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
            <div className="absolute top-4 left-4">
              <Sword className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Track your ongoing adventures
            </CardDescription>
            <Link to="/campaigns">
              <Button className="w-full bg-primary hover:bg-primary/90">View Campaigns</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${mapsImg})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
            <div className="absolute top-4 left-4">
              <Map className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Gallery</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Explore maps and character photos
            </CardDescription>
            <Link to="/gallery">
              <Button className="w-full bg-primary hover:bg-primary/90">View Gallery</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${musicImg})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
            <div className="absolute top-4 left-4">
              <Music className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Music</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Set the perfect ambiance
            </CardDescription>
            <Link to="/music">
              <Button className="w-full bg-primary hover:bg-primary/90">Browse Music</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${fichaImg})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
            <div className="absolute top-4 left-4">
              <ScrollText className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Ficha</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Your character sheet
            </CardDescription>
            <Link to="/ficha">
              <Button className="w-full bg-primary hover:bg-primary/90">View Ficha</Button>
            </Link>
          </CardContent>
        </Card>

        {profile?.role === 'master' && (
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-accent/20">
            <div 
              className="h-48 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${notesImg})` }}
            >
              <div className="absolute inset-0 bg-primary/40" />
              <div className="absolute top-4 left-4">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Master Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Organize your campaign notes
              </CardDescription>
              <Link to="/notes">
                <Button className="w-full bg-primary hover:bg-primary/90">View Notes</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
