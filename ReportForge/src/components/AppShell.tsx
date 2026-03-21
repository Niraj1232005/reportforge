"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideFooter = pathname.startsWith("/editor/");

  return (
    <div className="min-h-screen bg-app text-app font-sans pb-px">
      <AppHeader />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="relative"
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {!hideFooter ? <AppFooter /> : null}
    </div>
  );
}
