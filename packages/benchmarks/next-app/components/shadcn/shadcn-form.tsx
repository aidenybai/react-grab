"use client";
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ShadcnForm({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="shadcn-name">Full Name</Label>
            <Input
              id="shadcn-name"
              placeholder="Jane Doe"
              data-testid="shadcn-input-name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shadcn-email">Email</Label>
            <Input
              id="shadcn-email"
              type="email"
              placeholder="jane@example.com"
              data-testid="shadcn-input-email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shadcn-password">Password</Label>
            <Input
              id="shadcn-password"
              type="password"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" data-testid="shadcn-submit-button">
            {submitted ? "Submitted!" : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
