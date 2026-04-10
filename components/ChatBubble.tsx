
export default function ChatBubble({ text, me }: any) {
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`p-2 rounded-xl ${me ? "bg-green-500 text-white" : "bg-gray-200"}`}>
        {text}
      </div>
    </div>
  );
}
