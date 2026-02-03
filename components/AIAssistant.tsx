
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, User, Bot, Loader2 } from 'lucide-react';
import { askStudioAssistant } from '../geminiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onClose: () => void;
  context: any;
}

const AIAssistant: React.FC<Props> = ({ onClose, context }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là trợ lý Ánh Sáng Studio. Bạn muốn hỏi về doanh thu, lịch trình hay hợp đồng hôm nay?' }
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const reply = await askStudioAssistant(userMsg, context);
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <div className="bg-white flex flex-col h-full border border-slate-200">
      <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Sparkles size={18} />
          <span>Trợ lý Studio</span>
        </div>
        <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              m.role === 'user' 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-400 font-medium">Đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input 
            type="text" 
            placeholder="Đặt câu hỏi..."
            className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:scale-100 active:scale-90 transition-all shadow-md"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
