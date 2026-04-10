import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InventoryItem {
  id: string;
  campaign_id: number;
  item_name: string;
  quantity: number;
  notes: string;
}

interface CampaignInventoryProps {
  campaignId: number;
}

export function CampaignInventory({ campaignId }: CampaignInventoryProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => { fetchItems(); }, [campaignId]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaign_inventory')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('item_name');
    if (data) setItems(data as InventoryItem[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('campaign_inventory').insert({
      campaign_id: campaignId,
      item_name: newName.trim(),
      quantity: newQty,
      notes: newNotes.trim(),
    });
    if (error) toast({ title: "Error", description: "No se pudo añadir", variant: "destructive" });
    else { setNewName(''); setNewQty(1); setNewNotes(''); fetchItems(); }
  };

  const handleUpdate = async (item: InventoryItem) => {
    const { error } = await supabase.from('campaign_inventory')
      .update({ item_name: item.item_name, quantity: item.quantity, notes: item.notes })
      .eq('id', item.id);
    if (error) toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    else toast({ title: "Guardado", description: "Item actualizado" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('campaign_inventory').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    else fetchItems();
  };

  const updateItem = (id: string, field: keyof InventoryItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando inventario...</div>;

  return (
    <div className="space-y-4">
      {/* Add new item */}
      <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border border-border">
        <Input placeholder="Nombre del objeto" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 min-w-[150px]" />
        <Input type="number" placeholder="Cant." value={newQty} onChange={e => setNewQty(Number(e.target.value))} className="w-20" min={0} />
        <Input placeholder="Notas (opcional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="flex-1 min-w-[150px]" />
        <Button onClick={handleAdd} disabled={!newName.trim()}><Plus className="w-4 h-4 mr-1" />Añadir</Button>
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Inventario vacío</h3>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-2 font-medium">Objeto</th>
                <th className="text-center px-4 py-2 font-medium w-24">Cantidad</th>
                <th className="text-left px-4 py-2 font-medium">Notas</th>
                <th className="w-24 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <Input value={item.item_name} onChange={e => updateItem(item.id, 'item_name', e.target.value)} className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} className="border-0 bg-transparent p-0 h-auto text-center focus-visible:ring-0 w-16 mx-auto" min={0} />
                  </td>
                  <td className="px-4 py-2">
                    <Input value={item.notes} onChange={e => updateItem(item.id, 'notes', e.target.value)} className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" placeholder="—" />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleUpdate(item)}><Save className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
