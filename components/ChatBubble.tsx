"use client";

type ChatBubbleProps = {
  text: string;
  me?: boolean;
  time?: string;
};

export default function ChatBubble({
  text,
  me,
  time,
}: ChatBubbleProps) {
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"} mb-2`}>
      
      {/* Bubble */}
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-2 rounded-2xl text-sm shadow 
          ${me 
            ? "bg-green-500 text-white rounded-br-sm" 
            : "bg-gray-200 text-black rounded-bl-sm"
          }`}
        >
          {text}
        </div>

        {/* Time */}
        {time && (
          <p
            className={`text-xs mt-1 ${
              me ? "text-right text-gray-400" : "text-left text-gray-400"
            }`}
          >
            {time}
          </p>
        )}
      </div>
    </div>
  );
}
