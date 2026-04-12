"use client";

import { useEffect, useState } from "react";
import {
  listenFriendRequests,
  acceptRequest,
  rejectRequest,
} from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";

export default function FriendRequests() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsub = listenFriendRequests(user.uid, setList);
    return () => unsub();
  }, [user]);

  return (
    <div className="p-3 bg-white rounded-xl shadow">
      <h3 className="font-semibold mb-2">Lời mời kết bạn</h3>

      {list.map((req) => (
        <div
          key={req.id}
          className="flex justify-between items-center mb-2"
        >
          <span>{req.from}</span>

          <div className="flex gap-2">
            <button
              onClick={() => acceptRequest(req)}
              className="bg-green-500 text-white px-2 py-1 rounded"
            >
              Đồng ý
            </button>

            <button
              onClick={() => rejectRequest(req.id)}
              className="bg-gray-300 px-2 py-1 rounded"
            >
              Từ chối
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
