"use client";

import { useEffect, useState } from "react";
import { Loader2, SendHorizontal, X } from "lucide-react";

type CommentDto = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  user: { id: string; name: string | null; email: string | null };
  replies: CommentDto[];
};

export default function CommentSection({ partId, onClose }: { partId: string; onClose: () => void }) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?partId=${partId}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setError("Failed to load comments"))
      .finally(() => setLoading(false));
  }, [partId]);

  async function submit() {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId, body, parentId: replyTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      setComments((cs) => insertReply(cs, data.comment, replyTo));
      setBody("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="font-bold text-zinc-900">Comments ({countAll(comments)})</h2>
          <button onClick={onClose} className="rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700" aria-label="Close comments">
            <X size={16} />
          </button>
        </div>

        <div className="sv-scroll min-h-0 flex-1 space-y-4 overflow-auto p-4">
          {loading && <p className="flex items-center gap-2 text-zinc-500"><Loader2 size={16} className="animate-spin" /> Loading comments…</p>}
          {!loading && comments.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">Be the first to comment!</p>}
          {comments.map((c) => (
            <CommentNode key={c.id} comment={c} depth={0} onReply={setReplyTo} />
          ))}
        </div>

        <div className="border-t border-zinc-200 p-4">
          {replyTo && (
            <p className="mb-2 text-xs text-red-600">
              Replying to a comment ·{" "}
              <button className="underline" onClick={() => setReplyTo(null)}>cancel</button>
            </p>
          )}
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts…"
              rows={2}
              maxLength={2000}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <button
              onClick={submit}
              disabled={sending || !body.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              aria-label="Send comment"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentNode({ comment, depth, onReply }: { comment: CommentDto; depth: number; onReply: (id: string) => void }) {
  const initials = (comment.user.name ?? comment.user.email ?? "?")[0]?.toUpperCase();
  return (
    <div className={depth > 0 ? "ml-4 border-l border-zinc-200 pl-4 sm:ml-6" : ""}>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{initials}</span>
          <span className="truncate text-sm font-semibold text-zinc-900">{comment.user.name ?? comment.user.email ?? "Reader"}</span>
          <span className="ml-auto text-[11px] text-zinc-400">{timeAgoLocal(comment.createdAt)}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-600">{comment.body}</p>
        {depth < 4 && (
          <button onClick={() => onReply(comment.id)} className="mt-2 text-xs font-medium text-red-600 hover:underline">
            Reply
          </button>
        )}
      </div>
      {comment.replies?.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((r) => <CommentNode key={r.id} comment={r} depth={depth + 1} onReply={onReply} />)}
        </div>
      )}
    </div>
  );
}

function countAll(list: CommentDto[]): number {
  return list.reduce((n, c) => n + 1 + countAll(c.replies ?? []), 0);
}

function insertReply(list: CommentDto[], node: CommentDto, parentId: string | null): CommentDto[] {
  if (!parentId) return [...list, node];
  return list.map((c) =>
    c.id === parentId
      ? { ...c, replies: [...(c.replies ?? []), node] }
      : { ...c, replies: insertReply(c.replies ?? [], node, parentId) }
  );
}

function timeAgoLocal(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
