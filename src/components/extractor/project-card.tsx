"use client";

import { useState } from "react";
import { STATUS_COLORS, type Project } from "@/types/extractor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Link2, Code2, Palette, Clock, Trash2 } from "lucide-react";

type ProjectCardProps = {
  project: Project;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
};

export function ProjectCard({ project, onSelect, onDelete }: ProjectCardProps) {
  const [deleting, setDeleting] = useState(false);
  const getCount = (key: string) => {
    const c = (project as unknown as Record<string, Record<string, number>>)._count;
    return c ? c[key] || 0 : 0;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(project.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      className="group bg-card/50 hover:border-primary/30 cursor-pointer backdrop-blur-sm transition-all"
      onClick={() => onSelect(project.id)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Link2 className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}
            >
              {project.status}
            </span>
          </div>
          <p className="text-muted-foreground truncate text-xs">{project.url}</p>
        </div>
        <div className="text-muted-foreground hidden items-center gap-3 text-xs sm:flex">
          {project._count?.components !== undefined && (
            <span className="flex items-center gap-1">
              <Code2 className="h-3 w-3" /> {project._count.components}
            </span>
          )}
          {project._count?.tokens !== undefined && (
            <span className="flex items-center gap-1">
              <Palette className="h-3 w-3" /> {project._count.tokens}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{project.name}&quot; and all its components,
                tokens, and references. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </CardContent>
    </Card>
  );
}
