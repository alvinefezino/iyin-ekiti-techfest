"use client";
import { AnimatePresence, motion } from "framer-motion";

export default function Backdrop({ show, onClick, z = "z-40" }: { show: boolean; onClick?: () => void; z?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="backdrop"
          aria-hidden
          onClick={onClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 ${z} bg-black/45 backdrop-blur-md`}
        />
      )}
    </AnimatePresence>
  );
}
