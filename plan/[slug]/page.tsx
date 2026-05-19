"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTaskBySlug, joinPlan, toggleMilestone } from "@/lib/task";
import { PlanItem } from "@/types/task";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Calendar, Users, DollarSign, MapPin, CheckCircle2, Circle } from "lucide-react";
import { formatEventDate, getPlanProgress, canUserEditPlan } from "@/types/task";

export default function PlanDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getTaskBySlug(slug).then((data) => {
      if (data && data.type === "plan") setPlan(data as PlanItem);
      setLoading(false);
    });
  }, [slug]);

  const handleJoin = async () => {
    if (!user ||!plan) return toast.error("Đăng nhập đi bạn");
    try {
      await joinPlan(plan.id, user);
      toast.success("Tham gia thành công");
      const updated = await getTaskBySlug(slug);
      if (updated) setPlan(updated as PlanItem);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!user ||!plan) return;
    try {
      await toggleMilestone(plan.id, user.uid, milestoneId);
      const updated = await getTaskBySlug(slug);
      if (updated) setPlan(updated as PlanItem);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;
  if (!plan) return <div className="p-4">Không tìm thấy kế hoạch</div>;

  const isParticipant = user && plan.participants.some((p) => p.userId === user.uid);
  const canEdit = user && canUserEditPlan(plan, user.uid);
  const progress = getPlanProgress(plan);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{plan.title}</h1>
          <p className="text-muted-foreground mt-2">{plan.description}</p>
        </div>
        <Badge variant={plan.status === "open"? "default" : "secondary"}>
          {plan.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="text-sm text-muted-foreground">Diễn ra</p>
                <p className="font-medium">{formatEventDate(plan.eventDate)}</p>
              </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <div>
                <p className="text-sm text-muted-foreground">Thành viên</p>
                <p className="font-medium">{plan.currentParticipants}/{plan.maxParticipants}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <div>
                <p className="text-sm text-muted-foreground">Chi phí</p>
                <p className="font-medium">
                  {plan.costType === "free"? "Miễn phí" :
                   plan.costType === "share"? `${plan.costAmount?.toLocaleString()}đ/người` :
                   `${plan.costAmount?.toLocaleString()}đ (Chủ chi)`}
                </p>
              </div>
            </div>
            {plan.location?.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa điểm</p>
                  <p className="font-medium">{plan.location.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiến độ {progress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {plan.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mốc quan trọng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.milestones.sort((a, b) => a.order - b.order).map((m) => (
              <div key={m.id} className="flex items-start gap-3">
                <button onClick={() => handleToggleMilestone(m.id)} disabled={!isParticipant}>
                  {m.completed? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${m.completed? "line-through text-muted-foreground" : ""}`}>
                    {m.title}
                  </p>
                  {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                  {m.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Hạn: {m.dueDate.toDate().toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thành viên ({plan.participants.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {plan.participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={p.userAvatar} />
                <AvatarFallback>{p.userName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{p.userName}</p>
                <Badge variant="outline" className="text-xs">{p.role}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {!isParticipant && user && (
        <Button onClick={handleJoin} className="w-full" size="lg">
          Tham gia kế hoạch
        </Button>
      )}
    </div>
  );
}