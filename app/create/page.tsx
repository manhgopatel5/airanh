"use client";

import { useState, useEffect } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function CreateTaskPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [tasks, setTasks] = useState<any[]>([]);

  // 🔥 realtime tasks
  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // 🔥 upload ảnh
  const uploadImage = async () => {
    if (!image) return "";

    const storageRef = ref(storage, `tasks/${Date.now()}_${image.name}`);
    await uploadBytes(storageRef, image);
    return await getDownloadURL(storageRef);
  };

  // 🔥 tạo task
  const handleCreate = async () => {
    if (!title) return alert("Nhập tiêu đề");

    setLoading(true);

    const imageUrl = await uploadImage();

    await addDoc(collection(db, "tasks"), {
      title,
      desc,
      price,
      deadline,
      imageUrl,
      likes: [],
      comments: [],
      userId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    setTitle("");
    setDesc("");
    setPrice("");
    setDeadline("");
    setImage(null);

    setLoading(false);
  };

  // 🔥 like
  const handleLike = async (task: any) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const refDoc = doc(db, "tasks", task.id);

    const liked = task.likes?.includes(uid);

    await updateDoc(refDoc, {
      likes: liked
        ? task.likes.filter((id: string) => id !== uid)
        : [...(task.likes || []), uid],
    });
  };

  // 🔥 comment
  const handleComment = async (task: any, text: string) => {
    if (!text) return;

    const refDoc = doc(db, "tasks", task.id);

    await updateDoc(refDoc, {
      comments: [
        ...(task.comments || []),
        {
          text,
          uid: auth.currentUser?.uid,
          createdAt: new Date(),
        },
      ],
    });
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">

      {/* 🔥 FORM */}
      <div className="bg-white p-4 rounded-2xl shadow mb-6">
        <h2 className="text-lg font-bold mb-3">Tạo Task</h2>

        <input
          placeholder="Tiêu đề"
          className="w-full border p-2 rounded mb-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Mô tả chi tiết"
          className="w-full border p-2 rounded mb-2"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <input
          type="number"
          placeholder="Giá"
          className="w-full border p-2 rounded mb-2"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          type="datetime-local"
          className="w-full border p-2 rounded mb-2"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        {/* upload ảnh */}
        <input
          type="file"
          className="mb-3"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleCreate}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Đang tạo..." : "Tạo Task"}
        </button>
      </div>

      {/* 🔥 LIST TASK */}
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onLike={handleLike}
          onComment={handleComment}
        />
      ))}
    </div>
  );
}

/* ================= CARD ================= */

function TaskCard({ task, onLike, onComment }: any) {
  const [text, setText] = useState("");

  return (
    <div className="bg-white p-4 rounded-2xl shadow mb-4">
      <h3 className="font-bold">{task.title}</h3>

      <p className="text-gray-600">{task.desc}</p>

      {task.imageUrl && (
        <img
          src={task.imageUrl}
          className="w-full h-48 object-cover rounded mt-2"
        />
      )}

      <div className="flex justify-between text-sm mt-2">
        <span>💰 {task.price}</span>
        <span>⏰ {task.deadline}</span>
      </div>

      {/* 🔥 LIKE */}
      <div className="mt-3 flex gap-4">
        <button onClick={() => onLike(task)}>
          ❤️ {task.likes?.length || 0}
        </button>
      </div>

      {/* 🔥 COMMENT */}
      <div className="mt-3">
        <input
          placeholder="Viết comment..."
          className="border p-2 w-full rounded"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={() => {
            onComment(task, text);
            setText("");
          }}
          className="text-blue-500 mt-1"
        >
          Gửi
        </button>

        {/* list comment */}
        <div className="mt-2 text-sm">
          {task.comments?.map((c: any, i: number) => (
            <p key={i}>💬 {c.text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}