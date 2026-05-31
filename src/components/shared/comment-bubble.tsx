"use client";

import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Comment } from "@/lib/types";
import { useApp } from "@/lib/store";

function renderBody(body: string) {
  const parts = body.split(/(@[\w]+(?:\s[\w]+)?)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span
        key={i}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CommentBubble({ comment }: { comment: Comment }) {
  const { getMember } = useApp();
  const author = getMember(comment.authorId);
  return (
    <div className="flex gap-3">
      <Avatar name={author?.name ?? "?"} color={author?.avatarColor} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-xl rounded-tl-sm border border-border bg-card px-3 py-2">
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold">{author?.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {renderBody(comment.body)}
          </p>
        </div>
      </div>
    </div>
  );
}
