"use client";

export default function PostCard({ post }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-3">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={post.userAvatar || "/avatar.png"}
          className="w-8 h-8 rounded-full"
        />
        <span className="font-semibold">{post.userName}</span>
      </div>

      <p className="text-gray-800">{post.content}</p>
    </div>
  );
}
