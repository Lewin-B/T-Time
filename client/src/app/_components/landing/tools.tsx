"use client";

import { motion } from "motion/react";
import { BsNvidia as NvidiaLogo } from "react-icons/bs";
import { AiOutlineOpenAI as OpenAILogo } from "react-icons/ai";
import { SiTmobile as TMobileLogo } from "react-icons/si";
import {
  RiGeminiLine as GeminiLogo,
  RiClaudeLine as ClaudeLogo,
} from "react-icons/ri";

export default function Tools() {
  // Increased radius for more spacing from the center logo
  const orbitRadius = 200;

  const logos = [
    { component: NvidiaLogo, angle: 0, color: "text-green-500" },
    { component: OpenAILogo, angle: 90, color: "text-[#10A37F]" },
    { component: GeminiLogo, angle: 180, color: "text-blue-400" },
    { component: ClaudeLogo, angle: 270, color: "text-[#D97757]" },
  ];

  return (
    <section className="w-full border-t border-gray-800 bg-black px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
            Powered by Industry Leaders
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg md:text-xl">
            Built with cutting-edge AI technologies from the world&apos;s most
            innovative companies
          </p>
        </div>

        {/* Orbital Logo Animation */}
        <div className="relative mx-auto flex h-[450px] w-full items-center justify-center md:h-[550px]">
          {/* Center T-Mobile Logo */}
          <div className="absolute z-10">
            <div className="glow-effect bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-lg md:h-28 md:w-28">
              <TMobileLogo className="h-12 w-12 md:h-14 md:w-14" />
            </div>
          </div>

          {/* Orbiting Logos Container */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              transformOrigin: "50% 50%",
            }}
          >
            {logos.map((logo, index) => {
              const Component = logo.component;
              const angleRad = (logo.angle * Math.PI) / 180;
              const x = Math.cos(angleRad) * orbitRadius;
              const y = Math.sin(angleRad) * orbitRadius;

              return (
                <div
                  key={index}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  }}
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="bg-secondary/50 flex h-20 w-20 items-center justify-center rounded-lg backdrop-blur-sm md:h-24 md:w-24"
                  >
                    <Component
                      className={`h-12 w-12 md:h-14 md:w-14 ${logo.color}`}
                    />
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
