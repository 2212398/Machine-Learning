"use client";

import {
  CalendarDays,
  CheckCircle2,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  createScanHistory,
  deleteScanHistory,
  updateScanHistory,
  type ScanHistoryInput,
  type ScanHistoryRow,
} from "@/lib/actions/scan-history";

type FormState = {
  image_url: string;
  plant_label: string;
  disease_label: string;
  confidence: string;
  status: ScanHistoryInput["status"];
  note: string;
};

const emptyForm: FormState = {
  image_url: "",
  plant_label: "",
  disease_label: "",
  confidence: "0.90",
  status: "completed",
  note: "",
};

const statusView: Record<
  ScanHistoryRow["status"],
  { label: string; badge: "healthy" | "mild" | "severe" | "unknown"; icon: typeof CheckCircle2 }
> = {
  completed: { label: "Hoàn tất", badge: "healthy", icon: CheckCircle2 },
  unknown: { label: "Chưa rõ", badge: "unknown", icon: SearchX },
  failed: { label: "Lỗi xử lý", badge: "severe", icon: XCircle },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

function toInput(form: FormState): ScanHistoryInput {
  return {
    image_url: form.image_url.trim() || null,
    plant_label: form.plant_label.trim(),
    disease_label: form.disease_label.trim(),
    confidence: Math.min(1, Math.max(0, Number(form.confidence) || 0)),
    status: form.status,
    note: form.note.trim() || null,
  };
}

function toForm(row: ScanHistoryRow): FormState {
  return {
    image_url: row.image_url ?? "",
    plant_label: row.plant_label,
    disease_label: row.disease_label,
    confidence: String(row.confidence),
    status: row.status,
    note: row.note ?? "",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ScanHistoryCrud({ initialRows }: { initialRows: ScanHistoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScanHistoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [rows],
  );

  const isEditing = Boolean(editingId);

  function setField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(row: ScanHistoryRow) {
    setEditingId(row.id);
    setForm(toForm(row));
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (saving) {
      return;
    }

    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  async function handleSave() {
    const payload = toInput(form);

    if (!payload.plant_label || !payload.disease_label) {
      toast.error("Vui lòng nhập đầy đủ tên cây và kết quả bệnh.");
      return;
    }

    setSaving(true);

    try {
      const saved = isEditing
        ? await updateScanHistory(editingId as string, payload)
        : await createScanHistory(payload);

      setRows((current) => {
        if (!isEditing) {
          return [saved, ...current];
        }

        return current.map((row) => (row.id === saved.id ? saved : row));
      });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(isEditing ? "Đã cập nhật lịch sử chẩn đoán." : "Đã thêm lịch sử chẩn đoán.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu bản ghi."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteScanHistory(pendingDelete.id);
      setRows((current) => current.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Đã xóa lịch sử chẩn đoán.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa bản ghi."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Danh sách bản ghi</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Sửa ghi chú, cập nhật kết quả hoặc xóa bản ghi ngay trên màn hình này.
          </p>
        </div>
        <Button className="w-full sm:w-auto" icon={<Plus className="h-4 w-4" />} onClick={openCreateDialog}>
          Thêm bản ghi
        </Button>
      </div>

      {sortedRows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {sortedRows.map((row) => {
            const view = statusView[row.status];
            const StatusIcon = view.icon;

            return (
              <Card
                className="group overflow-hidden p-0 transition hover:border-primary/25 hover:shadow-md"
                key={row.id}
              >
                <article className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-primary-pale sm:h-24 sm:w-24">
                    {row.image_url ? (
                      <img
                        alt={row.plant_label}
                        className="h-full w-full object-cover"
                        src={row.image_url}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold text-neutral-900">{row.plant_label}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-700">
                          {row.disease_label}
                        </p>
                      </div>
                      <Badge size="sm" variant={view.badge}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {view.label}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {/* Explicit timezone avoids hydration mismatch between server and browser. */}
                        {dateFormatter.format(new Date(row.created_at))}
                      </span>
                      <span className="rounded-full bg-primary-pale px-2 py-1 font-semibold text-primary">
                        {formatPercent(row.confidence)}
                      </span>
                    </div>

                    {row.note ? (
                      <p className="mt-3 line-clamp-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-700">
                        {row.note}
                      </p>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <Button
                        className="min-h-[40px] flex-1"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => openEditDialog(row)}
                        size="sm"
                        variant="outline"
                      >
                        Sửa
                      </Button>
                      <Button
                        className="min-h-[40px] flex-1"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setPendingDelete(row)}
                        size="sm"
                        variant="ghost"
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </article>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-pale text-primary">
            <SearchX className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-neutral-900">Chưa có lịch sử chẩn đoán</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
            Khi bạn lưu kết quả nhận diện, bản ghi sẽ xuất hiện tại đây để theo dõi và ghi chú.
          </p>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{isEditing ? "Sửa lịch sử chẩn đoán" : "Thêm lịch sử chẩn đoán"}</DialogTitle>
              <DialogDescription>
                Dữ liệu sẽ được lưu theo tài khoản hiện tại và được Supabase RLS bảo vệ.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-semibold text-neutral-700">
                Tên cây
                <Input
                  disabled={saving}
                  onChange={(event) => setField("plant_label", event.target.value)}
                  placeholder="Cà chua"
                  required
                  value={form.plant_label}
                />
              </label>

              <label className="space-y-1 text-sm font-semibold text-neutral-700">
                Kết quả bệnh
                <Input
                  disabled={saving}
                  onChange={(event) => setField("disease_label", event.target.value)}
                  placeholder="Bạc lá"
                  required
                  value={form.disease_label}
                />
              </label>

              <label className="space-y-1 text-sm font-semibold text-neutral-700">
                Độ tin cậy
                <Input
                  disabled={saving}
                  max="1"
                  min="0"
                  onChange={(event) => setField("confidence", event.target.value)}
                  step="0.01"
                  type="number"
                  value={form.confidence}
                />
              </label>

              <label className="space-y-1 text-sm font-semibold text-neutral-700">
                Trạng thái
                <select
                  className="min-h-[44px] w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  onChange={(event) => setField("status", event.target.value as FormState["status"])}
                  value={form.status}
                >
                  <option value="completed">Hoàn tất</option>
                  <option value="unknown">Chưa rõ</option>
                  <option value="failed">Lỗi xử lý</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-sm font-semibold text-neutral-700">
              URL ảnh
              <Input
                disabled={saving}
                onChange={(event) => setField("image_url", event.target.value)}
                placeholder="https://..."
                value={form.image_url}
              />
            </label>

            <label className="block space-y-1 text-sm font-semibold text-neutral-700">
              Ghi chú
              <Textarea
                disabled={saving}
                maxLength={500}
                onChange={(event) => setField("note", event.target.value)}
                placeholder="Ví dụ: Lá xuất hiện đốm vàng ở mặt dưới..."
                value={form.note}
              />
            </label>
            <p className="text-right text-xs text-neutral-500">{form.note.length}/500</p>

            <DialogFooter>
              <Button disabled={saving} onClick={() => handleDialogOpenChange(false)} type="button" variant="outline">
                Hủy
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Đang lưu..." : "Lưu bản ghi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !deleting && !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bản ghi này?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa lịch sử của {pendingDelete?.plant_label ?? "bản ghi"} khỏi tài khoản hiện tại
              và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
