"use client";

import React from "react";
import Image from "next/image";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "./menu-toggle-icon";
import { useScroll } from "@/hooks/use-scroll";
import { api } from "../../convex/_generated/api";

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  const currentUser = useQuery(api.users.current);

  const links = [
    {
      label: "Features",
      href: "#",
    },
    {
      label: "Pricing",
      href: "#",
    },
    {
      label: "About",
      href: "#",
    },
    {
      label: "Hire me",
      href: "#",
    },
  ];

  React.useEffect(() => {
    if (open) {
      // Disable scroll
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scroll
      document.body.style.overflow = "";
    }

    // Cleanup when component unmounts (important for Next.js)
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-md md:border md:transition-all md:ease-out p-0.5",
        {
          "bg-background/95 supports-backdrop-filter:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow":
            scrolled && !open,
          "bg-background/90": open,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
          {
            "md:px-2": scrolled,
          },
        )}
      >
        <Image
          src="/logo_dark_text.svg"
          alt="logo-dark-with-black-text"
          height={130}
          width={130}
          className=" m-2"
        />
        <div className="hidden items-center gap-2 md:flex">
          {links.map((link, i) => (
            <Link
              key={i}
              target="_blank"
              className={buttonVariants({ variant: "ghost" })}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <Unauthenticated>
            <SignInButton mode="modal">
              <Button variant="neutral">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Get Started</Button>
            </SignUpButton>
          </Unauthenticated>

          <Authenticated>
            <Link href="/dashboard" className="mr-2">
              <Button >Dashboard</Button>
            </Link>
            <UserButton />
          </Authenticated>
        </div>
        <Button
          size="icon"
          onClick={() => setOpen(!open)}
          className="md:hidden"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      <div
        className={cn(
          "bg-background/90 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div
          data-slot={open ? "open" : "closed"}
          className={cn(
            "data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out",
            "flex h-full w-full flex-col justify-between gap-y-2 p-4",
          )}
        >
          <div className="grid gap-y-2">
            {links.map((link) => (
              <Link
                key={link.label}
                className={buttonVariants({
                  variant: "ghost",
                  className: "justify-start",
                })}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Unauthenticated>
              <SignInButton>
                <Button className="w-full">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button className="w-full">Get Started</Button>
              </SignUpButton>
            </Unauthenticated>
            <Authenticated>
              <div>
                <Button className="min-w-full">
                  <Link href="/dashboard">Navigate to dashboard</Link>
                </Button>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 flex-1 min-w-0">
                  <div className="shrink-0 pt-2">
                    <UserButton />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {(currentUser?.firstName == undefined && (
                        <span className="text-md dark:text-gray-400 truncate">
                          Fetching Name
                        </span>
                      )) ||
                        currentUser?.firstName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {(currentUser?.email == undefined && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          Fetching Email
                        </span>
                      )) ||
                        currentUser?.email}
                    </span>
                  </div>
                </div>
              </div>
            </Authenticated>
          </div>
        </div>
      </div>
    </header>
  );
}
