"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Send,
  Smile,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Crown,
  Activity,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PricingModal from "@/components/PricingModal";
import ReportModal from "@/components/ReportModal";
import { getSocket } from "@/lib/socket";
import { getCurrentUser, UserProfile } from "@/lib/api";

interface MessageItem {
  id: string;
  senderUserId?: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

/**
 * Creates a silent audio track using Web Audio API to prevent
 * WebRTC negotiation failure when microphone is unavailable or busy.
 */
function createSilentAudioTrack(): MediaStreamTrack | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // complete silence
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    return dest.stream.getAudioTracks()[0] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Generates an active, animated 30fps virtual camera MediaStream on an HTML5 canvas.
 * Allows seamless WebRTC video calls in multiple tabs simultaneously on the same machine
 * without failing due to hardware camera lock (e.g. Linux /dev/video0 exclusive access).
 */
function createVirtualMediaStream(displayName: string, subtitle: string): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  let frame = 0;
  const initial = displayName?.charAt(0)?.toUpperCase() || "U";

  function draw() {
    if (!ctx) return;
    frame++;

    // Gradient background that shifts subtly
    const hue = (frame * 0.3) % 360;
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, `hsl(${hue}, 40%, 14%)`);
    grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 50%, 8%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle animated grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Outer pulsing ring
    const pulseRadius = 70 + Math.sin(frame * 0.05) * 8;
    ctx.beginPath();
    ctx.arc(320, 200, pulseRadius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Avatar Circle
    ctx.beginPath();
    ctx.arc(320, 200, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    // Initial
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, 320, 200);

    // Display Name
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(displayName, 320, 310);

    // Subtitle badge
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(subtitle, 320, 340);

    // Animated simulated audio wave bars
    ctx.fillStyle = "#60a5fa";
    const bars = 7;
    const barWidth = 6;
    const spacing = 10;
    const startX = 320 - ((bars * (barWidth + spacing)) / 2);
    for (let i = 0; i < bars; i++) {
      const h = 8 + Math.sin(frame * 0.1 + i * 0.8) * 8;
      ctx.fillRect(startX + i * (barWidth + spacing), 375 - h / 2, barWidth, h);
    }
  }

  const intervalId = setInterval(draw, 1000 / 30);
  draw();

  const canvasStream = canvas.captureStream(30);
  const audioTrack = createSilentAudioTrack();
  if (audioTrack) {
    canvasStream.addTrack(audioTrack);
  }

  (canvasStream as any)._canvasInterval = intervalId;
  return canvasStream;
}

