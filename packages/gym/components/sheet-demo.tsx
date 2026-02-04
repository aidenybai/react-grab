"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const SheetDemo = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Test</SheetTitle>
          <SheetDescription>
            Try to grab elements inside this sheet. Clicking the react-grab
            cursor icon should not close the sheet.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <Button variant="default">Button Inside Sheet</Button>
          <Button variant="outline">Another Button</Button>
          <Input type="text" placeholder="Input inside sheet…" />
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">Card Inside Sheet</div>
              <div className="text-muted-foreground text-xs mt-1">
                This card is inside the sheet
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
