"use client";

import React from "react";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";

/**
 * Site header
 */
export const Header = () => {
  return (
    <div className="sticky top-0 navbar min-h-0 shrink-0 justify-between z-20 px-0 sm:px-2">
      <div className="flex-1"></div>
      <div className="flex-1 flex justify-center">
        <Link href="/" className="btn btn-ghost text-xl">
          🪨📄✂️ Rock Paper Scissors
        </Link>
      </div>
      <div className="flex-1 flex justify-end mr-4">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
