import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

import { Menu, Users, Search, Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import ManagerSidebar from "@/components/manager/ManagerSidebar";
import { cn } from "@/lib/utils";

import { getDocs, query, Timestamp, where, writeBatch } from "firebase/firestore";
import { volunteersRef } from "@/services/firestore";
import { ensureDefaultGroup, GroupUI, useAddGroup, useDeleteGroup, useGroups, useUpdateGroup } from "@/hooks/useFirestoreGroups";

const MOBILE_BREAKPOINT = 1024;

export default function Groups() {
  const navigate = useNavigate();
  const { t } = useTranslation("manager-groups");
  const { t: tNav } = useTranslation("navigation");
  const { isRTL } = useLanguage();
  const { toast } = useToast();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<GroupUI | null>(null);

  const { groups, loading } = useGroups();
  const { addGroup, loading: adding } = useAddGroup();
  const { updateGroup, loading: updating } = useUpdateGroup();
  const { deleteGroup, loading: deleting } = useDeleteGroup();

  // Auth guard
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    if (!user.id || user.role !== "manager") {
      navigate("/login");
    }
  }, [navigate]);

  // Responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ensure default group exists (one-time)
  useEffect(() => {
    ensureDefaultGroup().catch((e) => console.warn("Failed ensuring default group:", e));
  }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
  }, [groups, search]);

  const onLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await addGroup({ name });
    if (!id) {
      toast({ title: t("toasts.createError"), variant: "destructive" });
      return;
    }
    setNewName("");
    setIsCreateOpen(false);
    toast({ title: t("toasts.createSuccess") });
  };

  const handleEdit = async () => {
    if (!selected) return;
    if (selected.isDefault) {
      toast({ title: t("toasts.cannotEditDefault"), variant: "destructive" });
      return;
    }
    const name = newName.trim();
    if (!name) return;
    await updateGroup(selected.id, { name });
    setIsEditOpen(false);
    setSelected(null);
    toast({ title: t("toasts.updateSuccess") });
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.isDefault) {
      toast({ title: t("toasts.cannotDeleteDefault"), variant: "destructive" });
      return;
    }

    // Reassign volunteers to default group before deleting (prevents dangling foreign keys)
    try {
      const defaultGroup = await ensureDefaultGroup();
      const q = query(volunteersRef, where("groupAffiliation", "==", selected.id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        let batch = writeBatch(db);
        let writes = 0;
        const commits: Promise<void>[] = [];

        snap.docs.forEach((d) => {
          batch.update(d.ref, { groupAffiliation: defaultGroup.id });
          writes++;
          if (writes >= 450) {
            commits.push(batch.commit());
            batch = writeBatch(db);
            writes = 0;
          }
        });
        if (writes > 0) commits.push(batch.commit());
        await Promise.all(commits);
      }
    } catch (e) {
      console.error("Failed reassigning volunteers to default group:", e);
      toast({ title: t("toasts.reassignError"), variant: "destructive" });
      return;
    }

    await deleteGroup(selected.id);
    setIsDeleteOpen(false);
    setSelected(null);
    toast({ title: t("toasts.deleteSuccess") });
  };

  return (
    <div className={cn("flex min-h-screen bg-slate-50", isRTL && "rtl")}>
      <ManagerSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile={isMobile}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col">
        <header className={cn("bg-white border-b px-4 py-3 flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" />
                {tNav("groups")}
              </h1>
              <p className="text-sm text-slate-500">{t("subtitle")}</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.create")}
            </Button>
          </div>
        </header>

        <main className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                />
                <Badge variant="secondary">{t("count", { count: filteredGroups.length })}</Badge>
              </div>

              <div className="border rounded-md bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.type")}</TableHead>
                      <TableHead className="text-right">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                          {t("loading")}
                        </TableCell>
                      </TableRow>
                    ) : filteredGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                          {t("empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGroups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell>
                            {g.isDefault ? (
                              <Badge className="bg-slate-100 text-slate-900 hover:bg-slate-100">{t("badges.default")}</Badge>
                            ) : (
                              <Badge variant="secondary">{t("badges.custom")}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={g.isDefault}
                                onClick={() => {
                                  setSelected(g);
                                  setNewName(g.name);
                                  setIsEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={g.isDefault}
                                onClick={() => {
                                  setSelected(g);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("dialogs.createTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="groupName">{t("fields.name")}</Label>
            <Input id="groupName" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={adding || !newName.trim()}>
              {t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("dialogs.editTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editGroupName">{t("fields.name")}</Label>
            <Input id="editGroupName" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={updating || !newName.trim()}>
              {t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("dialogs.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {t("actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

