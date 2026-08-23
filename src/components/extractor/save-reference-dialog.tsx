"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SaveReferenceDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refName: string;
  onSetRefName: (v: string) => void;
  refTags: string;
  onSetRefTags: (v: string) => void;
  onSave: () => void;
  canSave: boolean;
};

export function SaveReferenceDialog({
  open,
  onOpenChange,
  refName,
  onSetRefName,
  refTags,
  onSetRefTags,
  onSave,
  canSave,
}: SaveReferenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Reference</DialogTitle>
          <DialogDescription>Save this component to your reference library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={refName}
              onChange={(e) => onSetRefName(e.target.value)}
              placeholder="e.g., Hero Section"
            />
          </div>
          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input
              value={refTags}
              onChange={(e) => onSetRefTags(e.target.value)}
              placeholder="hero, landing, cta"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={canSave}>
            Save Reference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
