"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function ScanHistoryCrud({ initialRows }: { initialRows: ScanHistoryRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const title = editingId ? "Cap nhat lich su kham cay" : "Them lich su kham cay";
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [rows],
  );

  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const save = async () => {
    const payload = toInput(form);

    if (!payload.plant_label || !payload.disease_label) {
      setMessage("Vui long nhap day du ten cay va ket qua benh.");
      return;
    }

    const saved = editingId
      ? await updateScanHistory(editingId, payload)
      : await createScanHistory(payload);

    setRows((current) => {
      if (!editingId) {
        return [saved, ...current];
      }

      return current.map((row) => (row.id === saved.id ? saved : row));
    });
    resetForm();
    setMessage("Da luu lich su kham cay.");
  };

  const remove = async (id: string) => {
    await deleteScanHistory(id);
    setRows((current) => current.filter((row) => row.id !== id));
    setMessage("Da xoa ban ghi.");
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-lg">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(() => {
              void save().catch(() => setMessage("Khong the luu ban ghi. Vui long thu lai."));
            });
          }}
        >
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
            {message ? <p className="mt-1 text-sm text-neutral-600">{message}</p> : null}
          </div>

          <label className="space-y-1 text-sm font-medium text-neutral-700">
            Ten cay
            <Input
              onChange={(event) => setField("plant_label", event.target.value)}
              placeholder="Tomato"
              required
              value={form.plant_label}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-neutral-700">
            Ket qua benh
            <Input
              onChange={(event) => setField("disease_label", event.target.value)}
              placeholder="Late blight"
              required
              value={form.disease_label}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-neutral-700">
            Do tin cay
            <Input
              max="1"
              min="0"
              onChange={(event) => setField("confidence", event.target.value)}
              step="0.01"
              type="number"
              value={form.confidence}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-neutral-700">
            Trang thai
            <select
              className="min-h-[48px] w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground outline-none"
              onChange={(event) => setField("status", event.target.value as FormState["status"])}
              value={form.status}
            >
              <option value="completed">Da kham</option>
              <option value="unknown">Khong xac dinh</option>
              <option value="failed">Loi xu ly</option>
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-neutral-700 md:col-span-2">
            URL anh
            <Input
              onChange={(event) => setField("image_url", event.target.value)}
              placeholder="https://..."
              value={form.image_url}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-neutral-700 md:col-span-2">
            Ghi chu
            <Input
              onChange={(event) => setField("note", event.target.value)}
              placeholder="Trieu chung quan sat duoc"
              value={form.note}
            />
          </label>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button loading={isPending} type="submit">
              {editingId ? "Luu thay doi" : "Them ban ghi"}
            </Button>
            {editingId ? (
              <Button onClick={resetForm} type="button" variant="outline">
                Huy
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="rounded-lg p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thoi gian</TableHead>
              <TableHead>Loai cay</TableHead>
              <TableHead>Ket qua</TableHead>
              <TableHead>Do tin cay</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.created_at).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell className="font-medium">{row.plant_label}</TableCell>
                <TableCell>{row.disease_label}</TableCell>
                <TableCell>{Math.round(row.confidence * 100)}%</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setEditingId(row.id);
                        setForm(toForm(row));
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Sua
                    </Button>
                    <Button
                      onClick={() => {
                        startTransition(() => {
                          void remove(row.id).catch(() => setMessage("Khong the xoa ban ghi."));
                        });
                      }}
                      size="sm"
                      variant="danger"
                    >
                      Xoa
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {sortedRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-600">Chua co lich su kham cay.</div>
        ) : null}
      </Card>
    </div>
  );
}

