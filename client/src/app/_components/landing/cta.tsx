import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <div className="bg-background">
      {/* Final CTA */}
      <section className="border-t border-gray-800 px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <h2 className="text-foreground text-4xl font-bold text-balance md:text-5xl">
            Ready to transform customer service?
          </h2>
          <Link href="/subscription">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
