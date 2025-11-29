"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";

const BetsPage = () => {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="px-4 sm:px-8 pt-12 sm:pt-16 pb-56">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image
                  src={ReactGrabLogo}
                  alt="React Grab"
                  className="w-10 h-10"
                />
              </Link>
              <h1 className="text-xl font-medium text-white">Some bets</h1>
            </div>

            <div className="text-sm text-neutral-500">
              By{" "}
              <a
                href="https://x.com/aidenybai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline underline-offset-4"
              >
                Aiden Bai
              </a>
              {" · "}
              <span>November 29, 2025</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-neutral-400">
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                1. AI coding for UI will be one of the most economically
                important ways people build things
              </h3>
              <p>
                Humans and agents will always be using UIs. In fact, UIs will
                become more important to use: better computer use, interfaces
                for humans post-code, legacy business software that needs
                maintaining.
              </p>
              <p>There will be code written to build and maintain UIs.</p>
              <p>
                As expectations and capabilities rise with AI progress, so will
                the need for new UIs and better versions of the old.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                2. Most of the new UIs of the world will be made using web
                technology
              </h3>
              <p>
                Sub-bet: most of web frontends will be made using a flavor of
                the same base React.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                3. Models will become (1) incredibly fast, then (2) incredibly
                good at UI tasks
              </h3>
              <p>
                Fast because code has verifiable rewards (tests pass, code
                runs), making it ideal for RL. Labs are scaling post-training on
                code, and coding tools are building on top. Good requires taste.
                Great people will get there eventually but slower.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                4. Our tools will go the way of &quot;media technology&quot;
                past
              </h3>
              <p>
                From daguerreotype to polaroid to camcorder to studio-level
                digital cameras back to iPhones. From low use to an explosion of
                capabilities and then a product for the average person.
              </p>
              <p>
                Coding, unlike cameras, will progress OOM faster (
                <a
                  href="https://x.com/polynoamial/status/1994439121243169176"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  5-20 years
                </a>
                ).
              </p>
              <p>
                Once AI coding becomes commodified, you win on taste/ease of use vs.
                bleeding edge capability.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                5. There will only be two form factors for UI tasks
              </h3>
              <p>
                Low latency low entropy (sub 100ms), and long background tasks
                (big refactors, maintenance, scaffolding a well-spec{"'"}d
                feature).
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                6. The gap
              </h3>
              <p>There is no tool that is good at UI.</p>
              <p>There is no company willing to fully bet on this.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BetsPage.displayName = "BetsPage";

export default BetsPage;
