"use client";

import {
  useRouter,
} from "next/navigation";

import {
  FiHeart,

  
  FiUsers,
  FiClock,
  FiMapPin,
  FiCalendar,
  
  FiCheckCircle,
} from "react-icons/fi";

import {
  useEffect,
  useState,
  useCallback,
  memo,
  useMemo,
} from "react";

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import {
  getFirebaseDB,
  getFirebaseAuth,
} from "@/lib/firebase";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { incrementTaskView } from "@/lib/task";

import type {
  TaskListItem,
  PlanListItem,
} from "@/types/task";

import { toast, Toaster } from "sonner";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import LottiePlayer from "@/components/LottiePlayer";

import illustrations, { type IllustrationKey } from "@/components/illustrations";

type CardTask =
  | TaskListItem
  | PlanListItem;

interface Props {
  task: CardTask;
  mode: "task" | "plan";
  onDelete?: (
    id: string
  ) => void;
}

const planCategoryEmoji: Record<
  string,
  string
> = {
  food: "🍜",
  nightlife: "🎉",
  outdoor: "🥾",
  sightseeing: "🗺️",
  entertainment: "🎬",
  shopping: "🛍️",
  wellness: "🧘",
  social: "💬",
  other: "✨",
};
const likeBurstKey: IllustrationKey = "celebrate";
function TaskCard({
  task,
  mode,
}: Props) {
  const router = useRouter();

  const db = useMemo(
    () => getFirebaseDB(),
    []
  );

  const auth = useMemo(
    () => getFirebaseAuth(),
    []
  );

  const [currentUser, setCurrentUser] =
    useState<User | null>(
      null
    );

  const [liking, setLiking] =
    useState(false);

  const [localLikes, setLocalLikes] =
    useState<string[]>(
      task.likes || []
    );

  const [
    showLikeBurst,
    setShowLikeBurst,
  ] = useState(false);

  const [isHovered, setIsHovered] =
    useState(false);

  useEffect(() => {
    const unsub =
      onAuthStateChanged(
        auth,
        setCurrentUser
      );

    return () => unsub();
  }, [auth]);

  if (!task) {
    return <Skeleton />;
  }

  const isPlanMode =
    mode === "plan";

  const liked =
    !!currentUser &&
    localLikes.includes(
      currentUser.uid
    );

 

  const statusConfig = {
    open: {
      text: "Đang tuyển",
      bg: "bg-[#30d158]/10",
      textCls:
        "text-[#30d158]",
      icon: null,
    },

    full: {
      text: "Đã đủ",
      bg: "bg-[#ff9f0a]/10",
      textCls:
        "text-[#ff9f0a]",
      icon: null,
    },

    doing: {
      text: "Đang làm",
      bg: "bg-[#0a84ff]/10",
      textCls:
        "text-[#0a84ff]",
      icon: null,
    },

    completed: {
      text: "Hoàn thành",
      bg: "bg-[#0a84ff]/10",
      textCls:
        "text-[#0a84ff]",
      icon: FiCheckCircle,
    },

    cancelled: {
      text: "Đã hủy",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      textCls:
        "text-zinc-500",
      icon: null,
    },
  } as const;

  const safeStatus =
    (
      task.status &&
      task.status in
        statusConfig
        ? task.status
        : "open"
    ) as keyof typeof statusConfig;

  const status =
    statusConfig[safeStatus];

  const taskData =
    mode === "task"
      ? (task as TaskListItem)
      : null;

  const planData =
    mode === "plan"
      ? (task as PlanListItem)
      : null;

  const handleLike =
    useCallback(
      async (
        e: React.MouseEvent
      ) => {
        e.stopPropagation();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        if (liking) return;

        setLiking(true);

        const newLikes = liked
          ? localLikes.filter(
              (id) =>
                id !==
                currentUser.uid
            )
          : [
              ...localLikes,
              currentUser.uid,
            ];

        setLocalLikes(newLikes);

        if (!liked) {
          setShowLikeBurst(
            true
          );

          navigator.vibrate?.(
            10
          );

          setTimeout(() => {
            setShowLikeBurst(
              false
            );
          }, 900);
        } else {
          navigator.vibrate?.(
            5
          );
        }

        try {
          await updateDoc(
            doc(
              db,
              "tasks",
              task.id
            ),
            {
              likes: liked
                ? arrayRemove(
                    currentUser.uid
                  )
                : arrayUnion(
                    currentUser.uid
                  ),

              likeCount:
                newLikes.length,
            }
          );
        } catch {
          setLocalLikes(
            task.likes || []
          );

          toast.error(
            "Thao tác thất bại"
          );
        } finally {
          setLiking(false);
        }
      },
      [
        currentUser,
        liked,
        liking,
        localLikes,
        task,
        router,
        db,
      ]
    );

  

  const handleClick =
    useCallback(() => {
      incrementTaskView(
        task.id
      );

      navigator.vibrate?.(3);

      router.push(
        `/${mode}/${task.slug}`
      );
    }, [
      router,
      task,
      mode,
    ]);

  const goToProfile =
    useCallback(
      (
        e: React.MouseEvent
      ) => {
        e.stopPropagation();

        if (task.userId) {
          router.push(
            `/user/${task.userId}`
          );
        }
      },
      [router, task]
    );

  const timeAgo =
    useCallback(
      (
        seconds?: number
      ) => {
        if (!seconds)
          return "";

        const diff =
          Date.now() / 1000 -
          seconds;

        if (diff < 60)
          return "vừa xong";

        if (diff < 3600) {
          return `${Math.floor(
            diff / 60
          )}p`;
        }

        if (diff < 86400) {
          return `${Math.floor(
            diff / 3600
          )}h`;
        }

        if (diff < 604800) {
          return `${Math.floor(
            diff / 86400
          )}n`;
        }

        return new Date(
          seconds * 1000
        ).toLocaleDateString(
          "vi-VN",
          {
            day: "2-digit",
            month:
              "2-digit",
          }
        );
      },
      []
    );

  const formatPrice =
    useCallback(
      (
        price: number,
        currency = "VND"
      ) =>
        new Intl.NumberFormat(
          "vi-VN",
          {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }
        ).format(price),
      []
    );

  const progressPercent =
    useMemo(() => {
      if (
        taskData?.totalSlots
      ) {
        return Math.round(
          ((taskData.joined ||
            0) /
            taskData.totalSlots) *
            100
        );
      }

      if (
        planData?.maxParticipants
      ) {
        return Math.round(
          ((planData.currentParticipants ||
            0) /
            planData.maxParticipants) *
            100
        );
      }

      return 0;
    }, [
      taskData,
      planData,
    ]);

  return (
    <>
      <Toaster
        richColors
        position="top-center"
      />

      <motion.article
        whileHover={{
          y: -2,
        }}
        whileTap={{
          scale: 0.99,
        }}
        onClick={
          handleClick
        }
        onHoverStart={() => {
          setIsHovered(
            true
          );

          router.prefetch(
            `/${mode}/${task.slug}`
          );
        }}
        onHoverEnd={() =>
          setIsHovered(
            false
          )
        }
        className={`
          group relative overflow-hidden cursor-pointer
          bg-white dark:bg-zinc-900
          rounded-3xl border transition-all duration-300
          ${
            isHovered
              ? "border-[#0a84ff]/20 shadow-2xl shadow-[#0a84ff]/10"
              : "border-zinc-100/80 dark:border-zinc-800/80 shadow-sm"
          }
        `}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0a84ff] via-[#5e5ce6] to-[#0a84ff] opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3.5">
            <button
              onClick={
                goToProfile
              }
              className="relative flex-shrink-0 group/avatar"
            >
              <img
                src={
                  task.userAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    task.userName ||
                      "U"
                  )}&background=0a84ff&color=fff&bold=true`
                }
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-zinc-900 dark:text-white truncate">
                  {task.userName ||
                    "User"}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2 h-5 rounded-full text-xs font-bold ${status.bg} ${status.textCls}`}
                >
                  {status.icon && (
                    <status.icon
                      size={
                        11
                      }
                    />
                  )}

                  {isPlanMode &&
                    planCategoryEmoji[
                      planData?.category ||
                        "other"
                    ]}

                  {isPlanMode
                    ? "PLAN"
                    : status.text}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-1">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <FiClock
                    size={
                      11
                    }
                  />

                  {timeAgo(
                    task
                      .createdAt
                      ?.seconds
                  )}
                </span>

                {task.location
                  ?.city && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                    <FiMapPin
                      size={
                        11
                      }
                    />

                    {
                      task
                        .location
                        .city
                    }
                  </span>
                )}
              </div>
            </div>

            <motion.button
              whileTap={{
                scale: 0.85,
              }}
              onClick={
                handleLike
              }
              disabled={
                liking
              }
              className="relative w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <AnimatePresence>
                {showLikeBurst && (
                  <motion.div
                    initial={{
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      scale: 1.8,
                      opacity: 0,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.8,
                    }}
                    className="absolute inset-0 pointer-events-none"
                  >
  <LottiePlayer
  animationData={illustrations[likeBurstKey]}
  autoplay
  loop={false}
  renderer="svg"
  className="w-8 h-8"
/>
                  </motion.div>
                )}
              </AnimatePresence>

              <FiHeart
                size={16}
                className={
                  liked
                    ? "fill-red-500 text-red-500 scale-110"
                    : "text-zinc-400"
                }
                strokeWidth={
                  liked
                    ? 0
                    : 2
                }
              />
            </motion.button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <h3
                className={`
                  flex-1 line-clamp-2
                  font-bold leading-snug transition-all duration-300
                  ${
                    isHovered
                      ? "text-[#0a84ff]"
                      : "text-zinc-900 dark:text-white"
                  }
                `}
              >
                {task.title}
              </h3>

              {mode ===
                "task" &&
                taskData?.price !==
                  undefined && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-extrabold tracking-tight text-[#00C853]">
                      {formatPrice(
                        taskData.price,
                        taskData.currency
                      )}
                    </div>
                  </div>
                )}
            </div>

            {task.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                {
                  task.description
                }
              </p>
            )}

            {(taskData?.totalSlots ||
              planData?.maxParticipants) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-zinc-500 font-medium">
                    <FiUsers
                      size={
                        12
                      }
                    />

                    {taskData?.joined ||
                      planData?.currentParticipants ||
                      0}
                    /
                    {taskData?.totalSlots ||
                      planData?.maxParticipants}{" "}
                    người
                  </span>

                  <span className="text-zinc-400 font-medium">
                    {
                      progressPercent
                    }
                    %
                  </span>
                </div>

                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${progressPercent}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      ease: "easeOut",
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]"
                  />
                </div>
              </div>
            )}

            {isPlanMode &&
              planData?.eventDate && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-lg bg-[#0a84ff]/10 text-[#0a84ff] font-medium">
                    <FiCalendar
                      size={
                        12
                      }
                    />

                    {new Date(
                      planData.eventDate.seconds *
                        1000
                    ).toLocaleDateString(
                      "vi-VN",
                      {
                        day: "2-digit",
                        month:
                          "2-digit",
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}
                  </span>
                </div>
              )}

            {task.images &&
              task.images.length >
                0 && (
                <div
                  className={`grid gap-1.5 mt-1 ${
                    task.images
                      .length ===
                    1
                      ? "grid-cols-1"
                      : task
                            .images
                            .length ===
                          2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  }`}
                >
                  {task.images
                    .slice(0, 3)
                    .map(
                      (
                        img,
                        i
                      ) => (
                        <div
                          key={
                            i
                          }
                          className="relative overflow-hidden rounded-xl"
                        >
                          <img
                            src={
                              img
                            }
                            alt=""
                            loading="lazy"
                            className={`w-full h-full object-cover transition-transform duration-700 ${
                              isHovered
                                ? "scale-105"
                                : "scale-100"
                            }`}
                          />
                        </div>
                      )
                    )}
                </div>
              )}
          </div>
        </div>
      </motion.article>
    </>
  );
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/3" />

          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4" />

        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />

        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
      </div>
    </div>
  );
}

export default memo(
  TaskCard,
  (prev, next) =>
    prev.task.id ===
      next.task.id &&
    prev.mode ===
      next.mode &&
    prev.task.likeCount ===
      next.task.likeCount &&
    prev.task.commentCount ===
      next.task.commentCount &&
    prev.task.status ===
      next.task.status
);