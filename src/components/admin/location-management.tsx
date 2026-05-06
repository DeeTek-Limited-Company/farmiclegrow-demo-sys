"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";

type Region = { id: string; name: string };
type District = { id: string; name: string; regionId: string; region: Region };
type Community = {
  id: string;
  name: string;
  districtId: string;
  district: District;
  latitude: string | null;
  longitude: string | null;
  description: string | null;
  _count?: { farmers: number };
};

export function LocationManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  const [newRegionName, setNewRegionName] = useState("");
  const [newDistrictName, setNewDistrictName] = useState("");
  const [newDistrictRegionId, setNewDistrictRegionId] = useState<string>("");

  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDistrictId, setNewCommunityDistrictId] = useState<string>("");
  const [newCommunityLat, setNewCommunityLat] = useState("");
  const [newCommunityLng, setNewCommunityLng] = useState("");
  const [newCommunityDesc, setNewCommunityDesc] = useState("");

  const [editing, setEditing] = useState<
    | { kind: "region"; id: string; name: string }
    | { kind: "district"; id: string; name: string; regionId: string }
    | { kind: "community"; id: string; name: string; districtId: string; latitude: string; longitude: string; description: string }
    | null
  >(null);

  const districtsByRegion = useMemo(() => {
    const map = new Map<string, District[]>();
    for (const d of districts) {
      map.set(d.regionId, [...(map.get(d.regionId) || []), d]);
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => a.name.localeCompare(b.name));
      map.set(k, v);
    }
    return map;
  }, [districts]);

  const communitiesByDistrict = useMemo(() => {
    const map = new Map<string, Community[]>();
    for (const c of communities) {
      map.set(c.districtId, [...(map.get(c.districtId) || []), c]);
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => a.name.localeCompare(b.name));
      map.set(k, v);
    }
    return map;
  }, [communities]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rRes, dRes, cRes] = await Promise.all([
        apiFetch("/api/regions"),
        apiFetch("/api/districts"),
        apiFetch("/api/communities"),
      ]);

      const rJson = await rRes.json();
      const dJson = await dRes.json();
      const cJson = await cRes.json();

      setRegions(rJson.regions || []);
      setDistricts(dJson.districts || []);
      setCommunities(cJson.communities || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const createRegion = async () => {
    if (!newRegionName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRegionName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create region");
      setNewRegionName("");
      toast.success("Region created");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create region");
    } finally {
      setSaving(false);
    }
  };

  const createDistrict = async () => {
    if (!newDistrictName.trim() || !newDistrictRegionId) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDistrictName.trim(), regionId: newDistrictRegionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create district");
      setNewDistrictName("");
      toast.success("District created");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create district");
    } finally {
      setSaving(false);
    }
  };

  const createCommunity = async () => {
    if (!newCommunityName.trim() || !newCommunityDistrictId) return;
    setSaving(true);
    try {
      const latitude = newCommunityLat.trim() ? Number(newCommunityLat) : undefined;
      const longitude = newCommunityLng.trim() ? Number(newCommunityLng) : undefined;

      const res = await apiFetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCommunityName.trim(),
          districtId: newCommunityDistrictId,
          latitude: latitude !== undefined && Number.isFinite(latitude) ? latitude : undefined,
          longitude: longitude !== undefined && Number.isFinite(longitude) ? longitude : undefined,
          description: newCommunityDesc.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create community");
      setNewCommunityName("");
      setNewCommunityLat("");
      setNewCommunityLng("");
      setNewCommunityDesc("");
      toast.success("Community created");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create community");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: any) => setEditing(item);
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.kind === "region") {
        const res = await apiFetch(`/api/regions/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editing.name.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to update region");
      }

      if (editing.kind === "district") {
        const res = await apiFetch(`/api/districts/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editing.name.trim(), regionId: editing.regionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to update district");
      }

      if (editing.kind === "community") {
        const lat = editing.latitude.trim() ? Number(editing.latitude) : undefined;
        const lng = editing.longitude.trim() ? Number(editing.longitude) : undefined;
        const res = await apiFetch(`/api/communities/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name.trim(),
            districtId: editing.districtId,
            latitude: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
            longitude: lng !== undefined && Number.isFinite(lng) ? lng : undefined,
            description: editing.description.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Failed to update community");
      }

      toast.success("Saved");
      setEditing(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (kind: "region" | "district" | "community", id: string) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/${kind}s/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      toast.success("Deleted");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Regions</CardTitle>
          <CardDescription>Create and manage regions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Region name</Label>
              <Input value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <Button onClick={createRegion} className="h-11 rounded-xl font-black" disabled={saving || !newRegionName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Region
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {regions.length === 0 ? <p className="text-sm text-muted-foreground">No regions yet.</p> : null}
            {regions.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  {editing?.kind === "region" && editing.id === r.id ? (
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  ) : (
                    <div className="font-bold truncate">{r.name}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editing?.kind === "region" && editing.id === r.id ? (
                    <>
                      <Button onClick={saveEdit} className="h-10 rounded-xl font-black" disabled={saving || !editing.name.trim()}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} className="h-10 rounded-xl font-black" disabled={saving}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl font-black"
                        onClick={() => startEdit({ kind: "region", id: r.id, name: r.name })}
                        disabled={saving}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-10 rounded-xl font-black"
                        onClick={() => deleteItem("region", r.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Districts</CardTitle>
          <CardDescription>Create districts under regions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District name</Label>
              <Input value={newDistrictName} onChange={(e) => setNewDistrictName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Region</Label>
              <Select value={newDistrictRegionId} onValueChange={setNewDistrictRegionId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="font-semibold">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={createDistrict}
              className="h-11 rounded-xl font-black md:col-span-1"
              disabled={saving || !newDistrictName.trim() || !newDistrictRegionId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {regions.map((r) => {
              const list = districtsByRegion.get(r.id) || [];
              if (list.length === 0) return null;
              return (
                <div key={r.id} className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">{r.name}</div>
                  {list.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                      <div className="min-w-0 flex-1">
                        {editing?.kind === "district" && editing.id === d.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <div className="md:col-span-3">
                              <Input
                                value={editing.name}
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                className="h-10 rounded-xl"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Select
                                value={editing.regionId}
                                onValueChange={(v) => setEditing({ ...editing, regionId: v })}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="Region" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {regions.map((rr) => (
                                    <SelectItem key={rr.id} value={rr.id} className="font-semibold">
                                      {rr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : (
                          <div className="font-bold truncate">{d.name}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editing?.kind === "district" && editing.id === d.id ? (
                          <>
                            <Button onClick={saveEdit} className="h-10 rounded-xl font-black" disabled={saving || !editing.name.trim() || !editing.regionId}>
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button variant="outline" onClick={cancelEdit} className="h-10 rounded-xl font-black" disabled={saving}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="h-10 rounded-xl font-black"
                              onClick={() => startEdit({ kind: "district", id: d.id, name: d.name, regionId: d.regionId })}
                              disabled={saving}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              className="h-10 rounded-xl font-black"
                              onClick={() => deleteItem("district", d.id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Communities</CardTitle>
          <CardDescription>Create communities under districts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Community name</Label>
              <Input value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District</Label>
              <Select value={newCommunityDistrictId} onValueChange={setNewCommunityDistrictId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="font-semibold">
                      {d.region.name} · {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lat</Label>
              <Input value={newCommunityLat} onChange={(e) => setNewCommunityLat(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lng</Label>
              <Input value={newCommunityLng} onChange={(e) => setNewCommunityLng(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="lg:col-span-10 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input value={newCommunityDesc} onChange={(e) => setNewCommunityDesc(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <Button
              onClick={createCommunity}
              className="h-11 rounded-xl font-black lg:col-span-2"
              disabled={saving || !newCommunityName.trim() || !newCommunityDistrictId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {districts.map((d) => {
              const list = communitiesByDistrict.get(d.id) || [];
              if (list.length === 0) return null;
              return (
                <div key={d.id} className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {d.region.name} · {d.name}
                  </div>
                  {list.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        {editing?.kind === "community" && editing.id === c.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                              <div className="md:col-span-3">
                                <Input
                                  value={editing.name}
                                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                  className="h-10 rounded-xl"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Select value={editing.districtId} onValueChange={(v) => setEditing({ ...editing, districtId: v })}>
                                  <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="District" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    {districts.map((dd) => (
                                      <SelectItem key={dd.id} value={dd.id} className="font-semibold">
                                        {dd.region.name} · {dd.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input
                                value={editing.latitude}
                                onChange={(e) => setEditing({ ...editing, latitude: e.target.value })}
                                className="h-10 rounded-xl"
                                placeholder="Latitude"
                              />
                              <Input
                                value={editing.longitude}
                                onChange={(e) => setEditing({ ...editing, longitude: e.target.value })}
                                className="h-10 rounded-xl"
                                placeholder="Longitude"
                              />
                              <Input
                                value={editing.description}
                                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                className="h-10 rounded-xl"
                                placeholder="Description"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold truncate">
                              {c.name}{" "}
                              <span className="text-xs text-muted-foreground font-bold">
                                ({c._count?.farmers ?? 0} farmers)
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium truncate">
                              {c.description || "—"}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editing?.kind === "community" && editing.id === c.id ? (
                          <>
                            <Button
                              onClick={saveEdit}
                              className="h-10 rounded-xl font-black"
                              disabled={saving || !editing.name.trim() || !editing.districtId}
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button variant="outline" onClick={cancelEdit} className="h-10 rounded-xl font-black" disabled={saving}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="h-10 rounded-xl font-black"
                              onClick={() =>
                                startEdit({
                                  kind: "community",
                                  id: c.id,
                                  name: c.name,
                                  districtId: c.districtId,
                                  latitude: c.latitude || "",
                                  longitude: c.longitude || "",
                                  description: c.description || "",
                                })
                              }
                              disabled={saving}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              className="h-10 rounded-xl font-black"
                              onClick={() => deleteItem("community", c.id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

