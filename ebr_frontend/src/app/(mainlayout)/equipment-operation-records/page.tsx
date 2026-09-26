"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  EquipmentIncidentPriority,
  EquipmentIncidentReport,
} from "@/features/equipment/types";
import { API_ROUTES } from "@/lib/api-routes";
import { equipmentService } from "@/services/index.service";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const priorityLabels: Record<EquipmentIncidentPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};
const statusLabels: Record<EquipmentIncidentReport["status"], string> = {
  OPEN: "Mới báo cáo",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã khắc phục",
  CLOSED: "Đã đóng",
};
const statusStyles: Record<EquipmentIncidentReport["status"], string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};
const priorityStyles: Record<EquipmentIncidentPriority, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function EquipmentOperationRecordsPage() {
  const { mutate } = useSWRConfig();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [equipmentId, setEquipmentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formPriority, setFormPriority] =
    useState<EquipmentIncidentPriority>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  const { data: reports, error, isLoading } = useSWR(
    API_ROUTES.equipment.incidentReports,
    () => equipmentService.fetchEquipmentIncidentReports(),
  );
  const { data: equipment } = useSWR(
    API_ROUTES.equipment.base,
    equipmentService.fetchEquipment,
  );

  const filteredReports = useMemo(() =>
    (reports ?? []).filter((report) => {
      const query = search.trim().toLocaleLowerCase("vi");
      const matchesSearch = !query || [report.title, report.description, report.equipment?.code, report.equipment?.name]
        .some((value) => value?.toLocaleLowerCase("vi").includes(query));
      return matchesSearch && (status === "ALL" || report.status === status) &&
        (priority === "ALL" || report.priority === priority);
    }), [reports, search, status, priority]);

  const resetForm = () => {
    setEquipmentId(""); setTitle(""); setDescription(""); setFormPriority("MEDIUM");
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!equipmentId) { toast.error("Vui lòng chọn thiết bị."); return; }
    setSubmitting(true);
    try {
      await equipmentService.createEquipmentIncidentReport({
        equipment_id: Number(equipmentId), title: title.trim(),
        description: description.trim(), priority: formPriority,
      });
      await mutate(API_ROUTES.equipment.incidentReports);
      toast.success("Đã tạo báo cáo sự cố.");
      setOpen(false); resetForm();
    } catch {
      toast.error("Không thể tạo báo cáo sự cố.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 border-b bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-amber-600" />
            <h1 className="text-lg font-semibold">Báo cáo sự cố thiết bị</h1>
          </div>
          <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" />Thêm mới sự cố</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={submitReport}>
                <DialogHeader>
                  <DialogTitle>Thêm mới sự cố thiết bị</DialogTitle>
                  <DialogDescription>Nhập thông tin thiết bị và sự cố cần báo cáo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Thiết bị</Label>
                    <Select value={equipmentId} onValueChange={setEquipmentId}>
                      <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                      <SelectContent>{(equipment ?? []).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.code} - {item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="incident-title">Tiêu đề sự cố</Label><Input id="incident-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required /></div>
                  <div className="grid gap-2"><Label htmlFor="incident-description">Mô tả</Label><Textarea id="incident-description" value={description} onChange={(event) => setDescription(event.target.value)} required /></div>
                  <div className="grid gap-2"><Label>Mức độ</Label><Select value={formPriority} onValueChange={(value) => setFormPriority(value as EquipmentIncidentPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(priorityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? "Đang lưu..." : "Tạo báo cáo"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-gray-400" /><Input className="pl-9" placeholder="Tìm sự cố hoặc thiết bị" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả trạng thái</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger className="w-44"><SelectValue placeholder="Mức độ" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả mức độ</SelectItem>{Object.entries(priorityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error ? <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không thể tải danh sách sự cố.</p> : isLoading ? <p className="p-8 text-center text-sm text-gray-500">Đang tải danh sách sự cố...</p> : filteredReports.length ? (
          <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3 font-medium">Sự cố</th><th className="px-4 py-3 font-medium">Thiết bị</th><th className="px-4 py-3 font-medium">Mức độ</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 font-medium">Người báo cáo</th><th className="px-4 py-3 font-medium">Thời gian</th></tr></thead>
            <tbody className="divide-y">{filteredReports.map((report) => <tr key={report.id} className="align-top hover:bg-gray-50"><td className="max-w-sm px-4 py-3"><p className="font-medium text-gray-900">{report.title}</p><p className="mt-1 line-clamp-2 text-gray-500">{report.description}</p></td><td className="px-4 py-3"><p className="font-medium">{report.equipment?.code ?? `#${report.equipment_id}`}</p><p className="text-gray-500">{report.equipment?.name}</p></td><td className="px-4 py-3"><Badge className={priorityStyles[report.priority]}>{priorityLabels[report.priority]}</Badge></td><td className="px-4 py-3"><Badge className={statusStyles[report.status]}>{statusLabels[report.status]}</Badge></td><td className="px-4 py-3">{report.createdBy?.name || report.createdBy?.username || "-"}</td><td className="whitespace-nowrap px-4 py-3">{report.created_at ? new Date(report.created_at).toLocaleString("vi-VN") : "-"}</td></tr>)}</tbody>
          </table></div>
        ) : <div className="rounded-lg border border-dashed p-10 text-center"><TriangleAlert className="mx-auto size-8 text-gray-400" /><p className="mt-3 font-medium text-gray-700">{search || status !== "ALL" || priority !== "ALL" ? "Không tìm thấy sự cố phù hợp." : "Chưa có báo cáo sự cố thiết bị."}</p><p className="mt-1 text-sm text-gray-500">Thêm báo cáo mới để ghi nhận sự cố.</p></div>}
      </div>
    </div>
  );
}
