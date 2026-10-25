import { Card, CardContent } from '@/components/ui/card';

export default function Ficha() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Ficha</h1>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">En proceso</p>
        </CardContent>
      </Card>
    </div>
  );
}
