"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
      setTasks(snap.docs.map((doc) => doc.data()));
    });

    return () => unsub();
  }, []);

  const addTask = async () => {
    if (!title) return;

    await addDoc(collection(db, "tasks"), {
      title,
      createdAt: Date.now(),
    });

    setTitle("");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Tasks</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 flex-1"
        />
        <button onClick={addTask}>Add</button>
      </div>

      {tasks.map((t, i) => (
        <div key={i} className="bg-white p-3 rounded shadow mb-2">
          {t.title}
        </div>
      ))}
    </div>
  );
}