export default function VideoChatPage() {
  // User & Auth
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [matchStatus, setMatchStatus] = useState<"IDLE" | "SEARCHING" | "CONNECTED">("IDLE");
  const [currentMode, setCurrentMode] = useState<"random" | "preferred_gender">("random");
  const [targetGender, setTargetGender] = useState<"ANY" | "FEMALE" | "MALE">("ANY");

  // Call Peer Info
  const [peerInfo, setPeerInfo] = useState<{
    id: string;
    displayName: string;
    avatarUrl?: string;
    gender?: string;
    isSimulated?: boolean;
  } | null>(null);

  // Call timer
  const [callDuration, setCallDuration] = useState(0);

  // Audio/Video controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isVirtualCam, setIsVirtualCam] = useState(false);
  const [isRemoteMutedForEcho, setIsRemoteMutedForEcho] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live status & caption
  const [liveCaption, setLiveCaption] = useState("Ready to chat. Click 'Start Video Matching' to meet someone!");

  // In-session messages
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef<number>(0);

  // Modals
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Media streams & WebRTC
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const virtualCanvasStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const cameraStartedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep a ref of user to avoid re-binding effects on balance updates
  const userRef = useRef<UserProfile | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check Authentication & Load User info
  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        window.location.href = "/auth?redirect=/video";
        return;
      }
      setUser(u);
      if (u.preferences?.preferredGender === "FEMALE" || u.preferences?.preferredGender === "MALE") {
        setTargetGender(u.preferences.preferredGender as any);
      }
      setAuthChecking(false);
    });
  }, []);

  // Initialize Camera immediately on mount in parallel with auth check to eliminate opening lag
  useEffect(() => {
    if (cameraStartedRef.current) return;
    cameraStartedRef.current = true;

    async function startCamera() {
      // 1. Try real physical camera and microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = stream;
        setHasCameraStream(true);
        setIsVirtualCam(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        // Update active WebRTC connection if already open
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          stream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track && s.track.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              peerConnectionRef.current?.addTrack(track, stream);
            }
          });
        }
        return;
      } catch (err: any) {
        console.warn("Full camera+mic access failed, checking fallback:", err?.name || err);
      }

      // 2. Try physical camera video-only (in case microphone is locked or busy)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const silentAudio = createSilentAudioTrack();
        if (silentAudio) stream.addTrack(silentAudio);

        localStreamRef.current = stream;
        setHasCameraStream(true);
        setIsVirtualCam(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          stream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track && s.track.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              peerConnectionRef.current?.addTrack(track, stream);
            }
          });
        }
        return;
      } catch (err: any) {
        console.warn("Camera video-only failed (hardware locked in another tab):", err?.name || err);
      }

      // 3. Fallback: Virtual Animated Camera Stream for multi-tab simultaneous testing
      console.info("Starting virtual camera stream for multi-tab support...");
      const displayName = userRef.current?.profile?.displayName || "You";
      const virtualStream = createVirtualMediaStream(displayName, "Camera in Tab 1 • Virtual Feed");
      virtualCanvasStreamRef.current = virtualStream;
      localStreamRef.current = virtualStream;
      setHasCameraStream(true);
      setIsVirtualCam(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = virtualStream;
        localVideoRef.current.play().catch(() => {});
      }
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        virtualStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(() => {});
          } else {
            peerConnectionRef.current?.addTrack(track, virtualStream);
          }
        });
      }
    }
    startCamera();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (virtualCanvasStreamRef.current) {
        const intervalId = (virtualCanvasStreamRef.current as any)._canvasInterval;
        if (intervalId) clearInterval(intervalId);
      }
    };
  }, []);

  // Ensure remote and local videos stay playing continuously
  useEffect(() => {
    if (hasRemoteStream && remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      const promise = remoteVideoRef.current.play();
      if (promise !== undefined) {
        promise.catch(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [hasRemoteStream, matchStatus]);

  useEffect(() => {
    if (hasCameraStream && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [hasCameraStream, isVideoDisabled]);

  // WebRTC Peer Connection Helper
  const createPeerConnection = (targetSocketId?: string) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notice: Do NOT clear iceCandidatesQueue.current here!
    // Early candidates sent by initiator during signaling must be preserved.

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    });
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      // Fallback transceivers to ensure SDP media sections exist
      try {
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
      } catch (e) {}
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit("signal-ice-candidate", { candidate: event.candidate, targetSocketId });
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = stream;
      }

      setHasRemoteStream(true);
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        const promise = remoteVideoRef.current.play();
        if (promise !== undefined) {
          promise.catch(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().catch(() => {});
            }
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setHasRemoteStream(true);
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setHasRemoteStream(false);
      }
    };

    return pc;
  };

  // Setup Socket listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on("match-found", async (data) => {
      setMatchStatus("CONNECTED");
      setPeerInfo(data.peer);
      setCallDuration(0);
      setLiveCaption(`Connected with ${data.peer.displayName}. Video and audio are encrypted.`);

      // If connected to another tab of oneself, mute remote audio by default to avoid howling audio feedback
      if (data.peer?.isSelfTab) {
        setIsRemoteMutedForEcho(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true;
        }
      }

      setMessages([
        {
          id: `sys_${Date.now()}`,
          senderName: "System",
          text: data.peer?.isSelfTab
            ? `Connected with your second tab! (Audio muted to prevent microphone feedback loop)`
            : `Connected with ${data.peer.displayName}. Say hi!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        },
      ]);

      if (data.isInitiator) {
        try {
          const pc = createPeerConnection(data.peer.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal-offer", { targetSocketId: data.peer.socketId, offer });
        } catch (err) {
          console.error("WebRTC offer initiation error", err);
        }
      }
    });

    socket.on("signal-offer", async (data: { offer: RTCSessionDescriptionInit; senderSocketId: string }) => {
      try {
        const pc = createPeerConnection(data.senderSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        // Flush any candidates that arrived before remoteDescription was set
        const queued = [...iceCandidatesQueue.current];
        iceCandidatesQueue.current = [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal-answer", { answer });
      } catch (err) {
        console.error("WebRTC answer error", err);
      }
    });

    socket.on("signal-answer", async (data: { answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          // Flush any candidates that arrived before remoteDescription was set
          const queued = [...iceCandidatesQueue.current];
          iceCandidatesQueue.current = [];
          for (const cand of queued) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error("WebRTC set answer error", err);
      }
    });

    socket.on("signal-ice-candidate", async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      } catch (err) {
        console.error("WebRTC add ice candidate error", err);
      }
    });

    socket.on("session-tick", (data) => {
      setCallDuration(data.durationSeconds);
    });

    socket.on("session-message", (msg) => {
      const isMine = msg.senderSocketId === socket.id;
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: msg.timestamp,
          isMe: isMine,
        },
      ]);
      setPartnerIsTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
    });

    socket.on("session-typing", (data) => {
      if (data.senderSocketId !== socket.id) {
        if (data.isTyping) {
          setPartnerIsTyping(true);
          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
          }
          // Extends notification as long as continuous typing pulses arrive
          partnerTypingTimeoutRef.current = setTimeout(() => {
            setPartnerIsTyping(false);
          }, 4500);
        } else {
          setPartnerIsTyping(false);
          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
          }
        }
      }
    });

    socket.on("peer-disconnected", () => {
      setPartnerIsTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setHasRemoteStream(false);
      setMatchStatus("SEARCHING");
      setPeerInfo(null);
      setLiveCaption("Partner disconnected. Searching for next match...");
      handleNextMatch();
    });

    socket.on("insufficient_balance", (data?: { message?: string }) => {
      setMatchStatus("IDLE");
      setPeerInfo(null);
      setLiveCaption(data?.message || "Preferred Gender Filter requires a paid pack. Please recharge to continue.");
      setIsPricingOpen(true);
    });

    socket.on("out_of_time", (data?: { message?: string }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setHasRemoteStream(false);
      setMatchStatus("IDLE");
      setPeerInfo(null);
      setLiveCaption(data?.message || "Your Preferred Gender minutes have expired. Please recharge to continue.");
      setIsPricingOpen(true);
    });

    socket.on("balance-update", (data: { paidVideoSecondsAvailable?: number }) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          usageBalance: {
            ...prev.usageBalance,
            paidVideoSecondsAvailable: data.paidVideoSecondsAvailable ?? prev.usageBalance?.paidVideoSecondsAvailable ?? 0,
            paidTextSecondsAvailable: prev.usageBalance?.paidTextSecondsAvailable ?? 0,
          },
        };
      });
    });

    socket.on("trial-update", (data: { videoTrialUsedSeconds?: number; videoTrialTotalMinutes?: number }) => {
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          trialEntitlement: {
            ...prev.trialEntitlement,
            videoTrialUsedSeconds: data.videoTrialUsedSeconds ?? prev.trialEntitlement?.videoTrialUsedSeconds ?? 0,
            videoTrialTotalMinutes: data.videoTrialTotalMinutes ?? prev.trialEntitlement?.videoTrialTotalMinutes ?? 15,
            textTrialTotalMinutes: prev.trialEntitlement?.textTrialTotalMinutes ?? 15,
            textTrialUsedSeconds: prev.trialEntitlement?.textTrialUsedSeconds ?? 0,
          },
        };
      });
    });

    return () => {
      socket.off("match-found");
      socket.off("signal-offer");
      socket.off("signal-answer");
      socket.off("signal-ice-candidate");
      socket.off("session-tick");
      socket.off("session-message");
      socket.off("session-typing");
      socket.off("peer-disconnected");
      socket.off("insufficient_balance");
      socket.off("out_of_time");
      socket.off("balance-update");
      socket.off("trial-update");
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartMatch = (mode: "random" | "preferred_gender") => {
    const socket = getSocket();

    if (mode === "preferred_gender") {
      const available = user?.usageBalance?.paidVideoSecondsAvailable || 0;
      if (available <= 0) {
        setIsPricingOpen(true);
        return;
      }
    }

    setCurrentMode(mode);
    setMatchStatus("SEARCHING");
    setPeerInfo(null);
    setLiveCaption("Searching for a partner...");

    // Reset ICE candidates queue for fresh matching
    iceCandidatesQueue.current = [];

    socket.emit("join-queue", {
      userId: user?.id || `guest_${Date.now()}`,
      displayName: user?.profile?.displayName || "Guest User",
      avatarUrl: user?.profile?.avatarUrl,
      gender: user?.profile?.gender || "OTHER",
      targetGender: mode === "preferred_gender" ? targetGender : "ANY",
      type: "video",
      mode,
    });
  };

  const handleNextMatch = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setHasRemoteStream(false);
    setIsRemoteMutedForEcho(false);
    iceCandidatesQueue.current = [];
    const socket = getSocket();
    socket.emit("next-match");
    handleStartMatch(currentMode);
  };

  const handleEndCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setHasRemoteStream(false);
    setIsRemoteMutedForEcho(false);
    iceCandidatesQueue.current = [];
    const socket = getSocket();
    socket.emit("leave-session");
    setMatchStatus("IDLE");
    setPeerInfo(null);
    setCallDuration(0);
    setLiveCaption("Ready to chat. Click 'Start Video Matching' to meet someone!");
  };

  const handleRetryCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // Stop previous virtual canvas stream if any
      if (virtualCanvasStreamRef.current) {
        const intervalId = (virtualCanvasStreamRef.current as any)._canvasInterval;
        if (intervalId) clearInterval(intervalId);
        virtualCanvasStreamRef.current.getTracks().forEach((t) => t.stop());
        virtualCanvasStreamRef.current = null;
      }

      localStreamRef.current = stream;
      setHasCameraStream(true);
      setIsVirtualCam(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // If active WebRTC peer connection exists, replace sender tracks
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        for (const sender of senders) {
          if (sender.track?.kind === "video" && videoTrack) {
            sender.replaceTrack(videoTrack).catch(() => {});
          } else if (sender.track?.kind === "audio" && audioTrack) {
            sender.replaceTrack(audioTrack).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      alert("Hardware camera is still busy in another tab. Once that tab is closed, click this again to switch to real camera.");
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMicMuted(!isMicMuted);
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoDisabled(!isVideoDisabled);
    } else {
      setIsVideoDisabled(!isVideoDisabled);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);
    const socket = getSocket();

    if (matchStatus !== "CONNECTED") return;

    if (val.trim().length > 0) {
      const now = Date.now();
      // Send typing pulse immediately if not already typing, or every 1.5s as long as user keeps typing
      if (!isTypingRef.current || now - lastTypingSentRef.current > 1500) {
        isTypingRef.current = true;
        lastTypingSentRef.current = now;
        socket.emit("session-typing", { isTyping: true });
      }

      // Reset the idle stop-typing timer
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing notification 2.5 seconds after user stops writing
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        socket.emit("session-typing", { isTyping: false });
      }, 2500);
    } else {
      // Input was cleared
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("session-typing", { isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || matchStatus !== "CONNECTED") return;

    const socket = getSocket();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    socket.emit("session-typing", { isTyping: false });

    socket.emit("send-session-message", {
      text: chatInput.trim(),
      senderName: user?.profile?.displayName || "You",
    });

    setChatInput("");
  };

  // Format Duration HH:MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-900 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
          <span className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-300 font-medium">Authenticating & initializing video chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden flex flex-col bg-slate-50 font-sans">
      {/* Top Navbar */}
      <div className="shrink-0">
        <Navbar onOpenPricing={() => setIsPricingOpen(true)} />
      </div>

      {/* Main Full-Window Video & Chat Workspace (NO WINDOW SCROLLING) */}
      <main className="flex-1 min-h-0 max-w-[1680px] w-full mx-auto p-2 sm:p-3 mb-11 sm:mb-12 lg:mb-0 flex flex-col lg:flex-row gap-2.5 sm:gap-3 overflow-hidden">
        {/* Left Side: Video Canvas & Controls */}
        <div
          ref={videoContainerRef}
          className={`w-full min-h-0 flex flex-col bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl relative border border-slate-800 transition-all duration-200 ${
            showChatMobile ? "h-[50%] sm:h-[52%] lg:h-full lg:flex-1" : "h-full flex-1"
          }`}
        >
          {/* Top Video Header Bar (matching reference image) */}
          <div className="h-11 sm:h-12 shrink-0 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between z-20">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href="/"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[140px] sm:max-w-xs">
                  {matchStatus === "CONNECTED" && peerInfo
                    ? `Call with "${peerInfo.displayName}"`
                    : matchStatus === "SEARCHING"
                    ? "Looking for someone..."
                    : "Ready to Match"}
                </h1>
                {currentMode === "preferred_gender" ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Crown className="h-3 w-3" /> Preferred Gender ({Math.floor((user?.usageBalance?.paidVideoSecondsAvailable || 0) / 60)}m left)
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🟢 100% Free Random
                  </span>
                )}
              </div>
            </div>

            {/* Right side duration / status */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-mono text-slate-800 font-bold text-xs">
                  {formatTimer(callDuration)}
                </span>
              </div>

              {/* Chat Toggle Button for Mobile / Half Screen */}
              <button
                type="button"
                onClick={() => setShowChatMobile(!showChatMobile)}
                className={`lg:hidden flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showChatMobile
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={showChatMobile ? "Maximize Video (Hide Chat)" : "Show Chat"}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{showChatMobile ? "Hide Chat" : "Chat"}</span>
              </button>

              {matchStatus === "CONNECTED" && (
                <button
                  onClick={() => setIsReportOpen(true)}
                  title="Report user"
                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Central Video Viewport */}
          <div className="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Main Remote Feed */}
            {matchStatus === "CONNECTED" ? (
              <div className="w-full h-full relative">
                {/* Real Remote WebRTC Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => {
                    e.currentTarget.play().catch(() => {});
                  }}
                  onPause={(e) => {
                    if (e.currentTarget.srcObject && matchStatus === "CONNECTED") {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    hasRemoteStream ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
                  }`}
                />

                {/* Connecting / Placeholder when tracks are connecting */}
                {!hasRemoteStream && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 space-y-3">
                    <img
                      src={
                        peerInfo?.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerInfo?.displayName || "peer"}`
                      }
                      alt={peerInfo?.displayName || "Remote Peer"}
                      className="w-24 h-24 rounded-full border-2 border-blue-500 object-cover shadow-xl"
                    />
                    <div className="text-center">
                      <div className="text-base font-bold text-white">{peerInfo?.displayName || "Partner"}</div>
                      <div className="text-xs text-blue-400 mt-1 flex items-center justify-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>Connecting live camera & microphone...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remote User Label */}
                <div className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5">
                  <span>{peerInfo?.displayName || "Connected Partner"}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Live</span>
                  {isRemoteMutedForEcho && (
                    <button
                      onClick={() => {
                        if (remoteVideoRef.current) {
                          remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
                          setIsRemoteMutedForEcho(remoteVideoRef.current.muted);
                        }
                      }}
                      className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/80 hover:bg-amber-500 text-[10px] text-white font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="Remote audio muted to prevent feedback loop between tabs. Click to toggle."
                    >
                      <VolumeX className="h-3 w-3" />
                      <span>Echo Guard</span>
                    </button>
                  )}
                </div>
              </div>
            ) : matchStatus === "SEARCHING" ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin flex items-center justify-center" />
                  <VideoIcon className="h-6 w-6 text-blue-400 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Searching for your match...</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                    Waiting for another user to join the video queue. Stand by!
                  </p>
                </div>
                <button
                  onClick={handleEndCall}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel Search
                </button>
              </div>
            ) : (
              // Idle Ready Screen
              <div className="w-full h-full relative bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center p-4">
                {/* Overlay Prompt to Connect */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 max-w-sm w-full max-h-[92%] overflow-y-auto shadow-2xl border border-white/20 text-center space-y-2.5 sm:space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      100% Free Video Chat
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      18+ Verified
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    Ready to meet someone new?
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Click below to start matchmaking. Free video calls connect with real active users in the queue.
                  </p>

                  {/* Mode selection */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <button
                      onClick={() => setCurrentMode("random")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        currentMode === "random"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <span>🟢 Random Mode</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">100% Free Forever</div>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentMode("preferred_gender");
                        if (targetGender === "ANY") setTargetGender("FEMALE");
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        currentMode === "preferred_gender"
                          ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <span>⭐ Female / Gender Filter</span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">
                        {(user?.usageBalance?.paidVideoSecondsAvailable || 0) > 0
                          ? `${Math.floor((user?.usageBalance?.paidVideoSecondsAvailable || 0) / 60)} mins remaining`
                          : "₹599 / 60 connected mins"}
                      </div>
                    </button>
                  </div>

                  {currentMode === "preferred_gender" && (
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <span className="text-xs text-slate-600 font-semibold">Filter:</span>
                      <button
                        onClick={() => setTargetGender("FEMALE")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                          targetGender === "FEMALE"
                            ? "bg-amber-500 text-white border-amber-600"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Female
                      </button>
                      <button
                        onClick={() => setTargetGender("MALE")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                          targetGender === "MALE"
                            ? "bg-amber-500 text-white border-amber-600"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Male
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleStartMatch(currentMode)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Start Video Matching</span>
                  </button>
                </div>
              </div>
            )}

            {/* Picture-in-Picture Local Camera (Top Right) */}
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 w-24 sm:w-36 md:w-40 aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/60 shadow-xl bg-slate-900 group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
                onPause={(e) => {
                  if (e.currentTarget.srcObject && !isVideoDisabled) {
                    e.currentTarget.play().catch(() => {});
                  }
                }}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isVideoDisabled || !hasCameraStream ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
                }`}
              />
              {!hasCameraStream && !isVideoDisabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-2 text-center">
                  <div className="h-8 w-8 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-xs mb-1">
                    {user?.profile?.displayName?.charAt(0) || "U"}
                  </div>
                  <span className="text-[9px] text-slate-400">Loading Cam...</span>
                </div>
              )}
              {isVideoDisabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-2 text-center">
                  <VideoOff className="h-5 w-5 mb-1" />
                  <span className="text-[9px] font-semibold">Camera Off</span>
                </div>
              )}
              {/* Local Tag */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white">
                  {user?.profile?.displayName || "You"}
                </span>
                {isVirtualCam && (
                  <button
                    onClick={handleRetryCamera}
                    className="px-1.5 py-0.5 rounded bg-amber-500/80 hover:bg-amber-500 backdrop-blur-md text-[9px] font-semibold text-white cursor-pointer transition-colors"
                    title="Camera locked in another tab. Click to retry hardware camera."
                  >
                    Virtual Cam
                  </button>
                )}
              </div>
            </div>

            {/* Glassmorphism Floating Control Bar (Bottom Center, matching reference image) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
              {/* Speaker / Volume Button with Popover Vertical Slider */}
              <div className="relative">
                <button
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  className="p-2 sm:p-2.5 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-colors"
                  title="Adjust Volume"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>

                {showVolumeSlider && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 p-2.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center gap-1.5">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="h-20 w-1.5 accent-blue-600 appearance-none bg-slate-200 rounded-lg cursor-pointer"
                      style={{ writingMode: "vertical-lr", direction: "rtl" }}
                    />
                    <span className="text-[9px] font-bold text-slate-700">{volume}%</span>
                  </div>
                )}
              </div>

              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                className={`p-2 sm:p-2.5 rounded-full transition-colors ${
                  isMicMuted
                    ? "bg-red-500 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/20"
                }`}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Red End Call / Next Button (Exact Circular red button from screenshot) */}
              <button
                onClick={matchStatus === "CONNECTED" ? handleNextMatch : () => handleStartMatch(currentMode)}
                className="p-3 sm:p-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                title={matchStatus === "CONNECTED" ? "Next Match (Skip)" : "Start Call"}
              >
                <PhoneOff className="h-5 w-5" />
              </button>

              {/* Camera Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-2 sm:p-2.5 rounded-full transition-colors ${
                  isVideoDisabled
                    ? "bg-red-500 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/20"
                }`}
                title={isVideoDisabled ? "Enable Video" : "Disable Video"}
              >
                {isVideoDisabled ? <VideoOff className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 sm:p-2.5 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Live Caption / Audio Wave Bar (Bottom Footer of Video area, exact match to reference screenshot) */}
          <div className="h-10 shrink-0 px-4 bg-white border-t border-slate-200 flex items-center gap-2.5 text-xs text-slate-800 font-medium z-20">
            {/* Audio Wave Visualizer */}
            <div className="flex items-center gap-0.5 text-blue-600 shrink-0">
              <span className="inline-block w-1 h-3 bg-blue-600 rounded-full animate-pulse" />
              <span className="inline-block w-1 h-4 bg-blue-600 rounded-full animate-pulse delay-75" />
              <span className="inline-block w-1 h-2 bg-blue-600 rounded-full animate-pulse delay-150" />
              <span className="inline-block w-1 h-3.5 bg-blue-600 rounded-full animate-pulse delay-100" />
            </div>
            <p className="truncate text-slate-700 font-medium text-[11px] sm:text-xs">
              {liveCaption}
            </p>
          </div>
        </div>

        {/* Right Side: Chat Panel (Fully fitted in viewport height, input box ALWAYS visible) */}
        <div
          className={`w-full lg:w-80 xl:w-96 min-h-0 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden shrink-0 transition-all duration-200 ${
            showChatMobile ? "h-[50%] sm:h-[48%] lg:h-full flex" : "hidden lg:flex lg:h-full"
          }`}
        >
          {/* Chat Header */}
          <div className="h-10 sm:h-12 shrink-0 px-3 sm:px-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Chat</h2>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time</span>
            </div>
          </div>

          {/* Messages Stream (Internally scrollable, stays within canvas) */}
          <div className="flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain space-y-2.5 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-1.5">
                <div className="p-2.5 rounded-full bg-slate-100 text-slate-400">
                  <Smile className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-600">No messages yet</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">
                  When you connect with a partner, you can send real-time text messages here.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isMe ? "items-end" : "items-start"}`}
                >
                  {!m.isMe && (
                    <div className="flex items-center gap-1.5 mb-0.5 pl-1">
                      <div className="h-4 w-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                        {m.senderName.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800">{m.senderName}</span>
                      <span className="text-[9px] text-slate-400">{m.timestamp}</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[85%] px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                      m.isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm"
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>

                  {m.isMe && (
                    <span className="text-[9px] text-slate-400 mt-0.5 pr-1">{m.timestamp}</span>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Notification Banner (Pinned at the end of the message box, immediately above typing input bar) */}
          {partnerIsTyping && (
            <div className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-blue-50/90 via-slate-50 to-blue-50/90 border-t border-blue-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold">
                  {peerInfo?.displayName?.charAt(0) || "S"}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-blue-900 font-medium">
                  <span className="font-bold text-slate-800">{peerInfo?.displayName || "Stranger"}</span>
                  <span className="text-slate-500">is typing</span>
                  <span className="inline-flex items-center gap-0.5 ml-0.5">
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-blue-500 font-semibold uppercase tracking-wider">typing...</span>
            </div>
          )}

          {/* Chat Input Bar (ALWAYS visible at bottom of screen, pinned in place) */}
          <form
            onSubmit={handleSendMessage}
            className="shrink-0 p-2.5 border-t border-slate-100 bg-white flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-1.5 bg-slate-100/90 rounded-2xl px-3 py-1.5 border border-slate-200/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Insert emoji"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              <input
                type="text"
                placeholder="Type here..."
                value={chatInput}
                onChange={handleInputChange}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow transition-all shrink-0"
              title="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </main>

      {/* Modals */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        highlightProduct="VIDEO_PACK_60M"
        onSuccess={() => getCurrentUser().then((u) => setUser(u))}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetUserId={peerInfo?.id || "unknown_peer"}
        targetUserName={peerInfo?.displayName || "Current Partner"}
        onReportSuccess={handleNextMatch}
      />
    </div>
  );
}
