"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    fullName: string;
    id: string;
  };
}

interface OrderChatProps {
  orderId: string;
  currentUserId: string;
}

export function OrderChat({ orderId, currentUserId }: OrderChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function fetchMessages() {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send message");
      }

      const data = await response.json();
      if (data.message) {
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-slate-100 rounded-3xl bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-50 bg-slate-50/50">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <Send className="w-3 h-3" />
          Order Negotiation Chat
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground italic">No messages yet. Start the negotiation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                      isMe
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-900 rounded-tl-none"
                    }`}
                  >
                    <p className="font-bold text-[10px] mb-1 opacity-70 flex items-center gap-1">
                      {isMe ? <User className="w-2 h-2" /> : <Building2 className="w-2 h-2" />}
                      {msg.sender.fullName}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-medium">
                    {format(new Date(msg.createdAt), "HH:mm")}
                  </span>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-50 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="rounded-xl border-slate-200 focus:ring-primary/20"
          disabled={sending}
        />
        <Button 
          type="submit" 
          disabled={sending || !newMessage.trim()}
          className="rounded-xl bg-slate-900 hover:bg-primary transition-all px-6"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
