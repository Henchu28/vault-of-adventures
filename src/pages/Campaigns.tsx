import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search, Sword } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Campaign {
  id: number;
  plain: string;
}

export default function Campaigns() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } else {
      setCampaigns(data || []);
    }
    
    setLoading(false);
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaign.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      fetchCampaigns();
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.plain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Campaign</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground">Campaign form would go here</div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 p-4 bg-card rounded-lg">
        <Search className="w-4 h-4" />
        <Input
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sword className="w-5 h-5" />
                  <span>Campaign {campaign.id}</span>
                </div>
                {isMaster && (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCampaign(campaign)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(campaign)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {campaign.plain || 'No description available'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <Sword className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No campaigns found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'Start your first adventure!'}
          </p>
        </div>
      )}
    </div>
  );
}