"use client";

import {
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode2,
  Trash2,
  File,
} from "lucide-react";
import { Attachment } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

const iconFor = (type: string) => {
  switch (type) {
    case "pdf":
      return { Icon: FileText, color: "text-red-500 bg-red-500/10" };
    case "png":
    case "jpg":
      return { Icon: FileImage, color: "text-violet-500 bg-violet-500/10" };
    case "xlsx":
    case "csv":
      return {
        Icon: FileSpreadsheet,
        color: "text-emerald-500 bg-emerald-500/10",
      };
    case "fig":
      return { Icon: FileCode2, color: "text-pink-500 bg-pink-500/10" };
    default:
      return { Icon: File, color: "text-muted-foreground bg-muted" };
  }
};

export function FileAttachmentRow({
  file,
  onDelete,
}: {
  file: Attachment;
  onDelete?: () => void;
}) {
  const { Icon, color } = iconFor(file.type);
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-accent/40">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · {file.type.toUpperCase()}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
