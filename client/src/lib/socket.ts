import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
}

