interface FeatureItemProps {
  text: string;
  iconClassName?: string;
}

const FeatureItem = (props: FeatureItemProps) => {
  return (
    <li className="flex items-center gap-2">
      <svg
        className={`w-4 h-4 shrink-0 ${props.iconClassName ?? "text-green-500"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm">{props.text}</span>
    </li>
  );
};

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular: boolean;
  iconClassName?: string;
  cardClassName?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
}

const PricingCard = (props: PricingCardProps) => {
  const cardRounding = props.plan.cardClassName ?? "rounded-xl";

  return (
    <div
      className={`${cardRounding} border bg-card text-card-foreground shadow-sm flex flex-col relative ${
        props.plan.isPopular ? "border-primary border-2" : "border-border"
      }`}
    >
      {props.plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-xs font-medium">
          Popular
        </div>
      )}

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="text-lg font-semibold">{props.plan.name}</h3>
          <p className="text-sm text-muted-foreground">
            {props.plan.description}
          </p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">
            {props.plan.price}
          </span>
          <span className="text-sm text-muted-foreground">
            /{props.plan.period}
          </span>
        </div>

        <ul className="flex flex-col gap-2.5 flex-1">
          {props.plan.features.map((feature) => (
            <FeatureItem
              key={feature}
              text={feature}
              iconClassName={props.plan.iconClassName}
            />
          ))}
        </ul>

        <button
          className={`w-full rounded-md px-4 py-2 text-sm font-medium ${
            props.plan.isPopular
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          Get started
        </button>
      </div>
    </div>
  );
};

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "$9",
    period: "month",
    description: "Perfect for side projects",
    features: [
      "Up to 3 projects",
      "1 GB storage",
      "Basic analytics",
      "Email support",
      "API access",
    ],
    isPopular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "month",
    description: "For growing teams",
    features: [
      "Unlimited projects",
      "50 GB storage",
      "Advanced analytics",
      "Priority support",
      "API access",
      "Custom integrations",
    ],
    isPopular: true,
    iconClassName: "text-blue-500",
    cardClassName: "rounded-none",
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "For large organizations",
    features: [
      "Unlimited everything",
      "500 GB storage",
      "Custom analytics",
      "24/7 phone support",
      "API access",
      "Custom integrations",
    ],
    isPopular: false,
  },
];

export const PricingCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan) => (
        <PricingCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
};
