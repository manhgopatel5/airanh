"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useRouter } from "next/navigation";

import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  type Unsubscribe,
} from "firebase/firestore";

import Link from "next/link";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  FiBookmark,
  FiArrowLeft,
  FiSearch,
  FiGrid,
  FiList,
} from "react-icons/fi";

import { toast, Toaster } from "sonner";

import { useAuth } from "@/lib/AuthContext";

import { getFirebaseDB } from "@/lib/firebase";

import type { ItemListItem } from "@/types/task";

import TaskCard from "@/components/TaskCard";

import LottiePlayer from "@/components/LottiePlayer";

import illustrations from "@/components/illustrations";

const BATCH_SIZE = 10;

type FilterType =
  | "all"
  | "task"
  | "plan";

type ViewMode =
  | "list"
  | "grid";

export default function BookmarksPage() {
  const db = useMemo(
    () => getFirebaseDB(),
    []
  );

  const router = useRouter();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [tasks, setTasks] = useState<
    ItemListItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [viewMode, setViewMode] =
    useState<ViewMode>("list");

  const unsubRef =
    useRef<Unsubscribe | null>(
      null
    );

  useEffect(() => {
    if (
      !authLoading &&
      !user
    ) {
      router.replace("/login");
    }
  }, [
    user,
    authLoading,
    router,
  ]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    setLoading(true);

    const q = query(
      collection(
        db,
        "task_bookmarks"
      ),

      where(
        "userId",
        "==",
        user.uid
      ),

      orderBy(
        "createdAt",
        "desc"
      )
    );

    unsubRef.current =
      onSnapshot(
        q,
        async (snap) => {
          try {
            const taskIds =
              snap.docs
                .map(
                  (d) =>
                    d.data()
                      ?.taskId
                )
                .filter(
                  Boolean
                ) as string[];

            if (
              taskIds.length === 0
            ) {
              setTasks([]);
              setLoading(
                false
              );
              return;
            }

            const chunks: string[][] =
              [];

            for (
              let i = 0;
              i <
              taskIds.length;
              i += BATCH_SIZE
            ) {
              chunks.push(
                taskIds.slice(
                  i,
                  i +
                    BATCH_SIZE
                )
              );
            }

            const taskArrays =
              await Promise.all(
                chunks.map(
                  async (
                    chunk
                  ) => {
                    const snaps =
                      await Promise.all(
                        chunk.map(
                          (
                            id
                          ) =>
                            getDoc(
                              doc(
                                db,
                                "tasks",
                                id
                              )
                            )
                        )
                      );

                    return snaps
                      .filter(
                        (
                          s
                        ) =>
                          s.exists() &&
                          s
                            .data()
                            ?.status !==
                            "cancelled" &&
                          !s
                            .data()
                            ?.banned
                      )
                      .map(
                        (
                          s
                        ) =>
                          ({
                            id: s.id,
                            ...s.data(),
                          }) as ItemListItem
                      );
                  }
                )
              );

            const allTasks =
              taskArrays
                .flat()
                .sort(
                  (
                    a,
                    b
                  ) =>
                    (b.createdAt?.toMillis?.() ||
                      0) -
                    (a.createdAt?.toMillis?.() ||
                      0)
                );

            setTasks(
              allTasks
            );

            navigator.vibrate?.(
              5
            );
          } catch (error) {
            console.error(
              "Load bookmarks error:",
              error
            );

            toast.error(
              "Lỗi tải dữ liệu"
            );

            setTasks([]);
          } finally {
            setLoading(
              false
            );
          }
        },

        (
          error
        ) => {
          console.error(
            "Bookmarks listener error:",
            error
          );

          toast.error(
            "Không thể kết nối realtime"
          );

          setLoading(
            false
          );
        }
      );

    return () => {
      unsubRef.current?.();
      unsubRef.current =
        null;
    };
  }, [user?.uid, db]);

  const filteredTasks =
    useMemo(() => {
      let filtered =
        tasks;

      if (
        filter !== "all"
      ) {
        filtered =
          filtered.filter(
            (
              t
            ) =>
              t.type ===
              filter
          );
      }

      if (search) {
        const q =
          search.toLowerCase();

        filtered =
          filtered.filter(
            (
              t
            ) =>
              t.title
                ?.toLowerCase()
                .includes(
                  q
                ) ||
              t.description
                ?.toLowerCase()
                .includes(
                  q
                )
          );
      }

      return filtered;
    }, [
      tasks,
      filter,
      search,
    ]);

  const stats =
    useMemo(
      () => ({
        total:
          tasks.length,

        tasks:
          tasks.filter(
            (
              t
            ) =>
              t.type ===
              "task"
          ).length,

        plans:
          tasks.filter(
            (
              t
            ) =>
              t.type ===
              "plan"
          ).length,
      }),
      [tasks]
    );

  if (
    authLoading ||
    !user
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <LottiePlayer
          animationData={
            illustrations.loadingPull
          }
          loop
          autoplay
          renderer="canvas"
          className="h-12 w-12"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24 dark:bg-black">
      <Toaster
        richColors
        position="top-center"
      />

      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto h-[52px] max-w-[720px] px-4">
          <div className="flex h-full items-center gap-3">
            <Link
              href="/"
              className="grid h-9 w-9 place-items-center rounded-full transition-all hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
            >
              <FiArrowLeft
                size={22}
                className="text-[#0a84ff]"
              />
            </Link>

            <div className="flex-1">
              <h1 className="text-[17px] font-bold leading-tight">
                Đã lưu
              </h1>

              <p className="text-[13px] leading-tight text-[#8e8e93]">
                {stats.total} mục •{" "}
                {stats.tasks} việc
                • {stats.plans} kế
                hoạch
              </p>
            </div>

            <button
              onClick={() => {
                setViewMode(
                  viewMode ===
                    "list"
                    ? "grid"
                    : "list"
                );

                navigator.vibrate?.(
                  5
                );
              }}
              className="grid h-9 w-9 place-items-center rounded-full transition-all hover:bg-black/5 active:scale-90 dark:hover:bg-white/10"
            >
              {viewMode ===
              "list" ? (
                <FiGrid
                  size={18}
                  className="text-[#8e8e93]"
                />
              ) : (
                <FiList
                  size={20}
                  className="text-[#8e8e93]"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[720px] px-4 py-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-4 space-y-3"
        >
          <div className="relative">
            <FiSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]"
              size={18}
            />

            <input
              value={search}
              onChange={(
                e
              ) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Tìm trong mục đã lưu"
              className="h-10 w-full rounded-xl border border-black/5 bg-white pl-10 pr-3 text-[15px] outline-none transition-all focus:border-[#0a84ff]/50 focus:ring-4 focus:ring-[#0a84ff]/10 dark:border-white/10 dark:bg-zinc-900"
            />
          </div>

          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            {[
              {
                id: "all",
                label:
                  "Tất cả",
                count:
                  stats.total,
              },

              {
                id: "task",
                label:
                  "Công việc",
                count:
                  stats.tasks,
              },

              {
                id: "plan",
                label:
                  "Kế hoạch",
                count:
                  stats.plans,
              },
            ].map(
              (tab) => (
                <button
                  key={
                    tab.id
                  }
                  onClick={() => {
                    setFilter(
                      tab.id as FilterType
                    );

                    navigator.vibrate?.(
                      5
                    );
                  }}
                  className={`h-8 whitespace-nowrap rounded-full px-3.5 text-[15px] font-medium transition-all active:scale-95 ${
                    filter ===
                    tab.id
                      ? "bg-[#0a84ff] text-white shadow-lg shadow-[#0a84ff]/20"
                      : "border border-black/5 bg-white text-[#3a3a3c] hover:bg-black/5 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                  }`}
                >
                  {
                    tab.label
                  }{" "}
                  <span
                    className={
                      filter ===
                      tab.id
                        ? "opacity-80"
                        : "opacity-60"
                    }
                  >
                    (
                    {
                      tab.count
                    }
                    )
                  </span>
                </button>
              )
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="space-y-3"
            >
              {Array.from({
                length: 4,
              }).map(
                (
                  _,
                  i
                ) => (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        i *
                        0.05,
                    }}
                    className="rounded-3xl border border-black/5 bg-white p-4 dark:border-white/5 dark:bg-zinc-900"
                  >
                    <div className="flex gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-[#E5E5EA] dark:bg-zinc-800" />

                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-[#E5E5EA] dark:bg-zinc-800" />

                        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[#E5E5EA] dark:bg-zinc-800" />

                        <div className="h-16 animate-pulse rounded-2xl bg-[#E5E5EA] dark:bg-zinc-800" />
                      </div>
                    </div>
                  </motion.div>
                )
              )}

              <div className="flex justify-center pt-4">
                <LottiePlayer
                  animationData={
                    illustrations.loadingPull
                  }
                  loop
                  autoplay
                  renderer="canvas"
                  className="h-12 w-12 opacity-60"
                />
              </div>
            </motion.div>
          ) : filteredTasks.length ===
            0 ? (
            <motion.div
              key="empty"
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="py-16 text-center"
            >
              <motion.div
                initial={{
                  scale: 0,
                }}
                animate={{
                  scale: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="relative mx-auto mb-6 h-24 w-24"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0a84ff]/20 to-[#5e5ce6]/20 blur-2xl" />

                <div className="relative grid h-full w-full place-items-center rounded-full border border-black/5 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
                  <FiBookmark
                    className="text-[#8e8e93]"
                    size={40}
                    strokeWidth={
                      1.5
                    }
                  />
                </div>
              </motion.div>

              <h2 className="mb-2 text-xl font-bold text-black dark:text-white">
                {search ||
                filter !==
                  "all"
                  ? "Không tìm thấy"
                  : "Chưa có mục nào"}
              </h2>

              <p className="mx-auto mb-8 max-w-xs text-[15px] leading-relaxed text-[#8e8e93]">
                {search ||
                filter !==
                  "all"
                  ? "Thử tìm với từ khóa khác hoặc đổi bộ lọc"
                  : "Lưu các công việc và kế hoạch bạn quan tâm để xem lại sau"}
              </p>

              {!search &&
                filter ===
                  "all" && (
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                  >
                    <Link
                      href="/"
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0a84ff] px-6 font-semibold text-white shadow-lg shadow-[#0a84ff]/25 transition-all active:shadow-md"
                    >
                      <span>
                        Khám
                        phá
                        ngay
                      </span>
                    </Link>
                  </motion.div>
                )}

              {(search ||
                filter !==
                  "all") && (
                <button
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setFilter(
                      "all"
                    );
                  }}
                  className="h-10 rounded-xl border border-black/10 bg-white px-5 font-medium text-[#0a84ff] transition-all hover:bg-black/5 active:scale-95 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-white/5"
                >
                  Xóa bộ
                  lọc
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className={
                viewMode ===
                "grid"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                  : "space-y-3"
              }
            >
              <AnimatePresence>
                {filteredTasks.map(
                  (
                    task,
                    index
                  ) => (
                    <motion.div
                      key={
                        task.id
                      }
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      transition={{
                        delay:
                          index *
                          0.03,

                        type: "spring",

                        stiffness: 400,

                        damping: 25,
                      }}
                      layout
                    >
                      <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-[#0a84ff]/0 via-[#0a84ff]/10 to-[#5e5ce6]/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                        <div className="relative">
                          <TaskCard
                            task={
                              task as any
                            }
                            mode={
                              task.type as
                                | "task"
                                | "plan"
                            }
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading &&
          filteredTasks.length >
            0 && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.3,
              }}
              className="mt-8 border-t border-black/5 pt-6 dark:border-white/5"
            >
              <p className="text-center text-[13px] text-[#8e8e93]">
                Hiển thị{" "}
                {
                  filteredTasks.length
                }{" "}
                /{" "}
                {
                  stats.total
                }{" "}
                mục đã lưu
              </p>
            </motion.div>
          )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}