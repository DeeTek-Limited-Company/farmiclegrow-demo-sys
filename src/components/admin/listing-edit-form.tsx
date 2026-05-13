"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Store, X, Upload } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string | null;
  unit: string | null;
  images: string[];
  tags: string[];
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
};

export function ListingEditForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || "");
  const [price, setPrice] = useState(listing.price.toString());
  const [currency, setCurrency] = useState(listing.currency);
  const [category, setCategory] = useState(listing.category || "");
  const [unit, setUnit] = useState(listing.unit || "MT");
  const [images, setImages] = useState<string[]>(listing.images);
  const [tags, setTags] = useState<string[]>(listing.tags);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState(listing.status);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!images.includes(base64String)) {
        setImages([...images, base64String]);
        toast.success("Image uploaded successfully.");
      }
    };
    reader.readAsDataURL(file);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiFetch(`/api/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          currency,
          category,
          unit,
          images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
          tags,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update listing.");
      }

      toast.success("Listing updated successfully");
      router.push("/admin/inventory");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update listing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-[2.5rem] border-0 shadow-2xl overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black">Edit Listing</CardTitle>
            <p className="text-slate-400 text-sm font-medium">Update your marketplace presence</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 bg-white">
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Listing Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <Input 
                  type="number"
                  step="0.01"
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="h-12 pl-8 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT">Metric Tons (MT)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="bag">Bags (50kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Description</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Tags</Label>
            <div className="flex flex-wrap gap-2 p-2 min-h-[48px] rounded-xl bg-slate-50 border border-slate-200">
              {tags.map(t => (
                <span key={t} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center gap-1">
                  {t}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(t)} />
                </span>
              ))}
              <input 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:font-medium"
                placeholder="Press Enter to add tags..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Product Images</Label>
            <div className="flex gap-4">
              <Input 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="Paste image URL here..."
              />
              <Button 
                type="button" 
                variant="outline" 
                className="h-12 rounded-xl px-4"
                onClick={() => {
                  if (imageUrl && !images.includes(imageUrl)) {
                    setImages([...images, imageUrl]);
                    setImageUrl("");
                  }
                }}
              >
                Add
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-edit"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-xl px-4 flex gap-2"
                  onClick={() => document.getElementById('file-upload-edit')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Local
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
             <div>
                <Label className="text-sm font-black text-slate-900">Publish Status</Label>
                <p className="text-xs text-slate-500 font-medium italic">Active listings are visible to buyers.</p>
             </div>
             <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="w-32 h-10 rounded-xl bg-white border-slate-200 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
