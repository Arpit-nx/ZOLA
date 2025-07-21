"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

const Notification: React.FC<NotificationProps> = ({ message, type, visible }) => {
  const icon = type === "success" ? <CheckCircle className="text-green-500 w-5 h-5 mr-2" /> : <XCircle className="text-red-500 w-5 h-5 mr-2" />;
  const bgColor = type === "success" ? "bg-white" : "bg-white";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed left-4 bottom-4 z-50 shadow-lg rounded-lg px-4 py-2 flex items-center space-x-2 border ${bgColor}`}
        >
          {icon}
          <p className="text-sm text-gray-800 font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
