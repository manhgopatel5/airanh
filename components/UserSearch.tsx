"use client";

import { useState } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";

export default function UserSearch() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e: any) => {
    const val = e.target.value;
    setKeyword(val);

    const res = await searchUsers(val);
    setResults(res);
  };

  return (
    <div className="p-3">
      {/* SEARCH INPUT */}
      <input
        value={keyword}
        onChange={handleSearch}
        placeholder="Tìm bạn..."
        className="w-full border p-2 rounded-lg mb-3"
      />

      {/* RESULT */}
      {results.map((u) => (
        <div
          key={u.uid}
          className="flex items-center justify-between p-2 bg-white rounded-xl shadow mb-2"
        >
          <div className="flex items-center gap-2">
            <img
              src={u.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-gray-400">
                {u.email}
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              sendFriendRequest(user.uid, u.uid)
            }
            className="bg-blue-500 text-white px-3 py-1 rounded-lg"
          >
            Kết bạn
          </button>
        </div>
      ))}
    </div>
  );
}
