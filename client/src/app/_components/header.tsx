"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiTmobile as TMobileLogo } from "react-icons/si";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

export default function Header() {
  const pathname = usePathname();
  const isNotHome = pathname !== "/";

  return (
    <nav className="flex shrink-0 items-center justify-between border-b border-gray-800 px-6 py-4 md:px-12">
      <div className="flex items-center gap-3">
        {isNotHome ? (
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-3">
            <div className="glow-effect bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
              <TMobileLogo className="h-6 w-6" />
            </div>
            <span className="text-foreground hidden text-sm font-semibold sm:inline">
              Time
            </span>
          </Link>
        )}
      </div>
      <Button variant="outline" size="sm">
        Sign In
      </Button>
    </nav>
  );
}
