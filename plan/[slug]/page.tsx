"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTaskBySlug, joinPlan, toggleMilestone } from "@/lib/task";
import { PlanItem } from "@/types/task";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Calendar, Users, DollarSign, MapPin, CheckCircle2, Circle } from "lucide-react";
import { formatEventDate, getPlanProgress, canUserEditPlan } from "@/types/task";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function PlanDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";

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
      toast.success("Tham gia thành công!");
      navigator.vibrate?.([10,20,10]);
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
      navigator.vibrate?.(5);
      const updated = await getTaskBySlug(slug);
      if (updated) setPlan(updated as PlanItem);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-20 h-20"><DotLottieReact src={loadingLottie} autoplay loop /></div>
    </div>
  );
  if (!plan) return <div className="p-6 text-center text-zinc-500">Không tìm thấy kế hoạch</div>;

  const isParticipant = user && plan.participants.some((p) => p.userId === user.uid);
  const canEdit = user && canUserEditPlan(plan, user.uid);
  const progress = getPlanProgress(plan);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Header */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-900">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{plan.title}</h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">{plan.description}</p>
            </div>
            <Badge className="shrink-0" style={{background:plan.status==="open"?'#0042B2':'#6b7280',color:'white'}}>
              {plan.status === "open"? "Đang mở" : "Đã đóng"}
            </Badge>
          </div>
        </motion.div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.05}}>
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 rounded-3xl shadow-sm">
              <CardContent className="p-5 space-y-4">
                {[
                  {icon:Calendar,label:"Diễn ra",value:formatEventDate(plan.eventDate)},
                  {icon:Users,label:"Thành viên",value:`${plan.currentParticipants}/${plan.maxParticipants}`},
                  {icon:DollarSign,label:"Chi phí",value:plan.costType==="free"?"Miễn phí":plan.costType==="share"?`${plan.costAmount?.toLocaleString()}đ/người`:`${plan.costAmount?.toLocaleString()}đ`},
                ].map((item,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0042B2]/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-[#0042B2]" /></div>
                    <div>
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="font-semibold text-zinc-900 dark:text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
                {plan.location?.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0042B2]/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-[#0042B2]" /></div>
                    <div>
                      <p className="text-xs text-zinc-500">Địa điểm</p>
                      <p className="font-semibold text-zinc-900 dark:text-white">{plan.location.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 rounded-3xl shadow-sm h-full">
              <CardHeader className="pb-3"><CardTitle className="text-base">Tiến độ</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-black" style={{color:'#0042B2'}}>{progress}%</span>
                  <span className="text-xs text-zinc-500">{plan.milestones.filter(m=>m.completed).length}/{plan.milestones.length} mốc</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.8}} className="h-full rounded-full" style={{background:'linear-gradient(90deg,#0042B2,#1A5FFF)'}} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Milestones */}
        {plan.milestones.length > 0 && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 rounded-3xl shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Mốc quan trọng</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {plan.milestones.sort((a, b) => a.order - b.order).map((m,idx) => (
                    <motion.div key={m.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:idx*0.05}} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                      <button onClick={() => handleToggleMilestone(m.id)} disabled={!isParticipant} className="mt-0.5">
                        {m.completed? <CheckCircle2 className="w-5 h-5" style={{color:'#00C853'}} /> : <Circle className="w-5 h-5 text-zinc-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${m.completed? "line-through text-zinc-500" : "text-zinc-900 dark:text-white"}`}>{m.title}</p>
                        {m.description && <p className="text-sm text-zinc-500 mt-0.5">{m.description}</p>}
                        {m.dueDate && <p className="text-xs text-zinc-400 mt-1">Hạn: {m.dueDate.toDate().toLocaleDateString("vi-VN")}</p>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Members */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.2}}>
          <Card className="bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 rounded-3xl shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Thành viên ({plan.participants.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {plan.participants.map((p) => (
                  <div key={p.userId} className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                    <Avatar className="w-8 h-8 ring-2 ring-white dark:ring-zinc-950">
                      <AvatarImage src={p.userAvatar} />
                      <AvatarFallback style={{background:'#0042B2',color:'white'}}>{p.userName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold leading-none">{p.userName}</p>
                      <p className="text-xs text-zinc-500 capitalize mt-0.5">{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Join Button */}
        {!isParticipant && user && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
            <Button onClick={handleJoin} className="w-full h-12 rounded-2xl font-bold text-base shadow-lg" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>
              Tham gia kế hoạch
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}