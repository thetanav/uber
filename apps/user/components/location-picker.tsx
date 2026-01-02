import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MapPicker } from "./map-select";
import { Check, Loader2 } from "lucide-react";

export function LocationDialog({
  open,
  origin,
  onClose,
  onConfirm,
  setOrigin,
  setDestination,
  choose,
}: any) {
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose} modal={false}>
      <DialogContent className="p-4 max-w-lg">
        <DialogHeader>
          <DialogTitle>Select {choose ? "Origin" : "Destination"}</DialogTitle>
        </DialogHeader>

        <MapPicker
          origin={origin}
          onSelect={setSelected}
          setLoading={setLoading}
        />

        <Button
          disabled={!selected || loading}
          onClick={() => {
            console.log(selected);
            onClose();
            if (choose) {
              setOrigin(selected);
            } else {
              setDestination(selected);
            }
          }}>
          {loading ? <Loader2 className="animate-spin" /> : <Check />}
          Confirm location
        </Button>
      </DialogContent>
    </Dialog>
  );
}
