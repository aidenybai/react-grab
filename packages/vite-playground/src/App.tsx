import { NotificationFeed } from "./components/notification-feed";
import { PricingCards } from "./components/pricing-cards";
import { UserProfileCard } from "./components/user-profile-card";

const App = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">React Grab Demo</h1>
        <p className="text-muted-foreground mt-2">
          Hover over any element and press ⌘C to grab its context. Can you spot
          the bugs?
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        <UserProfileCard />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Pricing</h2>
        <PricingCards />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <NotificationFeed />
      </section>
    </div>
  );
};

export default App;
