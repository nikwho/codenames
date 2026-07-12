import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DisplayView,
  PlayerRole,
  SanitizedGameState,
  Settings,
  SubmitCluePayload,
  Team
} from "@codenames/shared";
import {
  getDeviceId,
  getStoredName,
  getStoredRole,
  setStoredName,
  setStoredRole,
  socket
} from "../socket";

export type ConnectionStatus = "loading" | "connected" | "disconnected" | "reconnecting";

export function useGameSocket(roomId: string) {
  const [state, setState] = useState<SanitizedGameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [nextRoomId, setNextRoomId] = useState<string | null>(null);

  const deviceId = useMemo(() => getDeviceId(), []);

  const joinAs = useCallback(
    (name: string, role: PlayerRole) => {
      setStoredName(name);
      setStoredRole(role);
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("joinRoom", {
        roomId,
        deviceId,
        name,
        role
      });
    },
    [deviceId, roomId]
  );

  useEffect(() => {
    const onConnect = () => {
      setConnectionStatus("connected");
      joinAs(getStoredName(), getStoredRole());
    };
    const onDisconnect = () => setConnectionStatus("disconnected");
    const onReconnectAttempt = () => setConnectionStatus("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on("gameState", ({ stateForCurrentPlayer }) => {
      setState(stateForCurrentPlayer);
      setRemainingSeconds(stateForCurrentPlayer.remainingSeconds);
      setError(null);
    });
    socket.on("timerTick", ({ remainingSeconds: nextRemaining }) => {
      setRemainingSeconds(nextRemaining);
    });
    socket.on("errorMessage", ({ message }) => {
      setError(message);
    });
    socket.on("newGameCreated", ({ roomId: createdRoomId }) => {
      setNextRoomId(createdRoomId);
    });

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off("gameState");
      socket.off("timerTick");
      socket.off("errorMessage");
      socket.off("newGameCreated");
    };
  }, [joinAs]);

  return {
    state,
    connectionStatus,
    error,
    remainingSeconds,
    nextRoomId,
    deviceId,
    joinAs,
    chooseTeam: (team: Team) => socket.emit("chooseTeam", { team }),
    chooseSpymasterTeam: (team: Team) => socket.emit("chooseSpymasterTeam", { team }),
    startGame: () => socket.emit("startGame"),
    submitClue: (payload: SubmitCluePayload) => socket.emit("submitClue", payload),
    revealCard: (cardId: string) => socket.emit("revealCard", { cardId }),
    endGuessing: () => socket.emit("endGuessing"),
    pauseGame: () => socket.emit("pauseGame"),
    resumeGame: () => socket.emit("resumeGame"),
    newGame: (onCreated?: (roomId: string) => void) =>
      socket.emit("newGame", ({ roomId: createdRoomId }) => {
        setNextRoomId(createdRoomId);
        onCreated?.(createdRoomId);
      }),
    restartRound: () => socket.emit("restartRound"),
    revealKeyAfterGame: () => socket.emit("revealKeyAfterGame"),
    resetPlayers: () => socket.emit("resetPlayers"),
    updateSettings: (settingsPatch: Partial<Settings>) => socket.emit("updateSettings", { settingsPatch }),
    setDisplayView: (view: DisplayView) => socket.emit("setDisplayView", { view })
  };
}
