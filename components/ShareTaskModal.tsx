"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import { Task } from "@/types/task";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { toast } from "sonner";

type Props = {
  task: Task;
  onClose: () => void;
};

type Friend = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
};

export default function ShareTaskModal({
  task,
  onClose,
}: Props) {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  if (!task?.id) return null;

  useEffect(() => {
    let mounted = true;

    const fetchFriends = async () => {
      if (!user?.uid) {
        setFriends([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const db = getFirebaseDB();

        // friends subcollection
        const friendsRef = collection(
          db,
          "users",
          user.uid,
          "friends"
        );

        const friendsSnap = await getDocs(friendsRef);

        const friendIds = friendsSnap.docs
          .filter(
            (doc) =>
              doc.data()?.status === "accepted"
          )
          .map((doc) => doc.id);

        console.log("friendIds", friendIds);

        if (friendIds.length === 0) {
          if (mounted) {
            setFriends([]);
            setLoading(false);
          }
          return;
        }

        const loadedFriends: Friend[] = [];

        // firestore "in" max 10 docs
        for (let i = 0; i < friendIds.length; i += 10) {
          const chunk = friendIds.slice(i, i + 10);

          const usersQuery = query(
            collection(db, "users"),
            where(documentId(), "in", chunk)
          );

          const usersSnap = await getDocs(usersQuery);

          const chunkFriends: Friend[] =
            usersSnap.docs.map((doc) => ({
              id: doc.id,
              name:
                doc.data()?.displayName ||
                doc.data()?.name ||
                "User",
              username:
                doc.data()?.username || "",
              avatar:
                doc.data()?.photoURL ||
                doc.data()?.avatar ||
                "",
              online:
                doc.data()?.online || false,
            }));

          loadedFriends.push(...chunkFriends);
        }

        console.log(
          "loadedFriends",
          loadedFriends
        );

        if (mounted) {
          setFriends(loadedFriends);
        }
      } catch (error) {
        console.error(
          "fetchFriends error",
          error
        );

        toast.error(
          "Không tải được danh sách bạn bè"
        );

        if (mounted) {
          setFriends([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchFriends();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      const keyword = search.toLowerCase();

      return (
        friend.name
          ?.toLowerCase()
          .includes(keyword) ||
        friend.username
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [friends, search]);

  const toggleSelect = (id: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }

    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selected.length === 0) {
      toast.error(
        "Chọn ít nhất 1 người bạn"
      );
      return;
    }

    try {
      // TODO:
      // await sendTaskToFriends(task.id, selected);

      toast.success(
        `Đã chia sẻ cho ${selected.length} người`
      );

      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }

      onClose();
    } catch (error) {
      console.error(error);

      toast.error("Gửi thất bại");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="
          fixed inset-0 z-[999]
          bg-black/50
          backdrop-blur-sm
          flex items-end
          md:items-center md:justify-center
        "
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            damping: 24,
            stiffness: 260,
          }}
          onClick={(e) =>
            e.stopPropagation()
          }
          className="
            w-full
            max-w-md
            bg-white dark:bg-zinc-950
            rounded-t-[32px]
            md:rounded-3xl
            flex flex-col
            max-h-[85dvh]
            overflow-hidden
          "
        >
          {/* drag handle */}
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          {/* header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
            <h2 className="text-[28px] leading-none font-black text-zinc-900 dark:text-white">
              Chia sẻ cho
            </h2>

            <button
              onClick={onClose}
              className="
                w-10 h-10 rounded-full
                flex items-center justify-center
                hover:bg-zinc-100
                dark:hover:bg-zinc-900
                active:scale-95
                transition
              "
            >
              <FiX
                size={24}
                className="text-zinc-500"
              />
            </button>
          </div>

          {/* task preview */}
          <div className="px-5 pb-4 shrink-0">
            <div
              className="
                rounded-3xl
                border border-blue-100
                dark:border-blue-900/40
                bg-blue-50 dark:bg-blue-950/20
                p-4
              "
            >
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <span>📋</span>

                <span className="text-sm font-bold">
                  {task.type === "task"
                    ? "Công việc"
                    : "Kế hoạch"}
                </span>
              </div>

              <p className="font-black text-xl text-zinc-900 dark:text-white line-clamp-2">
                {task.title}
              </p>

              {task.type === "task" &&
                (task.price ?? 0) > 0 && (
                  <p className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                    {task.price.toLocaleString(
                      "vi-VN"
                    )}
                    đ
                  </p>
                )}
            </div>
          </div>

          {/* search */}
          <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 px-5 pb-3 shrink-0">
            <div
              className="
                relative
                rounded-2xl
                border border-zinc-200
                dark:border-zinc-800
                bg-zinc-100
                dark:bg-zinc-900
              "
            >
              <FiSearch
                size={18}
                className="
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-zinc-400
                "
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Tìm bạn bè..."
                className="
                  h-14
                  w-full
                  bg-transparent
                  pl-11
                  pr-4
                  text-[15px]
                  text-zinc-900
                  dark:text-white
                  placeholder:text-zinc-400
                  outline-none
                "
              />
            </div>
          </div>

          {/* friend list */}
          <div
            className="
              flex-1
              overflow-y-auto
              overscroll-contain
              px-5
              pb-5
            "
          >
            {loading ? (
              <div className="space-y-3 pt-2">
                {Array.from({
                  length: 5,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

                      <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-20 text-center text-zinc-400">
                {search
                  ? "Không tìm thấy bạn bè"
                  : "Chưa có bạn bè nào"}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {filteredFriends.map(
                  (friend) => {
                    const isSelected =
                      selected.includes(
                        friend.id
                      );

                    return (
                      <button
                        key={friend.id}
                        onClick={() =>
                          toggleSelect(
                            friend.id
                          )
                        }
                        className="
                          w-full
                          flex items-center gap-3
                          rounded-2xl
                          p-3
                          bg-zinc-50
                          dark:bg-zinc-900
                          active:scale-[0.985]
                          transition
                        "
                      >
                        <div className="relative shrink-0">
                          {friend.avatar ? (
                            <img
                              src={
                                friend.avatar
                              }
                              alt={
                                friend.name
                              }
                              className="
                                w-12 h-12
                                rounded-full
                                object-cover
                              "
                            />
                          ) : (
                            <div
                              className="
                                w-12 h-12
                                rounded-full
                                bg-gradient-to-br
                                from-blue-500
                                to-blue-600
                                flex items-center justify-center
                                text-white
                                font-bold
                              "
                            >
                              {friend.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          {friend.online && (
                            <div
                              className="
                                absolute bottom-0 right-0
                                w-3.5 h-3.5
                                rounded-full
                                bg-green-500
                                border-2
                                border-white
                                dark:border-zinc-950
                              "
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate font-bold text-zinc-900 dark:text-white">
                            {friend.name}
                          </p>

                          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {friend.username
                              ? `@${friend.username}`
                              : friend.online
                              ? "Đang hoạt động"
                              : "Ngoại tuyến"}
                          </p>
                        </div>

                        <div
                          className={`
                            shrink-0
                            w-6 h-6
                            rounded-full
                            border-2
                            flex items-center justify-center
                            transition
                            ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-zinc-300 dark:border-zinc-700"
                            }
                          `}
                        >
                          {isSelected && (
                            <FiCheck
                              size={14}
                              className="text-white"
                            />
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* bottom button */}
          {selected.length > 0 && (
            <div
              className="
                shrink-0
                border-t
                border-zinc-200
                dark:border-zinc-800
                p-5
                pb-[max(20px,env(safe-area-inset-bottom))]
              "
            >
              <button
                onClick={handleSend}
                className="
                  h-14
                  w-full
                  rounded-2xl
                  bg-gradient-to-r
                  from-blue-500
                  to-blue-600
                  text-white
                  font-black
                  text-base
                  active:scale-[0.98]
                  transition
                  shadow-lg
                  shadow-blue-500/20
                "
              >
                Gửi cho {selected.length} người
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}