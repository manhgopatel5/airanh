"use client";

import { useEffect, useState } from "react";
import { Flame, Clock, Sparkles, Users } from "lucide-react";
import UserSearch from "@/components/UserSearch";
import FriendList from "@/components/FriendList";
import FriendRequests from "@/components/FriendRequests";
import Link from "next/link";

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import TaskCard from "@/components/TaskCard";
import PostCard from "@/components/PostCard";

export default function Home() {
  const [activeTab, setActiveTab] = useState("hot");

  const [tasks, setTasks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  /* ================= FETCH FIRESTORE ================= */

  useEffect(() => {
    // 📌 TASKS
    const qTasks = query(
      collection(db, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(data);
    });

    // 📝 POSTS
    const qPosts = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(data);
    });

    return () => {
      unsubTasks();
      unsubPosts();
    };
  }, []);

  /* ================= TABS ================= */

  const tabs = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "recent", label: "Gần đây", icon: Clock },
    { id: "new", label: "New", icon: Sparkles },
    { id: "friends", label: "Bạn bè", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 🔥 TOP NAV */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="pt-[env(safe-area-inset-top)]" />

        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 flex-1 transition ${
                  active ? "text-black" : "text-gray-400"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{tab.label}</span>

                <div
                  className={`mt-1 h-[2px] w-6 rounded-full ${
                    active ? "bg-black" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 📦 CONTENT */}
      <div className="max-w-xl mx-auto p-3 space-y-3">
        {activeTab === "hot" && (
          <HotTab tasks={tasks} posts={posts} />
        )}

        {activeTab === "recent" && (
          <RecentTab tasks={tasks} posts={posts} />
        )}

        {activeTab === "new" && <NewTaskTab />}

        {activeTab === "friends" && (
          <FriendsTab tasks={tasks} posts={posts} />
        )}
      </div>
    </div>
  );
}

/* ================= TAB ================= */

function HotTab({
  tasks,
  posts,
}: {
  tasks: any[];
  posts: any[];
}) {
  const sortedTasks = [...tasks].sort(
    (a, b) => (b.likes || 0) - (a.likes || 0)
  );

  const sortedPosts = [...posts].sort(
    (a, b) => (b.likes || 0) - (a.likes || 0)
  );

  if (!sortedTasks.length && !sortedPosts.length)
    return <EmptyState />;

  return (
    <>
      {/* 🔥 POSTS */}
      {sortedPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* 📌 TASKS */}
      {sortedTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function RecentTab({
  tasks,
  posts,
}: {
  tasks: any[];
  posts: any[];
}) {
  if (!tasks.length && !posts.length)
    return <EmptyState />;

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function NewTaskTab() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h2 className="text-lg font-semibold mb-2">
        Tạo task mới
      </h2>

      <Link
        href="/create"
        className="bg-black text-white px-5 py-2 rounded-xl"
      >
        Tạo Task
      </Link>
    </div>
  );
}

function FriendsTab({
  tasks,
  posts,
}: {
  tasks: any[];
  posts: any[];
}) {
  // 👉 sau này filter theo friends
  if (!tasks.length && !posts.length)
    return <EmptyState />;

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-gray-400 mt-10">
      Chưa có dữ liệu
    </div>
  );
}
