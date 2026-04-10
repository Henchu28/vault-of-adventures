import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, ImageIcon } from 'lucide-react';
import { GalleryMaps } from '@/components/gallery/GalleryMaps';
import { GalleryPhotos } from '@/components/gallery/GalleryPhotos';

export default function Gallery() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gallery</h1>
      <Tabs defaultValue="maps" className="w-full">
        <TabsList>
          <TabsTrigger value="maps" className="flex items-center gap-2">
            <Map className="w-4 h-4" /><span>Mapas</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /><span>Fotos Personajes</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="maps"><GalleryMaps /></TabsContent>
        <TabsContent value="photos"><GalleryPhotos /></TabsContent>
      </Tabs>
    </div>
  );
}
