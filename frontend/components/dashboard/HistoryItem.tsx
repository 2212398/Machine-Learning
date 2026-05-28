"use client";

import { Loader2, Pencil, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { deleteRecord, updateNote } from "@/lib/actions/dashboard";
import type { DiagnosisHistoryItem as DiagnosisHistoryItemType } from "@/types/dashboard";

type HistoryItemProps = {
  item: DiagnosisHistoryItemType;
  onDeleted: (id: string) => void;
  onUpdated: (item: DiagnosisHistoryItemType) => void;
};

function isHealthy(item: DiagnosisHistoryItemType) {
  return item.severity === "healthy";
}

export function HistoryItem({ item, onDeleted, onUpdated }: HistoryItemProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleNoteOpenChange(open: boolean) {
    if (saving) {
      return;
    }

    setNoteOpen(open);
    setError(null);
    setNote(item.note ?? "");
  }

  async function handleSaveNote() {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateNote(item.id, note);
      onUpdated(updated);
      setNoteOpen(false);
    } catch {
      setError("Không thể lưu ghi chú. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deleteRecord(item.id);
      onDeleted(item.id);
      setDeleteOpen(false);
    } catch {
      setError("Không thể xóa bản ghi. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="group flex gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-primary-pale">
        {item.imageUrl ? <img alt="" className="h-full w-full object-cover" src={item.imageUrl} /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-neutral-900">{item.plantName}</h3>
            <p className="truncate text-base text-neutral-700">{item.diseaseName}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-70 sm:transition sm:group-hover:opacity-100">
            <Button
              aria-label="Sửa ghi chú"
              className="h-9 min-h-0 min-w-9 rounded-full p-0 text-neutral-600 hover:text-primary"
              onClick={() => handleNoteOpenChange(true)}
              title="Sửa ghi chú"
              variant="ghost"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Xóa bản ghi"
              className="h-9 min-h-0 min-w-9 rounded-full p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                setError(null);
                setDeleteOpen(true);
              }}
              title="Xóa bản ghi"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
          <Badge size="sm" variant={isHealthy(item) ? "healthy" : "severe"}>
            {isHealthy(item) ? "Khỏe" : "Bệnh"}
          </Badge>
        </div>

        {item.note ? (
          <p className="mt-3 flex gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-700">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="line-clamp-2">{item.note}</span>
          </p>
        ) : null}
      </div>

      <Dialog open={noteOpen} onOpenChange={handleNoteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa ghi chú</DialogTitle>
            <DialogDescription>
              Ghi chú giúp bạn lưu lại tình trạng cây, vị trí chụp hoặc cách xử lý sau lần chẩn đoán này.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            disabled={saving}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Cây ở luống số 2, đã phun thuốc sinh học sau khi chẩn đoán..."
            value={note}
          />
          <p className="text-right text-sm text-neutral-500">{note.length}/500</p>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <DialogFooter>
            <Button disabled={saving} onClick={() => handleNoteOpenChange(false)} variant="outline">
              Hủy
            </Button>
            <Button disabled={saving} onClick={handleSaveNote}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bản ghi này?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa lịch sử chẩn đoán khỏi tài khoản của bạn và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
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
    </article>
  );
}
