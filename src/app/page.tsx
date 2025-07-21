"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  sender: "user" | "bot";
  content: string;
}

interface UploadedFile {
  name: string;
  content: string;
}

const defaultBotMessage: Message = {
  id: Date.now(),
  sender: "bot",
  content: "Hi, I am your friendly neighborhood Arnim-ZOLA. How can I assist you today?",
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<"success" | "error" | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ ...defaultBotMessage, id: Date.now() }]);
    }
  }, []);

  useEffect(() => {
    if (uploadStatus !== null) {
      const timer = setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: input,
    };

    const combinedFileContent = uploadedFiles.map(f => f.content).join("\n\n");
    const fullPrompt = `${input}\n\n${combinedFileContent}`;
    const newHistory = [...messages, userMessage];

    setMessages(newHistory);
    setInput("");
    setIsTyping(true);

    const response = await fetch("/api/gemini", {
      method: "POST",
      body: JSON.stringify({
        prompt: fullPrompt,
        history: newHistory.map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let botReply = "";
    const botId = Date.now();
    setMessages((prev) => [...prev, { id: botId, sender: "bot", content: "" }]);

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      botReply += decoder.decode(value, { stream: true });
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botId ? { ...msg, content: botReply } : msg))
      );
    }

    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    document.body.appendChild(script);

    script.onload = async () => {
      //@ts-ignore
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".pdf")) {
          setUploadStatus("error");
          setUploadMessage(`Unsupported file: ${file.name}`);
          continue;
        }

        try {
          const arrayBuffer = await file.arrayBuffer();
          //@ts-ignore
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

          let content = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(" ");
            content += `Page ${i}: ${text}\n`;
          }

          setUploadedFiles((prev) => [...prev, { name: file.name, content }]);
          setUploadStatus("success");
          setUploadMessage(`${file.name} uploaded successfully!`);
        } catch (error) {
          console.error("PDF parsing failed", error);
          setUploadStatus("error");
          setUploadMessage(`Failed to parse ${file.name}`);
        }
      }
    };
  };

  const removeFile = (nameToRemove: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== nameToRemove));
  };

  const onFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearChat = () => {
    setMessages([{
      ...defaultBotMessage,
      id: Date.now() // Give a new unique ID on each reset
    }]);
  };

  return (
    <div className="relative h-screen flex justify-center items-center px-4 py-6">
      <div className="absolute inset-0 z-0">
        <img
          src="/background.jpg"
          alt="background"
          className="w-full h-full object-cover opacity-90 blur-md"
        />
      </div>

      {uploadStatus && (
        <div className="absolute top-4 right-4 z-20 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center space-x-2">
          <span className="text-xl">{uploadStatus === "success" ? "✅" : "❌"}</span>
          <span className="text-sm font-medium text-gray-800">{uploadMessage}</span>
        </div>
      )}

      <div className="relative z-10 w-full max-w-2xl h-full flex flex-col">
        <h1 className="text-3xl font-bold text-center text-white mb-4">
          Ask ZOLA - Your AI Assistant
        </h1>
        <Card className="flex flex-col flex-1 overflow-hidden">
          <CardContent className="flex flex-col p-0 h-full">
            <ScrollArea className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-2xl p-3 w-fit max-w-[75%] whitespace-pre-wrap break-words overflow-x-auto shadow-sm mb-3 ${
                      msg.sender === "user"
                        ? "bg-blue-500 text-white ml-auto text-right"
                        : "bg-gray-200 text-black mr-auto text-left"
                    }`}
                  >
                  {msg.sender === "bot" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <motion.div className="bg-gray-200 text-black p-3 rounded-2xl w-fit max-w-[75%] mr-auto text-left shadow-sm">
                  Bot is typing...
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Bottom Panel */}
            <div className="p-4 border-t bg-white/90 backdrop-blur-md sticky bottom-0 z-10">
              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-700"
                    >
                      <div className="truncate max-w-[85%] flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656L6.343 9.172a6 6 0 008.486 8.486"
                          />
                        </svg>
                        <span className="truncate">{file.name}</span>
                      </div>
                      <button
                        className="text-gray-400 hover:text-red-500 text-lg ml-2"
                        onClick={() => removeFile(file.name)}
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={onFileIconClick}
                  className="p-2 rounded-md hover:bg-gray-200 text-gray-600"
                  aria-label="Attach file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656L6.343 9.172a6 6 0 008.486 8.486"
                    />
                  </svg>
                </button>
                <Input
                  placeholder="Type your message..."
                  className="flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <Button onClick={handleSend}>Send</Button>
                <Button variant="outline" onClick={handleClearChat}>
                  Clear Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
