"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPlan } from "@/lib/task";
import { useAuth } from "@/hooks/useAuth";
import { Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Calendar, Users, DollarSign, Lock, MapPin, X, Plus } from "lucide-react";
import { nanoid } from "nanoid";

type MilestoneInput = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
};

export default function CreatePlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "event",
    eventDate: "",
    endDate: "",
    maxParticipants: "",
    costType: "free" as "free" | "share" | "host",
    costAmount: "",
    costDescription: "",
    visibility: "public" as "public" | "private" | "unlisted",
    allowInvite: true,
    autoAccept: false,
    requireApproval: false,
    tags: "",
    location: {
      address: "",
      city: "",
      country: "Vietnam",
    },
  });
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { id: nanoid(8), title: "", description: "", dueDate: "" },
  ]);

  useEffect(() => {
    const titleParam = searchParams.get("title");
    if (titleParam) {
      setForm(prev => ({...prev, title: decodeURIComponent(titleParam) }));
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!user) return toast.error("Bạn cần đăng nhập");
    if (form.title.length < 5) return toast.error("Tiêu đề tối thiểu 5 ký tự");
    if (!form.eventDate) return toast.error("Chọn ngày diễn ra");
    if (!form.maxParticipants || parseInt(form.maxParticipants) < 2) {
      return toast.error("Số người tối thiểu là 2");
    }
    if (form.costType!== "free" && (!form.costAmount || parseFloat(form.costAmount) <= 0)) {
      return toast.error("Nhập số tiền hợp lệ");
    }

    setLoading(true);
    try {
      const validMilestones = milestones
       .filter((m) => m.title.trim())
       .map((m) => ({
          title: m.title,
          description: m.description,
          dueDate: m.dueDate? Timestamp.fromDate(new Date(m.dueDate)) : undefined,
        }));

      const { slug } = await createPlan(
        {
          type: "plan",
          title: form.title,
          description: form.description,
          category: form.category,
          eventDate: Timestamp.fromDate(new Date(form.eventDate)),
          endDate: form.endDate? Timestamp.fromDate(new Date(form.endDate)) : undefined,
          maxParticipants: parseInt(form.maxParticipants),
          costType: form.costType,
          costAmount: form.costType === "free"? undefined : parseFloat(form.costAmount),
          costDescription: form.costDescription,
          allowInvite: form.allowInvite,
          autoAccept: form.autoAccept,
          requireApproval: form.requireApproval,
          visibility: form.visibility,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          location: form.location.address? form.location : undefined,
          milestones: validMilestones,
        },
        user
      );
      toast.success("Tạo kế hoạch thành công");
      router.push(`/plan/${slug}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { id: nanoid(8), title: "", description: "", dueDate: "" }]);
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id!== id));
  };

  const updateMilestone = (id: string, field: keyof MilestoneInput, value: string) => {
    setMilestones(milestones.map((m) => (m.id === id? {...m, [field]: value } : m)));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pb-20">
      <h1 className="text-3xl font-bold mb-6">Tạo kế hoạch nhóm</h1>

      <div className="space-y-6">
        {/* Thông tin cơ bản */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tiêu đề *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value })}
                placeholder="VD: Đi Đà Lạt cuối tuần"
                maxLength={100}
              />
            </div>

            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value })}
                placeholder="Mô tả chi tiết kế hoạch..."
                rows={4}
                maxLength={5000}
              />
            </div>

            <div>
              <Label>Danh mục</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Sự kiện</SelectItem>
                  <SelectItem value="travel">Du lịch</SelectItem>
                  <SelectItem value="study">Học tập</SelectItem>
                  <SelectItem value="work">Công việc</SelectItem>
                  <SelectItem value="sport">Thể thao</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tags</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({...form, tags: e.target.value })}
                placeholder="teambuilding, dalat, weekend (cách nhau bởi dấu phẩy)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Thời gian */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Thời gian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngày bắt đầu *</Label>
                <Input
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(e) => setForm({...form, eventDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Ngày kết thúc</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thành viên */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Thành viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Số người tối đa *</Label>
              <Input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => setForm({...form, maxParticipants: e.target.value })}
                placeholder="VD: 10"
                min={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Cho phép thành viên mời thêm</Label>
              <Switch
                checked={form.allowInvite}
                onCheckedChange={(v) => setForm({...form, allowInvite: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Tự động duyệt khi tham gia</Label>
              <Switch
                checked={form.autoAccept}
                onCheckedChange={(v) => setForm({...form, autoAccept: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Yêu cầu duyệt từ chủ kế hoạch</Label>
              <Switch
                checked={form.requireApproval}
                onCheckedChange={(v) => setForm({...form, requireApproval: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chi phí */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Chi phí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Loại chi phí</Label>
              <Select value={form.costType} onValueChange={(v: any) => setForm({...form, costType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Miễn phí</SelectItem>
                  <SelectItem value="share">Chia đều</SelectItem>
                  <SelectItem value="host">Chủ chi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.costType!== "free" && (
              <>
                <div>
                  <Label>Số tiền {form.costType === "share"? "mỗi người" : "tổng"}</Label>
                  <Input
                    type="number"
                    value={form.costAmount}
                    onChange={(e) => setForm({...form, costAmount: e.target.value })}
                    placeholder="VD: 500000"
                  />
                </div>
                <div>
                  <Label>Mô tả chi phí</Label>
                  <Input
                    value={form.costDescription}
                    onChange={(e) => setForm({...form, costDescription: e.target.value })}
                    placeholder="VD: Tiền xe, ăn uống, vé tham quan"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Địa điểm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Địa điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Địa chỉ</Label>
              <Input
                value={form.location.address}
                onChange={(e) => setForm({...form, location: {...form.location, address: e.target.value } })}
                placeholder="VD: Đà Lạt, Lâm Đồng"
              />
            </div>
          </CardContent>
        </Card>

        {/* Mốc quan trọng */}
        <Card>
          <CardHeader>
            <CardTitle>Mốc quan trọng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((m, i) => (
              <div key={m.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={m.title}
                      onChange={(e) => updateMilestone(m.id, "title", e.target.value)}
                      placeholder={`Mốc ${i + 1}: Tên mốc`}
                    />
                    <Input
                      value={m.description}
                      onChange={(e) => updateMilestone(m.id, "description", e.target.value)}
                      placeholder="Mô tả"
                    />
                    <Input
                      type="date"
                      value={m.dueDate}
                      onChange={(e) => updateMilestone(m.id, "dueDate", e.target.value)}
                    />
                  </div>
                  {milestones.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMilestone(m.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addMilestone} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Thêm mốc
            </Button>
          </CardContent>
        </Card>

        {/* Quyền riêng tư */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Quyền riêng tư
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={form.visibility} onValueChange={(v: any) => setForm({...form, visibility: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Công khai - Ai cũng thấy</SelectItem>
                <SelectItem value="unlisted">Không liệt kê - Chỉ link mới vào được</SelectItem>
                <SelectItem value="private">Riêng tư - Chỉ thành viên thấy</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
          {loading? "Đang tạo..." : "Tạo kế hoạch"}
        </Button>
      </div>
    </div>
  );
}