interface StatItemProps {
  value: string;
  label: string;
  valueClassName?: string;
}

const StatItem = (props: StatItemProps) => {
  return (
    <div className="flex flex-col items-center">
      <span className={props.valueClassName ?? "text-2xl font-bold"}>
        {props.value}
      </span>
      <span className="text-sm text-muted-foreground">{props.label}</span>
    </div>
  );
};

const AvatarBadge = () => {
  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
        SC
      </div>
      <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card" />
    </div>
  );
};

export const UserProfileCard = () => {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-sm">
      <div className="p-6 flex flex-col items-center gap-4">
        <AvatarBadge />

        <div className="text-center">
          <h3 className="text-lg font-semibold">Sarah Chen</h3>
          <p className="text-sm text-muted-foreground">
            Product Designer at Figma
          </p>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Designing interfaces that make people's lives simpler. Passionate
          about design systems and accessibility.
        </p>

        <div className="flex gap-8 py-2">
          <StatItem value="2.4k" label="Followers" />
          <StatItem value="891" label="Following" />
          <StatItem
            value="142"
            label="Posts"
            valueClassName="text-lg font-bold"
          />
        </div>

        <div className="flex gap-3 w-full">
          <button className="flex-1 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-white hover:text-white">
            Follow
          </button>
          <button className="flex-1 rounded-md border border-input bg-background text-foreground px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Message
          </button>
        </div>
      </div>
    </div>
  );
};
