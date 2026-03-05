import { Dashboard } from "@/components/dashboard";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <Dashboard />
      </div>
    </div>
  );
}
